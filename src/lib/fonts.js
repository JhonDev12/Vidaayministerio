import { jsPDF } from 'jspdf';
import regular from '../../assets/DejaVuSans.ttf';
import bold from '../../assets/DejaVuSans-Bold.ttf';
import boldW from '../../assets/DejaVuSansBoldW.ttf';
import iconTesoros from '../../assets/icon_tesoros.png';
import iconMaestros from '../../assets/icon_maestros.png';
import iconVida from '../../assets/icon_vida.png';

export const FONT_B64 = { regular, bold, boldW };
export const ICONS = { tesoros: iconTesoros, maestros: iconMaestros, vida: iconVida };

export function registerFonts(doc) {
  doc.addFileToVFS('DejaVuSans.ttf', regular);
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', bold);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
}

let measureDoc = null;
export function measurer() {
  if (!measureDoc) {
    measureDoc = new jsPDF({ unit: 'pt', format: 'letter' });
    registerFonts(measureDoc);
  }
  return (text, isBold, size) => {
    measureDoc.setFont('DejaVu', isBold ? 'bold' : 'normal');
    measureDoc.setFontSize(size);
    return measureDoc.getTextWidth(text);
  };
}

export function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function dataUrlToBytes(url) {
  return b64ToBytes(url.slice(url.indexOf(',') + 1));
}
