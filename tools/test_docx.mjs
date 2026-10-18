import fs from 'fs';
import { docxBuffer } from '../src/lib/word.js';
const seed = JSON.parse(fs.readFileSync('/home/claude/programa/privado/seed.json'));
const byId = Object.fromEntries(seed.persons.map(p => [p.id, p]));
const dates = process.argv[3].split(',');
const ws = seed.weeks.filter(w => dates.includes(w.date));
const buf = await docxBuffer(ws, byId, {});
fs.writeFileSync(process.argv[2], buf);
console.log('ok', ws.length);
