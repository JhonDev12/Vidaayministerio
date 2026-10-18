// Modelo de una semana y conversión a "filas" listas para dibujar (PDF, vista previa y Word)
import { nameOf } from './names.js';
import { weekTitle } from './dates.js';

export const SECTIONS = {
  t: { title: 'TESOROS DE LA BIBLIA', color: '#1c8f8f', icon: 'tesoros' },
  m: { title: 'SEAMOS MEJORES MAESTROS', color: '#c98b1e', icon: 'maestros' },
  v: { title: 'NUESTRA VIDA CRISTIANA', color: '#b5342e', icon: 'vida' },
};

export function fmtTime(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return ((h + 11) % 12 + 1) + ':' + String(m).padStart(2, '0');
}

export function parseStart(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : 18 * 60 + 30;
}

/** Calcula la hora de inicio de cada elemento siguiendo el patrón del programa original. */
export function schedule(week, startMin) {
  let t = startMin;
  const out = { parts: [] };
  out.songOpen = t; t += 5;
  out.intro = t; t += 1;
  const parts = week.parts || [];
  let lastM = -1;
  parts.forEach((p, i) => { if (p.s === 'm') lastM = i; });
  parts.forEach((p, i) => { if (p.s === 't') { out.parts[i] = t; t += +p.mins || 0; if (p.k === 'lectura') t += 1; } });
  parts.forEach((p, i) => { if (p.s === 'm') { out.parts[i] = t; t += +p.mins || 0; t += i === lastM ? 2 : 1; } });
  out.songMid = t; t += 4;
  parts.forEach((p, i) => { if (p.s === 'v') { out.parts[i] = t; t += +p.mins || 0; } });
  out.concl = t; t += 3 + 1;
  out.songClose = t;
  return out;
}

export function partTitle(p, n) {
  let s = `${n}. ${p.title}`;
  if (p.k === 'lectura' && p.ref) s += ` — ${p.ref}`;
  if (p.k === 'study' && p.ref) s += `: ${p.ref}`;
  if (p.mins) s += ` (${p.mins}\u00a0min.)`;
  return s;
}

const songText = (n, extra) => 'Canción' + (n ? ' ' + n : '') + (extra ? ' ' + extra : '');

/**
 * Devuelve { head, sub, banner, items }.
 * items: {k:'section', key} | {k:'row', time, title, right:[ [ {t,b} ... ] ... ], study:bool}
 */
export function buildRows(week, peopleById, opts = {}) {
  const cong = opts.congregation || 'Congregación La Floresta';
  const startMin = parseStart(opts.startTime || '18:30');
  const nm = (id) => nameOf(id, peopleById);
  const reading = (week.reading || '').trim();
  const sub = weekTitle(week.date) + '  |  ' + reading;
  const res = {
    head: 'Programa para la reunión de entre semana',
    cong,
    sub: reading ? sub : weekTitle(week.date),
    banner: week.noMeeting ? week.noMeeting : '',
    items: [],
  };
  if (week.noMeeting) return res;

  const tm = schedule(week, startMin);
  const lab = (label, id) => {
    const n = nm(id);
    return n ? [{ t: label, b: true }, { t: ' ' + n }] : [];
  };
  const parts = week.parts || [];
  const rowsOf = (p) => {
    switch (p.k) {
      case 'pair': {
        const ns = (p.a || []).map(nm).filter(Boolean);
        return ns.length ? [[{ t: ns.join(' & ') }]] : [];
      }
      case 'study': {
        const l = [];
        const c = lab('Conductor', p.a && p.a[0]);
        const r = lab('Lector', p.a && p.a[1]);
        if (c.length) l.push(c);
        if (r.length) l.push(r);
        return l;
      }
      default: {
        const n = nm(p.a && p.a[0]);
        return n ? [[{ t: n }]] : [];
      }
    }
  };

  res.items.push({ k: 'row', time: fmtTime(tm.songOpen), title: songText(week.songOpen, 'y oración inicial'), right: [lab('Oración', week.prayerOpen)].filter((x) => x.length) });
  res.items.push({ k: 'row', time: fmtTime(tm.intro), title: 'Palabras de introducción (1 min.)', right: [lab('Presidente', week.president)].filter((x) => x.length) });

  let n = 0;
  const secDone = {};
  const sectionOnce = (key) => { if (!secDone[key]) { secDone[key] = true; res.items.push({ k: 'section', key }); } };
  parts.forEach((p, i) => {
    n += 1;
    sectionOnce(p.s);
    if (p.s === 'v' && !secDone.vSong) {
      secDone.vSong = true;
      res.items.push({ k: 'row', time: fmtTime(tm.songMid), title: songText(week.songMid), right: [] });
    }
    res.items.push({ k: 'row', time: fmtTime(tm.parts[i]), title: partTitle(p, n), right: rowsOf(p), study: p.k === 'study', part: i });
  });
  if (!secDone.v) {
    sectionOnce('v');
    res.items.push({ k: 'row', time: fmtTime(tm.songMid), title: songText(week.songMid), right: [] });
  }
  res.items.push({ k: 'row', time: fmtTime(tm.concl), title: 'Palabras de conclusión (3 min.)', right: [] });
  res.items.push({ k: 'row', time: fmtTime(tm.songClose), title: songText(week.songClose, 'y oración final'), right: [lab('Oración', week.prayerClose)].filter((x) => x.length) });
  return res;
}

/** ¿Cuántas asignaciones faltan en una semana? */
export function missingCount(week) {
  if (week.noMeeting) return 0;
  let m = 0;
  if (!week.prayerOpen) m++;
  if (!week.president) m++;
  if (!week.prayerClose) m++;
  for (const p of week.parts || []) {
    const need = p.k === 'pair' || p.k === 'study' ? 2 : 1;
    for (let i = 0; i < need; i++) if (!(p.a && p.a[i])) m++;
  }
  return m;
}

export function newPartId() {
  return 'x' + Math.random().toString(36).slice(2, 8);
}
