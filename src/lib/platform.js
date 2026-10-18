// Diferencias entre plataformas: descarga de archivos y acceso a internet (jw.org)
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNative = () => Capacitor.isNativePlatform();
export const isElectron = () => typeof window !== 'undefined' && !!window.native;

/** Descarga de texto con el mejor método disponible en cada plataforma. */
export async function fetchText(url) {
  if (isElectron() && window.native.fetchText) {
    const r = await window.native.fetchText(url);
    if (r.status >= 400) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return r.text;
  }
  const tryFetch = async (u) => {
    const r = await fetch(u, { credentials: 'omit' });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return r.text();
  };
  try {
    return await tryFetch(url);
  } catch (e) {
    if (e && e.status) throw e;           // el sitio respondió (404, etc.): no es un problema de red
    if (isNative()) throw e;
    // Navegador (iPhone / web): jw.org no permite CORS -> intentamos servicios puente públicos
    const proxies = [
      (u) => 'https://corsproxy.io/?' + encodeURIComponent(u),
      (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    ];
    let last = e;
    for (const p of proxies) {
      try { return await tryFetch(p(url)); } catch (e2) { last = e2; }
    }
    const err = new Error('No se pudo conectar con jw.org desde este navegador.');
    err.code = 'NETWORK';
    err.cause = last;
    throw err;
  }
}

const isMobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.platform));

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

/** Guarda / comparte un archivo. Devuelve un texto corto con lo que pasó. */
export async function saveFile(blob, filename) {
  if (isNative()) {
    const data = await blobToBase64(blob);
    const w = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
    await Share.share({ title: filename, text: filename, url: w.uri, dialogTitle: 'Guardar o enviar ' + filename });
    return 'Elige dónde guardarlo o con qué app abrirlo.';
  }
  const file = new File([blob], filename, { type: blob.type });
  if (isMobileBrowser() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'Elige dónde guardarlo o con qué app abrirlo.';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'Cancelado.';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
  return 'Descarga iniciada: ' + filename;
}
