// Lectura automática del programa semanal desde wol.jw.org (Guía de actividades – Vida y Ministerio)
import { isoWeek, addDays, parse } from './dates.js';

const BASE = 'https://wol.jw.org';
export const meetingsUrl = (monday) => {
  const { year, week } = isoWeek(monday);
  return `${BASE}/es/wol/meetings/r4/lp-s/${year}/${week}`;
};

const BOOKS = {
  gen: 'Génesis', ex: 'Éxodo', lev: 'Levítico', num: 'Números', dt: 'Deuteronomio', jos: 'Josué', jue: 'Jueces', rut: 'Rut',
  '1sa': '1 Samuel', '2sa': '2 Samuel', '1re': '1 Reyes', '2re': '2 Reyes', '1cr': '1 Crónicas', '2cr': '2 Crónicas', esd: 'Esdras',
  ne: 'Nehemías', est: 'Ester', job: 'Job', sl: 'Salmos', pr: 'Proverbios', ec: 'Eclesiastés', can: 'Cantares', isa: 'Isaías',
  jer: 'Jeremías', lam: 'Lamentaciones', eze: 'Ezequiel', dan: 'Daniel', ose: 'Oseas', joel: 'Joel', am: 'Amós', abd: 'Abdías',
  jon: 'Jonás', miq: 'Miqueas', nah: 'Nahúm', hab: 'Habacuc', sof: 'Sofonías', ag: 'Ageo', zac: 'Zacarías', mal: 'Malaquías',
  mt: 'Mateo', mr: 'Marcos', lu: 'Lucas', jn: 'Juan', hch: 'Hechos', ro: 'Romanos', '1co': '1 Corintios', '2co': '2 Corintios',
  gal: 'Gálatas', ef: 'Efesios', flp: 'Filipenses', col: 'Colosenses', '1te': '1 Tesalonicenses', '2te': '2 Tesalonicenses',
  '1ti': '1 Timoteo', '2ti': '2 Timoteo', tit: 'Tito', flm: 'Filemón', heb: 'Hebreos', snt: 'Santiago', '1pe': '1 Pedro',
  '2pe': '2 Pedro', '1jn': '1 Juan', '2jn': '2 Juan', '3jn': '3 Juan', jud: 'Judas', rev: 'Apocalipsis',
};
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s.]/g, '');
export function expandRef(ref) {
  const m = /^((?:[1-3]\s?)?[A-Za-zÁÉÍÓÚáéíóúñÑ]{1,12}\.?)\s*(\d+:\d+(?:\s?[-–,]\s?\d+)*)/.exec(ref.trim());
  if (!m) return ref.trim();
  const full = BOOKS[fold(m[1])];
  return (full || m[1].replace(/\.$/, '')) + ' ' + m[2].replace(/\s/g, '').replace('–', '-');
}

// ------------------------------------------------------------------ HTML -> líneas de texto
export function htmlToLines(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('#article') || doc.querySelector('article') || doc.body;
  const out = [];
  let cur = '';
  const BLOCK = /^(P|DIV|H[1-6]|LI|UL|OL|TR|TABLE|SECTION|ARTICLE|HEADER|FOOTER|BR|FIGURE|FIGCAPTION|ASIDE|BLOCKQUOTE|TD|TH)$/;
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|SVG|IMG|VIDEO|BUTTON|NAV)$/;
  const flush = () => { const t = cur.replace(/[\s ]+/g, ' ').trim(); if (t) out.push(t); cur = ''; };
  const walk = (n) => {
    if (n.nodeType === 3) { cur += n.nodeValue; return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toUpperCase();
    if (SKIP.test(tag)) return;
    const b = BLOCK.test(tag);
    if (b) flush();
    for (const c of n.childNodes) walk(c);
    if (b) flush();
  };
  walk(root);
  flush();
  return out;
}

