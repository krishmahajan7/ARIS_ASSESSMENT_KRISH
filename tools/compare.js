// Compare configs on the same seeds. The first config is the reference.
//   node tools/compare.js '{}' '{"slate":40}'
//   node tools/compare.js '{}' '{"fairScreening":1}' '{"fairScreening":1,"slate":40}' --seeds=42,7,123
// Every config inherits the seed from the list (a "seed" key in a config is ignored).
// Prints the mean over seeds for each config, its delta vs the reference, and
// the per-seed deltas so you can see whether the sign is stable.
'use strict';
const T = require('./metrics.js');

const args = process.argv.slice(2);
const seedArg = args.find((a) => a.startsWith('--seeds='));
const seeds = seedArg ? seedArg.slice(8).split(',').map(Number) : [42, 7, 123];
const only = args.find((a) => a.startsWith('--rows='));
const rows = only ? T.ROWS.filter((r) => only.slice(7).split(',').includes(r[0])) : T.ROWS;
let configs = args.filter((a) => a.trim().startsWith('{')).map((a) => JSON.parse(a));
if (!configs.length) configs = [{}];
if (configs.length === 1) configs.unshift({});

const results = configs.map((cfg, ci) => seeds.map((seed) => {
  const r = T.runConfig(Object.assign({}, cfg, { seed }));
  process.stderr.write(`  config ${ci} seed ${seed}: ${r.ms} ms\n`);
  return r.metrics;
}));

const mean = (xs) => { const v = xs.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const name = (cfg, i) => i === 0 ? 'A ' + (Object.keys(cfg).length ? JSON.stringify(cfg) : '(defaults)') : String.fromCharCode(65 + i) + ' ' + JSON.stringify(cfg);

console.log('Seeds: ' + seeds.join(', '));
configs.forEach((cfg, i) => console.log('  ' + name(cfg, i)));
console.log('');
const lw = Math.max(...rows.map((r) => r[1].length));
let head = 'Metric'.padEnd(lw) + ' | ' + 'A'.padStart(10);
for (let i = 1; i < configs.length; i++) head += ' | ' + (String.fromCharCode(65 + i)).padStart(10) + ' | ' + ('Δ' + String.fromCharCode(65 + i) + ' (per seed)').padEnd(30);
console.log(head);
console.log('-'.repeat(head.length));
rows.forEach((r) => {
  const per = results.map((rs) => rs.map((m) => r[2](m)));
  const base = mean(per[0]);
  let line = r[1].padEnd(lw) + ' | ' + T.fmtVal(base, r[3]).padStart(10);
  for (let i = 1; i < configs.length; i++) {
    const v = mean(per[i]);
    const seedDeltas = per[i].map((x, k) => T.fmtDelta(x != null && per[0][k] != null ? x - per[0][k] : null, r[3])).join(' ');
    line += ' | ' + T.fmtVal(v, r[3]).padStart(10) + ' | ' + (T.fmtDelta(v != null && base != null ? v - base : null, r[3]) + ' (' + seedDeltas + ')').padEnd(30);
  }
  console.log(line);
});
