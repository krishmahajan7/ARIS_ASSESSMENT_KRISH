// Run one config and print its persona metrics.
//   node tools/baseline.js                      defaults (seed 42, 5 years, 200 companies)
//   node tools/baseline.js '{"seed":7}'         any engine overrides as JSON
//   node tools/baseline.js '{"seed":7}' --json  raw metrics object
'use strict';
const T = require('./metrics.js');

const args = process.argv.slice(2);
const cfg = JSON.parse(args.find((a) => a.trim().startsWith('{')) || '{}');
const { sim, metrics: m, ms } = T.runConfig(cfg);

if (args.includes('--json')) { console.log(JSON.stringify(m, null, 2)); process.exit(0); }

console.log('Config: ' + JSON.stringify(cfg) + '  (seed ' + sim.cfg.seed + ', ' + sim.cfg.years + ' y, ' + sim.cfg.companies + ' companies, ' + ms + ' ms)');
console.log('Unemployment by year: ' + m.unemploymentByYear.map((u) => (u * 100).toFixed(1) + '%').join(' → '));
console.log('');
const w = Math.max(...T.ROWS.map((r) => r[1].length));
T.ROWS.forEach((r) => console.log('  ' + r[1].padEnd(w) + '  ' + T.fmtVal(r[2](m), r[3])));
console.log('');
console.log('  Cohorts (entered / eligible for 4Q check / still looking):');
['grad', 'laidOff', 'switcher'].forEach((k) => {
  const c = m.cohorts[k];
  console.log('    ' + k.padEnd(9) + ' ' + c.entered + ' / ' + c.eligible4q + ' / ' + c.stuckAtEnd);
});
console.log('  Region unemployment: ' + Object.keys(m.regionUnemployment).map((k) => k + ' ' + (m.regionUnemployment[k] * 100).toFixed(1) + '%').join(', '));
