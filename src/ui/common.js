export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ico = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const I = {
  cal: ico('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>'),
  users: ico('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c2 .6 3.4 2.3 3.8 5.2"/>'),
  down: ico('<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>'),
  gear: ico('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  left: ico('<path d="M15 18l-6-6 6-6"/>'),
  right: ico('<path d="M9 18l6-6-6-6"/>'),
  wand: ico('<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 6.2L11 5M3 21l9-9"/><path d="M12.2 11.8L11 13"/>'),
  eye: ico('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
  trash: ico('<path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14M10 11v6M14 11v6"/>'),
  more: ico('<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>'),
  x: ico('<path d="M18 6L6 18M6 6l12 12"/>'),
  refresh: ico('<path d="M21 12a9 9 0 01-15.5 6.2M3 12A9 9 0 0118.5 5.8"/><path d="M21 4v5h-5M3 20v-5h5"/>'),
  check: ico('<path d="M20 6L9 17l-5-5"/>'),
  user: ico('<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>'),
  sun: ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: ico('<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>'),
  lock: ico('<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 018 0v4"/>'),
  help: ico('<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.3a2.9 2.9 0 015.6 1c0 1.9-2.8 2.4-2.8 4M12 17.6v.1"/>'),
  pencil: ico('<path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z"/>'),
  phone: ico('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
  monitor: ico('<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  shield: ico('<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>'),
  doc: ico('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
};

export function initials(name) {
  const t = String(name || '?').trim().split(/\s+/);
  return ((t[0] || '?')[0] + (t.length > 1 ? t[t.length - 1][0] : '')).toUpperCase();
}

let toastTimer;
export function toast(msg, ms = 3400) {
  const box = document.getElementById('toast');
  const el = document.createElement('div');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export function openModal(html, { wide = false } = {}) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="overlay" data-a="overlay"><div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.style.overflow = 'hidden';
  return m.firstElementChild;
}
export function closeModal() {
  document.getElementById('modal').innerHTML = '';
  document.body.style.overflow = '';
}
export const modalOpen = () => !!document.getElementById('modal').firstElementChild;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
