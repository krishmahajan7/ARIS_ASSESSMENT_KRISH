// Turn a tools/compare.js text table into a Markdown table, keeping chosen rows.
//   node tools/md-table.js tools/results/f1-fair-chance.txt "Unemployment,New grads placed" "Baseline,Fair-Chance,..."
'use strict';
const fs = require('fs');
const [file, rowsArg, namesArg] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const head = lines.findIndex((l) => l.startsWith('Metric'));
const want = rowsArg ? rowsArg.split(',') : null;
const body = lines.slice(head + 2).filter((l) => l.includes('|') && (!want || want.some((w) => l.startsWith(w))));
const cols = lines[head].split('|').map((s) => s.trim());
const names = namesArg ? namesArg.split(',') : null;
let k = 0;
const header = cols.map((c, i) => i === 0 ? 'Metric' : c.startsWith('Δ') ? 'Δ vs baseline (seeds 42 / 7 / 123)' : (names ? names[k++] : c));
console.log('| ' + header.join(' | ') + ' |');
console.log('|' + header.map((_, i) => i === 0 ? '---' : '---:').join('|') + '|');
body.forEach((l) => console.log('| ' + l.split('|').map((s) => s.trim().replace(/ \((.*)\)$/, ' <sub>($1)</sub>')).join(' | ') + ' |'));