// ------------------------------------------------------------------ líneas -> semana
const SECS = [[/^TESOROS DE LA BIBLIA/i, 't'], [/^SEAMOS MEJORES MAESTROS/i, 'm'], [/^NUESTRA VIDA CRISTIANA/i, 'v']];
const MINS = /\(\s*(\d+)\s*mins?\.?\s*\)/i;

export function parseGuide(lines) {
  const wk = { reading: '', songOpen: '', songMid: '', songClose: '', parts: [] };
  let section = null, cur = null, concl = false;
  const parts = [];
  for (let L of lines) {
    L = L.trim();
    if (!L) continue;
    if (!section && /^\d{1,2}(\s+DE\s+[A-ZÁÉÍÓÚ]+)?\s*(-|–|A|AL)\s*\d{1,2}\s+DE\s+/i.test(L) && !parts.length) continue; // "16-22 DE NOVIEMBRE"
    const sec = SECS.find(([re]) => re.test(L));
    if (sec) { section = sec[1]; cur = null; continue; }
    // Canción + introducción
    let m = /^Canci[oó]n\s+(\d+)[^|]*\|\s*Palabras de introducci[oó]n/i.exec(L);
    if (m) { wk.songOpen = +m[1]; cur = null; continue; }
    m = /^Palabras de conclusi[oó]n[^|]*\|\s*Canci[oó]n\s+(\d+)/i.exec(L);
    if (m) { wk.songClose = +m[1]; cur = null; concl = true; continue; }
    if (/^Palabras de conclusi[oó]n/i.test(L)) { concl = true; cur = null; continue; }
    m = /^Canci[oó]n\s+(\d+)/i.exec(L);
    if (m && L.length < 40) {
      const n = +m[1];
      if (!section) wk.songOpen = wk.songOpen || n;
      else if (section === 'v' && concl) wk.songClose = n;
      else if (section === 'v' && !parts.some((p) => p.s === 'v')) wk.songMid = n;
      else if (section === 'v' && wk.songMid && parts.some((p) => p.s === 'v')) wk.songClose = n;
      else if (section === 'v') wk.songMid = n;
      cur = null;
      continue;
    }
    // parte numerada
    m = /^(\d{1,2})\.\s+(.+)$/.exec(L);
    if (m && section) {
      const mm = MINS.exec(m[2]);
      const rest = mm ? m[2].slice(mm.index + mm[0].length).trim() : '';
      cur = { s: section, num: +m[1], raw: (mm ? m[2].slice(0, mm.index) : m[2]).replace(/\s+/g, ' ').trim(), mins: mm ? +mm[1] : 0, notes: rest ? [rest] : [] };
      parts.push(cur);
      continue;
    }
    if (cur) {
      const mm = /^\(\s*(\d+)\s*mins?\.?\s*\)\s*(.*)$/i.exec(L);
      if (mm && !cur.mins) { cur.mins = +mm[1]; if (mm[2]) cur.notes.push(mm[2]); continue; }
      cur.notes.push(L);
      continue;
    }
    if (!section && !wk.reading && /^[1-3]?\s?[A-ZÁÉÍÓÚÜÑ ]{3,}\s\d+([,\-–]\s?\d+)*$/.test(L)) wk.reading = L;
  }
  // clasificar
  parts.forEach((p, i) => {
    const title = p.raw.replace(/[.\s]+$/, '');
    const notes = p.notes.join(' ');
    let k = 'talk', ref = '', t = title;
    if (p.s === 't') {
      if (/lectura de la biblia/i.test(title)) {
        k = 'lectura';
        t = 'Lectura de la Biblia';
        const r = /((?:[1-3]\s?)?[A-Za-zÁÉÍÓÚáéíóúñ]{2,12}\.?)\s+(\d+:\d+(?:\s?[-–,]\s?\d+)*)/.exec(notes);
        if (r) ref = expandRef(r[1] + ' ' + r[2]);
      } else if (/perlas/i.test(title)) k = 'perlas';
    } else if (p.s === 'm') {
      if (/^discurso/i.test(title)) k = 'discurso';
      else if (/qu[eé] dir[ií]as?\??$/i.test(title)) k = 'single';
      else k = 'pair';
    } else {
      if (/estudio b[ií]blico de la congregaci[oó]n/i.test(title)) {
        k = 'study';
        t = 'Estudio bíblico de la congregación';
        const sm = /\b([a-z]{2,6}\s+(?:cap\.|introducci[oó]n|secci[oó]n|lecci[oó]n|p[aá]rr)[^]*)$/i.exec(notes.replace(/^\(\s*\d+\s*mins?\.?\s*\)\s*/, ''));
        if (sm) ref = sm[1].replace(/[.\s]+$/, '').trim();
      }
    }
    wk.parts.push({ s: p.s, k, title: t, mins: p.mins || (k === 'study' ? 30 : 0), ref, a: k === 'pair' || k === 'study' ? ['', ''] : [''] });
  });
  if (wk.parts.length < 5 || !wk.parts.some((p) => p.s === 't') || !wk.parts.some((p) => p.s === 'v')) {
    const e = new Error('No se pudo reconocer la estructura de la guía de actividades.');
    e.code = 'PARSE';
    throw e;
  }
  return wk;
}
export function parseGuideText(text) {
  return parseGuide(text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
}

// ------------------------------------------------------------------ descarga
export function findGuideLink(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const as = [...doc.querySelectorAll('a[href]')].filter((a) => /\/wol\/d\/r\d+\/lp-s\/\d+/.test(a.getAttribute('href')));
  const pick = as.find((a) => /gu[ií]a de actividades|vida y ministerio/i.test(a.textContent));
  return pick ? new URL(pick.getAttribute('href'), BASE).href : null;
}

/** Devuelve la plantilla de la semana, o null si aún no está publicada. */
export async function fetchWeek(monday, fetchText) {
  let html;
  try {
    html = await fetchText(meetingsUrl(monday));
  } catch (e) {
    if (e && e.status === 404) return null;
    throw e;
  }
  const link = findGuideLink(html);
  if (!link) return null;
  const art = await fetchText(link);
  const wk = parseGuide(htmlToLines(art));
  wk.source = link;
  return wk;
}

/** Aplica una plantilla de la guía a un objeto de semana (conservando lo asignado si ya existía). */
export function weekFromTemplate(monday, tpl, newId) {
  return {
    date: monday,
    reading: tpl.reading,
    songOpen: tpl.songOpen,
    songMid: tpl.songMid,
    songClose: tpl.songClose,
    prayerOpen: '', president: '', prayerClose: '',
    noMeeting: '', note: '', source: tpl.source || '',
    parts: tpl.parts.map((p) => ({ ...p, a: p.a.slice(), id: newId() })),
  };
}

export function blankTemplate() {
  return {
    reading: '', songOpen: '', songMid: '', songClose: '',
    parts: [
      { s: 't', k: 'talk', title: '', mins: 10, ref: '', a: [''] },
      { s: 't', k: 'perlas', title: 'Busquemos perlas escondidas', mins: 10, ref: '', a: [''] },
      { s: 't', k: 'lectura', title: 'Lectura de la Biblia', mins: 4, ref: '', a: [''] },
      { s: 'm', k: 'pair', title: 'Empecemos conversaciones', mins: 3, ref: '', a: ['', ''] },
      { s: 'm', k: 'pair', title: 'Hagamos revisitas', mins: 4, ref: '', a: ['', ''] },
      { s: 'm', k: 'pair', title: 'Hagamos discípulos', mins: 5, ref: '', a: ['', ''] },
      { s: 'v', k: 'talk', title: '', mins: 15, ref: '', a: [''] },
      { s: 'v', k: 'study', title: 'Estudio bíblico de la congregación', mins: 30, ref: '', a: ['', ''] },
    ],
  };
}
export { addDays, parse };
