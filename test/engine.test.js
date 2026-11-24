// Engine invariants. Run: node test/engine.test.js
'use strict';
const assert = require('assert');
const W = require('../js/engine.js');
const W0 = require('./fixtures/engine.original.js'); // the engine as originally provided
const M = require('../js/metrics.js');
const data = { cities: require('../js/data/cities.js'), companies: require('../js/data/companies.js') };
const S = W.STATUS;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (e) {
    console.error('  FAIL ' + name + '\n       ' + e.message);
    process.exitCode = 1;
  }
}
const make = (over) => new W.WorkforceSim(Object.assign({ companies: 60, years: 3 }, over), data);
function near(actual, expected, tol, label) {
  assert(Math.abs(actual - expected) <= tol, `${label}: ${actual.toFixed(3)} vs ${expected.toFixed(3)} (±${tol})`);
}

// Check every bookkeeping structure agrees with every agent's status.
function checkBooks(sim) {
  const A = sim.agents;
  let employed = 0, inPool = 0;
  for (let a = 0; a < A.n; a++) {
    const st = A.status[a];
    if (st === S.EMPLOYED) {
      employed++;
      const c = sim.companies[A.company[a]];
      assert(c && c.members[A.memberPos[a]] === a, `agent ${a} missing from its company`);
      assert.strictEqual(A.poolPos[a], -1, `employed agent ${a} also in pool`);
    } else if (st >= S.GRAD && st <= S.LAID_OFF) {
      inPool++;
      assert.strictEqual(sim.pool[A.poolPos[a]], a, `agent ${a} missing from pool`);
      assert.strictEqual(A.company[a], -1, `pool agent ${a} has a company`);
    } else {
      assert(A.poolPos[a] === -1 && A.memberPos[a] === -1 && A.activePos[a] === -1, `inactive agent ${a} still listed`);
    }
  }
  assert.strictEqual(employed, sim.employedCount(), 'employed count');
  assert.strictEqual(inPool, sim.pool.length, 'pool count');
  assert.strictEqual(employed + inPool, sim.active.length, 'active list');
  sim.companies.forEach((c) => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    c.members.forEach((a) => counts[A.level[a]]++);
    assert.deepStrictEqual(counts, c.levelCount, `${c.name} level counts drifted`);
  });
}

console.log('Workforce engine tests');

test('org pyramid: one manager per 10 reports, up to a single head', () => {
  assert.deepStrictEqual(W.pyramid(32000, 10), [32000, 3200, 320, 32, 4, 1]);
  assert.deepStrictEqual(W.pyramid(21, 10), [21, 3, 1]);
  assert.deepStrictEqual(W.pyramidForHeadcount(25, 10), [21, 3, 1]);
  const sim = make({});
  sim.companies.forEach((c) => {
    const eng = c.kind === 'startup' ? Math.min(c.engineersData, 21) : c.engineersData;
    assert.deepStrictEqual(c.levelCount.slice(0, W.pyramid(eng, 10).length), W.pyramid(eng, 10), c.name);
  });
});

test('X companies: X/2 largest plus X/2 startups (≤ 25 people)', () => {
  const sim = make({ companies: 40 });
  const large = sim.companies.filter((c) => c.kind === 'large');
  assert.strictEqual(large.length, 20);
  assert.deepStrictEqual(large.map((c) => c.name).slice(0, 3), ['Google', 'Apple', 'Meta']);
  sim.companies.filter((c) => c.kind === 'startup').forEach((c) => assert(c.members.length <= 25, c.name));
});

test('homes are spread in proportion to city population', () => {
  const sim = make({ companies: 200, years: 1 });
  const rows = sim.cityStats();
  const total = rows.reduce((s, r) => s + r.laborForce, 0);
  const sf = rows.find((r) => r.name === 'San Francisco'), sj = rows.find((r) => r.name === 'San Jose');
  near(sf.laborForce / total, sf.pop / sim.popTotal, 0.01, 'SF share');
  near(sj.laborForce / total, sj.pop / sim.popTotal, 0.01, 'SJ share');
});

test('bookkeeping stays consistent every quarter', () => {
  const sim = make({ exitAfterQuarters: 6, layoffTargeting: 1 });
  while (!sim.done) { sim.step(); checkBooks(sim); }
});

