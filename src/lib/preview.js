import { FONT_B64, ICONS } from './fonts.js';
import { layoutWeek, PAGE } from './layout.js';
import { esc } from '../ui/common.js';

let fontsInjected = false;
export function injectFonts() {
  if (fontsInjected) return;
  fontsInjected = true;
  const st = document.createElement('style');
  st.textContent =
    `@font-face{font-family:DejaVuPV;font-weight:400;src:url(data:font/ttf;base64,${FONT_B64.regular}) format("truetype")}` +
    `@font-face{font-family:DejaVuPV;font-weight:700;src:url(data:font/ttf;base64,${FONT_B64.bold}) format("truetype")}`;
  document.head.appendChild(st);
}

/** Devuelve el SVG (cadena) de una semana: es exactamente lo que saldrá en el PDF. */
export function weekSvg(week, peopleById, opts) {
  injectFonts();
  const lay = layoutWeek(week, peopleById, opts);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE.w} ${PAGE.h}" role="img" aria-label="Vista previa de la página"><rect width="${PAGE.w}" height="${PAGE.h}" fill="#fff"/>`;
  for (const it of lay.items) {
    if (it.type === 'text') {
      s += `<text x="${it.x}" y="${it.y}" font-family="DejaVuPV, 'DejaVu Sans', sans-serif" font-size="${it.size}" font-weight="${it.bold ? 700 : 400}" fill="${it.color}"${it.anchor === 'end' ? ' text-anchor="end"' : ''} xml:space="preserve">${esc(it.text)}</text>`;
    } else if (it.type === 'rect') {
      s += `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${it.color}"/>`;
    } else if (it.type === 'image') {
      s += `<image x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" href="${ICONS[it.name]}"/>`;
    }
  }
  return s + '</svg>';
}
