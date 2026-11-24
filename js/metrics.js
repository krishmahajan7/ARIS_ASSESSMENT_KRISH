/*
 * BayWork persona metrics — how each group fares in a run. Pure, no DOM.
 * Shared by the browser (window.BWMetrics) and Node (require('./js/metrics.js')).
 *
 * Pool-entry cohorts are built from the event stream:
 *   new grad   = a GRAD event        (enters the pool)
 *   switcher   = a LEAVE event       (quit, joins the pool)
 *   laid off   = a LAYOFF event      (joins the pool)
 * A spell ends with a placement (HIRE, or any event type listed in
 * PLACEMENT_TYPES) or with RETIRE / EXIT (not placed). People in the starting
 * pool have no entry event and are left out of the cohorts.
 *
 * "Placed within 4 quarters" = hired in the entry quarter or the 3 after it.
 * Only spells with all 4 of those quarters simulated count toward that share.
 */
(function (root) {
  'use strict';

  function quantile(sorted, p) {
    if (!sorted.length) return null;
    var i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }

  function personaMetrics(sim, W) {
    W = W || (typeof require === 'function' && typeof module !== 'undefined' ? require('./engine.js') : root.Workforce);
    var EV = W.EV, E = sim.events, A = sim.agents, s = sim.series;
    var first = s[0], last = s[s.length - 1], Q = sim.q;
    var placedTypes = {};
    placedTypes[EV.HIRE] = true;
    if (EV.REDEPLOY) placedTypes[EV.REDEPLOY] = true;

    // ---- cohorts from events
    var KINDS = ['grad', 'laidOff', 'switcher'];
    var entryKind = {};
    entryKind[EV.GRAD] = 'grad'; entryKind[EV.LAYOFF] = 'laidOff'; entryKind[EV.LEAVE] = 'switcher';
    var c = {};
    KINDS.forEach(function (k) { c[k] = { entered: 0, eligible: 0, placed4: 0, placed: 0, waitSum: 0, open: 0, payRatioSum: 0, payRatioN: 0 }; });
    var open = new Map(); // agent -> [kind, entryQ, entryComp]
    function close(a, placedQ, value) {
      var sp = open.get(a);
      if (!sp) return;
      open.delete(a);
      var k = c[sp[0]], wait = placedQ == null ? null : placedQ - sp[1];
      if (sp[1] + 4 <= Q) { k.eligible++; if (wait != null && wait < 4) k.placed4++; }
      if (wait != null) {
        k.placed++; k.waitSum += wait;
        if (sp[0] === 'laidOff' && sp[2] > 0) { k.payRatioSum += value / sp[2]; k.payRatioN++; }
      }
    }
    for (var i = 0; i < E.n; i++) {
      var a = E.agent[i], t = E.type[i];
      if (entryKind[t]) {
        close(a, null, 0); // a still-open spell can't precede a new entry, but be safe
        open.set(a, [entryKind[t], E.q[i], E.value[i]]);
        c[entryKind[t]].entered++;
      } else if (placedTypes[t]) close(a, E.q[i], E.value[i]);
      else if (t === EV.RETIRE || t === EV.EXIT) close(a, null, 0);
    }
    open.forEach(function (sp) {
      var k = c[sp[0]];
      k.open++;
      if (sp[1] + 4 <= Q) k.eligible++;
    });
    var cohorts = {};
    KINDS.forEach(function (k) {
      var x = c[k];
      cohorts[k] = {
        entered: x.entered,
        eligible4q: x.eligible,
        placed4q: x.placed4,
        placed4qShare: x.eligible ? x.placed4 / x.eligible : null,
        placedShare: x.entered ? x.placed / x.entered : null,
        meanQuartersToHire: x.placed ? x.waitSum / x.placed : null,
        stuckAtEnd: x.open,
        rehirePayRatio: x.payRatioN ? x.payRatioSum / x.payRatioN : null,
      };
    });

    // Net: placements within 4 quarters across all three cohorts. If a feature
    // only moves jobs between groups, this stays flat while the shares shift.
    var net = { placed4q: 0, eligible4q: 0 };
    KINDS.forEach(function (k) { net.placed4q += c[k].placed4; net.eligible4q += c[k].eligible; });
    net.placed4qShare = net.eligible4q ? net.placed4q / net.eligible4q : null;

    // ---- the pool at the end
    var longTerm = 0, poolN = sim.pool.length;
    for (var p = 0; p < poolN; p++) if (A.idleQ[sim.pool[p]] >= 4) longTerm++;

    // ---- companies
    var g = { large: { start: 0, end: 0 }, startup: { start: 0, end: 0 } };
    sim.companies.forEach(function (co) { g[co.kind].start += co.startHc; g[co.kind].end += co.members.length; });
    var hires = 0, fillAgeSum = 0, retired = 0;
    for (var q = 1; q < s.length; q++) {
      hires += s[q].hires;
      retired += s[q].retired;
      if (s[q].avgFillAge != null) fillAgeSum += s[q].avgFillAge * s[q].hires;
    }

    // ---- cities with more than 200 engineers
    var rows = sim.cityStats().filter(function (r) { return r.laborForce > 200; });
    var us = rows.map(function (r) { return r.unemployment; }).sort(function (x, y) { return x - y; });
    var p10 = quantile(us, 0.1), p90 = quantile(us, 0.9);
    var regions = {};
    rows.forEach(function (r) {
      var x = regions[r.region] || (regions[r.region] = { pool: 0, lf: 0 });
      x.pool += r.pool; x.lf += r.laborForce;
    });
    Object.keys(regions).forEach(function (k) { regions[k] = regions[k].lf ? regions[k].pool / regions[k].lf : 0; });

    var byYear = [];
    for (var y = 0; y < s.length; y += 4) byYear.push(s[y].unemployment);
    if ((s.length - 1) % 4) byYear.push(last.unemployment);

    return {
      quarters: Q,
      unemployment: last.unemployment,
      unemploymentStart: first.unemployment,
      unemploymentByYear: byYear,
      pool: poolN,
      cohorts: cohorts,
      net: net,
      longTermShare: poolN ? longTerm / poolN : 0,
      longTerm: longTerm,
      largeHcChange: g.large.start ? g.large.end / g.large.start - 1 : 0,
      startupHcChange: g.startup.start ? g.startup.end / g.startup.start - 1 : 0,
      largeHcEnd: g.large.end,
      startupHcEnd: g.startup.end,
      unfilledReqs: last.openReqs,
      oldReqs: last.oldReqs,
      avgFillQuarters: hires ? fillAgeSum / hires : null,
      avgCommute: last.avgCommute,
      cityGapP90P10: p90 != null ? p90 - p10 : null,
      cityP10: p10, cityP90: p90,
      regionUnemployment: regions,
      retirements: retired,
      hires: hires,
      employed: last.employed,
    };
  }

  // Flatten to labelled rows for tables: [key, label, getter, kind]
  // kind: 'pct' (share), 'pts' (percentage points), 'num', 'q' (quarters), 'mi', 'ratio'
  var ROWS = [
    ['unemp', 'Unemployment at end', function (m) { return m.unemployment; }, 'pct', false],
    ['net4q', 'NET placed ≤4Q, all cohorts (count)', function (m) { return m.net.placed4q; }, 'num', true],
    ['net4qShare', 'NET placed ≤4Q, all cohorts (share)', function (m) { return m.net.placed4qShare; }, 'pct', true],
    ['grad4q', 'New grads placed ≤4Q', function (m) { return m.cohorts.grad.placed4qShare; }, 'pct', true],
    ['gradWait', 'New grads: quarters to hire', function (m) { return m.cohorts.grad.meanQuartersToHire; }, 'q', false],
    ['gradStuck', 'New grads stuck at end', function (m) { return m.cohorts.grad.stuckAtEnd; }, 'num', false],
    ['lo4q', 'Laid off placed ≤4Q', function (m) { return m.cohorts.laidOff.placed4qShare; }, 'pct', true],
    ['loWait', 'Laid off: quarters to hire', function (m) { return m.cohorts.laidOff.meanQuartersToHire; }, 'q', false],
    ['loPay', 'Laid off: rehire pay ratio', function (m) { return m.cohorts.laidOff.rehirePayRatio; }, 'ratio', true],
    ['loStuck', 'Laid off stuck at end', function (m) { return m.cohorts.laidOff.stuckAtEnd; }, 'num', false],
    ['sw4q', 'Switchers placed ≤4Q', function (m) { return m.cohorts.switcher.placed4qShare; }, 'pct', true],
    ['swWait', 'Switchers: quarters to hire', function (m) { return m.cohorts.switcher.meanQuartersToHire; }, 'q', false],
    ['swStuck', 'Switchers stuck at end', function (m) { return m.cohorts.switcher.stuckAtEnd; }, 'num', false],
    ['lt', 'Pool idle 4+ quarters', function (m) { return m.longTermShare; }, 'pct', false],
    ['large', 'Large-company headcount change', function (m) { return m.largeHcChange; }, 'pct', true],
    ['startup', 'Startup headcount change', function (m) { return m.startupHcChange; }, 'pct', true],
    ['unfilled', 'Unfilled reqs at end', function (m) { return m.unfilledReqs; }, 'num', false],
    ['fill', 'Avg fill time (quarters)', function (m) { return m.avgFillQuarters; }, 'q', false],
    ['commute', 'Avg commute', function (m) { return m.avgCommute; }, 'mi', false],
    ['gap', 'City unemployment gap p90−p10', function (m) { return m.cityGapP90P10; }, 'pct', false],
    ['retired', 'Retirements', function (m) { return m.retirements; }, 'num', null],
    ['hires', 'Total hires', function (m) { return m.hires; }, 'num', true],
  ];

  var api = { personaMetrics: personaMetrics, ROWS: ROWS, quantile: quantile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BWMetrics = api;
})(this);