test('startups never exceed the max headcount', () => {
  const sim = make({ growthStartupPct: 300 });
  while (!sim.done) {
    sim.step();
    sim.companies.filter((c) => c.kind === 'startup').forEach((c) => assert(c.members.length <= 25, `${c.name} at ${c.members.length}`));
  }
});

test('no company hires more than max(5, 5% of headcount) in a quarter', () => {
  const sim = make({ growthLargePct: 40, growthStartupPct: 200 }).runToEnd();
  sim.companies.forEach((c) => {
    c.series.hires.forEach((h, i) => {
      if (i === 0) return;
      assert(h <= c.series.cap[i], `${c.name} hired ${h} > cap ${c.series.cap[i]} in ${sim.series[i].label}`);
      assert(c.series.cap[i] >= 5, 'cap floor of 5');
    });
  });
});

test('with backfills exempt, only growth hires are capped', () => {
  const a = make({}).runToEnd(), b = make({ capIncludesBackfills: 0 }).runToEnd();
  assert(b.series.at(-1).employed > a.series.at(-1).employed, 'exempting backfills should keep more people employed');
});

test('voluntary attrition matches the half-lives (4 y large, 2 y startup)', () => {
  const sim = make({ companies: 200, years: 2 });
  let leftL = 0, baseL = 0, leftS = 0, baseS = 0;
  while (!sim.done) {
    const before = sim.companies.map((c) => c.members.length);
    sim.step();
    sim.companies.forEach((c, i) => {
      if (c.kind === 'large') { leftL += c.qc.leavers; baseL += before[i]; } else { leftS += c.qc.leavers; baseS += before[i]; }
    });
  }
  near(leftL / baseL, 1 - Math.pow(0.5, 1 / 16), 0.002, 'large quarterly attrition');
  near(leftS / baseS, 1 - Math.pow(0.5, 1 / 8), 0.01, 'startup quarterly attrition');
});

test('Q1 layoffs: 5% at large companies, 20% at startups; laid-off ask 20% less', () => {
  const sim = make({ companies: 200, years: 2 });
  for (let i = 0; i < 4; i++) sim.step();
  const before = sim.companies.map((c) => c.members.length);
  const evStart = sim.events.n;
  sim.step(); // Q1 of year 2
  sim.companies.forEach((c, i) => {
    const rate = c.kind === 'large' ? 0.05 : 0.2;
    // Layoffs come after this quarter's retirements and voluntary exits.
    const expected = (before[i] - c.qc.leavers - c.qc.retired) * rate;
    assert(c.qc.layoffs === Math.floor(expected) || c.qc.layoffs === Math.ceil(expected), `${c.name} laid off ${c.qc.layoffs} vs ${expected}`);
  });
  const E = sim.events, A = sim.agents;
  let checked = 0;
  for (let e = evStart; e < E.n; e++) {
    if (E.type[e] !== W.EV.LAYOFF) continue;
    const a = E.agent[e];
    if (A.status[a] !== S.LAID_OFF) continue; // already re-hired or retired
    const expectAsk = Math.max(sim.gradComp * 0.85, E.value[e] * 0.8 * 0.98); // one quarter of ask decay
    near(A.expect[a], expectAsk, 1, `agent ${a} ask`);
    checked++;
  }
  assert(checked > 1000, 'too few laid-off agents checked');
});

test('raises: incumbents +10% a year, their position band +2%', () => {
  const sim = make({ promoteSharePct: 0 });
  for (let i = 0; i < 4; i++) sim.step();
  const A = sim.agents, snap = new Map();
  for (let a = 0; a < A.n; a++) if (A.status[a] === S.EMPLOYED) snap.set(a, [A.company[a], A.comp[a], A.band[a]]);
  sim.step();
  let n = 0;
  snap.forEach((v, a) => {
    if (A.status[a] !== S.EMPLOYED || A.company[a] !== v[0] || A.joinedQ[a] >= 4) return;
    near(A.comp[a] / v[1], 1.10, 1e-4, 'raise');
    near(A.band[a] / v[2], 1.02, 1e-4, 'band growth');
    n++;
  });
  assert(n > 10000, 'too few stayers checked');
});

