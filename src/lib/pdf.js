import { jsPDF } from 'jspdf';
import { registerFonts, ICONS } from './fonts.js';
import { layoutWeek, PAGE } from './layout.js';

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

/** Crea el PDF (Blob) con una semana por página, idéntico al diseño original. */
export function makePdf(weeks, peopleById, opts = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  registerFonts(doc);
  doc.setProperties({ title: opts.title || 'Programa de reuniones', creator: 'Programa VyM' });
  weeks.forEach((w, i) => {
    if (i > 0) doc.addPage('letter', 'portrait');
    const lay = layoutWeek(w, peopleById, opts);
    for (const it of lay.items) {
      if (it.type === 'text') {
        doc.setFont('DejaVu', it.bold ? 'bold' : 'normal');
        doc.setFontSize(it.size);
        doc.setTextColor(...hex(it.color));
        doc.text(it.text, it.x, it.y, { align: it.anchor === 'end' ? 'right' : 'left', baseline: 'alphabetic' });
      } else if (it.type === 'rect') {
        doc.setFillColor(...hex(it.color));
        doc.rect(it.x, it.y, it.w, it.h, 'F');
      } else if (it.type === 'image') {
        doc.addImage(ICONS[it.name], 'PNG', it.x, it.y, it.w, it.h, it.name, 'FAST');
      }
    }
  });
  return doc;
}
export function pdfBlob(weeks, peopleById, opts) {
  return makePdf(weeks, peopleById, opts).output('blob');
}
export { PAGE };
