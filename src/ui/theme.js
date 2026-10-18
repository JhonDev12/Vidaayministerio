// Modo claro / oscuro / automático (se recuerda en este dispositivo)
const KEY = 'vym.theme';
export const getTheme = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } };
export function isDark() {
  const t = getTheme();
  return t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
}
export function applyTheme(t = getTheme()) {
  const r = document.documentElement;
  if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', isDark() ? '#0e121b' : '#1c4faa');
}
export function setTheme(t) { try { localStorage.setItem(KEY, t); } catch (e) { /* sin acceso */ } applyTheme(t); }
export function toggleTheme() { setTheme(isDark() ? 'light' : 'dark'); }
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());