test('new grads: 3% of the labour force each Q3; retirements ≈ 2% a year', () => {
  const sim = make({ companies: 200, years: 2 });
  let retired = 0;
  for (let i = 0; i < 8; i++) {
    const lf = sim.employedCount() + sim.pool.length;
    const s = sim.step();
    retired += s.retired;
    // Grads arrive after this quarter's retirements have left the labour force.
    if (i % 4 === 2) near(s.grads, (lf - s.retired) * 0.03, 1, 'grad intake');
    else assert.strictEqual(s.grads, 0, 'grads outside Q3');
  }
  const lf = sim.series.at(-1).laborForce;
  near(retired / 2 / lf, 0.02, 0.002, 'annual retirement rate');
});

test('offers never exceed the band, and hiring costs 5% of comp', () => {
  const sim = make({});
  const A = sim.agents;
  for (let i = 0; i < 6; i++) {
    const s = sim.step();
    let spend = 0;
    for (let a = 0; a < A.n; a++) {
      if (A.status[a] === S.EMPLOYED && A.joinedQ[a] === sim.q - 1) {
        assert(A.comp[a] <= A.band[a] + 1e-3 || A.level[a] > 0, `agent ${a} paid above band`);
      }
    }
    sim.companies.forEach((c) => { spend += c.qc.hireSpend; });
    near(s.hireSpend, spend, 1e-3, 'spend total');
    if (s.hires) near(s.hireSpend / (s.avgHireComp * s.hires), 0.05, 1e-6, 'hiring cost share');
  }
});

test('commute: new hires live closer to work than the starting workforce', () => {
  const sim = make({ companies: 200, years: 2 }).runToEnd();
  const start = sim.series[0].avgCommute;
  sim.series.slice(1).forEach((s) => assert(s.hireCommute < start - 3, `${s.label}: hires commute ${s.hireCommute} vs ${start}`));
});

test('people leave the Bay Area only when that option is on', () => {
  assert.strictEqual(make({}).runToEnd().series.at(-1).exitedTotal, 0);
  assert(make({ exitAfterQuarters: 4 }).runToEnd().series.at(-1).exitedTotal > 0);
});

test('same seed reproduces the run; another seed differs', () => {
  const a = make({}).runToEnd(), b = make({}).runToEnd(), c = make({ seed: 7 }).runToEnd();
  assert.deepStrictEqual(a.series.map((s) => s.employed), b.series.map((s) => s.employed));
  assert.notDeepStrictEqual(a.series.map((s) => s.employed), c.series.map((s) => s.employed));
});

test('an agent history reads back in order', () => {
  const sim = make({}).runToEnd();
  const E = sim.events;
  const a = E.agent[Math.floor(E.n / 2)];
  const h = sim.history(a);
  assert(h.length >= 1);
  for (let i = 1; i < h.length; i++) assert(h[i].q >= h[i - 1].q, 'history out of order');
});

// ---------------------------------------------------------------- uplift features

// Every series field the original engine produced must match exactly.
function sameAsOriginal(over, label) {
  const a = new W0.WorkforceSim(over, data).runToEnd();
  const b = new W.WorkforceSim(over, data).runToEnd();
  assert.strictEqual(a.series.length, b.series.length);
  a.series.forEach((x, i) => Object.keys(x).forEach((k) => {
    assert.deepStrictEqual(b.series[i][k], x[k], `${label}: ${k} differs in ${x.label}`);
  }));
  assert.strictEqual(a.events.n, b.events.n, `${label}: event count`);
}

test('all uplift features off: identical to the original engine (seeds 42, 7, 123)', () => {
  [42, 7, 123].forEach((seed) => sameAsOriginal({ companies: 100, years: 3, seed }, 'seed ' + seed));
  sameAsOriginal({ companies: 40, years: 2, seed: 5, exitAfterQuarters: 3, layoffTargeting: 1, capIncludesBackfills: 0 }, 'options');
});

const smallMean = (over, get) => {
  const xs = [42, 7, 123].map((seed) => get(M.personaMetrics(make(Object.assign({ companies: 100, seed }, over)).runToEnd(), W)));
  return xs.reduce((a, b) => a + b, 0) / xs.length;
};

