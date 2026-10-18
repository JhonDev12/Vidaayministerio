// Motor de diseño: convierte una semana en primitivas (texto, rectángulos, imágenes) con las
// coordenadas medidas del PDF original (Letter, 612 x 792 pt). Lo usan la vista previa (SVG) y el PDF.
import { buildRows, SECTIONS } from './model.js';
import { measurer } from './fonts.js';

export const PAGE = { w: 612, h: 792 };
const C = {
  left: 36, right: 576,
  ink: '#1a1a1a', bullet: '#444444', sub: '#1c4faa',
  size: 9.375, headSize: 12.75, congSize: 11.25, subSize: 11.25, secSize: 10.875,
  ruleTop: 40.34, ruleH: 1.5,
  headBase: 32.8, subBase: 59.8, firstRow: 82.4,
  row: 16.9, line: 10.91, studyExtra: 14.5,
  secGap: 8.25, secText: 13.5, secAfter: 20.7, icon: 19.5,
  bulletX: 67.5, textX: 76.5, secTextX: 64.5,
  titleW: 300,
};

/** @returns {{w:number,h:number,items:Array}} */
export function layoutWeek(week, peopleById, opts = {}) {
  const measure = measurer();
  const rows = buildRows(week, peopleById, opts);
  const items = [];
  const text = (x, y, t, o = {}) => items.push({ type: 'text', x, y, text: t, bold: !!o.bold, size: o.size || C.size, color: o.color || C.ink, anchor: o.anchor || 'start' });

  text(C.left, C.headBase, rows.head, { bold: true, size: C.headSize });
  text(C.right, C.headBase, rows.cong, { bold: true, size: C.congSize, anchor: 'end' });
  items.push({ type: 'rect', x: C.left, y: C.ruleTop, w: C.right - C.left, h: C.ruleH, color: C.ink });
  text(C.left, C.subBase, rows.sub, { bold: true, size: C.subSize, color: C.sub });

  let y = C.firstRow;           // baseline de la próxima fila
  let lastBase = null;          // baseline efectivo (última línea) de la fila anterior
  if (rows.banner) {
    text(C.left, y, rows.banner, { bold: true, size: C.subSize, color: '#b5342e' });
    text(C.left, y + 22, 'No hay reunión de entre semana esta semana.', { size: C.size });
    return { w: PAGE.w, h: PAGE.h, items, rows };
  }

  for (const it of rows.items) {
    if (it.k === 'section') {
      const s = SECTIONS[it.key];
      const iconTop = lastBase + C.secGap;
      items.push({ type: 'image', x: C.left, y: iconTop, w: C.icon, h: C.icon, name: s.icon });
      const base = iconTop + C.secText;
      text(C.secTextX, base, s.title, { bold: true, size: C.secSize, color: s.color });
      y = base + C.secAfter;
      continue;
    }
    // fila
    // ancho disponible para el título (no invadir los nombres)
    let nameW = 0;
    for (const ln of it.right) {
      const w = ln.reduce((a, r) => a + measure(r.t, !!r.b, C.size), 0);
      if (w > nameW) nameW = w;
    }
    const maxW = Math.min(C.titleW, C.right - nameW - 12 - C.textX);
    const lines = wrap(it.title, maxW, measure);
    text(C.left, y, it.time, { bold: true });
    text(C.bulletX, y, '•', { color: C.bullet });
    lines.forEach((ln, i) => text(C.textX, y + i * C.line, ln));
    // nombres (alineados a la derecha)
    it.right.forEach((ln, i) => {
      const yy = y + (it.study ? 0.9 + i * 12.7 : 0);
      const total = ln.reduce((a, r) => a + measure(r.t, !!r.b, C.size), 0);
      let x = C.right - total;
      for (const r of ln) {
        text(x, yy, r.t, { bold: !!r.b });
        x += measure(r.t, !!r.b, C.size);
      }
    });
    const extra = it.study && it.right.length > 1 ? C.studyExtra : (lines.length - 1) * C.line;
    lastBase = y + extra;
    y = lastBase + C.row;
  }
  return { w: PAGE.w, h: PAGE.h, items, rows };
}

export function wrap(str, maxW, measure) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && measure(t, false, C.size) > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export const LAYOUT = C;
