/*
 * BayWork persona metrics — how each group fares in a run. Pure, no DOM.
 * Shared by the browser (window.BWMetrics) and Node (require('./js/metrics.js')).
 *
 * Pool-entry cohorts are built from the event stream:
 *   new grad   = a GRAD event        (enters the pool)
 *   switcher   = a LEAVE event       (quit, joins the pool)
 *   laid off   = a LAYOFF event      (joins the pool)
 * A spell ends with a placement (HIRE, or any event type listed in
 * PLACEMENT_TYPES) or with RETIRE / EXIT (not placed). "Experienced" is a
 * fourth, overlapping cohort: switchers and laid-off people with 10+ years of
 * experience when they entered the pool. People in the starting
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

  function sumKey(s, key) {
    var t = 0;
    for (var i = 1; i < s.length; i++) t += s[i][key] || 0;
    return t;
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
    var ALL = KINDS.concat(['experienced']);
    var entryKind = {};
    entryKind[EV.GRAD] = 'grad'; entryKind[EV.LAYOFF] = 'laidOff'; entryKind[EV.LEAVE] = 'switcher';
    var c = {};
    ALL.forEach(function (k) { c[k] = { entered: 0, eligible: 0, placed4: 0, placed: 0, waitSum: 0, open: 0, payRatioSum: 0, payRatioN: 0 }; });
    var open = new Map(); // agent -> [kind, entryQ, entryComp, experienced]
    function tally(k, sp, wait, value) {
      if (sp[1] + 4 <= Q) { k.eligible++; if (wait != null && wait < 4) k.placed4++; }
      if (wait != null) {
        k.placed++; k.waitSum += wait;
        if (sp[0] === 'laidOff' && sp[2] > 0) { k.payRatioSum += value / sp[2]; k.payRatioN++; }
      }
    }
    function close(a, placedQ, value) {
      var sp = open.get(a);
      if (!sp) return;
      open.delete(a);
      var wait = placedQ == null ? null : placedQ - sp[1];
      tally(c[sp[0]], sp, wait, value);
      if (sp[3]) tally(c.experienced, sp, wait, value);
    }
    for (var i = 0; i < E.n; i++) {
      var a = E.agent[i], t = E.type[i];
      if (entryKind[t]) {
        close(a, null, 0); // a still-open spell can't precede a new entry, but be safe
        var veteran = t !== EV.GRAD && E.exp && E.exp[i] >= 10;
        open.set(a, [entryKind[t], E.q[i], E.value[i], veteran]);
        c[entryKind[t]].entered++;
        if (veteran) c.experienced.entered++;
      } else if (placedTypes[t]) close(a, E.q[i], E.value[i]);
      else if (t === EV.RETIRE || t === EV.EXIT) close(a, null, 0);
    }
    open.forEach(function (sp) {
      [c[sp[0]]].concat(sp[3] ? [c.experienced] : []).forEach(function (k) {
        k.open++;
        if (sp[1] + 4 <= Q) k.eligible++;
      });
    });
    var cohorts = {};
    ALL.forEach(function (k) {
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
    var g = { large: { start: 0, end: 0, hires: 0, age: 0, reqs: 0 }, startup: { start: 0, end: 0, hires: 0, age: 0, reqs: 0 } };
    sim.companies.forEach(function (co) {
      var x = g[co.kind];
      x.start += co.startHc; x.end += co.members.length; x.hires += co.totals.hires; x.age += co.fillAgeSum || 0; x.reqs += co.reqs.length;
    });
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
      largeFillQuarters: g.large.hires ? g.large.age / g.large.hires : null,
      startupFillQuarters: g.startup.hires ? g.startup.age / g.startup.hires : null,
      largeUnfilled: g.large.reqs,
      startupUnfilled: g.startup.reqs,
      mentorsActive: last.mentorsActive || 0,
      mentorRetirements: sumKey(s, 'mentorRetired'),
      handoffs: sumKey(s, 'handoffs'),
      mentorsStarted: sumKey(s, 'mentorsNew'),
      // First-year quit rate of grad hires (quits within 4 quarters of the hire ÷ grad hires; a flow
      // ratio, so the last year's hires have had less time to quit).
      gradFirstYearQuit: (function () {
        var h = sumKey(s, 'gradHiresMentored') + sumKey(s, 'gradHiresUnmentored');
        return h ? (sumKey(s, 'gradEarlyQuitsMentored') + sumKey(s, 'gradEarlyQuitsUnmentored')) / h : null;
      })(),
      gradFirstYearQuitMentored: sumKey(s, 'gradHiresMentored') ? sumKey(s, 'gradEarlyQuitsMentored') / sumKey(s, 'gradHiresMentored') : null,
      gradFirstYearQuitUnmentored: sumKey(s, 'gradHiresUnmentored') ? sumKey(s, 'gradEarlyQuitsUnmentored') / sumKey(s, 'gradHiresUnmentored') : null,
      gradHiresMentored: sumKey(s, 'gradHiresMentored'),
      backfillReqs: last.backfillReqs,
      // Scenarios (outsourcing, AI): roles that left the US hiring plan.
      indiaHeadcount: last.indiaHeadcount || 0,
      outsourcedRoles: sumKey(s, 'outsourced'),
      aiFilledRoles: sumKey(s, 'aiFilled'),
      aiShareOfNewRoles: sumKey(s, 'aiCandidates') ? sumKey(s, 'aiFilled') / sumKey(s, 'aiCandidates') : 0,
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
    ['exp4q', 'Experienced 10y+ placed ≤4Q', function (m) { return m.cohorts.experienced.placed4qShare; }, 'pct', true],
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
    ['retPlusMentor', 'Retired + still mentoring at end', function (m) { return m.retirements + m.mentorsActive; }, 'num', null],
    ['gradQuit', 'Grad hires: first-year quit rate', function (m) { return m.gradFirstYearQuit; }, 'pct', false],
    ['backfill', 'Open backfill reqs at end', function (m) { return m.backfillReqs; }, 'num', false],
    ['hires', 'Total hires', function (m) { return m.hires; }, 'num', true],
    ['india', 'India headcount (outsourced roles)', function (m) { return m.indiaHeadcount; }, 'num', null],
    ['outsourced', 'US roles outsourced', function (m) { return m.outsourcedRoles; }, 'num', null],
    ['aiFilled', 'US roles automated by AI', function (m) { return m.aiFilledRoles; }, 'num', null],
  ];

  // ---------------------------------------------------------------- persona scorecard
  // Each persona gets a 0–100 score from one or two metrics. The scales are
  // HEURISTIC (chosen so typical runs spread across the range), not a welfare
  // measure; the Policy Lab says so next to the table.
  function clamp01(x) { return x == null || !isFinite(x) ? 0 : Math.max(0, Math.min(1, x)); }
  function pct(x, d) { return x == null || !isFinite(x) ? '—' : (x * 100).toFixed(d == null ? 0 : d) + '%'; }
  function signed(x) { return x == null || !isFinite(x) ? '—' : (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(0) + '%'; }
  function int(x) { return Math.round(x || 0).toLocaleString('en-US'); }
  function worstRegion(m) {
    var best = null;
    Object.keys(m.regionUnemployment || {}).forEach(function (k) { if (!best || m.regionUnemployment[k] > m.regionUnemployment[best]) best = k; });
    return best;
  }
  var PERSONAS = [
    { key: 'grads', name: 'New grads', score: function (m) { return 100 * clamp01(m.cohorts.grad.placed4qShare); },
      detail: function (m) { return pct(m.cohorts.grad.placed4qShare) + ' placed ≤4Q · ' + (m.cohorts.grad.meanQuartersToHire || 0).toFixed(1) + ' qtrs to hire'; } },
    { key: 'laidOff', name: 'Laid off', score: function (m) { return 50 * clamp01(m.cohorts.laidOff.placed4qShare) + 50 * clamp01((m.cohorts.laidOff.rehirePayRatio - 0.6) / 0.4); },
      detail: function (m) { return pct(m.cohorts.laidOff.placed4qShare) + ' placed ≤4Q · rehired at ' + pct(m.cohorts.laidOff.rehirePayRatio) + ' of old pay'; } },
    { key: 'switchers', name: 'Job switchers', score: function (m) { return 100 * clamp01(m.cohorts.switcher.placed4qShare); },
      detail: function (m) { return pct(m.cohorts.switcher.placed4qShare) + ' placed ≤4Q · ' + int(m.cohorts.switcher.stuckAtEnd) + ' still looking'; } },
    { key: 'experienced', name: 'Experienced (10y+)', score: function (m) { return 100 * clamp01(m.cohorts.experienced.placed4qShare); },
      detail: function (m) { return pct(m.cohorts.experienced.placed4qShare) + ' placed ≤4Q'; } },
    { key: 'longTerm', name: 'Long-term unemployed', score: function (m) { return 100 * (1 - clamp01(m.longTermShare)); },
      detail: function (m) { return pct(m.longTermShare) + ' of the pool idle 4+ qtrs'; } },
    { key: 'large', name: 'Large companies', score: function (m) { return 100 * clamp01(0.5 + m.largeHcChange * 2); },
      detail: function (m) { return signed(m.largeHcChange) + ' headcount · ' + int(m.largeUnfilled) + ' unfilled reqs'; } },
    { key: 'startups', name: 'Startups', score: function (m) { return 70 * clamp01(0.5 + m.startupHcChange) + 30 * clamp01(1 - (m.startupFillQuarters || 0) / 2); },
      detail: function (m) { return signed(m.startupHcChange) + ' headcount · ' + (m.startupFillQuarters || 0).toFixed(2) + ' qtrs avg fill'; } },
    { key: 'retirees', name: 'Retirees & mentors', score: function (m) { return 100 * clamp01(m.retirements ? m.mentorRetirements / m.retirements : 0); },
      detail: function (m) { return int(m.retirements) + ' retired · ' + int(m.mentorRetirements) + ' after mentoring'; } },
    { key: 'regions', name: 'Regions', score: function (m) { return 100 * clamp01(1 - (m.cityGapP90P10 || 0) / 0.4); },
      detail: function (m) { var w = worstRegion(m); return 'city gap ' + pct(m.cityGapP90P10, 1) + ' · worst ' + (w ? w + ' ' + pct(m.regionUnemployment[w]) : '—'); } },
    { key: 'commuters', name: 'Commuters', score: function (m) { return 100 * clamp01(1 - (m.avgCommute - 10) / 20); },
      detail: function (m) { return m.avgCommute.toFixed(1) + ' mi average commute'; } },
  ];
  // weights: { personaKey: number }; missing keys weigh 1.
  function scorecard(m, weights) {
    weights = weights || {};
    var tw = 0, ts = 0;
    var rows = PERSONAS.map(function (p) {
      var w = weights[p.key] == null ? 1 : weights[p.key], sc = p.score(m);
      tw += w; ts += w * sc;
      return { key: p.key, name: p.name, score: sc, weight: w, detail: p.detail(m) };
    });
    return { rows: rows, overall: tw ? ts / tw : 0 };
  }

  var api = { personaMetrics: personaMetrics, ROWS: ROWS, quantile: quantile, PERSONAS: PERSONAS, scorecard: scorecard };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BWMetrics = api;
})(this);