test('Fair-Chance: books, band and cap hold every quarter', () => {
  const sim = make({ fairScreening: 1, fairRotation: 1, growthLargePct: 30 });
  const A = sim.agents;
  while (!sim.done) {
    sim.step();
    checkBooks(sim);
    for (let a = 0; a < A.n; a++) {
      if (A.status[a] === S.EMPLOYED && A.joinedQ[a] === sim.q - 1 && A.level[a] === 0) assert(A.comp[a] <= A.band[a] + 1e-3, `agent ${a} above band`);
    }
    sim.companies.forEach((c) => assert(c.qc.hires <= c.capQ, `${c.name} over cap`));
  }
});

test('Fair-Chance: new-grad placement within 4 quarters is not worse on average', () => {
  const base = smallMean({}, (m) => m.cohorts.grad.placed4qShare);
  const fair = smallMean({ fairScreening: 1 }, (m) => m.cohorts.grad.placed4qShare);
  assert(fair >= base, `grads placed ≤4Q: ${fair.toFixed(3)} vs baseline ${base.toFixed(3)}`);
});

test('visibility: per-spell counts and shares stay in range', () => {
  const sim = make({ years: 1 }).runToEnd();
  const A = sim.agents, v = sim.visibility();
  assert.strictEqual(v.total.n, sim.pool.length);
  [v.total].concat(v.buckets, v.status, v.regions).forEach((g) => {
    assert(g.unseenShare >= 0 && g.unseenShare <= 1 && g.unofferedShare >= 0 && g.unofferedShare <= 1, g.label);
  });
  assert(v.gini >= 0 && v.gini < 1 && v.offerGini >= 0 && v.offerGini < 1);
  sim.pool.forEach((a) => assert(A.screenedSpell[a] <= A.screened[a] || A.screened[a] === 65535));
});

test('stress tests: shock off is the original; a recession doubles layoffs only in its window', () => {
  sameAsOriginal({ companies: 60, years: 2, seed: 11, shockStartQ: 2, shockQuarters: 3 }, 'shock settings with shock 0');
  const calm = make({ companies: 100, years: 3 }).runToEnd(), rec = make({ companies: 100, years: 3, shock: 1, shockStartQ: 4, shockQuarters: 4 }).runToEnd();
  // Layoff rounds happen in Q1: quarter index 0 (outside), 4 (inside), 8 (outside).
  assert.strictEqual(rec.series[1].layoffs, calm.series[1].layoffs, 'before the window');
  assert(rec.series[5].layoffs > calm.series[5].layoffs * 1.6, `recession layoffs ${rec.series[5].layoffs} vs ${calm.series[5].layoffs}`);
  const boom = make({ companies: 100, years: 3, shock: 2, shockStartQ: 4, shockQuarters: 4 }).runToEnd();
  assert(boom.series[8].hires > calm.series[8].hires, 'boom hires more');
  boom.companies.forEach((c) => c.series.hires.forEach((h, i) => assert(h <= c.series.cap[i], `${c.name} over the boom cap`)));
});

test('metrics: one implementation for browser and tools; compare runs are deterministic', () => {
  const T = require('../tools/metrics.js');
  const a = T.runConfig({ companies: 60, years: 2, seed: 9, fairScreening: 1 }), b = T.runConfig({ companies: 60, years: 2, seed: 9, fairScreening: 1 });
  assert.deepStrictEqual(M.personaMetrics(a.sim, W), a.metrics, 'js/metrics.js and tools/metrics.js agree');
  assert.deepStrictEqual(a.metrics, b.metrics, 'same seed, same metrics');
  const sc = M.scorecard(a.metrics, { grads: 2 });
  assert.strictEqual(sc.rows.length, M.PERSONAS.length);
  sc.rows.forEach((r) => assert(r.score >= 0 && r.score <= 100, r.name));
});

