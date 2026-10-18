import * as S from '../lib/store.js';
import { esc, I, initials, toast, openModal, closeModal, modalOpen, $, $$ } from './common.js';
import { todayStr, mondayOf, addDays, weekTitle, weekShort, monthKey, monthLabel, MESES, diffDays, parse } from '../lib/dates.js';
import { missingCount, partTitle, newPartId } from '../lib/model.js';
import { suggestWeek, slotsOf, getSlot, setSlot, rank } from '../lib/suggest.js';
import { isFree, nameOf, norm } from '../lib/names.js';
import { weekSvg } from '../lib/preview.js';
import { ICONS } from '../lib/fonts.js';
import { fetchWeek, weekFromTemplate, blankTemplate, parseGuideText } from '../lib/wol.js';
import { fetchText, saveFile, isNative, isElectron } from '../lib/platform.js';
import { getTheme, setTheme, toggleTheme, isDark, applyTheme } from './theme.js';
import { encryptJson, decryptJson, hashPin, cleanCode } from '../lib/crypto.js';
import seedEnc from '../data/seed.enc.json';

const VERSION = '2.0.0';
const PINKEY = 'vym.pin';
const ui = {
  personFilter: 'all', personQuery: '', showPast: false, pickG: 'all',
  year: 0, monthSel: '', dl: { mode: 'month', month: '', from: '', to: '', fmt: 'pdf', picked: new Set() },
  syncAbort: false,
};

// ------------------------------------------------------------------ utilidades
const st = () => S.get();
const byId = () => S.peopleById();
const opts = () => ({ congregation: st().settings.congregation, startTime: st().settings.startTime });
const weekOf = (date) => st().weeks[date];
const fmtDay = (d) => parse(d).getUTCDate();
const monthAbbr = (d) => MESES[parse(d).getUTCMonth()].slice(0, 3);
const ic = (name, size = 20) => I[name].replace('<svg', `<svg width="${size}" height="${size}"`);
const SEC_COLOR = { t: 'var(--teal)', m: 'var(--gold)', v: 'var(--red)' };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* sin acceso */ } };

/** Todas las palabras escritas deben aparecer en el nombre (sin importar tildes ni orden). */
function matches(text, query) {
  const q = norm(query);
  if (!q) return true;
  const t = norm(text);
  return q.split(' ').every((w) => t.includes(w));
}

function progress(w) {
  if (w.noMeeting) return { done: 0, total: 0, pct: 100 };
  const sl = slotsOf(w);
  let done = 0;
  for (const s of sl) if (getSlot(w, s)) done++;
  return { done, total: sl.length, pct: sl.length ? Math.round((done / sl.length) * 100) : 0 };
}
function ring(pct, { cls = '', track = 'var(--line)', col = 'var(--ok)' } = {}) {
  return `<div class="ring ${cls}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="${track}" stroke-width="3.6"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="${col}" stroke-width="3.6" stroke-linecap="round" pathLength="100" stroke-dasharray="${pct} 100"/></svg><b>${pct}%</b></div>`;
}
function dots(w) {
  if (w.noMeeting) return '';
  const html = slotsOf(w).map((s) => {
    const sec = s.part != null ? w.parts[s.part].s : 'x';
    const f = getSlot(w, s) ? ' f' : '';
    const bg = f ? `background:${SEC_COLOR[sec] || 'var(--primary)'}` : '';
    return `<i class="${f}" style="${bg}"></i>`;
  }).join('');
  return `<div class="dots">${html}</div>`;
}

function weekChips(w) {
  if (w.noMeeting) return `<span class="chip gray">Sin reunión</span>`;
  const m = missingCount(w);
  let s = m === 0 ? `<span class="chip ok">${ic('check', 13)} Completo</span>` : `<span class="chip warn">Faltan ${m}</span>`;
  if (w.autoFilled) s += ` <span class="chip">✨ Sugerido</span>`;
  return s;
}

function lastLabel(date, last) {
  if (!last) return 'Nunca ha tenido esta parte';
  const wk = Math.round(Math.abs(diffDays(date, last)) / 7);
  if (wk === 0) return 'Esta misma semana';
  return `Última vez: hace ${wk} ${wk === 1 ? 'semana' : 'semanas'}`;
}

