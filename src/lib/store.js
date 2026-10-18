// Estado de la aplicación + guardado local (localStorage; con copia en memoria si el navegador lo bloquea)
import { newPartId } from './model.js';

const KEY = 'vym.state.v1';
let state = null;
let memory = null;
const subs = new Set();
let timer = null;

export const DEFAULT_SETTINGS = {
  congregation: 'Congregación La Floresta',
  startTime: '18:30',
  autoSuggest: true,     // al traer semanas nuevas, proponer asignaciones automáticamente
  autoCheck: true,       // buscar semanas nuevas al abrir la app (1 vez al día)
  lastCheck: '',
};

function fresh(seed) {
  if (!seed) return { v: 1, settings: { ...DEFAULT_SETTINGS }, people: [], weeks: {}, nextId: 1 };
  const weeks = {};
  for (const w of seed.weeks) {
    weeks[w.date] = { ...w, parts: w.parts.map((p) => ({ ...p, id: newPartId() })) };
  }
  return { v: 1, settings: { ...DEFAULT_SETTINGS }, people: JSON.parse(JSON.stringify(seed.persons)), weeks, nextId: seed.persons.length + 1 };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* sin acceso */ }
  return memory ? JSON.parse(memory) : null;
}
function write() {
  const s = JSON.stringify(state);
  memory = s;
  try { localStorage.setItem(KEY, s); } catch (e) { /* sin acceso: queda en memoria */ }
}

export const hasState = () => !!state;
/** Crea los datos iniciales: con la información de la congregación (descifrada) o en blanco. */
export function create(seed) { state = fresh(seed); write(); subs.forEach((f) => f(state)); return state; }
export function init() {
  if (state) return state;
  state = read();
  if (!state) return null;
  state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };
  if (!state.nextId) state.nextId = state.people.length + 1000;
  write();
  return state;
}
export const get = () => state;
export function update(fn) {
  fn(state);
  clearTimeout(timer);
  timer = setTimeout(write, 120);
  subs.forEach((f) => f(state));
}
export function flush() { clearTimeout(timer); write(); }
export function subscribe(f) { subs.add(f); return () => subs.delete(f); }

export function peopleById() {
  const m = {};
  for (const p of state.people) m[p.id] = p;
  return m;
}
export function sortedWeeks() {
  return Object.values(state.weeks).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function newPerson(o = {}) {
  const id = 'p' + state.nextId++;
  return {
    id, name: '', display: '', group: 0, gr: '', priv: '', g: 'H', caps: [], active: true, note: '', unavail: [], ...o,
  };
}

export const CAPS = [
  ['presidente', 'Presidente'],
  ['oracion', 'Oración'],
  ['tesoros', 'Tesoros / Perlas'],
  ['lectura', 'Lectura de la Biblia'],
  ['estudiante', 'Demostraciones (Seamos mejores maestros)'],
  ['discurso', 'Discurso (hermanos)'],
  ['vida', 'Parte de Nuestra vida cristiana'],
  ['conductor', 'Conductor del estudio'],
  ['lector', 'Lector del estudio'],
];
export function defaultCaps(g, kind = 'publicador') {
  if (g === 'M') return ['estudiante'];
  const base = ['oracion', 'lectura', 'estudiante', 'discurso', 'lector'];
  if (kind === 'anciano') return [...base, 'presidente', 'tesoros', 'vida', 'conductor'];
  if (kind === 'siervo') return [...base, 'presidente', 'tesoros', 'vida'];
  return base;
}

// ---- copia de seguridad
export function exportBackup() {
  return JSON.stringify({ app: 'programa-vym', exportedAt: new Date().toISOString(), data: state }, null, 1);
}
export function importBackup(text) {
  const o = JSON.parse(text);
  const d = o && o.data ? o.data : o;
  if (!d || !Array.isArray(d.people) || typeof d.weeks !== 'object') throw new Error('El archivo no parece una copia de seguridad válida.');
  state = d;
  state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };
  if (!state.nextId) state.nextId = state.people.length + 1000;
  write();
  subs.forEach((f) => f(state));
}
export function resetAll(seed) {
  state = fresh(seed);
  write();
  subs.forEach((f) => f(state));
}
export function clearWeeks() {
  state.weeks = {};
  write();
  subs.forEach((f) => f(state));
}