test('Warm Handoff: books, band, cap and startup max hold; redeployed people never sit idle', () => {
  const sim = make({ warmHandoff: 1, companies: 100 });
  const A = sim.agents;
  let handoffs = 0;
  while (!sim.done) {
    const evStart = sim.events.n;
    sim.step();
    checkBooks(sim);
    handoffs += sim.series.at(-1).handoffs;
    sim.companies.forEach((c) => {
      assert(c.qc.hires <= c.capQ, `${c.name} hired ${c.qc.hires} over cap ${c.capQ}`);
      if (c.kind === 'startup') assert(c.members.length <= 25, `${c.name} over startup max`);
    });
    for (let e = evStart; e < sim.events.n; e++) {
      if (sim.events.type[e] !== W.EV.REDEPLOY) continue;
      const a = sim.events.agent[e];
      if (A.status[a] === S.EMPLOYED && A.joinedQ[a] === sim.q - 1) {
        assert(A.level[a] > 0 || A.comp[a] <= A.band[a] + 1e-3, `redeployed agent ${a} above band`);
        assert.strictEqual(A.idleQ[a], 0, 'redeployed with idle quarters');
      }
      assert(A.lastCompany[a] !== sim.events.company[e] || A.layoffs[a] > 0, 'redeployed into the company that laid them off');
    }
  }
  assert(handoffs > 1000, `only ${handoffs} handoffs`);
});

test('Warm Handoff: cap-exempt lever hires more than the faithful reading', () => {
  const a = make({ warmHandoff: 1 }).runToEnd(), b = make({ warmHandoff: 1, handoffCountsTowardCap: 0 }).runToEnd();
  const sum = (sim) => sim.series.reduce((t, x) => t + x.hires, 0);
  assert(sum(b) > sum(a), 'exempt handoffs should add hires');
});

test('Bay Corridors: only shorten distances, never below 3 miles, stay symmetric; none = original', () => {
  const plain = make({ years: 1 });
  sameAsOriginal({ companies: 60, years: 2, seed: 3 }, 'no corridors');
  const sf = 0, mv = 16, rafael = 46;
  const corridors = [{ from: rafael, to: sf, cutPct: 90 }, { from: sf, to: mv }, { from: 3, to: 3 }, { from: 999, to: 1 }];
  const sim = new W.WorkforceSim({ companies: 60, years: 1 }, data, { corridors });
  assert.strictEqual(sim.corridors.length, 2, 'invalid corridors are dropped');
  let shorter = 0;
  for (let i = 0; i < sim.dist.length; i++) {
    for (let j = 0; j < sim.dist.length; j++) {
      assert(sim.dist[i][j] <= plain.dist[i][j] + 1e-6, `corridor lengthened ${i}→${j}`);
      assert(sim.dist[i][j] >= 3 - 1e-6, `below 3 miles ${i}→${j}`);
      assert.strictEqual(sim.dist[i][j], sim.dist[j][i], `asymmetric ${i}↔${j}`);
      if (sim.dist[i][j] < plain.dist[i][j] - 1e-6) shorter++;
    }
  }
  assert(sim.dist[sf][mv] < plain.dist[sf][mv] * 0.61, 'SF → Mountain View cut by ~40%');
  assert(shorter >= 4, 'the spill reaches neighbouring cities');
  const sug = sim.suggestCorridors(3);
  assert(sug.length === 3 && sug.every((k) => k.from !== k.to), 'three suggestions');
  sim.runToEnd();
  checkBooks(sim);
});

test('Retire-to-Mentor: mentors keep their seat, are never double-counted, and retire on schedule', () => {
  const sim = make({ mentorSharePct: 60, mentorQuarters: 3, companies: 100 });
  const A = sim.agents, E = sim.events;
  while (!sim.done) {
    sim.step();
    checkBooks(sim);
    sim.mentors.forEach((a) => {
      assert.strictEqual(A.status[a], S.EMPLOYED, `mentor ${a} not employed`);
      assert(A.mentorUntilQ[a] > 0);
    });
    sim.companies.forEach((c) => assert.strictEqual(c.mentorCount, c.members.filter((a) => A.mentorUntilQ[a]).length, `${c.name} mentor count`));
  }
  const became = new Map(), retired = new Map(), left = new Set();
  for (let i = 0; i < E.n; i++) {
    const a = E.agent[i], t = E.type[i];
    if (t === W.EV.MENTOR) { assert(!became.has(a), `agent ${a} became a mentor twice`); became.set(a, E.q[i]); }
    if (t === W.EV.RETIRE) { assert(!retired.has(a), `agent ${a} retired twice`); retired.set(a, E.q[i]); }
    if (became.has(a) && !retired.has(a) && (t === W.EV.LEAVE || t === W.EV.LAYOFF || t === W.EV.PROMOTE)) left.add(a);
  }
  assert(became.size > 500, 'too few mentors');
  assert.strictEqual(left.size, 0, 'a mentor quit, was laid off or promoted');
  became.forEach((q, a) => {
    if (q + 3 < sim.q) assert.strictEqual(retired.get(a), q + 3, `mentor ${a} retired at ${retired.get(a)}, expected ${q + 3}`);
    else assert(!retired.has(a), 'retired early');
  });
  const s = sim.series, retiredSum = s.reduce((t, x) => t + x.retired, 0);
  assert.strictEqual(retiredSum, s.at(-1).retiredTotal, 'retirements counted once, when they happen');
});

