// Sugerencias automáticas de asignaciones: reparte parejo según quién lleva más tiempo sin cada tipo de parte.
import { diffDays } from './dates.js';
import { isFree } from './names.js';

const NEVER = 400;

/** Rol (capacidad) que se necesita para cada espacio de una semana. */
export function slotsOf(week) {
  const s = [];
  const push = (key, role, extra = {}) => s.push({ key, role, ...extra });
  push('president', 'presidente');
  push('prayerOpen', 'oracion');
  (week.parts || []).forEach((p, i) => {
    const k = `p${i}`;
    switch (p.k) {
      case 'study': push(k + '.0', 'conductor', { part: i, idx: 0 }); push(k + '.1', 'lector', { part: i, idx: 1 }); break;
      case 'pair': push(k + '.0', 'estudiante', { part: i, idx: 0, pair: true }); push(k + '.1', 'estudiante', { part: i, idx: 1, pair: true }); break;
      case 'lectura': push(k + '.0', 'lectura', { part: i, idx: 0 }); break;
      case 'perlas': push(k + '.0', 'tesoros', { part: i, idx: 0 }); break;
      case 'discurso': push(k + '.0', 'discurso', { part: i, idx: 0 }); break;
      case 'single': push(k + '.0', 'estudiante', { part: i, idx: 0 }); break;
      default: push(k + '.0', p.s === 'v' ? 'vida' : 'tesoros', { part: i, idx: 0 });
    }
  });
  push('prayerClose', 'oracion');
  return s;
}
export function getSlot(week, slot) {
  if (slot.part == null) return week[slot.key];
  return (week.parts[slot.part].a || [])[slot.idx] || '';
}
export function setSlot(week, slot, val) {
  if (slot.part == null) { week[slot.key] = val; return; }
  const p = week.parts[slot.part];
  p.a = p.a || [];
  while (p.a.length <= slot.idx) p.a.push('');
  p.a[slot.idx] = val;
}

/** Historial: por persona, última fecha por rol y última en cualquier parte (se ignora la semana `exceptDate`). */
export function buildHistory(weeks, exceptDate) {
  const h = {};
  const mark = (id, role, date) => {
    if (!id || isFree(id)) return;
    const e = (h[id] = h[id] || { any: '', roles: {}, count: 0 });
    if (!e.any || date > e.any) e.any = date;
    if (!e.roles[role] || date > e.roles[role]) e.roles[role] = date;
    e.count++;
  };
  for (const w of weeks) {
    if (w.date === exceptDate || w.noMeeting) continue;
    for (const sl of slotsOf(w)) mark(getSlot(w, sl), sl.role, w.date);
  }
  return h;
}

export function isUnavailable(person, date) {
  const end = (d) => d;
  for (const r of person.unavail || []) {
    if (r.from && r.to && date >= r.from && date <= end(r.to)) return true;
  }
  return false;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

export function eligible(person, role) {
  return person.active !== false && (person.caps || []).includes(role);
}

/** Puntaje: más alto = más "le toca". */
export function score(person, role, date, hist, busy) {
  const e = hist[person.id];
  const last = e && e.roles[role];
  const lastAny = e && e.any;
  const daysRole = last ? Math.min(NEVER, Math.abs(diffDays(date, last))) : NEVER;
  const daysAny = lastAny ? Math.min(NEVER, Math.abs(diffDays(date, lastAny))) : NEVER;
  let s = daysRole + 0.35 * daysAny + hash(date + person.id) * 3;
  if (daysAny < 8) s -= 120;           // acaba de tener parte la semana anterior/siguiente
  const b = busy[person.id] || 0;
  if (b) s -= role === 'oracion' ? 90 : 1000 * b;
  return s;
}

/** Lista ordenada de candidatos para un espacio (para el selector de personas). */
export function rank(people, role, date, weeks, week, opts = {}) {
  const hist = buildHistory(weeks, date);
  const busy = {};
  for (const sl of slotsOf(week)) {
    const v = getSlot(week, sl);
    if (v && !isFree(v) && sl !== opts.slot) busy[v] = (busy[v] || 0) + 1;
  }
  const out = people.map((p) => ({
    p,
    ok: eligible(p, role),
    off: isUnavailable(p, date),
    busy: busy[p.id] || 0,
    last: hist[p.id] && hist[p.id].roles[role] ? hist[p.id].roles[role] : '',
    score: score(p, role, date, hist, busy),
  }));
  out.sort((a, b) => (b.ok - a.ok) || (a.off - b.off) || (b.score - a.score) || a.p.display.localeCompare(b.p.display));
  return out;
}

const ORDER = ['conductor', 'presidente', 'tesoros', 'vida', 'lectura', 'discurso', 'oracion', 'lector', 'estudiante'];

/** Rellena los espacios vacíos de `week`. Modifica la semana. Devuelve cuántos llenó. */
export function suggestWeek(week, people, allWeeks, { overwrite = false } = {}) {
  if (week.noMeeting) return 0;
  const hist = buildHistory(allWeeks, week.date);
  const busy = {};
  const slots = slotsOf(week);
  if (overwrite) for (const sl of slots) setSlot(week, sl, '');
  for (const sl of slots) { const v = getSlot(week, sl); if (v && !isFree(v)) busy[v] = (busy[v] || 0) + 1; }
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  let filled = 0;
  const order = slots.slice().sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
  for (const sl of order) {
    if (getSlot(week, sl)) continue;
    let pool = people.filter((p) => eligible(p, sl.role) && !isUnavailable(p, week.date));
    if (sl.pair) {
      // la pareja debe ser del mismo género que su compañero/a (si ya hay uno)
      const part = week.parts[sl.part];
      const other = (part.a || [])[1 - sl.idx];
      if (other && byId[other]) pool = pool.filter((p) => p.g === byId[other].g);
    }
    if (!pool.length) continue;
    let best = null, bs = -Infinity;
    for (const p of pool) {
      const sc = score(p, sl.role, week.date, hist, busy);
      if (sc > bs) { bs = sc; best = p; }
    }
    if (best) {
      setSlot(week, sl, best.id);
      busy[best.id] = (busy[best.id] || 0) + 1;
      // anotarlo en el historial temporal para no repetirlo en espacios posteriores
      const e = (hist[best.id] = hist[best.id] || { any: '', roles: {}, count: 0 });
      e.any = week.date; e.roles[sl.role] = week.date;
      filled++;
    }
  }
  return filled;
}
