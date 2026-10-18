import fs from 'fs';
import { makePdf } from '../src/lib/pdf.js';
const seed = JSON.parse(fs.readFileSync('/home/claude/programa/privado/seed.json'));
const byId = Object.fromEntries(seed.persons.map(p => [p.id, p]));
const dates = process.argv[3] ? process.argv[3].split(',') : seed.weeks.map(w => w.date);
const ws = seed.weeks.filter(w => dates.includes(w.date));
const doc = makePdf(ws, byId, {});
fs.writeFileSync(process.argv[2], Buffer.from(doc.output('arraybuffer')));
console.log('ok', ws.length, 'páginas');