test('Retire-to-Mentor: with the attrition cut at 0, grad quits are unchanged within noise', () => {
  const get = (m) => m.gradFirstYearQuit;
  const off = smallMean({ years: 3 }, get), structural = smallMean({ years: 3, mentorSharePct: 50, mentorAttritionCut: 0 }, get), assumed = smallMean({ years: 3, mentorSharePct: 50 }, get);
  assert(Math.abs(structural - off) < 0.01, `structural ${structural} vs off ${off}`);
  assert(assumed < off - 0.02, 'the assumed cut lowers grad quits');
});

test('Scenarios: outsourcing and AI keep the books, caps and startup max; deterministic per seed', () => {
  const cfg = { companies: 100, outsourceOn: 1, aiSharePct: 70 };
  const sim = make(cfg), twin = make(cfg);
  let outsourced = 0, ai = 0, cand = 0;
  while (!sim.done) {
    sim.step();
    twin.step();
    checkBooks(sim);
    const s = sim.series.at(-1);
    outsourced += s.outsourced; ai += s.aiFilled; cand += s.aiCandidates;
    sim.lastOutsourced.forEach((r) => assert(!r.filled, 'a seat was both outsourced and filled'));
    sim.companies.forEach((c) => {
      assert(c.qc.hires <= c.capQ, `${c.name} over cap`);
      if (c.kind === 'startup') assert(c.members.length <= 25, `${c.name} over startup max`);
      c.reqs.forEach((r) => assert(!r.outsourced, 'an outsourced req is still open'));
    });
    // AI share: never above the target at any point.
    assert(ai <= cand * 0.70 + 1, `AI took ${ai} of ${cand} roles`);
  }
  assert(outsourced > 100 && ai > 1000, `outsourced ${outsourced}, automated ${ai}`);
  assert(Math.abs(sim.series.at(-1).indiaHeadcount - 2.5 * outsourced) < 1e-6, 'India hires = 2.5 × outsourced reqs');
  assert.deepStrictEqual(sim.series.map((x) => x.employed), twin.series.map((x) => x.employed), 'same seed, same run');
  let ev = 0;
  for (let i = 0; i < sim.events.n; i++) if (sim.events.type[i] === W.EV.OUTSOURCE) ev++;
  assert.strictEqual(ev, outsourced, 'one "Role outsourced" event per req');
});

test('Scenarios: the AI share ramps and never exceeds aiSharePct; outsourcing every Nth is exact', () => {
  const sim = make({ companies: 100, aiSharePct: 40, aiRampQuarters: 4 }).runToEnd();
  const s = sim.series;
  s.slice(1).forEach((x, i) => {
    const target = 0.4 * Math.min(1, (i + 1) / 4);
    if (x.aiCandidates > 50) assert(x.aiFilled / x.aiCandidates <= target + 0.02, `quarter ${i}: ${x.aiFilled}/${x.aiCandidates} vs ${target}`);
  });
  const half = make({ companies: 100, outsourceOn: 1, outsourceSharePct: 50 }), full = make({ companies: 100, outsourceOn: 1 });
  half.step(); full.step(); half.step(); full.step(); half.step(); full.step();
  const tick = half.outsourceTick, taken = half.series.reduce((t, x) => t + x.outsourced, 0);
  assert(Math.abs(taken - tick * 0.5) <= 1, `every 2nd eligible req: ${taken} of ${tick}`);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
