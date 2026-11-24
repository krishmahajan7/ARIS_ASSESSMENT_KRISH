// Regenerate README.txt (plain text) from README.md so the two never drift.
//   node tools/readme-txt.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const md = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
let inCode = false;
const out = [];
md.split(/\r?\n/).forEach((line) => {
  if (line.startsWith('```')) { inCode = !inCode; return; }
  if (inCode) { out.push('    ' + line); return; }
  const h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    const text = strip(h[2]);
    if (h[1].length === 1) out.push(text.toUpperCase(), '='.repeat(text.length));
    else if (h[1].length === 2) out.push('', text.toUpperCase(), '-'.repeat(text.length));
    else out.push('', text, '~'.repeat(text.length));
    return;
  }
  if (/^\|[-| :]+\|$/.test(line.trim())) { out.push(line.replace(/:/g, '-')); return; }
  out.push(strip(line));
});

function strip(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<kbd>([^<]+)<\/kbd>/g, '[$1]')
    .replace(/<\/?sub>/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
}

fs.writeFileSync(path.join(root, 'README.txt'), out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
console.log('README.txt written (' + out.length + ' lines)');
