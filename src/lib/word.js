// Exportación a Word (.docx) con el mismo diseño del PDF. Las fuentes DejaVu van incrustadas.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, TabStopType,
  AlignmentType, ImageRun, VerticalAlign, HeightRule, TableLayoutType, LineRuleType, CharacterSet,
} from 'docx';
import { buildRows, SECTIONS } from './model.js';
import JSZip from 'jszip';
import { FONT_B64, ICONS, b64ToBytes, dataUrlToBytes } from './fonts.js';

const R = 'DejaVu Sans';
const B = 'DejaVu Sans Bold'; // solo como nombre interno de la fuente en negrita incrustada
const tw = (pt) => Math.round(pt * 20);
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NOBORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const CELLNB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const ZERO = { top: 0, bottom: 0, left: 0, right: 0 };
// Word solo admite medios puntos: 9.375 -> 9.5, 10.875 -> 11, 12.75 -> 13, 11.25 -> 11.5
const SZ = { row: 19, head: 26, cong: 23, sub: 23, sec: 22 };
const COLW = { a: tw(28.5), b: tw(3), c: tw(312), d: tw(540) - tw(28.5) - tw(3) - tw(312) };

function run(t, o = {}) {
  return new TextRun({ text: t, font: R, bold: !!o.bold, size: o.size || SZ.row, color: (o.color || '1A1A1A').replace('#', '') });
}
const exact = (pt) => ({ line: tw(pt), lineRule: LineRuleType.EXACT });

function rowTable(rows) {
  const trs = [];
  for (const it of rows.items) {
    if (it.k === 'section') {
      const s = SECTIONS[it.key];
      trs.push(new TableRow({
        height: { value: tw(25.5), rule: HeightRule.EXACT },
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: COLW.a, type: WidthType.DXA }, borders: CELLNB, margins: ZERO, verticalAlign: VerticalAlign.TOP,
            children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new ImageRun({ type: 'png', data: dataUrlToBytes(ICONS[s.icon]), transformation: { width: 26, height: 26 } })] })],
          }),
          new TableCell({
            width: { size: COLW.b + COLW.c + COLW.d, type: WidthType.DXA }, columnSpan: 3, borders: CELLNB, margins: ZERO, verticalAlign: VerticalAlign.TOP,
            children: [new Paragraph({ spacing: { before: tw(3.4), after: 0, ...exact(12.66) }, children: [run(s.title, { bold: true, size: SZ.sec, color: s.color })] })],
          }),
        ],
      }));
      continue;
    }
    const names = it.right.map((ln, i) => {
      const last = i === it.right.length - 1;
      const sp = it.study
        ? { before: i === 0 ? tw(0.9) : tw(1.8), after: last ? tw(6.9) : 0, ...exact(10.91) }
        : { before: 0, after: tw(6), ...exact(10.91) };
      return new Paragraph({ alignment: AlignmentType.RIGHT, spacing: sp, children: ln.map((r) => run(r.t, { bold: !!r.b })) });
    });
    if (!names.length) names.push(new Paragraph({ spacing: { before: 0, after: tw(6), ...exact(10.91) }, children: [] }));
    trs.push(new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: COLW.a + COLW.b, type: WidthType.DXA }, columnSpan: 2, borders: CELLNB, margins: ZERO,
          children: [new Paragraph({ spacing: { before: 0, after: tw(6), ...exact(10.91) }, children: [run(it.time, { bold: true })] })],
        }),
        new TableCell({
          width: { size: COLW.c, type: WidthType.DXA }, borders: CELLNB, margins: ZERO,
          children: [new Paragraph({
            spacing: { before: 0, after: tw(6), ...exact(10.91) },
            indent: { left: tw(9), hanging: tw(9) },
            tabStops: [{ type: TabStopType.LEFT, position: tw(9) }],
            children: [run('•', { color: '#444444' }), new TextRun({ text: '\t', font: R, size: SZ.row }), run(it.title)],
          })],
        }),
        new TableCell({ width: { size: COLW.d, type: WidthType.DXA }, borders: CELLNB, margins: ZERO, children: names }),
      ],
    }));
  }
  return new Table({
    width: { size: tw(540), type: WidthType.DXA },
    columnWidths: [COLW.a, COLW.b, COLW.c, COLW.d],
    layout: TableLayoutType.FIXED,
    borders: NOBORDERS,
    margins: ZERO,
    rows: trs,
  });
}

export function buildDocx(weeks, peopleById, opts = {}) {
  const children = [];
  weeks.forEach((w, i) => {
    const rows = buildRows(w, peopleById, opts);
    children.push(new Paragraph({
      pageBreakBefore: i > 0,
      tabStops: [{ type: TabStopType.RIGHT, position: tw(540) }],
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '1A1A1A', space: 4 } },
      children: [run(rows.head, { bold: true, size: SZ.head }), new TextRun({ text: '\t', font: R, size: SZ.row }), run(rows.cong, { bold: true, size: SZ.cong })],
    }));
    children.push(new Paragraph({
      spacing: { before: tw(7.6), after: tw(11.3) },
      children: [run(rows.sub, { bold: true, size: SZ.sub, color: '#1c4faa' })],
    }));
    if (rows.banner) {
      children.push(new Paragraph({ children: [run(rows.banner, { bold: true, size: SZ.sub, color: '#b5342e' })], spacing: { after: tw(8) } }));
      children.push(new Paragraph({ children: [run('No hay reunión de entre semana esta semana.')] }));
    } else {
      children.push(rowTable(rows));
    }
  });
  return new Document({
    creator: 'Programa VyM',
    title: opts.title || 'Programa de reuniones',
    fonts: [
      { name: R, data: b64ToBytes(FONT_B64.regular), characterSet: CharacterSet.ANSI },
      { name: B, data: b64ToBytes(FONT_B64.bold), characterSet: CharacterSet.ANSI },
    ],
    styles: { default: { document: { run: { font: R, size: SZ.row } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: tw(20.8), bottom: tw(36), left: tw(36), right: tw(36), header: 0, footer: 0 } } },
      children,
    }],
  });
}
// La librería solo sabe incrustar la variante "regular" de cada fuente: movemos la negrita a <w:embedBold>
// de la misma familia para que Word use la negrita verdadera aunque DejaVu no esté instalada.
async function patchFonts(data) {
  const zip = await JSZip.loadAsync(data);
  let xml = await zip.file('word/fontTable.xml').async('string');
  const m = /<w:font w:name="DejaVu Sans Bold">[\s\S]*?<w:embedRegular ([^>]*)\/>[\s\S]*?<\/w:font>/.exec(xml);
  if (m) {
    xml = xml.replace(m[0], '');
    xml = xml.replace(/(<w:embedRegular [^>]*\/>)(<\/w:font>)/, `$1<w:embedBold ${m[1]}/>$2`);
    zip.file('word/fontTable.xml', xml);
  }
  return zip;
}
export async function docxBlob(weeks, peopleById, opts) {
  const raw = await (await Packer.toBlob(buildDocx(weeks, peopleById, opts))).arrayBuffer();
  const zip = await patchFonts(raw);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}
export async function docxBuffer(weeks, peopleById, opts) {
  const raw = await (await Packer.toBlob(buildDocx(weeks, peopleById, opts))).arrayBuffer();
  const zip = await patchFonts(raw);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
