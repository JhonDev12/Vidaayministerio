// Compila la app web a ./www (un solo app.js + app.css + index.html + iconos)
import esbuild from 'esbuild';
import fs from 'fs';
const watch = process.argv.includes('--watch');
fs.mkdirSync('www', { recursive: true });
for (const f of fs.readdirSync('public')) fs.copyFileSync('public/' + f, 'www/' + f);
const cfg = {
  entryPoints: ['src/main.js'], bundle: true, minify: !watch, outfile: 'www/app.js', format: 'iife', target: ['es2020'],
  loader: { '.ttf': 'base64', '.png': 'dataurl', '.json': 'json' }, define: { 'process.env.NODE_ENV': '"production"', global: 'window' },
  inject: ['src/lib/buffer-shim.js'], logLevel: 'info', legalComments: 'none', splitting: false,
};
if (watch) { const ctx = await esbuild.context(cfg); await ctx.watch(); } else await esbuild.build(cfg);
