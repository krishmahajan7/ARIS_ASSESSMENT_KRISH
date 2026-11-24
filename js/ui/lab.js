/* BayWork Policy Lab — persona scorecard, baseline-vs-policy compare, stress tests, autopilot.
 *
 * Everything here runs the same deterministic engine as the main view. Runs are
 * chunked (one or more quarters per setTimeout tick, ~30 ms of work each) so
 * the page never freezes; Web Workers are not available from file://.
 */
(function (root) {
  'use strict';

  var C = root.BWCharts, fmt = C.fmt, esc = C.esc, attr = C.attr, delta = C.delta;
  var W = root.Workforce, M = root.BWMetrics;
  var DATA = { cities: root.BAY_CITIES, companies: root.BAY_COMPANIES };

  // What "Baseline" means: every uplift feature forced off (same seed and rules).
  var OFF = { fairScreening: 0, fairRotation: 0, warmHandoff: 0, mentorSharePct: 0, outsourceOn: 0, aiSharePct: 0 };
  // Scenario rows shown under the persona table (not scored).
  var EXTRA = [
    ['US unemployment', function (m) { return m.unemployment; }, 'pct', false],
    ['India headcount (outsourced roles)', function (m) { return m.indiaHeadcount; }, 'num', null],
    ['US roles automated by AI', function (m) { return m.aiFilledRoles; }, 'num', null],
  ];
  function offPatch() {
    var p = {};
    Object.keys(OFF).forEach(function (k) { if (k in W.DEFAULTS) p[k] = OFF[k]; });
    return p;
  }
  var QUICK = { companies: 100, years: 3 };
  var AUTO_SCALE = { companies: 60, years: 3 };

  // The autopilot's grid: named policies built from the features that exist.
  var GRID = [
    ['Fair-Chance slates', { fairScreening: 1 }],
    ['Fair-Chance, strong idle boost', { fairScreening: 1, fairIdleBoostPct: 60 }],
    ['Warm Handoff', { warmHandoff: 1 }],
    ['Warm Handoff, cap-exempt (policy lever)', { warmHandoff: 1, handoffCountsTowardCap: 0 }],
    ['Retire-to-Mentor 50%', { mentorSharePct: 50 }],
    ['Bay Corridors (3 suggested)', { corridors: 'suggest' }],
    ['Fair-Chance + Handoff', { fairScreening: 1, warmHandoff: 1 }],
    ['Fair-Chance + Mentor', { fairScreening: 1, mentorSharePct: 50 }],
    ['Fair-Chance + Corridors', { fairScreening: 1, corridors: 'suggest' }],
    ['Handoff + Mentor', { warmHandoff: 1, mentorSharePct: 50 }],
    ['All four', { fairScreening: 1, warmHandoff: 1, mentorSharePct: 50, corridors: 'suggest' }],
    ['All four, handoff cap-exempt', { fairScreening: 1, warmHandoff: 1, handoffCountsTowardCap: 0, mentorSharePct: 50, corridors: 'suggest' }],
  ];
  function gridAvailable() {
    return GRID.filter(function (g) {
      return Object.keys(g[1]).every(function (k) { return k === 'corridors' ? !!W.WorkforceSim.prototype.suggestCorridors : k in W.DEFAULTS; });
    }).slice(0, 12);
  }

  function fmtKind(v, kind) {
    if (v == null || !isFinite(v)) return '—';
    if (kind === 'pct') return fmt.pct(v);
    if (kind === 'ratio') return v.toFixed(3);
    if (kind === 'q') return v.toFixed(2) + ' q';
    if (kind === 'mi') return fmt.miles(v);
    return fmt.int(v);
  }
  function fmtDeltaKind(d, kind) {
    if (d == null || !isFinite(d)) return '—';
    var s = d > 0 ? '+' : d < 0 ? '−' : '±', a = Math.abs(d);
    if (kind === 'pct') return s + (a * 100).toFixed(1) + ' pts';
    if (kind === 'ratio') return s + a.toFixed(3);
    if (kind === 'q') return s + a.toFixed(2) + ' q';
    if (kind === 'mi') return s + a.toFixed(1) + ' mi';
    return s + fmt.int(a);
  }
  function scoreBar(score, color) {
    return '<div class="lab-bar"><div class="track"><div class="fill" style="width:' + Math.max(0, Math.min(100, score)).toFixed(1) + '%;background:' + (color || 'var(--s-blue)') + '"></div></div><b>' + score.toFixed(0) + '</b></div>';
  }
  function describe(patch) {
    var keys = Object.keys(patch || {}).filter(function (k) { return k !== 'seed'; });
    return keys.length ? keys.map(function (k) { return k + '=' + (k === 'corridors' ? (Array.isArray(patch[k]) ? patch[k].length + ' lines' : patch[k]) : patch[k]); }).join(', ') : 'no changes';
  }

  // ---------------------------------------------------------------- runner

  // Run one config to the end, a slice of quarters per tick. Resolves to metrics.
  function runChunked(cfg, extras, job, onQuarter) {
    return new Promise(function (resolve, reject) {
      var sim;
      try { sim = new W.WorkforceSim(cfg, DATA, resolveExtras(extras, cfg)); } catch (e) { reject(e); return; }
      (function tick() {
        if (job.cancelled) { reject(new Error('cancelled')); return; }
        var t0 = performance.now();
        try {
          do { sim.step(); onQuarter(); } while (!sim.done && performance.now() - t0 < 30);
        } catch (e) { reject(e); return; }
        if (sim.done) { var m = M.personaMetrics(sim, W); sim = null; resolve(m); } else setTimeout(tick, 0);
      })();
    });
  }
  // corridors: 'suggest' asks the engine for its top suggestions on this config.
  function resolveExtras(extras, cfg) {
    extras = Object.assign({}, extras || {});
    if (extras.corridors === 'suggest') {
      var probe = new W.WorkforceSim(cfg, DATA);
      extras.corridors = probe.suggestCorridors ? probe.suggestCorridors(3) : [];
    }
    return extras;
  }

  // ---------------------------------------------------------------- the lab

  function Lab(app) {
    this.app = app;
    this.tab = 'scorecard';
    this.cache = {};
    this.job = null;
    this.results = { compare: null, recession: null, boom: null, auto: null };
    this.scale = 'quick'; // a full-size run is ~5–15 s in Chrome; quick keeps a compare to a few seconds
    this.weights = {};
    try { this.weights = JSON.parse(localStorage.getItem('bw-lab-weights') || '{}') || {}; } catch (e) { this.weights = {}; }
  }
  var L = Lab.prototype;

  L.open = function (overlays, tab) {
    var self = this;
    this.overlays = overlays;
    if (tab) this.tab = tab;
    overlays.show(function () { return self.shell(); }, { kind: 'lab', args: [this.tab] });
    this.sheet = overlays.sheet;
    if (!this.sheet._labWired) { this.sheet._labWired = true; this.sheet.addEventListener('click', function (e) { self.onClick(e); }); this.sheet.addEventListener('input', function (e) { self.onInput(e); }); }
    this.renderBody();
  };
  L.isOpen = function () { return this.sheet && this.sheet.querySelector('.lab') && this.overlays.isOpen(); };

  L.shell = function () {
    var tabs = [['scorecard', 'Scorecard'], ['compare', 'Compare'], ['stress', 'Stress tests'], ['auto', 'Autopilot']];
    return '<div class="lab"><header class="sheet-head"><div><p class="eyebrow">Policy Lab</p><h2 id="sheet-title">Who does each policy help, and who pays for it?</h2>'
      + '<div class="badges"><span class="badge">Same engine, same seed</span><span class="badge">Baseline = every uplift feature off</span><span class="badge">Deterministic heuristics, no ML</span></div></div>'
      + '<button class="btn icon" type="button" data-close aria-label="Close">✕</button></header>'
      + '<div class="tabs lab-tabs" role="tablist">' + tabs.map(function (t) {
        return '<button class="tab" role="tab" type="button" data-lab-tab="' + t[0] + '" aria-selected="' + (t[0] === this.tab) + '">' + t[1] + '</button>';
      }, this).join('') + '</div><div id="lab-body"></div></div>';
  };

  L.renderBody = function () {
    if (!this.isOpen()) return;
    var body = this.sheet.querySelector('#lab-body');
    var html = this.tab === 'scorecard' ? this.scorecardHtml() : this.tab === 'compare' ? this.compareHtml()
      : this.tab === 'stress' ? this.stressHtml() : this.autoHtml();
    body.innerHTML = this.progressHtml() + html;
  };

  L.progressHtml = function () {
    if (!this.job) return '';
    return '<div class="lab-progress"><div><b id="lab-job-label">' + esc(this.job.label) + '</b> <span class="muted" id="lab-job-sub">' + esc(this.job.sub || '') + '</span></div>'
      + '<div class="progress"><div class="progress-fill" id="lab-job-bar" style="width:' + (this.job.done / Math.max(1, this.job.total) * 100).toFixed(1) + '%"></div></div>'
      + '<button class="btn" type="button" data-lab-action="cancel">Cancel</button></div>';
  };
  L.tickProgress = function () {
    if (!this.job || !this.isOpen()) return;
    var bar = this.sheet.querySelector('#lab-job-bar');
    if (bar) bar.style.width = (this.job.done / Math.max(1, this.job.total) * 100).toFixed(1) + '%';
    var sub = this.sheet.querySelector('#lab-job-sub');
    if (sub) sub.textContent = this.job.sub || '';
  };

  L.onClick = function (e) {
    if (!this.isOpen()) return;
    var t = e.target.closest('[data-lab-tab]');
    if (t) {
      this.tab = t.getAttribute('data-lab-tab');
      this.sheet.querySelectorAll('[data-lab-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b === t)); });
      if (this.overlays.stack.length) this.overlays.stack[this.overlays.stack.length - 1].args = [this.tab];
      this.renderBody();
      return;
    }
    var a = e.target.closest('[data-lab-action]');
    if (!a) return;
    var act = a.getAttribute('data-lab-action');
    if (act === 'cancel' && this.job) { this.job.cancelled = true; return; }
    if (act === 'scale') { this.scale = a.getAttribute('data-val'); this.renderBody(); return; }
    if (act === 'reset-weights') { this.weights = {}; this.saveWeights(); this.renderBody(); return; }
    if (this.job) return; // one job at a time
    if (act === 'compare') this.runCompare('compare', {});
    else if (act === 'recession') this.runCompare('recession', { shock: 1 });
    else if (act === 'boom') this.runCompare('boom', { shock: 2 });
    else if (act === 'auto') this.runAuto();
    else if (act === 'apply') {
      var r = this.results.auto && this.results.auto.ranked[Number(a.getAttribute('data-i'))];
      if (r) this.app.applyPolicy(r.patch);
    }
  };
  L.onInput = function (e) {
    var k = e.target.getAttribute('data-weight');
    if (!k) return;
    this.weights[k] = Number(e.target.value);
    this.saveWeights();
    var out = this.sheet.querySelector('[data-weight-out="' + k + '"]');
    if (out) out.textContent = Number(e.target.value).toFixed(1) + '×';
    clearTimeout(this._wt);
    var self = this;
    this._wt = setTimeout(function () {
      // Re-render without losing slider focus: only the overall readouts depend on weights.
      self.sheet.querySelectorAll('[data-overall]').forEach(function (el) { el.innerHTML = self.overallText(el.getAttribute('data-overall')); });
    }, 60);
  };
  L.saveWeights = function () { try { localStorage.setItem('bw-lab-weights', JSON.stringify(this.weights)); } catch (e) { /* storage blocked */ } };

  // ---------------------------------------------------------------- scorecard

  L.currentMetrics = function () {
    var sim = this.app.sim();
    if (!sim || sim.q < 1) return null;
    if (this._curQ !== sim.q || this._curSim !== sim) { this._curQ = sim.q; this._curSim = sim; this._cur = M.personaMetrics(sim, W); }
    return this._cur;
  };
  L.overallText = function (which) {
    var m = which === 'current' ? this.currentMetrics() : null;
    if (which === 'current') return m ? M.scorecard(m, this.weights).overall.toFixed(1) : '—';
    var parts = which.split(':'), res = this.results[parts[0]];
    if (!res) return '—';
    var b = M.scorecard(res.base, this.weights).overall, p = M.scorecard(res.pol, this.weights).overall;
    return b.toFixed(1) + ' → <b>' + p.toFixed(1) + '</b> ' + delta(p - b, true, (p - b >= 0 ? '+' : '−') + Math.abs(p - b).toFixed(1));
  };

  L.scorecardHtml = function () {
    var m = this.currentMetrics(), sim = this.app.sim();
    if (!m) return '<p class="muted lab-empty">Run the simulation (or step a few quarters) to fill the scorecard. It reads the run on the main screen.</p>';
    var sc = M.scorecard(m, this.weights);
    var rows = sc.rows.map(function (r) {
      return '<tr><td><b>' + esc(r.name) + '</b></td><td style="width:34%">' + scoreBar(r.score) + '</td><td class="muted">' + esc(r.detail) + '</td>'
        + '<td class="lab-w"><input type="range" min="0" max="3" step="0.5" value="' + r.weight + '" data-weight="' + r.key + '" aria-label="Weight for ' + attr(r.name) + '"><span data-weight-out="' + r.key + '">' + r.weight.toFixed(1) + '×</span></td></tr>';
    }).join('');
    return '<div class="lab-overall"><div><span class="muted">Weighted score, this run</span><div class="big" data-overall="current">' + this.overallText('current') + '</div></div>'
      + '<p class="muted">' + esc(sim.label(sim.q)) + ' · ' + sim.q + ' of ' + sim.quarters + ' quarters · settings: ' + esc(describe(this.app.upliftSettings())) + '. '
      + (sim.q < 5 ? '<b>“Placed ≤4Q” needs 4 quarters of follow-up, so early numbers are thin.</b> ' : '')
      + 'Weights apply in every tab.</p></div>'
      + '<div class="tbl-wrap"><table class="data lab-table"><thead><tr><th>Persona</th><th>Score (0–100)</th><th>What it measures, this run</th><th>Weight</th></tr></thead><tbody>' + rows
      + EXTRA.map(function (x) { return '<tr class="lab-extra"><td><b>' + esc(x[0]) + '</b></td><td class="muted">scenario row, not scored</td><td>' + fmtKind(x[1](m), x[2]) + '</td><td></td></tr>'; }).join('')
      + '</tbody></table></div>'
      + '<p class="chart-sub" style="margin-top:8px">Scores are heuristic 0–100 scales of one or two metrics each (README, “Persona scorecard”), not a welfare measure. Compare policies on the same scale, not across scales. “Placed ≤4Q” = hired in the quarter they started looking or the 3 after it. <button class="link" type="button" data-lab-action="reset-weights">Reset weights</button></p>';
  };

  // ---------------------------------------------------------------- compare and stress

  L.runConfigs = function (extra) {
    var cfg = Object.assign({}, this.app.cfg(), this.scale === 'quick' ? QUICK : {}, extra);
    var base = Object.assign({}, cfg, offPatch());
    return { cfg: cfg, base: base, extras: this.app.extras(), baseExtras: { corridors: [] } };
  };

  L.runCompare = function (slot, extra) {
    var self = this, rc = this.runConfigs(extra);
    var key = JSON.stringify([rc.base, 'base']);
    var quarters = W.normalizeConfig(rc.cfg).years * 4;
    var cached = this.cache[key];
    var job = this.job = { label: slot === 'compare' ? 'Comparing' : slot === 'recession' ? 'Recession test' : 'Boom test', sub: '', done: 0, total: quarters * (cached ? 1 : 2), cancelled: false };
    var t0 = performance.now();
    this.renderBody();
    var step = function () { job.done++; self.tickProgress(); };
    var baseP = cached ? Promise.resolve(cached) : (job.sub = 'baseline (all uplift off)', runChunked(rc.base, rc.baseExtras, job, step));
    baseP.then(function (base) {
      self.cache[key] = base;
      job.sub = 'your policy';
      self.tickProgress();
      return runChunked(rc.cfg, rc.extras, job, step).then(function (pol) {
        self.results[slot] = { base: base, pol: pol, cfg: rc.cfg, patch: self.app.upliftSettings(), seconds: (performance.now() - t0) / 1000, cachedBase: !!cached };
      });
    }).catch(function (e) { if (e.message !== 'cancelled') { self.results[slot] = { error: String(e.message || e) }; } })
      .then(function () { self.job = null; self.renderBody(); });
  };

  // Persona rows, gains and losses, then the metric table.
  L.resultHtml = function (res, slot) {
    if (!res) return '';
    if (res.error) return '<p class="lab-warn">Run failed: ' + esc(res.error) + '</p>';
    var b = M.scorecard(res.base, this.weights), p = M.scorecard(res.pol, this.weights);
    var gains = [], losses = [], sum = 0;
    var rows = b.rows.map(function (rb, i) {
      var rp = p.rows[i], d = rp.score - rb.score;
      sum += d;
      if (d >= 1) gains.push(rb.name + ' ' + '+' + d.toFixed(0)); else if (d <= -1) losses.push(rb.name + ' −' + Math.abs(d).toFixed(0));
      return '<tr' + (d <= -1 ? ' class="lab-loss"' : '') + '><td><b>' + esc(rb.name) + '</b></td><td>' + scoreBar(rb.score, 'var(--s-gray)') + '</td><td>' + scoreBar(rp.score) + '</td>'
        + '<td class="r">' + delta(d, true, (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1)) + '</td><td class="muted">' + esc(rp.detail) + '</td></tr>';
    }).join('');
    var same = describe(res.patch) === 'no changes';
    var metricRows = M.ROWS.map(function (r) {
      var vb = r[2](res.base), vp = r[2](res.pol), d = vb != null && vp != null ? vp - vb : null;
      return '<tr><td>' + esc(r[1]) + '</td><td class="r">' + fmtKind(vb, r[3]) + '</td><td class="r">' + fmtKind(vp, r[3]) + '</td><td class="r">'
        + (r[4] == null ? '<span class="delta flat">' + fmtDeltaKind(d, r[3]) + '</span>' : delta(d && Math.abs(d) > 1e-9 ? d : 0, r[4], fmtDeltaKind(d, r[3]))) + '</td></tr>';
    }).join('');
    var cfg = W.normalizeConfig(res.cfg);
    return (same ? '<p class="lab-warn">No uplift feature is on in your settings, so “Your policy” equals the baseline. Pick a preset in the sidebar (or switch a feature on) and run again.</p>' : '')
      + '<div class="lab-overall"><div><span class="muted">Weighted score, baseline → your policy</span><div class="big" data-overall="' + slot + '">' + this.overallText(slot) + '</div></div>'
      + '<p class="muted">Seed ' + cfg.seed + ' · ' + cfg.companies + ' companies · ' + cfg.years + ' years' + (cfg.shock ? ' · shock in quarters ' + (cfg.shockStartQ + 1) + '–' + (cfg.shockStartQ + cfg.shockQuarters) : '') + ' · policy: ' + esc(describe(res.patch))
      + ' · ' + res.seconds.toFixed(1) + ' s' + (res.cachedBase ? ' (baseline cached)' : '') + '</p></div>'
      + '<div class="lab-gl"><div class="gain"><b>Who gains</b> ' + (gains.length ? esc(gains.join(' · ')) : '<span class="muted">nobody by 1+ point</span>') + '</div>'
      + '<div class="loss"><b>Who loses</b> ' + (losses.length ? esc(losses.join(' · ')) : '<span class="muted">nobody by 1+ point</span>') + '</div>'
      + '<div class="net"><b>Sum of persona changes</b> ' + delta(sum, true, (sum >= 0 ? '+' : '−') + Math.abs(sum).toFixed(1) + ' points') + ' <span class="muted">(unweighted; under the hiring cap, gains for one group are often paid by another)</span></div></div>'
      + '<div class="tbl-wrap"><table class="data lab-table"><thead><tr><th>Persona</th><th>Baseline</th><th>Your policy</th><th class="r">Δ score</th><th>Your policy, in numbers</th></tr></thead><tbody>' + rows
      + EXTRA.map(function (x) {
        var vb = x[1](res.base), vp = x[1](res.pol), d = vp - vb;
        return '<tr class="lab-extra"><td><b>' + esc(x[0]) + '</b></td><td>' + fmtKind(vb, x[2]) + '</td><td>' + fmtKind(vp, x[2]) + '</td><td class="r">'
          + (x[3] == null ? '<span class="delta flat">' + fmtDeltaKind(d, x[2]) + '</span>' : delta(Math.abs(d) > 1e-9 ? d : 0, x[3], fmtDeltaKind(d, x[2]))) + '</td><td class="muted">scenario row, not scored</td></tr>';
      }).join('')
      + '</tbody></table></div>'
      + '<details class="lab-details"><summary>All metrics</summary><div class="tbl-wrap"><table class="data"><thead><tr><th>Metric</th><th class="r">Baseline</th><th class="r">Your policy</th><th class="r">Δ</th></tr></thead><tbody>' + metricRows + '</tbody></table></div>'
      + '<p class="chart-sub">“NET placed ≤4Q” adds the three pool cohorts. If a policy only moves jobs between groups, NET stays flat while the group rows move in opposite directions.</p></details>';
  };

  L.scaleHtml = function () {
    var c = this.app.cfg();
    return '<div class="lab-scale"><span class="muted">Scale</span><div class="seg-group">'
      + '<button class="seg" type="button" data-lab-action="scale" data-val="full" aria-pressed="' + (this.scale === 'full') + '">Your settings (' + c.companies + ' cos · ' + c.years + ' y)</button>'
      + '<button class="seg" type="button" data-lab-action="scale" data-val="quick" aria-pressed="' + (this.scale === 'quick') + '">Quick (100 cos · 3 y)</button></div></div>';
  };

  L.compareHtml = function () {
    return '<div class="lab-actions"><button class="btn primary" type="button" data-lab-action="compare"' + (this.job ? ' disabled' : '') + '>Run baseline vs your policy</button>' + this.scaleHtml() + '</div>'
      + '<p class="chart-sub">Runs the same seed and settings twice: once with every uplift feature off, once with your sidebar settings. A full-size run takes a few seconds in Chrome; the baseline is cached for the same settings.</p>'
      + (this.results.compare ? this.resultHtml(this.results.compare, 'compare') : '');
  };

  L.stressHtml = function () {
    var res = this.results, normal = res.compare && !res.compare.error ? M.scorecard(res.compare.pol, this.weights).overall - M.scorecard(res.compare.base, this.weights).overall : null;
    var still = function (r) {
      if (!r || r.error) return '';
      var d = M.scorecard(r.pol, this.weights).overall - M.scorecard(r.base, this.weights).overall;
      return '<p class="lab-verdict">' + (d > 0.5 ? 'Your policy <b>still helps</b> under this shock' : d < -0.5 ? 'Under this shock your policy <b>does worse</b> than the baseline' : 'Under this shock your policy makes <b>little difference</b>')
        + ' (' + (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' weighted points' + (normal != null ? '; ' + (normal >= 0 ? '+' : '−') + Math.abs(normal).toFixed(1) + ' without the shock' : '') + ').</p>';
    }.bind(this);
    return '<div class="lab-actions"><button class="btn primary" type="button" data-lab-action="recession"' + (this.job ? ' disabled' : '') + '>Run recession</button>'
      + '<button class="btn" type="button" data-lab-action="boom"' + (this.job ? ' disabled' : '') + '>Run hiring boom</button>' + this.scaleHtml() + '</div>'
      + '<p class="chart-sub">Both runs (baseline and your policy) get the same shock in year 2 (quarters 5–8). <b>Recession</b>: layoff rates ×2 and funded growth frozen. <b>Boom</b>: funded growth ×2 and the hiring cap ×1.5. These multipliers are <b>assumptions</b> chosen to make the shock visible, not estimates of a real cycle.</p>'
      + (res.recession ? '<h3 class="lab-h">Recession</h3>' + still(res.recession) + this.resultHtml(res.recession, 'recession') : '')
      + (res.boom ? '<h3 class="lab-h">Hiring boom</h3>' + still(res.boom) + this.resultHtml(res.boom, 'boom') : '');
  };

  // ---------------------------------------------------------------- autopilot

  L.runAuto = function () {
    var self = this, grid = gridAvailable();
    var common = Object.assign({}, this.app.cfg(), AUTO_SCALE);
    var base = Object.assign({}, common, offPatch());
    var quarters = W.normalizeConfig(common).years * 4;
    var job = this.job = { label: 'Autopilot', sub: '', done: 0, total: quarters * (grid.length + 1), cancelled: false };
    var t0 = performance.now();
    this.renderBody();
    var step = function () { job.done++; self.tickProgress(); };
    var out = [];
    job.sub = 'baseline';
    var chain = runChunked(base, { corridors: [] }, job, step).then(function (bm) {
      var i = 0;
      var next = function () {
        if (i >= grid.length) return bm;
        var g = grid[i++], numeric = {}, extras = { corridors: [] };
        Object.keys(g[1]).forEach(function (k) { if (k === 'corridors') extras.corridors = g[1][k]; else numeric[k] = g[1][k]; });
        job.sub = g[0] + ' (' + i + ' of ' + grid.length + ')';
        self.tickProgress();
        return runChunked(Object.assign({}, base, numeric), extras, job, step).then(function (m) { out.push({ name: g[0], patch: g[1], m: m }); return next(); });
      };
      return next();
    });
    chain.then(function (bm) {
      self.results.auto = { base: bm, runs: out, seconds: (performance.now() - t0) / 1000, cfg: common };
      self.rankAuto();
    }).catch(function (e) { if (e.message !== 'cancelled') self.results.auto = { error: String(e.message || e) }; })
      .then(function () { self.job = null; self.renderBody(); });
  };
  L.rankAuto = function () {
    var a = this.results.auto, self = this;
    if (!a || a.error) return;
    var b = M.scorecard(a.base, this.weights);
    a.ranked = a.runs.map(function (r) {
      var s = M.scorecard(r.m, self.weights);
      return { name: r.name, patch: r.patch, overall: s.overall, d: s.overall - b.overall, rows: s.rows.map(function (x, i) { return x.score - b.rows[i].score; }) };
    }).sort(function (x, y) { return y.d - x.d; });
  };

  L.autoHtml = function () {
    var a = this.results.auto, n = gridAvailable().length;
    if (a && !a.error) this.rankAuto(); // weights may have changed since the run
    var html = '<div class="lab-actions"><button class="btn primary" type="button" data-lab-action="auto"' + (this.job ? ' disabled' : '') + '>Search ' + n + ' policies</button></div>'
      + '<p class="chart-sub">Tries a small, fixed grid of ' + n + ' policy combinations (feature toggles and a few levels) on a <b>smaller model</b> (' + AUTO_SCALE.companies + ' companies, ' + AUTO_SCALE.years + ' years, your seed and rules), scores each with your persona weights, and shows the top 3. It is a grid search, not an optimiser, and the full-size result can differ: check a pick in the Compare tab.</p>';
    if (!a) return html;
    if (a.error) return html + '<p class="lab-warn">Search failed: ' + esc(a.error) + '</p>';
    var names = M.PERSONAS.map(function (p) { return p.name; });
    html += '<p class="muted">Searched in ' + a.seconds.toFixed(1) + ' s. Baseline weighted score ' + M.scorecard(a.base, this.weights).overall.toFixed(1) + '.</p><div class="lab-picks">';
    a.ranked.slice(0, 3).forEach(function (r, i) {
      html += '<article class="lab-pick"><div class="lab-pick-head"><div><span class="insight-n">' + (i + 1) + '</span> <b>' + esc(r.name) + '</b></div>'
        + '<div>' + delta(r.d, true, (r.d >= 0 ? '+' : '−') + Math.abs(r.d).toFixed(1) + ' weighted') + '</div></div>'
        + '<div class="lab-pick-rows">' + r.rows.map(function (d, k) {
          return '<span class="' + (d <= -1 ? 'neg' : d >= 1 ? 'pos' : '') + '">' + esc(names[k]) + ' ' + (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(0) + '</span>';
        }).join('') + '</div><button class="btn" type="button" data-lab-action="apply" data-i="' + i + '">Apply this policy</button></article>';
    });
    html += '</div><details class="lab-details"><summary>All ' + a.ranked.length + ' results</summary><div class="tbl-wrap"><table class="data"><thead><tr><th>Policy</th><th class="r">Weighted Δ</th><th>Settings</th></tr></thead><tbody>'
      + a.ranked.map(function (r) { return '<tr><td>' + esc(r.name) + '</td><td class="r">' + delta(r.d, true, (r.d >= 0 ? '+' : '−') + Math.abs(r.d).toFixed(1)) + '</td><td class="muted">' + esc(describe(r.patch)) + '</td></tr>'; }).join('')
      + '</tbody></table></div></details>';
    return html;
  };

  root.BWLab = Lab;
  root.BWLabGrid = GRID;
})(this);
