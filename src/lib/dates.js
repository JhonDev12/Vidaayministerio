// Utilidades de fechas (todo en UTC para evitar saltos por zona horaria / horario de verano)
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function fmt(d) {
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}
export function addDays(s, n) {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}
export function mondayOf(s) {
  const d = parse(s);
  const wd = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - wd);
  return fmt(d);
}
export function todayStr() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}
/** Semana ISO-8601 (la que usa wol.jw.org en /meetings/.../AÑO/SEMANA) */
export function isoWeek(s) {
  const d = parse(s);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3); // jueves de esa semana
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return { year, week };
}
export function diffDays(a, b) {
  return Math.round((parse(a) - parse(b)) / 86400000);
}

/** "21 al 27 de Septiembre de 2026" estilo del PDF original */
export function weekTitle(monday) {
  const a = parse(monday);
  const b = parse(addDays(monday, 6));
  const da = a.getUTCDate(), db = b.getUTCDate();
  const ma = MESES[a.getUTCMonth()], mb = MESES[b.getUTCMonth()];
  const ya = a.getUTCFullYear(), yb = b.getUTCFullYear();
  if (ya !== yb) return `Semana del ${da} de ${ma} de ${ya} al ${db} de ${mb} de ${yb}`;
  if (ma !== mb) return `Semana del ${da} de ${ma} al ${db} de ${mb} de ${yb}`;
  return `Semana del ${da} al ${db} de ${ma} de ${yb}`;
}
/** versión corta: "21–27 sep" */
export function weekShort(monday) {
  const a = parse(monday), b = parse(addDays(monday, 6));
  const m3 = (d) => MESES[d.getUTCMonth()].slice(0, 3).toLowerCase();
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${b.getUTCDate()} ${m3(a)}`;
  return `${a.getUTCDate()} ${m3(a)} – ${b.getUTCDate()} ${m3(b)}`;
}
export function monthKey(monday) {
  // La semana pertenece al mes en que cae su lunes
  return monday.slice(0, 7);
}
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return MESES[m - 1] + ' ' + y;
}
