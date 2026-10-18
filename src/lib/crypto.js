// Cifrado de los datos de la congregación (AES-GCM + PBKDF2). Sin el código, el archivo es ilegible.
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const cleanCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function keyFrom(code, salt, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(cleanCode(code)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptJson(obj, code, iter = 250000) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await keyFrom(code, salt, iter);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(obj))));
  return { v: 1, i: iter, s: b64(salt), n: b64(iv), d: b64(ct) };
}
export async function decryptJson(box, code) {
  const k = await keyFrom(code, unb64(box.s), box.i);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.n) }, k, unb64(box.d));
    return JSON.parse(dec.decode(pt));
  } catch (e) { throw new Error('Código incorrecto'); }
}
// PIN local (solo bloquea la pantalla de la app)
export async function hashPin(pin, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey('raw', enc.encode('pin:' + pin), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, base, 256));
  return { salt: b64(salt), hash: b64(bits) };
}
