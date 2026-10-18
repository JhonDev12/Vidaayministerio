export function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Una asignación guarda el id de una persona ("p12") o un texto libre ("~Nombre"). */
export function isFree(v) {
  return typeof v === 'string' && v.startsWith('~');
}
export function nameOf(v, peopleById) {
  if (!v) return '';
  if (isFree(v)) return v.slice(1);
  const p = peopleById[v];
  return p ? p.display || p.name : '';
}
