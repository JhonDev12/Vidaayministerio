// Uso: node tools/encrypt_seed.mjs "CODIGO"   (lee privado/seed.json y escribe src/data/seed.enc.json)
import fs from 'fs';
import { webcrypto } from 'crypto';
globalThis.crypto ??= webcrypto;
const { encryptJson } = await import('../src/lib/crypto.js');
const code = process.argv[2] || fs.readFileSync('privado/CODIGO.txt', 'utf8').trim();
const seed = JSON.parse(fs.readFileSync('privado/seed.json', 'utf8'));
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/seed.enc.json', JSON.stringify(await encryptJson(seed, code)));
console.log('seed.enc.json listo (', seed.persons.length, 'personas,', seed.weeks.length, 'semanas )');