// ------------------------------------------------------------------ router
function route() {
  const h = (location.hash || '#/').replace(/^#/, '');
  const parts = h.split('/').filter(Boolean);
  if (!parts.length) return { name: 'programa' };
  if (parts[0] === 'semana' && parts[1]) return { name: 'semana', date: parts[1] };
  if (['personas', 'descargar', 'ajustes', 'ayuda'].includes(parts[0])) return { name: parts[0] };
  return { name: 'programa' };
}
const go = (h) => { location.hash = h; };

const NAV = [
  ['programa', 'Programa', I.cal, '#/'],
  ['personas', 'Personas', I.users, '#/personas'],
  ['descargar', 'Descargar', I.down, '#/descargar'],
  ['ayuda', 'Ayuda', I.help, '#/ayuda'],
  ['ajustes', 'Ajustes', I.gear, '#/ajustes'],
];
const MARK = '<span class="mark"><i></i><i></i><i></i></span>';
const themeIcon = () => (isDark() ? I.sun : I.moon);

function shell() {
  return `<div class="shell"><nav class="nav" aria-label="Menú principal"><div class="brand">${MARK} Programa VyM</div>${NAV.map(([k, label, icon, h]) =>
    `<button data-a="nav" data-h="${h}" aria-label="${label}">${icon}<span>${label}</span></button>`).join('')}
    <div class="navfoot"><button data-a="theme" aria-label="Cambiar entre modo claro y oscuro"><span class="ti">${themeIcon()}</span><span class="tl">${isDark() ? 'Modo claro' : 'Modo oscuro'}</span></button></div></nav>
    <main id="main"></main></div>`;
}
function topbar(extra = '') {
  return `<div class="topbar"><div class="logo">${MARK} Programa VyM</div><div class="sp"></div>${extra}<button class="themebtn" data-a="theme" aria-label="Cambiar entre modo claro y oscuro" title="Modo claro / oscuro">${themeIcon()}</button></div>`;
}

let lastKey = '';
function render(force = false) {
  const app = $('#app');
  if (!S.hasState()) return;
  const r = route();
  const key = r.name + '|' + (r.date || '');
  if (force || !$('#main')) app.innerHTML = shell();
  const main = $('#main');
  const y = window.scrollY;
  let html = '';
  switch (r.name) {
    case 'semana': html = viewSemana(r.date); break;
    case 'personas': html = viewPersonas(); break;
    case 'descargar': html = viewDescargar(); break;
    case 'ajustes': html = viewAjustes(); break;
    case 'ayuda': html = viewAyuda(); break;
    default: html = viewPrograma();
  }
  main.innerHTML = topbar() + html;
  if (lastKey === key) window.scrollTo(0, y); else window.scrollTo(0, 0);
  lastKey = key;
  const active = r.name === 'semana' ? 'programa' : r.name;
  $$('.nav > button').forEach((b, i) => b.classList.toggle('on', NAV[i][0] === active));
  $$('[data-a="theme"]').forEach((b) => {
    const t = b.querySelector('.ti'); if (t) { t.innerHTML = themeIcon(); b.querySelector('.tl').textContent = isDark() ? 'Modo claro' : 'Modo oscuro'; } else b.innerHTML = themeIcon();
  });
}


// ------------------------------------------------------------------ PROGRAMA
function weekCard(w, nowMon) {
  const past = w.date < nowMon;
  const p = progress(w);
  const cls = w.noMeeting ? '' : p.pct === 100 ? 'done' : 'todo';
  return `<button class="week ${cls} ${past ? 'past' : ''} ${w.date === nowMon ? 'now' : ''}" data-a="openWeek" data-date="${w.date}">
    <div class="date"><b>${fmtDay(w.date)}</b><span>${monthAbbr(w.date)}</span></div>
    <div class="body"><div class="t">${esc(w.noMeeting ? w.noMeeting : w.reading || 'Semana sin lectura')}</div>
    <div class="small muted">${esc(weekShort(w.date))}</div><div style="margin-top:6px">${weekChips(w)}</div>${dots(w)}</div>
    <span class="go">${ic('right')}</span></button>`;
}

function mondaysIn(y, m) {
  let n = 0;
  for (let d = new Date(Date.UTC(y, m, 1)); d.getUTCMonth() === m; d.setUTCDate(d.getUTCDate() + 1)) if (d.getUTCDay() === 1) n++;
  return n;
}

function viewPrograma() {
  const weeks = S.sortedWeeks();
  const nowMon = mondayOf(todayStr());
  const next = weeks.find((w) => w.date >= nowMon && !w.noMeeting) || null;
  const last = weeks.length ? weeks[weeks.length - 1] : null;
  const nowKey = nowMon.slice(0, 7);
  if (!ui.year) ui.year = Number((next ? next.date : last ? last.date : nowMon).slice(0, 4));
  if (!ui.monthSel) ui.monthSel = next ? monthKey(next.date) : last ? monthKey(last.date) : nowKey;
  const pendientes = weeks.filter((w) => w.date >= nowMon && !w.noMeeting && missingCount(w) > 0).length;

  let h = `<div class="pagehead"><div><h1>Programa</h1><div class="sub">${esc(st().settings.congregation)}</div></div></div>`;

  // --- próxima reunión
  if (next) {
    const p = progress(next);
    const secs = ['t', 'm', 'v'].map((k) => `<i style="flex:${Math.max(1, next.parts.filter((x) => x.s === k).length)};background:${k === 't' ? '#54d3cf' : k === 'm' ? '#ffc857' : '#ff7b72'}"></i>`).join('');
    const dw = Math.round(diffDays(next.date, nowMon) / 7);
    h += `<div class="hero"><div class="lab">${dw === 0 ? 'Esta semana' : dw === 1 ? 'Próxima semana' : 'Próxima reunión · en ' + dw + ' semanas'}</div>
      <div class="when"><div class="bigdate">${fmtDay(next.date)}–${fmtDay(addDays(next.date, 6))}<small>${esc(MESES[parse(next.date).getUTCMonth()])} ${next.date.slice(0, 4)}</small></div>${ring(p.pct, { track: 'rgba(255,255,255,.25)', col: '#fff' })}</div>
      <div class="reading">${esc(next.reading || 'Sin lectura')}</div>
      <div class="secbar">${secs}</div>
      <div class="row wrap"><button class="btn grow" data-a="openWeek" data-date="${next.date}">${ic('pencil')} ${p.pct === 100 ? 'Ver semana' : 'Completar asignaciones'}</button>
      <button class="btn ghost" data-a="dlWeek" data-date="${next.date}">${ic('down')} Descargar</button></div></div>`;
  } else {
    h += `<div class="hero"><div class="lab">Bienvenido</div><div class="reading" style="font-size:22px;margin-top:8px">Aún no hay semanas por delante</div><p style="opacity:.9;margin:8px 0 16px">Toca «Traer semanas» y la app las busca por ti.</p><button class="btn" data-a="sync">${ic('refresh')} Traer semanas</button></div>`;
  }
  if (pendientes) h += `<div class="warnbox" style="margin-top:12px">Hay <b>${pendientes}</b> ${pendientes === 1 ? 'semana' : 'semanas'} con asignaciones pendientes.</div>`;

  // --- actualizar
  h += `<div class="sec-title">Actualizar el programa</div><div class="card updcard">
    <h2>${last ? 'Programado hasta el ' + esc(longDate(addDays(last.date, 6))) : 'Sin semanas todavía'}</h2>
    <div class="small muted" style="margin-top:4px">${last ? 'Siguiente semana por traer: <b>' + esc(weekShort(addDays(last.date, 7))) + ' ' + addDays(last.date, 7).slice(0, 4) + '</b>' : 'Empieza trayendo las semanas desde jw.org.'}${st().settings.lastCheck ? ' · Última búsqueda: ' + esc(st().settings.lastCheck) : ''}</div>
    <div class="steps3"><div><b>1</b>Tocas el botón</div><div><b>2</b>La app lee jw.org</div><div><b>3</b>Tú revisas lo sugerido</div></div>
    <button class="btn primary big block" data-a="sync">${ic('refresh')} Traer semanas nuevas</button>
    <div class="small muted" style="margin-top:10px">jw.org publica los programas con meses de anticipación. Si aún no está el siguiente, la app te lo avisa y vuelve a intentarlo sola cada día. <a href="#" data-a="addWeek" style="color:var(--primary);font-weight:700">Agregar una semana a mano</a></div></div>`;

  // --- el año
  const monthsRows = [];
  for (let m = 0; m < 12; m++) {
    const mk = `${ui.year}-${String(m + 1).padStart(2, '0')}`;
    const ws = weeks.filter((w) => monthKey(w.date) === mk);
    const exp = mondaysIn(ui.year, m);
    const complete = ws.length > 0 && ws.every((w) => w.noMeeting || missingCount(w) === 0);
    const cls = ws.length === 0 ? 'empty' : complete && ws.length >= exp ? '' : 'part';
    monthsRows.push(`<button class="mtile ${cls} ${ui.monthSel === mk ? 'on' : ''} ${mk === nowKey ? 'cur' : ''}" data-a="month" data-mk="${mk}"><b>${MESES[m].slice(0, 3)}</b><div class="mb"><i style="width:${Math.min(100, Math.round((ws.length / exp) * 100))}%"></i></div></button>`);
  }
  h += `<div class="yearhead"><b>${ui.year}</b><div class="row"><button class="iconbtn" data-a="year" data-d="-1" aria-label="Año anterior">${I.left}</button><button class="iconbtn" data-a="year" data-d="1" aria-label="Año siguiente">${I.right}</button></div></div>
    <div class="months">${monthsRows.join('')}</div>
    <div class="small muted" style="margin:8px 2px 0">Barra completa = todas las semanas del mes cargadas · verde = asignaciones completas · naranja = faltan datos · punteado = sin cargar.</div>`;

  // --- semanas del mes
  const sel = weeks.filter((w) => monthKey(w.date) === ui.monthSel);
  h += `<div class="sec-title">${esc(monthLabel(ui.monthSel))}</div>`;
  if (!weeks.length) h += `<div class="empty"><b>Aún no hay semanas</b>Toca «Traer semanas nuevas» para empezar.</div>`;
  else if (!sel.length) h += `<div class="card pad stack"><b>Este mes todavía no está cargado.</b><div class="row wrap"><button class="btn primary grow" data-a="sync">${ic('refresh')} Buscar en jw.org</button><button class="btn grow" data-a="blankMonth" data-mk="${ui.monthSel}">Crear semanas en blanco</button></div></div>`;
  else h += `<div class="weeks">${sel.map((w) => weekCard(w, nowMon)).join('')}</div>`;
  return h;
}

// ------------------------------------------------------------------ SEMANA (editor)
const SEC_INFO = { t: ['Tesoros de la Biblia', 'tesoros'], m: ['Seamos mejores maestros', 'maestros'], v: ['Nuestra vida cristiana', 'vida'] };

function personBtn(label, key, id, people) {
  const n = nameOf(id, people);
  const p = id && !isFree(id) ? people[id] : null;
  return `<button class="fieldbtn ${n ? '' : 'empty'}" data-a="pick" data-slot="${key}">
    <span class="avatar ${p && p.g === 'M' ? 'f' : ''} ${n ? '' : 'q'}">${n ? esc(initials(n)) : '+'}</span>
    <span class="grow"><span class="l">${esc(label)}</span><span class="v">${n ? esc(n) : 'Toca para elegir…'}</span></span>
    <span class="chev">${ic('right', 18)}</span></button>`;
}

function slotLabels(w) {
  const m = { president: 'Presidente', prayerOpen: 'Oración inicial', prayerClose: 'Oración final' };
  w.parts.forEach((p, i) => {
    if (p.k === 'pair') { m[`p${i}.0`] = 'Estudiante'; m[`p${i}.1`] = 'Ayudante'; }
    else if (p.k === 'study') { m[`p${i}.0`] = 'Conductor'; m[`p${i}.1`] = 'Lector'; }
    else m[`p${i}.0`] = 'Asignado a';
  });
  return m;
}
const songBox = (label, k, v) => `<div class="songrow"><span class="note">♪</span><label class="lbl" style="margin:0" for="s_${k}">${label}</label><span class="grow"></span><input id="s_${k}" type="number" inputmode="numeric" data-c="song" data-k="${k}" value="${esc(v)}" placeholder="N.º"></div>`;

function viewSemana(date) {
  const w = weekOf(date);
  if (!w) return `<div class="empty"><b>No encontré esa semana</b><button class="btn primary" data-a="nav" data-h="#/">Volver al programa</button></div>`;
  const people = byId();
  const all = S.sortedWeeks();
  const idx = all.findIndex((x) => x.date === date);
  const prev = all[idx - 1], next = all[idx + 1];
  const p = progress(w);
  let h = `<div class="weekhead"><div class="top">
      <button class="iconbtn" data-a="nav" data-h="#/" aria-label="Volver al programa" title="Volver al programa">${I.cal}</button>
      <div class="ttl">${esc(weekShort(date))} ${date.slice(0, 4)}</div>
      <button class="iconbtn" ${prev ? `data-a="openWeek" data-date="${prev.date}"` : 'disabled'} aria-label="Semana anterior" title="Semana anterior">${I.left}</button>
      <button class="iconbtn" ${next ? `data-a="openWeek" data-date="${next.date}"` : 'disabled'} aria-label="Semana siguiente" title="Semana siguiente">${I.right}</button></div>
    <div class="mid"><div><div class="rd">${esc(w.noMeeting ? 'Sin reunión' : w.reading || 'Sin lectura')}</div><div class="small" style="opacity:.85;margin-top:4px">${w.noMeeting ? esc(w.noMeeting) : `${p.done} de ${p.total} asignaciones`}${w.note ? ' · ' + esc(w.note) : ''}</div></div>${w.noMeeting ? '' : ring(p.pct, { track: 'rgba(255,255,255,.25)', col: '#fff' })}</div></div>
  <div class="toolbar">
    <button class="btn primary" data-a="suggest" data-date="${date}">${I.wand} Sugerir asignaciones automáticamente</button>
    <button class="btn" data-a="preview" data-date="${date}">${I.eye} Vista previa</button>
    <button class="btn" data-a="dlWeek" data-date="${date}">${I.down} Descargar</button>
    <button class="iconbtn" data-a="weekMenu" data-date="${date}" aria-label="Más opciones">${I.more}</button>
  </div>`;
  if (w.noMeeting) {
    return h + `<div class="card pad stack"><b>Esta semana no hay reunión</b>
    <div class="field-g"><label class="lbl">Motivo (aparece en la hoja)</label><input type="text" data-c="noMeeting" value="${esc(w.noMeeting)}"></div>
    <button class="btn" data-a="toggleNoMeeting" data-date="${date}">Sí hay reunión esta semana</button></div>`;
  }
  const L = slotLabels(w);
  h += `<div class="card pad stack">
    <div class="field-g" style="margin:0"><label class="lbl">Lectura de la semana</label><input type="text" data-c="reading" value="${esc(w.reading)}" placeholder="Ej.: EZEQUIEL 9, 10"></div>
    ${songBox('Canción inicial', 'songOpen', w.songOpen)}
    ${personBtn(L.prayerOpen, 'prayerOpen', w.prayerOpen, people)}
    ${personBtn(L.president, 'president', w.president, people)}
  </div>`;
  for (const key of ['t', 'm', 'v']) {
    const parts = w.parts.map((x, i) => [x, i]).filter(([x]) => x.s === key);
    h += `<div class="banner ${key}"><img src="${ICONS[SEC_INFO[key][1]]}" alt=""><span>${SEC_INFO[key][0].toUpperCase()}</span></div><div class="sectbody">`;
    if (key === 'v') h += songBox('Canción (en medio)', 'songMid', w.songMid);
    for (const [pt, i] of parts) {
      h += `<div class="part ${pt.s}">
        <div class="ph"><span class="num">${i + 1}</span>
          <div class="grow stack" style="margin-top:0">
            <textarea rows="2" class="ptitle" data-c="ptitle" data-i="${i}" placeholder="Título de la parte" aria-label="Título">${esc(pt.title)}</textarea>
            ${pt.k === 'lectura' ? `<input type="text" data-c="pref" data-i="${i}" value="${esc(pt.ref)}" placeholder="Pasaje (ej.: Ezequiel 9:1-11)" aria-label="Pasaje">` : ''}
            ${pt.k === 'study' ? `<input type="text" data-c="pref" data-i="${i}" value="${esc(pt.ref)}" placeholder="Material (ej.: wcg cap. 23)" aria-label="Material">` : ''}
          </div></div>
        <div class="pmeta"><label class="small muted" for="pm${i}">Duración</label><input id="pm${i}" type="number" inputmode="numeric" class="mins" data-c="pmins" data-i="${i}" value="${esc(pt.mins)}" aria-label="Minutos"><span class="small muted">min.</span>
          <span class="grow"></span><button class="iconbtn" style="width:40px;height:40px" data-a="delPart" data-i="${i}" aria-label="Quitar parte">${I.trash}</button></div>
        <div class="${pt.k === 'pair' || pt.k === 'study' ? 'two' : ''}">
          ${personBtn(L[`p${i}.0`], `p${i}.0`, (pt.a || [])[0], people)}
          ${pt.k === 'pair' || pt.k === 'study' ? personBtn(L[`p${i}.1`], `p${i}.1`, (pt.a || [])[1], people) : ''}
        </div></div>`;
    }
    h += `<div class="addpart"><button class="btn sm" data-a="addPart" data-s="${key}">${ic('plus', 16)} Agregar parte</button></div></div>`;
  }
  h += `<div class="sec-title">Cierre</div><div class="card pad stack">
    ${songBox('Canción final', 'songClose', w.songClose)}
    ${personBtn(L.prayerClose, 'prayerClose', w.prayerClose, people)}</div>`;
  h += `<div class="toolbar" style="margin-top:18px"><button class="btn primary" data-a="preview" data-date="${date}">${I.eye} Vista previa</button><button class="btn" data-a="dlWeek" data-date="${date}">${I.down} Descargar esta semana</button></div>`;
  return h;
}

function mutWeek(date, fn, { manual = false } = {}) {
  S.update((s) => {
    const w = s.weeks[date];
    if (!w) return;
    fn(w, s);
    if (manual) w.autoFilled = false;
  });
}

// ---- selector de personas
function openPicker(date, key, query = '') {
  const w = weekOf(date);
  const slot = slotsOf(w).find((s) => s.key === key);
  if (!slot) return;
  const labels = slotLabels(w);
  const cur = getSlot(w, slot);
  ui.pickG = 'all';
  const html = `<div class="pickhead"><div class="head"><h2>${esc(labels[key])}</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
    <input type="search" id="pq" data-c="pickq" placeholder="Buscar por nombre o apellido…" value="${esc(query)}" autocomplete="off" enterkeyhint="search">
    <div class="pills" style="margin-top:8px" id="pgpills">${[['all', 'Todos'], ['H', 'Hermanos'], ['M', 'Hermanas']].map(([k, l]) => `<button class="pill ${k === 'all' ? 'on' : ''}" data-a="pickG" data-g="${k}">${l}</button>`).join('')}</div></div>
    <div id="plist" class="plist"></div>
    <hr class="s">
    <div class="row wrap"><button class="btn" data-a="pickFree" data-date="${date}" data-slot="${key}">${ic('pencil', 18)} Escribir otro nombre…</button>
    ${cur ? `<button class="btn danger" data-a="pickClear" data-date="${date}" data-slot="${key}">Quitar a esta persona</button>` : ''}</div>`;
  const el = openModal(html);
  const sheet = el.querySelector('.sheet');
  sheet.dataset.date = date; sheet.dataset.slot = key;
  fillPickList(date, key, query);
  const q = $('#pq'); if (q && window.innerWidth > 700) q.focus();
}

function fillPickList(date, key, query) {
  const w = weekOf(date);
  const slot = w && slotsOf(w).find((s) => s.key === key);
  const box = $('#plist');
  if (!slot || !box) return;
  const q = norm(query);
  const people = S.get().people;
  const ranked = rank(people, slot.role, date, S.sortedWeeks(), w, { slot });
  const cur = getSlot(w, slot);
  let shownOk = 0;
  const item = (r) => {
    const p = r.p;
    const tags = [];
    if (r.ok && !r.off && r.busy === 0 && shownOk < 3 && !q) tags.push('<span class="chip ok">Sugerido</span>');
    if (r.busy) tags.push('<span class="chip warn">Ya tiene parte</span>');
    if (r.off) tags.push('<span class="chip red">No disponible</span>');
    if (cur === p.id) tags.push('<span class="chip">Elegido</span>');
    if (r.ok && !r.off && r.busy === 0) shownOk++;
    return `<button class="pitem ${r.ok ? '' : 'dim'} ${cur === p.id ? 'sel' : ''}" data-a="pickSet" data-date="${date}" data-slot="${key}" data-id="${p.id}">
      <span class="avatar ${p.g === 'M' ? 'f' : ''}">${esc(initials(p.display || p.name))}</span>
      <span class="grow"><div class="n">${esc(p.display || p.name)}</div><div class="s">${r.ok ? esc(lastLabel(date, r.last)) : 'No tiene esta parte activada'}${p.group ? ' · Grupo ' + p.group : ''}</div></span>
      <span class="tags">${tags.join('')}</span></button>`;
  };
  const list = ranked.filter((r) => (ui.pickG === 'all' || r.p.g === ui.pickG) && matches(p2s(r.p), query));
  const ok = list.filter((r) => r.ok);
  const other = list.filter((r) => !r.ok);
  let h = ok.map(item).join('');
  if (!ok.length) h += `<div class="empty small">${q ? 'Nadie con ese nombre tiene activada esta parte.' : 'Nadie tiene activada esta parte.'} Puedes activarla en «Personas».</div>`;
  if (other.length) h += `<div class="sec-title" style="margin-top:14px">Otras personas (no tienen esta parte activada)</div>` + other.slice(0, q ? 60 : 12).map(item).join('') + (!q && other.length > 12 ? `<div class="small muted" style="padding:6px">Escribe un nombre para ver al resto…</div>` : '');
  box.innerHTML = h;
}
const p2s = (p) => `${p.name} ${p.display}`;


// ------------------------------------------------------------------ PERSONAS
function privTxt(p) {
  const r = [];
  if (p.gr === 'S') r.push('Superintendente de grupo');
  if (p.gr === 'A') r.push('Auxiliar de grupo');
  return r.join(' · ');
}
function filteredPeople() {
  const f = ui.personFilter;
  let list = st().people.slice();
  if (f === 'H') list = list.filter((p) => p.g === 'H');
  if (f === 'M') list = list.filter((p) => p.g === 'M');
  if (f === 'off') list = list.filter((p) => p.active === false);
  if (/^g\d$/.test(f)) list = list.filter((p) => String(p.group) === f.slice(1));
  list = list.filter((p) => matches(p2s(p), ui.personQuery));
  list.sort((a, b) => (a.display || a.name).localeCompare(b.display || b.name, 'es'));
  return list;
}
function viewPersonas() {
  const f = ui.personFilter;
  const total = st().people.length;
  const list = filteredPeople();
  const groups = [...new Set(st().people.map((p) => p.group).filter(Boolean))].sort((a, b) => a - b);
  return `<div class="pagehead"><div><h1>Personas</h1><div class="sub">${total} integrantes de la congregación</div></div>
    <button class="btn sm" data-a="bulkAdd">${I.users.replace('<svg', '<svg width="16" height="16"')} Varias</button></div>
    <input type="search" data-c="personq" placeholder="Buscar persona…" value="${esc(ui.personQuery)}" autocomplete="off" id="personq">
    <div class="pills" style="margin-top:10px">${[['all', 'Todos'], ['H', 'Hermanos'], ['M', 'Hermanas'], ...groups.map((g) => ['g' + g, 'Grupo ' + g]), ['off', 'Inactivos']].map(([k, l]) => `<button class="pill ${f === k ? 'on' : ''}" data-a="pfilter" data-k="${k}">${l}</button>`).join('')}</div>
    <div id="plistp" class="plist">${personRows(list)}</div>
    <button class="btn primary big fab" data-a="addPerson">${I.plus} Agregar persona</button>`;
}
function personRows(list) {
  if (!list.length) return `<div class="empty"><b>No hay resultados</b>Prueba con otro nombre o solo el apellido.</div>`;
  const caps = (p) => (p.caps || []).length;
  return list.map((p) => `<button class="pitem ${p.active === false ? 'dim' : ''}" data-a="editPerson" data-id="${p.id}">
    <span class="avatar ${p.g === 'M' ? 'f' : ''}">${esc(initials(p.display || p.name))}</span>
    <span class="grow"><div class="n">${esc(p.display || p.name)}</div>
    <div class="s">${p.g === 'M' ? 'Hermana' : 'Hermano'}${p.group ? ' · Grupo ' + p.group : ''}${privTxt(p) ? ' · ' + privTxt(p) : ''}</div></span>
    <span class="tags">${p.active === false ? '<span class="chip gray">Inactivo</span>' : ''}<span class="small muted">${caps(p)} ${caps(p) === 1 ? 'parte' : 'partes'}</span></span></button>`).join('');
}

function personForm(p, isNew) {
  const v = (k) => esc(p[k] ?? '');
  return `<div class="head"><h2>${isNew ? 'Agregar persona' : 'Editar persona'}</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
  <div class="stack" id="pform" data-id="${p.id}" data-new="${isNew ? 1 : 0}">
    <div class="field-g"><label class="lbl">Nombre completo</label><input type="text" id="f_name" value="${v('name')}" autocomplete="off"></div>
    <div class="field-g"><label class="lbl">Cómo aparece en el programa impreso</label><input type="text" id="f_display" value="${v('display')}" placeholder="Ej.: Luis A. López" autocomplete="off"></div>
    <div class="field-g"><label class="lbl">Es…</label><div class="seg" id="f_g"><button type="button" data-a="segG" data-g="H" class="${p.g === 'H' ? 'on' : ''}">Hermano</button><button type="button" data-a="segG" data-g="M" class="${p.g === 'M' ? 'on' : ''}">Hermana</button></div></div>
    <div class="row"><div class="grow field-g"><label class="lbl">Grupo de predicación</label><select id="f_group">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => `<option value="${g}" ${Number(p.group) === g ? 'selected' : ''}>${g ? 'Grupo ' + g : 'Sin grupo'}</option>`).join('')}</select></div></div>
    <label class="switch"><span><b>Disponible para recibir partes</b><div class="small muted">Si lo desactivas, no se le sugerirán partes.</div></span><input type="checkbox" id="f_active" ${p.active !== false ? 'checked' : ''}></label>
    <div><label class="lbl">Partes que puede recibir</label>
      <div class="row wrap" style="margin-bottom:8px"><button class="btn sm" type="button" data-a="presetCaps" data-k="publicador">Publicador</button><button class="btn sm" type="button" data-a="presetCaps" data-k="siervo">Siervo ministerial</button><button class="btn sm" type="button" data-a="presetCaps" data-k="anciano">Anciano</button></div>
      <div class="checks" id="f_caps">${S.CAPS.map(([k, l]) => `<label class="check"><input type="checkbox" value="${k}" ${(p.caps || []).includes(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div></div>
    <div class="field-g"><label class="lbl">Fechas en que NO está disponible</label><div id="f_unavail">${unavailRows(p)}</div>
      <div class="row" style="margin-top:6px"><input type="date" id="f_ufrom"><span>a</span><input type="date" id="f_uto"><button class="btn sm" type="button" data-a="addUnavail">Agregar</button></div></div>
    <div class="field-g"><label class="lbl">Notas</label><input type="text" id="f_note" value="${v('note')}"></div>
    <div class="row wrap"><button class="btn primary grow" data-a="savePerson">Guardar</button>${isNew ? '' : `<button class="btn danger" data-a="delPerson" data-id="${p.id}">Eliminar</button>`}</div>
  </div>`;
}
let editingUnavail = [];
function unavailRows(p) {
  const list = editingUnavail;
  if (!list.length) return `<div class="small muted">Sin fechas bloqueadas.</div>`;
  return list.map((r, i) => `<div class="row" style="margin:4px 0"><span class="chip red">${esc(r.from)} → ${esc(r.to)}</span><button class="iconbtn" style="width:34px;height:34px" type="button" data-a="delUnavail" data-i="${i}" aria-label="Quitar">${I.x}</button></div>`).join('');
}


// ------------------------------------------------------------------ DESCARGAR
function viewDescargar() {
  const weeks = S.sortedWeeks();
  if (!weeks.length) return `<div class="pagehead"><h1>Descargar</h1></div><div class="empty"><b>Aún no hay semanas</b>Primero agrega semanas en «Programa».</div>`;
  const months = [...new Set(weeks.map((w) => monthKey(w.date)))];
  const d = ui.dl;
  const nowMon = mondayOf(todayStr());
  if (!d.month || !months.includes(d.month)) d.month = months.find((m) => m >= nowMon.slice(0, 7)) || months[months.length - 1];
  if (!d.from || !weeks.find((w) => w.date === d.from)) d.from = (weeks.find((w) => w.date >= nowMon) || weeks[0]).date;
  if (!d.to || !weeks.find((w) => w.date === d.to)) d.to = weeks[weeks.length - 1].date;
  const sel = selectedWeeks();
  const pend = sel.filter((w) => !w.noMeeting && missingCount(w) > 0);
  const wlabel = (w) => `${weekShort(w.date)} ${w.date.slice(0, 4)}`;
  let pick = '';
  if (d.mode === 'month') pick = `<select data-c="dlMonth" aria-label="Mes">${months.map((m) => `<option value="${m}" ${m === d.month ? 'selected' : ''}>${esc(monthLabel(m))}</option>`).join('')}</select>`;
  else if (d.mode === 'range') pick = `<div class="row"><div class="grow"><label class="lbl">Desde</label><select data-c="dlFrom">${weeks.map((w) => `<option value="${w.date}" ${w.date === d.from ? 'selected' : ''}>${esc(wlabel(w))}</option>`).join('')}</select></div>
      <div class="grow"><label class="lbl">Hasta</label><select data-c="dlTo">${weeks.map((w) => `<option value="${w.date}" ${w.date === d.to ? 'selected' : ''}>${esc(wlabel(w))}</option>`).join('')}</select></div></div>`;
  else pick = `<div class="row wrap"><button class="btn sm" data-a="dlPickN" data-n="4">Próximas 4</button><button class="btn sm" data-a="dlPickN" data-n="12">Próximas 12</button><button class="btn sm" data-a="dlPickN" data-n="999">Todas</button><button class="btn sm" data-a="dlPickN" data-n="0">Ninguna</button></div>
      <div class="pickweeks">${weeks.map((w) => `<button class="wcheck ${d.picked.has(w.date) ? 'on' : ''}" data-a="dlToggle" data-date="${w.date}"><input type="checkbox" tabindex="-1" ${d.picked.has(w.date) ? 'checked' : ''}><span class="grow"><b>${esc(wlabel(w))}</b><div class="small muted">${esc(w.noMeeting || w.reading || '')}</div></span>${w.noMeeting ? '<span class="chip gray">Sin reunión</span>' : missingCount(w) ? `<span class="chip warn">Faltan ${missingCount(w)}</span>` : '<span class="chip ok">Completo</span>'}</button>`).join('')}</div>`;
  return `<div class="pagehead"><div><h1>Descargar</h1><div class="sub">El archivo sale con el mismo diseño del programa.</div></div></div>
  <div class="card pad stack">
    <div><label class="lbl">1 · ¿Qué semanas quieres?</label><div class="seg"><button data-a="dlMode" data-m="month" class="${d.mode === 'month' ? 'on' : ''}">Un mes</button><button data-a="dlMode" data-m="range" class="${d.mode === 'range' ? 'on' : ''}">Seguidas</button><button data-a="dlMode" data-m="pick" class="${d.mode === 'pick' ? 'on' : ''}">Elegir</button></div></div>
    ${pick}
    <div><label class="lbl">2 · ¿En qué formato?</label><div class="fmtcards">
      <button class="fmtcard ${d.fmt === 'pdf' ? 'on' : ''}" data-a="dlFmt" data-f="pdf"><span class="ficon pdf">PDF</span><b>PDF</b><span class="small muted">Para imprimir o enviar</span></button>
      <button class="fmtcard ${d.fmt === 'docx' ? 'on' : ''}" data-a="dlFmt" data-f="docx"><span class="ficon doc">DOC</span><b>Word</b><span class="small muted">Para seguir editando</span></button></div></div>
    <div class="sumbox"><b>${sel.length}</b><span>${sel.length === 1 ? 'semana' : 'semanas'} · una por página${sel.length ? '' : ' · elige al menos una'}</span></div>
    ${pend.length ? `<div class="warnbox">${pend.length === 1 ? 'Una semana tiene' : pend.length + ' semanas tienen'} asignaciones sin completar (${pend.slice(0, 6).map((w) => weekShort(w.date)).join(', ')}${pend.length > 6 ? '…' : ''}). Saldrán con espacios en blanco.</div>` : ''}
    <button class="btn primary big block" data-a="dlGo" ${sel.length ? '' : 'disabled'}>${ic('down')} Descargar ${d.fmt === 'pdf' ? 'PDF' : 'Word'}</button>
  </div>
  ${sel.length ? `<div class="sec-title">Vista previa (toca una para ampliar)</div><div class="thumbs">${sel.slice(0, 12).map((w) => `<button class="pv" data-a="preview" data-date="${w.date}" style="border:0;padding:0;cursor:pointer" aria-label="Ver ${esc(weekShort(w.date))}">${weekSvg(w, byId(), opts())}</button>`).join('')}</div>${sel.length > 12 ? `<div class="small muted">…y ${sel.length - 12} más.</div>` : ''}` : ''}`;
}
function selectedWeeks() {
  const d = ui.dl;
  const weeks = S.sortedWeeks();
  if (d.mode === 'month') return weeks.filter((w) => monthKey(w.date) === d.month);
  if (d.mode === 'pick') return weeks.filter((w) => d.picked.has(w.date));
  const a = d.from <= d.to ? d.from : d.to, b = d.from <= d.to ? d.to : d.from;
  return weeks.filter((w) => w.date >= a && w.date <= b);
}

async function doDownload(weeks, fmt, name) {
  const t = toast.bind(null);
  try {
    toast('Preparando el archivo…', 2000);
    const people = byId();
    let blob, file;
    if (fmt === 'pdf') {
      const { pdfBlob } = await import('../lib/pdf.js');
      blob = pdfBlob(weeks, people, opts());
      file = name + '.pdf';
    } else {
      const { docxBlob } = await import('../lib/word.js');
      blob = await docxBlob(weeks, people, opts());
      file = name + '.docx';
    }
    const msg = await saveFile(blob, file);
    toast(msg, 4500);
  } catch (e) {
    console.error(e);
    toast('No se pudo crear el archivo: ' + (e.message || e), 6000);
  }
}
function fileName(weeks) {
  if (weeks.length === 1) return 'Programa ' + weekShort(weeks[0].date).replace(/[–]/g, '-') + ' ' + weeks[0].date.slice(0, 4);
  const d = ui.dl;
  if (d.mode === 'month') return 'Programa ' + monthLabel(d.month);
  return `Programa ${weeks[0].date} a ${weeks[weeks.length - 1].date}`;
}


// ------------------------------------------------------------------ AJUSTES
function viewAjustes() {
  const s = st().settings;
  const plat = isElectron() ? 'Instalador de Windows' : isNative() ? 'App móvil' : 'Navegador';
  const th = getTheme();
  const hasPin = !!lsGet(PINKEY);
  return `<div class="pagehead"><div><h1>Ajustes</h1></div></div>
  <div class="sec-title" style="margin-top:6px">Apariencia</div>
  <div class="card pad"><div class="seg" role="group" aria-label="Tema">
    <button data-a="setTheme" data-t="light" class="${th === 'light' ? 'on' : ''}">${I.sun} Claro</button>
    <button data-a="setTheme" data-t="dark" class="${th === 'dark' ? 'on' : ''}">${I.moon} Oscuro</button>
    <button data-a="setTheme" data-t="auto" class="${th === 'auto' ? 'on' : ''}">${I.monitor} Automático</button></div>
    <div class="small muted" style="margin-top:8px">«Automático» sigue la configuración de tu teléfono o computadora.</div></div>
  <div class="sec-title">Seguridad</div>
  <div class="card pad stack">
    <div class="row"><span class="avatar">${I.shield}</span><div class="grow"><b>PIN de la aplicación</b><div class="small muted">${hasPin ? 'Activado: se pide al abrir la app y después de un rato inactiva.' : 'Pide un PIN cada vez que se abre la app en este dispositivo.'}</div></div></div>
    <div class="row wrap">${hasPin ? `<button class="btn grow" data-a="pinSet">Cambiar PIN</button><button class="btn grow" data-a="lockNow">${I.lock} Bloquear ahora</button><button class="btn danger" data-a="pinOff">Quitar</button>` : `<button class="btn primary grow" data-a="pinSet">${I.lock} Crear PIN</button>`}</div>
    <div class="infobox small">Los datos de la congregación viajan <b>cifrados</b> dentro de la app y solo se abren con el <b>código de la congregación</b>. Quien tenga el enlace sin el código no ve nada, y tus cambios se guardan solo en este dispositivo.</div>
  </div>
  <div class="sec-title">Congregación</div>
  <div class="card pad stack">
    <div class="field-g"><label class="lbl">Nombre (sale en el encabezado)</label><input type="text" data-c="set" data-k="congregation" value="${esc(s.congregation)}"></div>
    <div class="field-g"><label class="lbl">Hora de inicio de la reunión</label><input type="time" data-c="set" data-k="startTime" value="${esc(s.startTime)}"></div>
    <label class="switch"><span><b>Proponer asignaciones al traer semanas</b><div class="small muted">Reparte las partes según quién lleva más tiempo sin tenerlas.</div></span><input type="checkbox" data-c="setb" data-k="autoSuggest" ${s.autoSuggest ? 'checked' : ''}></label>
    <label class="switch"><span><b>Buscar semanas nuevas al abrir la app</b><div class="small muted">Una vez al día, si hay internet.</div></span><input type="checkbox" data-c="setb" data-k="autoCheck" ${s.autoCheck ? 'checked' : ''}></label>
  </div>
  <div class="sec-title">Copia de seguridad</div>
  <div class="card pad stack">
    <div class="small muted">Tus datos se guardan solo en este dispositivo. Guarda una copia para pasarlos a otro equipo o por si cambias de celular.</div>
    <div class="row wrap"><button class="btn grow" data-a="backup">${I.down} Guardar copia</button><button class="btn grow" data-a="restore">Restaurar copia</button></div>
    <input type="file" id="restoreFile" accept=".json,application/json" class="hidden">
  </div>
  <div class="sec-title">Traer una semana pegando el texto</div>
  <div class="card pad stack"><div class="small muted">Si no hay internet o el sitio no responde: copia la guía de actividades de la semana desde wol.jw.org y pégala aquí.</div>
    <button class="btn" data-a="pasteGuide">${I.doc} Pegar guía de actividades</button></div>
  <div class="sec-title">Datos</div>
  <div class="card pad stack">
    <button class="btn" data-a="reloadSeed">Volver a cargar los datos de la congregación (pide el código)</button>
    <button class="btn danger" data-a="clearWeeks">Borrar todas las semanas</button>
  </div>
  <div class="small muted" style="text-align:center;margin:22px 0">Programa VyM ${VERSION} · ${plat}</div>`;
}

// ------------------------------------------------------------------ AYUDA
function viewAyuda() {
  const step = (n, t, p) => `<div class="card helpcard"><span class="n">${n}</span><div><h3>${t}</h3><p>${p}</p></div></div>`;
  return `<div class="pagehead"><div><h1>Ayuda</h1><div class="sub">Lo básico en 5 pasos</div></div></div>
  <div class="helpgrid">
    ${step(1, 'Trae las semanas', 'En <b>Programa</b> toca <b>Traer semanas nuevas</b>. La app lee jw.org y crea las semanas que ya estén publicadas, con los títulos y los tiempos. Se repite sola cada día.')}
    ${step(2, 'Deja que sugiera', 'Dentro de una semana toca <b>Sugerir asignaciones</b>: reparte las partes según quién lleva más tiempo sin tenerlas y evita repetir a alguien en la misma semana.')}
    ${step(3, 'Cambia lo que quieras', 'Toca cualquier recuadro con un nombre para elegir a otra persona. Escribe en el buscador parte del nombre o del apellido para encontrarla rápido.')}
    ${step(4, 'Mira cómo queda', 'Toca <b>Vista previa</b>: es la hoja idéntica al programa original, tal como saldrá impresa.')}
    ${step(5, 'Descarga', 'En <b>Descargar</b> elige un mes, semanas seguidas o semanas sueltas, escoge <b>PDF</b> o <b>Word</b> y toca el botón. Cada semana sale en una página.')}
  </div>
  <div class="sec-title">Más ayuda</div>
  <div class="helpgrid two">
    <div class="card pad"><b>Agregar una persona</b><p class="small muted" style="margin-top:4px">Personas → <b>Agregar persona</b>. Marca qué partes puede recibir. También puedes agregar varias a la vez pegando una lista.</p></div>
    <div class="card pad"><b>Semana sin reunión</b><p class="small muted" style="margin-top:4px">Dentro de la semana toca los tres puntos (⋯) → «Esta semana no hay reunión».</p></div>
    <div class="card pad"><b>Usarla en el celular o tableta</b><p class="small muted" style="margin-top:4px">Android: instala la app. iPhone/iPad: abre el enlace en Safari → Compartir → <b>Añadir a pantalla de inicio</b>.</p></div>
    <div class="card pad"><b>Cambiar de celular</b><p class="small muted" style="margin-top:4px">Ajustes → <b>Guardar copia</b> y en el equipo nuevo «Restaurar copia».</p></div>
  </div>`;
}

// ------------------------------------------------------------------ SINCRONIZAR con jw.org

async function runSync({ silent = false } = {}) {
  ui.syncAbort = false;
  const s0 = st();
  const weeks = S.sortedWeeks();
  const nowMon = mondayOf(todayStr());
  let d = weeks.length ? addDays(weeks[weeks.length - 1].date, 7) : nowMon;
  if (d < nowMon && !weeks.length) d = nowMon;
  const added = [];
  let failedParse = 0, networkErr = null, stoppedAt = '';
  const prog = () => {
    const el = $('#syncMsg'); if (el) el.textContent = 'Buscando la semana del ' + weekShort(d) + '…';
    const b = $('#syncBar'); if (b) b.style.width = Math.min(100, 8 + added.length * 8) + '%';
  };
  if (!silent) {
    openModal(`<div class="head"><h2>Buscando en jw.org…</h2></div><div id="syncMsg" class="muted">Conectando…</div><div class="progress"><i id="syncBar"></i></div>
      <div style="margin-top:16px"><button class="btn block" data-a="syncCancel">Cancelar</button></div>`);
  }
  for (let i = 0; i < 70 && !ui.syncAbort; i++) {
    if (S.get().weeks[d]) { d = addDays(d, 7); continue; }
    prog();
    let tpl = null;
    try {
      tpl = await fetchWeek(d, fetchText);
    } catch (e) {
      if (e && e.code === 'PARSE') { failedParse++; tpl = { ...blankTemplate(), source: '' }; tpl.__failed = true; }
      else { networkErr = e; break; }
    }
    if (!tpl) { stoppedAt = d; break; }   // aún no está publicada
    const wk = weekFromTemplate(d, tpl, newPartId);
    if (tpl.__failed) wk.note = 'No se pudo leer automáticamente: revisa los títulos.';
    S.update((s) => { s.weeks[d] = wk; });
    added.push(d);
    d = addDays(d, 7);
  }
  if (added.length && S.get().settings.autoSuggest) {
    S.update((s) => {
      const all = Object.values(s.weeks).sort((a, b) => (a.date < b.date ? -1 : 1));
      for (const dt of added) {
        const w = s.weeks[dt];
        const n = suggestWeek(w, s.people, all);
        if (n) w.autoFilled = true;
      }
    });
  }
  S.update((s) => { s.settings.lastCheck = todayStr(); });
  return { added, failedParse, networkErr, stoppedAt, aborted: ui.syncAbort };
}


function syncSummary(r) {
  let h = '';
  const until = r.stoppedAt ? weekShort(r.stoppedAt) + ' ' + r.stoppedAt.slice(0, 4) : '';
  if (r.added.length) {
    h = `<div class="head"><h2>¡Listo! ✔</h2></div><p>Se agregaron <b>${r.added.length}</b> ${r.added.length === 1 ? 'semana' : 'semanas'} (${esc(weekShort(r.added[0]))} → ${esc(weekShort(r.added[r.added.length - 1]))}).${S.get().settings.autoSuggest ? ' Ya tienen asignaciones sugeridas: revísalas y cámbialas si hace falta.' : ''}</p>
    ${r.stoppedAt ? `<div class="infobox" style="margin-top:12px">jw.org todavía no publica desde la semana del <b>${esc(until)}</b>. La app lo vuelve a intentar sola cada día.</div>` : ''}
    ${r.failedParse ? `<div class="warnbox" style="margin-top:12px">En ${r.failedParse} ${r.failedParse === 1 ? 'semana' : 'semanas'} no pude leer la guía; quedaron con una plantilla para que corrijas los títulos.</div>` : ''}`;
  } else if (r.networkErr) {
    h = `<div class="head"><h2>No pude conectar</h2></div><p>No se pudo consultar jw.org desde este dispositivo ahora mismo. Revisa tu conexión a internet e inténtalo de nuevo.</p><div class="infobox" style="margin-top:12px">Mientras tanto puedes <b>pegar el texto de la guía</b> de la semana (Ajustes → «Pegar guía de actividades») o crear semanas en blanco desde el calendario del año.</div>`;
  } else {
    h = `<div class="head"><h2>Todo al día ✔</h2></div><p>jw.org todavía no ha publicado ${until ? 'la semana del <b>' + esc(until) + '</b> ni las siguientes' : 'semanas nuevas'}. Cuando salgan, la app las traerá sola (revisa una vez al día) o puedes tocar el botón de nuevo.</p>`;
  }
  h += `<div style="margin-top:16px" class="row wrap"><button class="btn primary grow" data-a="closeModal">Entendido</button></div>`;
  return h;
}

async function manualSync() {
  const r = await runSync();
  closeModal();
  if (r.aborted) { toast('Búsqueda cancelada.'); return; }
  if (r.added.length) ui.monthSel = monthKey(r.added[0]), ui.year = Number(r.added[0].slice(0, 4));
  openModal(syncSummary(r));
}

// ------------------------------------------------------------------ vista previa
function openPreview(dates, startIdx = 0) {
  const ws = dates.map((d) => weekOf(d)).filter(Boolean);
  if (!ws.length) return;
  let i = startIdx;
  const draw = () => {
    const w = ws[i];
    openModal(`<div class="head"><h2>Vista previa</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="pvwrap"><div class="pv">${weekSvg(w, byId(), opts())}</div></div>
      <div class="row" style="margin-top:12px;justify-content:space-between">
        <button class="iconbtn" data-a="pvMove" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Anterior">${I.left}</button>
        <div class="small muted">${i + 1} de ${ws.length} · ${esc(weekShort(w.date))}</div>
        <button class="iconbtn" data-a="pvMove" data-d="1" ${i === ws.length - 1 ? 'disabled' : ''} aria-label="Siguiente">${I.right}</button></div>`, { wide: true });
  };
  ui.pv = { move: (d) => { i = Math.max(0, Math.min(ws.length - 1, i + d)); draw(); } };
  draw();
}

// ------------------------------------------------------------------ acciones (clics)
const A = {
  nav: (el) => { closeModal(); go(el.dataset.h); },
  closeModal: () => closeModal(),
  overlay: (el, e) => { if (e.target === el) closeModal(); },
  openWeek: (el) => go('#/semana/' + el.dataset.date),
  togglePast: () => { ui.showPast = !ui.showPast; render(); },
  sync: () => manualSync(),
  syncCancel: () => { ui.syncAbort = true; },
  addWeek: () => {
    const weeks = S.sortedWeeks();
    const d = weeks.length ? addDays(weeks[weeks.length - 1].date, 7) : mondayOf(todayStr());
    openModal(`<div class="head"><h2>Agregar semana</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="stack"><div class="field-g"><label class="lbl">Cualquier día de esa semana</label><input type="date" id="aw_date" value="${d}"></div>
      <div class="small muted">Se crea una semana con las partes habituales; tú escribes los títulos. Normalmente es más fácil usar «Buscar semanas nuevas».</div>
      <button class="btn primary block" data-a="addWeekGo">Crear semana</button></div>`);
  },
  addWeekGo: () => {
    const v = $('#aw_date').value;
    if (!v) return;
    const d = mondayOf(v);
    if (weekOf(d)) { closeModal(); go('#/semana/' + d); return; }
    const wk = weekFromTemplate(d, blankTemplate(), newPartId);
    S.update((s) => { s.weeks[d] = wk; });
    closeModal(); go('#/semana/' + d);
  },
  pasteGuide: () => {
    const weeks = S.sortedWeeks();
    const d = weeks.length ? addDays(weeks[weeks.length - 1].date, 7) : mondayOf(todayStr());
    openModal(`<div class="head"><h2>Pegar guía de actividades</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="stack"><div class="field-g"><label class="lbl">Semana (cualquier día)</label><input type="date" id="pg_date" value="${d}"></div>
      <div class="field-g"><label class="lbl">Texto copiado de la guía de esa semana</label><textarea id="pg_text" placeholder="Pega aquí todo el texto de la semana…"></textarea></div>
      <button class="btn primary block" data-a="pasteGo">Leer y crear la semana</button></div>`);
  },
  pasteGo: () => {
    const d = mondayOf($('#pg_date').value || todayStr());
    try {
      const tpl = parseGuideText($('#pg_text').value);
      const wk = weekFromTemplate(d, tpl, newPartId);
      S.update((s) => { s.weeks[d] = wk; });
      closeModal(); toast('Semana creada.'); go('#/semana/' + d);
    } catch (e) {
      toast('No pude reconocer ese texto. Copia la página completa de la semana, desde el título hasta «Palabras de conclusión».', 7000);
    }
  },
  // ---- semana
  pick: (el) => openPicker(route().date, el.dataset.slot),
  pickSet: (el) => {
    const { date, slot, id } = el.dataset;
    mutWeek(date, (w) => { const sl = slotsOf(w).find((s) => s.key === slot); setSlot(w, sl, id); }, { manual: true });
    closeModal();
  },
  pickClear: (el) => {
    const { date, slot } = el.dataset;
    mutWeek(date, (w) => { const sl = slotsOf(w).find((s) => s.key === slot); setSlot(w, sl, ''); }, { manual: true });
    closeModal();
  },
  pickFree: (el) => {
    const { date, slot } = el.dataset;
    openModal(`<div class="head"><h2>Escribir un nombre</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="stack"><input type="text" id="free_name" placeholder="Nombre como debe salir impreso" autocomplete="off">
      <button class="btn primary block" data-a="pickFreeGo" data-date="${date}" data-slot="${slot}">Usar este nombre</button></div>`);
    $('#free_name').focus();
  },
  pickFreeGo: (el) => {
    const v = $('#free_name').value.trim();
    if (!v) return;
    const { date, slot } = el.dataset;
    mutWeek(date, (w) => { const sl = slotsOf(w).find((s) => s.key === slot); setSlot(w, sl, '~' + v); }, { manual: true });
    closeModal();
  },
  suggest: (el) => {
    const date = el.dataset.date;
    const w = weekOf(date);
    const empty = missingCount(w);
    if (!empty) {
      openModal(`<div class="head"><h2>Ya está todo asignado</h2></div><p>¿Quieres que vuelva a proponer todas las asignaciones desde cero?</p>
        <div class="row wrap"><button class="btn primary grow" data-a="suggestAll" data-date="${date}">Sí, volver a proponer</button><button class="btn grow" data-a="closeModal">No</button></div>`);
      return;
    }
    let n = 0;
    S.update((s) => { n = suggestWeek(s.weeks[date], s.people, Object.values(s.weeks)); if (n) s.weeks[date].autoFilled = true; });
    toast(n ? `Listo: propuse ${n} ${n === 1 ? 'asignación' : 'asignaciones'}. Revísalas.` : 'No encontré personas disponibles para las partes vacías.');
  },
  suggestAll: (el) => {
    const date = el.dataset.date;
    let n = 0;
    S.update((s) => { n = suggestWeek(s.weeks[date], s.people, Object.values(s.weeks), { overwrite: true }); s.weeks[date].autoFilled = true; });
    closeModal();
    toast(`Listo: propuse ${n} asignaciones. Revísalas.`);
  },
  preview: (el) => {
    const r = route();
    if (r.name === 'descargar') { const sel = selectedWeeks().map((w) => w.date); openPreview(sel, sel.indexOf(el.dataset.date)); }
    else openPreview([el.dataset.date], 0);
  },
  pvMove: (el) => ui.pv && ui.pv.move(Number(el.dataset.d)),
  dlWeek: (el) => {
    const date = el.dataset.date;
    openModal(`<div class="head"><h2>Descargar esta semana</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="fmtcards"><button class="fmtcard" data-a="dlOne" data-date="${date}" data-f="pdf"><b>PDF</b><span class="small muted">Para imprimir</span></button>
      <button class="fmtcard" data-a="dlOne" data-date="${date}" data-f="docx"><b>Word</b><span class="small muted">Para editar</span></button></div>`);
  },
  dlOne: (el) => { closeModal(); const w = weekOf(el.dataset.date); doDownload([w], el.dataset.f, fileName([w])); },
  weekMenu: (el) => {
    const date = el.dataset.date;
    openModal(`<div class="head"><h2>Más opciones</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="stack">
      <button class="btn block" data-a="toggleNoMeeting" data-date="${date}">Esta semana no hay reunión (asamblea, visita…)</button>
      <button class="btn block" data-a="clearWeek" data-date="${date}">Limpiar todas las asignaciones</button>
      <button class="btn block" data-a="refetchWeek" data-date="${date}">${I.refresh} Volver a leer los títulos desde jw.org</button>
      <button class="btn block danger" data-a="delWeek" data-date="${date}">${I.trash} Eliminar esta semana</button></div>`);
  },
  toggleNoMeeting: (el) => {
    const date = el.dataset.date;
    const w = weekOf(date);
    if (w.noMeeting) { mutWeek(date, (x) => { x.noMeeting = ''; }); closeModal(); return; }
    openModal(`<div class="head"><h2>Sin reunión esta semana</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="stack"><div class="field-g"><label class="lbl">Motivo (aparece en la hoja)</label><input type="text" id="nm_reason" value="Asamblea de circuito"></div>
      <button class="btn primary block" data-a="noMeetingGo" data-date="${date}">Guardar</button></div>`);
  },
  noMeetingGo: (el) => { const v = $('#nm_reason').value.trim() || 'Sin reunión'; mutWeek(el.dataset.date, (x) => { x.noMeeting = v; }); closeModal(); },
  clearWeek: (el) => {
    mutWeek(el.dataset.date, (w) => { w.prayerOpen = ''; w.president = ''; w.prayerClose = ''; w.parts.forEach((p) => { p.a = p.a.map(() => ''); }); }, { manual: true });
    closeModal(); toast('Asignaciones borradas.');
  },
  delWeek: (el) => {
    const date = el.dataset.date;
    openModal(`<div class="head"><h2>¿Eliminar esta semana?</h2></div><p>Se borra el programa de ${esc(weekTitle(date).replace('Semana del ', ''))}. No se puede deshacer.</p>
      <div class="row wrap"><button class="btn danger grow" data-a="delWeekGo" data-date="${date}">Sí, eliminar</button><button class="btn grow" data-a="closeModal">Cancelar</button></div>`);
  },
  delWeekGo: (el) => { S.update((s) => { delete s.weeks[el.dataset.date]; }); closeModal(); go('#/'); },
  refetchWeek: async (el) => {
    const date = el.dataset.date;
    closeModal();
    toast('Consultando jw.org…', 2500);
    try {
      const tpl = await fetchWeek(date, fetchText);
      if (!tpl) { toast('Esa semana todavía no está publicada en jw.org.'); return; }
      mutWeek(date, (w) => {
        const same = tpl.parts.length === w.parts.length && tpl.parts.every((p, i) => p.k === w.parts[i].k);
        w.reading = tpl.reading; w.songOpen = tpl.songOpen; w.songMid = tpl.songMid; w.songClose = tpl.songClose; w.source = tpl.source;
        if (same) tpl.parts.forEach((p, i) => { Object.assign(w.parts[i], { title: p.title, mins: p.mins, ref: p.ref }); });
        else w.parts = tpl.parts.map((p) => ({ ...p, a: p.a.slice(), id: newPartId() }));
      });
      toast('Títulos actualizados.');
    } catch (e) { toast('No pude conectar con jw.org. Revisa tu internet.', 5000); }
  },
  addPart: (el) => {
    const s = el.dataset.s;
    const opts2 = { t: [['talk', 'Parte (discurso)'], ['perlas', 'Perlas escondidas'], ['lectura', 'Lectura de la Biblia']], m: [['pair', 'Demostración en pareja'], ['single', 'Parte individual'], ['discurso', 'Discurso (solo hermanos)']], v: [['talk', 'Parte (discurso)'], ['study', 'Estudio bíblico de la congregación']] }[s];
    openModal(`<div class="head"><h2>Agregar parte</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="stack">${opts2.map(([k, l]) => `<button class="btn block" data-a="addPartGo" data-s="${s}" data-k="${k}">${l}</button>`).join('')}</div>`);
  },
  addPartGo: (el) => {
    const { s, k } = el.dataset;
    const date = route().date;
    const titles = { perlas: 'Busquemos perlas escondidas', lectura: 'Lectura de la Biblia', study: 'Estudio bíblico de la congregación', discurso: 'Discurso' };
    const part = { id: newPartId(), s, k, title: titles[k] || '', mins: { lectura: 4, study: 30, perlas: 10 }[k] || (s === 'v' ? 15 : s === 't' ? 10 : 4), ref: '', a: k === 'pair' || k === 'study' ? ['', ''] : [''] };
    mutWeek(date, (w) => {
      const order = { t: 0, m: 1, v: 2 };
      w.parts.push(part);
      w.parts = w.parts.map((p, i) => [p, i]).sort((a, b) => order[a[0].s] - order[b[0].s] || a[1] - b[1]).map((x) => x[0]);
    }, { manual: true });
    closeModal();
  },
  delPart: (el) => {
    const i = Number(el.dataset.i);
    const date = route().date;
    const p = weekOf(date).parts[i];
    openModal(`<div class="head"><h2>¿Quitar esta parte?</h2></div><p>${esc(partTitle(p, i + 1))}</p>
      <div class="row wrap"><button class="btn danger grow" data-a="delPartGo" data-i="${i}">Sí, quitar</button><button class="btn grow" data-a="closeModal">Cancelar</button></div>`);
  },
  delPartGo: (el) => { mutWeek(route().date, (w) => { w.parts.splice(Number(el.dataset.i), 1); }, { manual: true }); closeModal(); },
  // ---- personas
  pfilter: (el) => { ui.personFilter = el.dataset.k; render(); },
  addPerson: () => { const p = S.newPerson({ g: 'H', caps: S.defaultCaps('H') }); editingUnavail = []; openModal(personForm(p, true), { wide: false }); $('#f_name').focus(); },
  editPerson: (el) => {
    const p = st().people.find((x) => x.id === el.dataset.id);
    editingUnavail = (p.unavail || []).map((r) => ({ ...r }));
    openModal(personForm(p, false));
  },
  segG: (el) => { $$('#f_g button').forEach((b) => b.classList.toggle('on', b === el)); },
  presetCaps: (el) => {
    const g = $('#f_g .on').dataset.g;
    const caps = S.defaultCaps(g, el.dataset.k);
    $$('#f_caps input').forEach((c) => { c.checked = caps.includes(c.value); });
  },
  addUnavail: () => {
    const f = $('#f_ufrom').value, t = $('#f_uto').value;
    if (!f || !t) { toast('Elige las dos fechas.'); return; }
    editingUnavail.push({ from: f <= t ? f : t, to: f <= t ? t : f });
    $('#f_unavail').innerHTML = unavailRows();
    $('#f_ufrom').value = ''; $('#f_uto').value = '';
  },
  delUnavail: (el) => { editingUnavail.splice(Number(el.dataset.i), 1); $('#f_unavail').innerHTML = unavailRows(); },
  savePerson: () => {
    const f = $('#pform');
    const name = $('#f_name').value.trim();
    if (!name) { toast('Escribe el nombre.'); $('#f_name').focus(); return; }
    let display = $('#f_display').value.trim();
    if (!display) display = name.split(/\s+/).slice(0, 2).join(' ');
    const rec = {
      name, display, g: $('#f_g .on').dataset.g, group: Number($('#f_group').value), active: $('#f_active').checked,
      caps: $$('#f_caps input:checked').map((c) => c.value), note: $('#f_note').value.trim(), unavail: editingUnavail.map((r) => ({ ...r })),
    };
    const isNew = f.dataset.new === '1';
    S.update((s) => {
      if (isNew) s.people.push(S.newPerson({ ...rec }));
      else Object.assign(s.people.find((x) => x.id === f.dataset.id), rec);
    });
    closeModal();
    toast(isNew ? 'Persona agregada.' : 'Cambios guardados.');
  },
  delPerson: (el) => {
    const id = el.dataset.id;
    const p = st().people.find((x) => x.id === id);
    openModal(`<div class="head"><h2>¿Eliminar a ${esc(p.display || p.name)}?</h2></div><p>Sus asignaciones pasadas se conservan como texto en los programas ya hechos.</p>
      <div class="row wrap"><button class="btn danger grow" data-a="delPersonGo" data-id="${id}">Sí, eliminar</button><button class="btn grow" data-a="closeModal">Cancelar</button></div>`);
  },
  delPersonGo: (el) => {
    const id = el.dataset.id;
    S.update((s) => {
      const p = s.people.find((x) => x.id === id);
      const label = '~' + (p.display || p.name);
      for (const w of Object.values(s.weeks)) {
        for (const sl of slotsOf(w)) if (getSlot(w, sl) === id) setSlot(w, sl, label);
      }
      s.people = s.people.filter((x) => x.id !== id);
    });
    closeModal(); toast('Persona eliminada.');
  },
  bulkAdd: () => {
    openModal(`<div class="head"><h2>Agregar varias personas</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
      <div class="stack"><div class="small muted">Escribe o pega un nombre por línea. Para hermanas, agrega «(M)» al final; por defecto serán hermanos si el nombre no termina en «a».</div>
      <textarea id="bulk_text" placeholder="Ana Pérez (M)&#10;Carlos Gómez"></textarea>
      <div class="field-g"><label class="lbl">Grupo</label><select id="bulk_group">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((g) => `<option value="${g}">${g ? 'Grupo ' + g : 'Sin grupo'}</option>`).join('')}</select></div>
      <button class="btn primary block" data-a="bulkGo">Agregar</button></div>`);
  },
  bulkGo: () => {
    const lines = $('#bulk_text').value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const group = Number($('#bulk_group').value);
    let n = 0;
    S.update((s) => {
      for (let l of lines) {
        let g = null;
        const m = /\((M|H)\)\s*$/i.exec(l);
        if (m) { g = m[1].toUpperCase(); l = l.replace(/\((M|H)\)\s*$/i, '').trim(); }
        if (!l) continue;
        if (!g) g = /a$/i.test(l.split(/\s+/)[0]) ? 'M' : 'H';
        s.people.push(S.newPerson({ name: l, display: l.split(/\s+/).slice(0, 2).join(' '), g, group, caps: S.defaultCaps(g) }));
        n++;
      }
    });
    closeModal(); toast(`${n} ${n === 1 ? 'persona agregada' : 'personas agregadas'}.`);
  },
  // ---- descargar
  dlMode: (el) => { ui.dl.mode = el.dataset.m; render(); },
  dlFmt: (el) => { ui.dl.fmt = el.dataset.f; render(); },
  dlGo: () => { const ws = selectedWeeks(); if (ws.length) doDownload(ws, ui.dl.fmt, fileName(ws)); },
  // ---- ajustes
  backup: async () => {
    const msg = await saveFile(new Blob([S.exportBackup()], { type: 'application/json' }), `programa-vym-copia-${todayStr()}.json`);
    toast(msg, 4500);
  },
  restore: () => $('#restoreFile').click(),
  clearWeeks: () => openModal(`<div class="head"><h2>¿Borrar todas las semanas?</h2></div><p>Las personas se conservan. Esto no se puede deshacer (guarda una copia antes si quieres).</p>
    <div class="row wrap"><button class="btn danger grow" data-a="clearWeeksGo">Sí, borrar</button><button class="btn grow" data-a="closeModal">Cancelar</button></div>`),
  clearWeeksGo: () => { S.clearWeeks(); closeModal(); toast('Semanas borradas.'); },
  resetAll: () => openModal(`<div class="head"><h2>¿Volver a los datos de ejemplo?</h2></div><p>Se reemplaza TODO (personas y semanas) por la lista de integrantes y las semanas de septiembre a diciembre de 2026.</p>
    <div class="row wrap"><button class="btn danger grow" data-a="resetAllGo">Sí, reemplazar</button><button class="btn grow" data-a="closeModal">Cancelar</button></div>`),
  resetAllGo: () => { S.resetAll(); closeModal(); toast('Datos restablecidos.'); },
};

// ------------------------------------------------------------------ acciones nuevas
const longDate = (s) => `${fmtDay(s)} de ${MESES[parse(s).getUTCMonth()].toLowerCase()} de ${s.slice(0, 4)}`;
Object.assign(A, {
  theme: () => { toggleTheme(); render(); },
  setTheme: (el) => { setTheme(el.dataset.t); render(); },
  year: (el) => { ui.year += Number(el.dataset.d); render(); },
  month: (el) => { ui.monthSel = el.dataset.mk; render(); },
  blankMonth: (el) => {
    const [y, m] = el.dataset.mk.split('-').map(Number);
    let n = 0;
    S.update((s) => {
      for (let d = new Date(Date.UTC(y, m - 1, 1)); d.getUTCMonth() === m - 1; d.setUTCDate(d.getUTCDate() + 1)) {
        if (d.getUTCDay() !== 1) continue;
        const ds = d.toISOString().slice(0, 10);
        if (!s.weeks[ds]) { s.weeks[ds] = weekFromTemplate(ds, blankTemplate(), newPartId); n++; }
      }
    });
    toast(n ? `${n} semanas en blanco creadas. Escribe los títulos y asigna.` : 'Ese mes ya tenía semanas.');
  },
  pickG: (el) => {
    ui.pickG = el.dataset.g;
    $$('#pgpills .pill').forEach((b) => b.classList.toggle('on', b === el));
    const s = $('.sheet'); fillPickList(s.dataset.date, s.dataset.slot, ($('#pq') || {}).value || '');
  },
  dlMode: (el) => {
    ui.dl.mode = el.dataset.m;
    if (ui.dl.mode === 'pick' && !ui.dl.picked.size) S.sortedWeeks().filter((w) => w.date >= mondayOf(todayStr())).slice(0, 4).forEach((w) => ui.dl.picked.add(w.date));
    render();
  },
  dlToggle: (el) => { const s = ui.dl.picked; s.has(el.dataset.date) ? s.delete(el.dataset.date) : s.add(el.dataset.date); render(); },
  dlPickN: (el) => {
    const n = Number(el.dataset.n);
    ui.dl.picked = new Set(n ? S.sortedWeeks().filter((w) => w.date >= mondayOf(todayStr())).slice(0, n).map((w) => w.date) : []);
    if (n === 999) ui.dl.picked = new Set(S.sortedWeeks().map((w) => w.date));
    render();
  },
  // ---- PIN
  pinSet: () => openModal(`<div class="head"><h2>${lsGet(PINKEY) ? 'Cambiar PIN' : 'Crear PIN'}</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
    <div class="stack"><div class="small muted">De 4 a 8 números. Se pedirá al abrir la app en este dispositivo.</div>
    <div class="field-g"><label class="lbl">PIN nuevo</label><input type="password" id="pin1" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off"></div>
    <div class="field-g"><label class="lbl">Repite el PIN</label><input type="password" id="pin2" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off"></div>
    <button class="btn primary block" data-a="pinSetGo">Guardar PIN</button></div>`),
  pinSetGo: async () => {
    const a = $('#pin1').value, b = $('#pin2').value;
    if (!/^\d{4,8}$/.test(a)) { toast('El PIN debe tener de 4 a 8 números.'); return; }
    if (a !== b) { toast('Los dos PIN no coinciden.'); return; }
    const h = await hashPin(a);
    lsSet(PINKEY, JSON.stringify({ ...h, len: a.length }));
    closeModal(); render(); toast('PIN activado.');
  },
  pinOff: () => openModal(`<div class="head"><h2>¿Quitar el PIN?</h2></div><p>La app volverá a abrirse sin pedir PIN en este dispositivo.</p><div class="row wrap" style="margin-top:12px"><button class="btn danger grow" data-a="pinOffGo">Sí, quitar</button><button class="btn grow" data-a="closeModal">Cancelar</button></div>`),
  pinOffGo: () => { lsSet(PINKEY, null); closeModal(); render(); toast('PIN eliminado.'); },
  lockNow: () => { closeModal(); showLock().then(() => render(true)); },
  // ---- volver a cargar datos de la congregación
  reloadSeed: () => openModal(`<div class="head"><h2>Cargar datos de la congregación</h2><button class="iconbtn" data-a="closeModal" aria-label="Cerrar">${I.x}</button></div>
    <div class="stack"><div class="warnbox">Se reemplazan TODAS las personas y semanas de este dispositivo por la lista original (septiembre–diciembre 2026). Guarda una copia antes si quieres conservar tus cambios.</div>
    <div class="field-g"><label class="lbl">Código de la congregación</label><input type="text" id="rs_code" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX"></div>
    <button class="btn danger block" data-a="reloadSeedGo">Reemplazar datos</button></div>`),
  reloadSeedGo: async () => {
    try { const seed = await openSeed($('#rs_code').value); S.resetAll(seed); closeModal(); toast('Datos cargados.'); }
    catch (e) { toast(e.message, 5000); }
  },
});

// ------------------------------------------------------------------ pantallas de entrada
async function openSeed(code) {
  if (!(window.crypto && crypto.subtle)) throw new Error('Este navegador no permite abrir datos cifrados aquí. Usa la app instalada o abre el enlace seguro (https).');
  if (cleanCode(code).length < 8) throw new Error('Escribe el código completo.');
  return decryptJson(seedEnc, code);
}
const gate = (inner) => { closeModal(); $('#app').innerHTML = `<div class="gate"><div class="box"><span class="mark"><i></i><i></i><i></i></span>${inner}</div></div>`; };

function showWelcome() {
  return new Promise((resolve) => {
    gate(`<h1>Programa VyM</h1><p>Escribe el <b>código de la congregación</b> para cargar las personas y los programas. Solo hace falta la primera vez en este dispositivo.</p>
      <input id="g_code" placeholder="XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de la congregación">
      <div class="err" id="g_err" role="alert"></div>
      <button class="btn primary big block" id="g_go">Entrar</button>
      <div class="alt"><button class="btn block" id="g_blank">No tengo código: empezar en blanco</button></div>`);
    const inp = $('#g_code'); inp.focus();
    const go = async () => {
      const b = $('#g_go'); b.disabled = true; b.textContent = 'Abriendo…';
      try { S.create(await openSeed(inp.value)); resolve(); }
      catch (e) { $('#g_err').textContent = e.message; inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); b.disabled = false; b.textContent = 'Entrar'; }
    };
    $('#g_go').onclick = go;
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    $('#g_blank').onclick = () => { S.create(null); resolve(); };
  });
}

function showLock() {
  return new Promise((resolve) => {
    const rec = JSON.parse(lsGet(PINKEY) || 'null');
    if (!rec) { resolve(); return; }
    gate(`<h1>Escribe tu PIN</h1><p>Programa VyM está bloqueado.</p>
      <input id="g_pin" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" aria-label="PIN">
      <div class="err" id="g_err" role="alert"></div>
      <button class="btn primary big block" id="g_go">Desbloquear</button>`);
    const inp = $('#g_pin'); inp.focus();
    const go = async () => {
      const h = await hashPin(inp.value, rec.salt);
      if (h.hash === rec.hash) { resolve(); return; }
      $('#g_err').textContent = 'PIN incorrecto'; inp.value = ''; inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
    };
    $('#g_go').onclick = go;
    inp.oninput = () => { if (inp.value.length === rec.len) go(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  });
}


// ------------------------------------------------------------------ cambios de campos
const C = {
  reading: (el) => mutWeek(route().date, (w) => { w.reading = el.value.trim().toUpperCase(); }),
  noMeeting: (el) => mutWeek(route().date, (w) => { w.noMeeting = el.value.trim() || w.noMeeting; }),
  song: (el) => mutWeek(route().date, (w) => { w[el.dataset.k] = el.value ? Number(el.value) : ''; }),
  ptitle: (el) => mutWeek(route().date, (w) => { w.parts[Number(el.dataset.i)].title = el.value.trim(); }),
  pref: (el) => mutWeek(route().date, (w) => { w.parts[Number(el.dataset.i)].ref = el.value.trim(); }),
  pmins: (el) => mutWeek(route().date, (w) => { w.parts[Number(el.dataset.i)].mins = Number(el.value) || 0; }),
  dlMonth: (el) => { ui.dl.month = el.value; render(); },
  dlFrom: (el) => { ui.dl.from = el.value; render(); },
  dlTo: (el) => { ui.dl.to = el.value; render(); },
  set: (el) => S.update((s) => { s.settings[el.dataset.k] = el.value; }),
  setb: (el) => S.update((s) => { s.settings[el.dataset.k] = el.checked; }),
};


function onInput(e) {
  const el = e.target;
  if (el.dataset.c === 'pickq') {
    const sheet = $('.sheet');
    if (sheet) fillPickList(sheet.dataset.date, sheet.dataset.slot, el.value);
  }
  if (el.dataset.c === 'personq') {
    ui.personQuery = el.value;
    $('#plistp').innerHTML = personRows(filteredPeople());
  }
}

// ------------------------------------------------------------------ arranque
let started = false;
export async function start() {
  if (started) return; started = true;
  applyTheme();
  S.init();
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.a];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'restoreFile' && el.files[0]) {
      const r = new FileReader();
      r.onload = () => {
        try { S.importBackup(String(r.result)); toast('Copia restaurada.'); render(); }
        catch (err) { toast(err.message || 'No se pudo restaurar.', 6000); }
      };
      r.readAsText(el.files[0]);
      el.value = '';
      return;
    }
    const fn = el.dataset && C[el.dataset.c];
    if (fn) fn(el);
  });
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOpen()) closeModal();
    if (e.key === 'Enter' && e.target.id === 'free_name') { const b = $('[data-a="pickFreeGo"]'); if (b) b.click(); }
  });
  window.addEventListener('hashchange', () => { closeModal(); render(); });
  S.subscribe(() => { if (!document.hidden && S.hasState() && !$('.gate')) render(); });

  // bloqueo con PIN y primera vez
  let hiddenAt = 0, locked = false;
  const relock = async () => {
    if (locked || !lsGet(PINKEY)) return;
    locked = true; await showLock(); locked = false; render(true);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 120000) relock();
  });
  if (lsGet(PINKEY)) { locked = true; await showLock(); locked = false; }
  if (!S.hasState()) await showWelcome();
  render(true);

  // registro del service worker (solo web)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // búsqueda automática diaria
  setTimeout(async () => {
    const s = st().settings;
    if (s.autoCheck && s.lastCheck !== todayStr() && navigator.onLine !== false) {
      try {
        const r = await runSync({ silent: true });
        if (r.added.length) toast(`Se agregaron ${r.added.length} semanas nuevas desde jw.org.`, 5000);
      } catch (e) { /* silencioso */ }
    }
  }, 2500);
}
