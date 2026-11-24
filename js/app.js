/* BayWork app — controls, run loop, dashboard and wiring. */
(function () {
  'use strict';

  var W = window.Workforce, Charts = window.BWCharts, fmt = Charts.fmt, esc = Charts.esc, delta = Charts.delta;
  var DATA = { cities: window.BAY_CITIES, companies: window.BAY_COMPANIES };

  var CONTROLS = [
    { group: 'Scope', items: [
      { key: 'companies', label: 'Companies in the hiring plan', sym: 'X', min: 2, max: 500, step: 2, hint: 'Half are the largest companies, half are startups.' },
      { key: 'years', label: 'Years to simulate', unit: 'y', min: 1, max: 15, step: 1 },
      { key: 'seed', label: 'Seed', min: 0, max: 99999, step: 1, noSlider: true, hint: 'Same seed and settings, same run.' },
    ] },
    { group: 'Rules from the brief', items: [
      { key: 'startupMax', label: 'Startup max headcount', min: 5, max: 100, step: 1 },
      { key: 'hireCapPct', label: 'Hiring cap per quarter', unit: '% of HC', min: 1, max: 20, step: 0.5, decimals: 1 },
      { key: 'hireCapMin', label: 'Cap floor', unit: 'hires', min: 0, max: 20, step: 1, hint: 'When the percentage is smaller than this.' },
      { key: 'capIncludesBackfills', label: 'Backfills count toward the cap', toggle: true, hint: 'Off: only growth hires are capped.' },
      { key: 'halfLifeLarge', label: 'Employee half-life, large', unit: 'y', min: 0.5, max: 10, step: 0.5, decimals: 1 },
      { key: 'halfLifeStartup', label: 'Employee half-life, startup', unit: 'y', min: 0.5, max: 10, step: 0.5, decimals: 1 },
      { key: 'layoffLargePct', label: 'Layoffs per year, large', unit: '%', min: 0, max: 30, step: 1 },
      { key: 'layoffStartupPct', label: 'Layoffs per year, startup', unit: '%', min: 0, max: 50, step: 1 },
      { key: 'gradPct', label: 'New grads per year', unit: '% of LF', min: 0, max: 10, step: 0.5, decimals: 1 },
      { key: 'retirePct', label: 'Retirements per year', unit: '% of LF', min: 0, max: 10, step: 0.5, decimals: 1 },
      { key: 'layoffDiscountPct', label: 'Laid-off comp discount', unit: '%', min: 0, max: 50, step: 1 },
      { key: 'raisePct', label: 'Annual raise, incumbents', unit: '%', min: 0, max: 25, step: 1 },
      { key: 'bandGrowthPct', label: 'Annual growth, position comp', unit: '%', min: 0, max: 15, step: 0.5, decimals: 1 },
      { key: 'hiringCostPct', label: 'Hiring cost', unit: '% of comp', min: 0, max: 30, step: 1 },
      { key: 'span', label: 'Engineers per manager', unit: ':1', min: 3, max: 20, step: 1 },
      { key: 'nearbyMiles', label: '2× likelier to accept per', unit: 'mi closer', min: 2, max: 60, step: 1, hint: 'At equal comp, a candidate this much closer accepts twice as often.' },
    ] },
    { group: 'Candidate behaviour', items: [
      { key: 'baseAcceptPct', label: 'Acceptance at full ask, next door', unit: '%', min: 5, max: 100, step: 5 },
      { key: 'compElasticity', label: 'Comp sensitivity', unit: 'exp.', min: 0, max: 15, step: 0.5, decimals: 1, hint: 'P ∝ (offer ÷ ask)^this.' },
      { key: 'reservationDecayPct', label: 'Ask drops per idle quarter', unit: '%', min: 0, max: 10, step: 0.5, decimals: 1 },
      { key: 'switchPremiumPct', label: 'Switchers ask on top of pay', unit: '%', min: 0, max: 30, step: 1 },
      { key: 'exitAfterQuarters', label: 'Leave Bay Area after idle', unit: 'qtrs', min: 0, max: 20, step: 1, hint: '0 = never.' },
    ] },
    { group: 'Company behaviour', items: [
      { key: 'growthLargePct', label: 'Funded growth, large', unit: '%/y', min: -10, max: 30, step: 1 },
      { key: 'growthStartupPct', label: 'Funded growth, startups', unit: '%/y', min: 0, max: 200, step: 5 },
      { key: 'slate', label: 'Candidates screened per req', min: 1, max: 40, step: 1 },
      { key: 'offerEscalationPct', label: 'Offer bump per unfilled quarter', unit: '%', min: 0, max: 15, step: 0.5, decimals: 1 },
      { key: 'promoteSharePct', label: 'Manager seats filled from within', unit: '%', min: 0, max: 100, step: 5 },
      { key: 'layoffTargeting', label: 'Who gets laid off', choice: [[0, 'At random'], [1, 'Most over band']] },
      { key: 'freezeOnLayoff', label: 'Freeze hiring in the layoff quarter', toggle: true },
      { key: 'layoffQuarter', label: 'Layoff round', choice: [[1, 'Q1'], [2, 'Q2'], [3, 'Q3'], [4, 'Q4']] },
      { key: 'gradQuarter', label: 'Graduates arrive', choice: [[3, 'Q3'], [0, 'Spread']] },
      { key: 'initialPoolPct', label: 'Initially looking', unit: '% of employed', min: 0, max: 15, step: 0.5, decimals: 1 },
    ] },
    { group: 'Uplift features', note: 'Opt-in policies built on top of the original model. All off = the original simulator, number for number.', items: [
      { key: 'fairScreening', label: 'Fair-Chance: offer by fit, not seniority', toggle: true,
        hint: 'Recruiters offer first to the candidate whose ask the seat can best meet, instead of the most experienced. Measured (full scale, 3 seeds): new grads placed within 4 quarters +37 points and the city gap −7 points; experienced (10y+) candidates −28, switchers −10, laid-off −7. Under the cap, total hires don’t change.' },
      { key: 'fairIdleBoostPct', label: 'Fit boost for long-idle people', unit: '% at 8+ qtrs', min: 0, max: 100, step: 5, hint: 'Softens the cost to switchers and startups.' },
      { key: 'fairRankDistance', label: 'Fit rank also weighs commute', toggle: true, hint: 'Off by default: ranking on commute too widened the city unemployment gap by about 9–13 points.' },
      { key: 'fairRotation', label: 'Reserve slate seats for the longest-idle', toggle: true, hint: 'Measured: long-idle people are already screened, so this did not help on its own. Kept for comparison.' },
      { key: 'fairRotationPct', label: 'Reserved share of each slate', unit: '%', min: 0, max: 50, step: 5 },
      { key: 'warmHandoff', label: 'Warm Handoff: redeploy laid-off people', toggle: true,
        hint: 'The quarter of a layoff, each laid-off person gets first look at open seats at nearby companies, before general hiring. Same offer rule and acceptance formula.' },
      { key: 'handoffCountsTowardCap', label: 'Handoff hires count toward the cap', toggle: true, hint: 'On = the brief’s 5% rule: laid-off people placed within 4 quarters +18 points, rehired at 78% of old pay instead of 74%, but switchers −6 (jobs move between groups). Off = a policy lever that bypasses the cap: unemployment −8 points.' },
      { key: 'handoffRadiusMiles', label: 'Handoff radius, HQ to HQ', unit: 'mi', min: 5, max: 60, step: 5 },
      { key: 'handoffSharePct', label: 'Laid-off people offered a handoff', unit: '%', min: 0, max: 100, step: 10 },
      { key: 'mentorSharePct', label: 'Retire-to-Mentor: retirees who phase out', unit: '%', min: 0, max: 100, step: 10,
        hint: '0 = off. A retiring employee keeps their seat as a mentor for a while, so no backfill opens yet, then retires for real.' },
      { key: 'mentorQuarters', label: 'Mentoring period', unit: 'qtrs', min: 1, max: 12, step: 1 },
      { key: 'mentorAttritionCut', label: 'Grad quit-rate cut where a mentor works', unit: '% (assumption)', min: 0, max: 60, step: 5,
        hint: 'ASSUMPTION, not evidence. Measured: almost all of the grad-retention gain comes from this number; the headcount and unemployment gains come from mentors keeping their seats (they also appear at 0%).' },
    ] },
  ];
  var SPEEDS = [0.5, 1, 2, 4, 8];
  // Presets only touch the uplift features; the brief's rules stay as set.
  var PRESETS = [
    ['original', 'Original', {}, 'The simulator as provided: every uplift feature off.'],
    ['all', 'All uplift', { fairScreening: 1, warmHandoff: 1, mentorSharePct: 50, corridors: 'suggest' }, 'All four features, cap-faithful (handoffs count toward the cap).'],
    ['fair', 'Fair-Chance', { fairScreening: 1 }, 'Offer by fit, not seniority.'],
    ['handoff', 'Warm Handoff', { warmHandoff: 1 }, 'Laid-off people get first look at nearby open seats.'],
    ['handoffLever', 'Handoff, cap-exempt', { warmHandoff: 1, handoffCountsTowardCap: 0 }, 'Policy lever: redeployment bypasses the 5% cap.'],
    ['corridors', 'Bay Corridors', { corridors: 'suggest' }, 'Three suggested shuttle corridors.'],
    ['mentor', 'Retire-to-Mentor', { mentorSharePct: 50 }, 'Half of retirees phase out as mentors for 4 quarters.'],
  ];
  var LAYERS = [['hqs', 'Company HQs', 'var(--s-blue)'], ['startups', 'Startups', 'var(--s-aqua)'], ['residents', 'Where engineers live', 'var(--s-orange)'], ['flows', 'Hiring flows', 'var(--s-blue)']];

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    cfg: Object.assign({}, W.DEFAULTS),
    sim: null, status: 'ready', speed: 2, timer: null, chartTab: 'market', cityRows: null,
    corridors: [], // Bay Corridors: [{ from, to, cutPct, spillMiles }], outside the numeric settings
    preset: 'original', drawing: false, drawFrom: null,
  };
  var UPLIFT_KEYS = [];
  var inputs = {};

  // ---------------------------------------------------------------- controls

  function decimals(c) { return c.decimals || 0; }
  function clamp(c, v) {
    if (c.toggle) return v === true || v === 1 || v === '1' ? 1 : 0;
    if (c.choice) return Number(v);
    v = Number(v);
    if (!isFinite(v)) v = W.DEFAULTS[c.key];
    if (c.min != null) v = Math.max(c.min, v);
    if (c.max != null && !c.noSlider) v = Math.min(c.max, v);
    return decimals(c) ? Number(v.toFixed(decimals(c))) : Math.round(v);
  }

  function buildControls() {
    var html = '';
    CONTROLS.forEach(function (g) {
      html += '<details class="group" open><summary>' + g.group + '</summary>' + (g.note ? '<p class="group-note">' + g.note + '</p>' : '');
      g.items.forEach(function (c) {
        var id = 'in-' + c.key;
        var labelHtml = '<label for="' + id + '">' + c.label + (c.sym ? ' <span class="sym">' + c.sym + '</span>' : '') + '</label>';
        if (c.toggle) {
          html += '<div class="ctl"><div class="ctl-head">' + labelHtml + '<label class="switch"><input type="checkbox" id="' + id + '" data-key="' + c.key + '"><span class="track"></span></label></div>'
            + (c.hint ? '<p class="ctl-hint">' + c.hint + '</p>' : '') + '</div>';
        } else if (c.choice) {
          html += '<div class="ctl"><div class="ctl-head"><span style="font-weight:550">' + c.label + '</span></div><div class="choice" role="group" aria-label="' + c.label + '">'
            + c.choice.map(function (o) { return '<button class="seg" type="button" data-key="' + c.key + '" data-val="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
        } else {
          html += '<div class="ctl"><div class="ctl-head">' + labelHtml + '<span class="ctl-val">'
            + (c.noSlider ? '<button class="dice" type="button" id="dice">Shuffle</button>' : '')
            + '<input type="number" id="' + id + '" data-key="' + c.key + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '">'
            + (c.unit ? '<span>' + c.unit + '</span>' : '') + '</span></div>'
            + (c.noSlider ? '' : '<input type="range" data-key="' + c.key + '" aria-label="' + c.label + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '">')
            + (c.hint ? '<p class="ctl-hint">' + c.hint + '</p>' : '') + '</div>';
        }
        inputs[c.key] = { def: c };
        if (g.group === 'Uplift features') UPLIFT_KEYS.push(c.key);
      });
      html += '</details>';
    });
    $('config').innerHTML = html;
    Object.keys(inputs).forEach(function (k) {
      var c = inputs[k];
      c.num = document.querySelector('#config input[data-key="' + k + '"]:not([type="range"])');
      c.range = document.querySelector('#config input[type="range"][data-key="' + k + '"]');
      c.segs = document.querySelectorAll('#config .seg[data-key="' + k + '"]');
    });
    var cfgEl = $('config');
    cfgEl.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-key');
      if (k && e.target.type === 'range') setConfig(k, e.target.value);
    });
    cfgEl.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-key');
      if (!k) return;
      if (e.target.type === 'checkbox') setConfig(k, e.target.checked ? 1 : 0);
      else if (e.target.type === 'number') setConfig(k, e.target.value);
    });
    cfgEl.addEventListener('click', function (e) {
      var seg = e.target.closest('.seg[data-key]');
      if (seg) setConfig(seg.getAttribute('data-key'), seg.getAttribute('data-val'));
    });
    $('dice').addEventListener('click', function () { setConfig('seed', Math.floor(Math.random() * 99999)); });
    syncControls();
  }

  function syncControls() {
    Object.keys(inputs).forEach(function (k) {
      var c = inputs[k], v = state.cfg[k];
      if (c.def.toggle) c.num.checked = !!v;
      else if (c.def.choice) c.segs.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-val')) === Number(v))); });
      else {
        c.num.value = decimals(c.def) ? Number(v).toFixed(decimals(c.def)) : v;
        if (c.range) {
          c.range.value = v;
          c.range.style.setProperty('--pct', ((v - c.def.min) / (c.def.max - c.def.min) * 100) + '%');
        }
      }
    });
  }

  function locked() { return state.status === 'running' || state.status === 'paused'; }

  function setConfig(key, raw) {
    if (locked()) return;
    if (UPLIFT_KEYS.indexOf(key) >= 0 && state.preset) { state.preset = null; renderPresets(); }
    state.cfg[key] = clamp(inputs[key].def, raw);
    syncControls();
    clearTimeout(setConfig.t);
    setConfig.t = setTimeout(newRun, 120);
  }

  function lockControls() {
    var lock = locked();
    if (lock && state.drawing) { state.drawing = false; state.drawFrom = null; }
    if ($('preset-list').children.length) renderPresets();
    if (state.sim) renderCorridors();
    document.querySelector('.sidebar').classList.toggle('locked', lock);
    document.querySelectorAll('#config input, #config .seg, #dice').forEach(function (e) { e.disabled = lock; });
    $('btn-defaults').disabled = lock;
    if (lock) $('draw-hint').hidden = true;
  }

  // ---------------------------------------------------------------- run control

  function newRun() {
    stopTimer();
    state.sim = new W.WorkforceSim(state.cfg, DATA, { corridors: state.corridors });
    state.cityRows = state.sim.cityStats();
    map.setSim(state.sim);
    map.update(state.cityRows);
    renderLegend();
    $('company-list').innerHTML = state.sim.companies.filter(function (c) { return c.kind === 'large'; })
      .map(function (c) { return '<option value="' + Charts.attr(c.name) + '"></option>'; }).join('');
    setStatus('ready');
    renderAll();
  }

  function setStatus(s) {
    state.status = s;
    var labels = { ready: 'Start', running: 'Stop', paused: 'Resume', finished: 'Start again' };
    $('btn-start-label').textContent = labels[s];
    $('btn-start').classList.toggle('is-running', s === 'running');
    var st = $('status');
    st.dataset.state = s;
    st.textContent = { ready: 'Ready', running: 'Running', paused: 'Stopped', finished: 'Finished' }[s];
    $('btn-step').disabled = s === 'running' || s === 'finished';
    $('btn-summary').disabled = !(state.sim && state.sim.q > 0);
    lockControls();
  }

  function start() {
    if (state.status === 'finished') newRun();
    setStatus('running');
    tick();
  }
  function stop() { stopTimer(); setStatus('paused'); }
  function stopTimer() { clearTimeout(state.timer); state.timer = null; }
  function toggle() { if (state.status === 'running') stop(); else start(); }

  function stepOnce() {
    if (state.sim.done) return;
    state.sim.step();
    state.cityRows = state.sim.cityStats();
    map.update(state.cityRows);
    renderAll();
    if (state.sim.done) finish();
    else if (state.status === 'ready') setStatus('paused');
  }

  function tick() {
    if (state.status !== 'running') return;
    var t0 = performance.now();
    stepOnce();
    if (state.status !== 'running') return;
    var wait = Math.max(0, 1000 / state.speed - (performance.now() - t0));
    state.timer = setTimeout(tick, wait);
  }

  function finish() {
    stopTimer();
    setStatus('finished');
    overlays.summary();
  }

  // ---------------------------------------------------------------- dashboard

  function renderAll() {
    var sim = state.sim, s = sim.series, last = s[s.length - 1], first = s[0];
    renderCorridors();
    $('clock').textContent = last.label;
    $('clock-q').textContent = sim.q + ' of ' + sim.quarters + ' quarters';
    $('progress').style.width = (sim.q / sim.quarters * 100) + '%';
    $('btn-summary').disabled = !(sim.q > 0);
    renderKpis(first, last, s);
    renderCharts();
    renderMovers();
    renderFocus();
  }

  function kpi(label, value, sub) {
    return '<div class="kpi"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div><div class="kpi-sub">' + sub + '</div></div>';
  }

  function renderKpis(first, last, s) {
    var total = s.slice(1).reduce(function (t, x) { return t + x.hireSpend; }, 0);
    var gap = last.avgBand ? last.avgComp / last.avgBand - 1 : 0;
    $('kpis').innerHTML =
      kpi('Employed engineers', fmt.int(last.employed),
        delta(last.employed - first.employed, true, fmt.signedPct(last.employed / first.employed - 1)) + '<span>' + fmt.k(last.employedLarge) + ' large · ' + fmt.k(last.employedStartup) + ' startups</span>')
      + kpi('Unemployment', fmt.pct(last.unemployment),
        delta(last.unemployment - first.unemployment, false, (last.unemployment >= first.unemployment ? '+' : '−') + Math.abs((last.unemployment - first.unemployment) * 100).toFixed(1) + ' pts')
        + '<span>' + fmt.k(last.pool) + ' looking</span>')
      + kpi('Open reqs', fmt.int(last.openReqs),
        '<span>' + (last.openReqs ? fmt.pct(last.oldReqs / last.openReqs, 0) : '0%') + ' open 2+ qtrs · ' + last.capHitCompanies + ' at cap</span>')
      + kpi('Pay vs position band', fmt.signedPct(gap), '<span>' + fmt.money(last.avgComp) + ' avg · band ' + fmt.money(last.avgBand) + '</span>')
      + kpi('Hiring spend', fmt.money(last.hireSpend), '<span>this quarter · ' + fmt.money(total) + ' to date</span>')
      + kpi('Avg commute', fmt.miles(last.avgCommute), '<span>new hires ' + (last.hireCommute != null ? fmt.miles(last.hireCommute) : '—') + ' · start ' + fmt.miles(first.avgCommute) + '</span>')
      + reemployedKpi(s)
      + mentorKpi(s, last);
  }

  // Laid off and hired again in the same quarter (any route), since the start.
  function reemployedKpi(s) {
    var laid = 0, same = 0, hand = 0;
    s.forEach(function (x) { laid += x.layoffs; same += x.laidOffSameQ || 0; hand += x.handoffs || 0; });
    return kpi('Re-employed same quarter', laid ? fmt.pct(same / laid) : '—',
      '<span>of ' + fmt.k(laid) + ' laid off · ' + (state.cfg.warmHandoff ? fmt.k(hand) + ' via warm handoff' : 'warm handoff off') + '</span>');
  }

  // Retire-to-Mentor: mentors now, and how recently hired grads stay.
  function mentorKpi(s, last) {
    var hm = 0, hu = 0, qm = 0, qu = 0;
    s.forEach(function (x) { hm += x.gradHiresMentored || 0; hu += x.gradHiresUnmentored || 0; qm += x.gradEarlyQuitsMentored || 0; qu += x.gradEarlyQuitsUnmentored || 0; });
    if (!state.cfg.mentorSharePct) {
      return kpi('Grad first-year quits', hu ? fmt.pct(qu / hu) : '—', '<span>of grad hires · Retire-to-Mentor off</span>');
    }
    return kpi('Mentors active', fmt.int(last.mentorsActive || 0),
      '<span>grad first-year quits ' + (hm ? fmt.pct(qm / hm, 0) : '—') + ' with a mentor · ' + (hu ? fmt.pct(qu / hu, 0) : '—') + ' without</span>');
  }

  var CHART_TABS = [['market', 'Jobs & people'], ['flows', 'Flows'], ['pay', 'Pay & commute'], ['vis', 'Visibility']];

  function renderCharts() {
    var s = state.sim.series, labels = s.map(function (x) { return x.label; });
    var pick = function (k) { return s.map(function (x) { return x[k]; }); };
    var flowLabels = labels.slice(1), fpick = function (k) { return pick(k).slice(1); };
    var block = function (title, sub, chart) {
      return '<div class="chart-block"><div class="chart-title">' + title + '</div><div class="chart-sub">' + sub + '</div>' + chart + '</div>';
    };
    var html;
    if (state.chartTab === 'market') {
      html = block('Employed vs looking', 'The engineer labour force, stacked.', Charts.lineChart({
        labels: labels, stacked: true, label: 'Employed and looking',
        series: [{ name: 'Employed', color: 'var(--s-blue)', values: pick('employed') }, { name: 'Looking', color: 'var(--s-orange)', values: pick('pool') }],
        extraTip: function (i) { return '<div class="tt-row tt-muted">Unemployment<b>' + fmt.pct(s[i].unemployment) + '</b></div>'; },
      }))
        + block('Who is looking', 'The talent pool by how they got there.', Charts.lineChart({
          labels: labels, stacked: true, label: 'Talent pool composition',
          series: [
            { name: 'New grads', color: 'var(--s-yellow)', values: pick('poolGrad') },
            { name: 'Switching jobs', color: 'var(--s-violet)', values: pick('poolSwitcher') },
            { name: 'Laid off', color: 'var(--s-red)', values: pick('poolLaidOff') },
          ],
        }));
    } else if (state.chartTab === 'flows') {
      html = block('In and out each quarter', 'Hires up; departures down.', s.length > 1 ? Charts.barChart({
        labels: flowLabels, label: 'Quarterly flows',
        series: [
          { name: 'Hired', color: 'var(--s-blue)', values: fpick('hires') },
          { name: 'Left', color: 'var(--s-violet)', values: fpick('leavers'), sign: -1 },
          { name: 'Laid off', color: 'var(--s-red)', values: fpick('layoffs'), sign: -1 },
          { name: 'Retired', color: 'var(--s-gray)', values: fpick('retired'), sign: -1 },
        ],
      }) : emptyChart())
        + block('Who got hired', 'Hires by where they came from.' + (state.cfg.warmHandoff ? ' Redeployed = laid off and placed by the warm handoff in the same quarter.' : ''), s.length > 1 ? Charts.barChart({
          labels: flowLabels, label: 'Hires by source',
          series: [
            { name: 'Switchers', color: 'var(--s-violet)', values: fpick('hiresSwitcher') },
            { name: 'Laid off', color: 'var(--s-red)', values: fpick('hiresLaidOff').map(function (v, i) { return v - (s[i + 1].handoffs || 0); }) },
            { name: 'New grads', color: 'var(--s-yellow)', values: fpick('hiresGrad') },
          ].concat(state.cfg.warmHandoff ? [{ name: 'Redeployed', color: 'var(--s-aqua)', values: fpick('handoffs') }] : []),
        }) : emptyChart());
    } else if (state.chartTab === 'vis') {
      html = visibilityPanel(s, labels, pick, block);
    } else {
      html = block('Pay', 'Incumbents get the raise; seats grow slower.', Charts.lineChart({
        labels: labels, label: 'Average comp', yFormat: fmt.money, zero: false,
        series: [
          { name: 'Avg employee', color: 'var(--s-blue)', values: pick('avgComp'), kind: 'line', format: fmt.money },
          { name: 'Avg position band', color: 'var(--s-gray)', values: pick('avgBand'), kind: 'line', format: fmt.money },
          { name: 'Avg new hire', color: 'var(--s-orange)', values: pick('avgHireComp'), kind: 'line', format: fmt.money },
        ],
      }))
        + block('Commute', 'Miles from home to HQ.', Charts.lineChart({
          labels: labels, label: 'Average commute', yFormat: function (v) { return v.toFixed(0) + ' mi'; }, zero: false,
          series: [
            { name: 'All employees', color: 'var(--s-blue)', values: pick('avgCommute'), kind: 'line', format: fmt.miles },
            { name: 'New hires', color: 'var(--s-orange)', values: pick('hireCommute'), kind: 'line', format: fmt.miles },
          ],
        }));
    }
    $('chart-body').innerHTML = html;
  }
  // Who in the pool is being looked at: on a slate at all, and reached with an offer.
  function visibilityPanel(s, labels, pick, block) {
    var v = state.sim.visibility();
    var rowsOf = function (groups) {
      return '<div class="bars vis-bars">' + groups.map(function (g) {
        return '<div class="bar-row"><span>' + esc(g.label) + ' <span class="muted">' + fmt.k(g.n) + '</span></span>'
          + '<div class="track" data-tip="' + Charts.attr('<div class="tt-title">' + esc(g.label) + '</div><div class="tt-row">Looking<b>' + fmt.int(g.n) + '</b></div><div class="tt-row">Not on any slate, 4 qtrs<b>' + fmt.pct(g.unseenShare) + '</b></div><div class="tt-row">No offer, 4 qtrs<b>' + fmt.pct(g.unofferedShare) + '</b></div><div class="tt-row">Slates this search<b>' + g.avgScreens.toFixed(1) + '</b></div><div class="tt-row">Offers this search<b>' + g.avgOffers.toFixed(1) + '</b></div>') + '">'
          + '<div class="fill" style="width:' + (g.unofferedShare * 100).toFixed(1) + '%;background:var(--s-red)"></div></div>'
          + '<div class="v">' + fmt.pct(g.unofferedShare, 0) + '</div></div>';
      }).join('') + '</div>';
    };
    if (!v.total.n) return '<p class="muted" style="padding:28px 0;text-align:center">Nobody is looking for work.</p>';
    return '<div class="vis-head"><div><b>' + fmt.pct(v.total.unofferedShare) + '</b><span>got no offer in 4 qtrs</span></div>'
      + '<div><b>' + fmt.pct(v.total.unseenShare) + '</b><span>not on any slate</span></div>'
      + '<div><b>' + v.offerGini.toFixed(2) + '</b><span>Gini of offers</span></div></div>'
      + '<p class="chart-sub" style="margin:6px 0 10px">Being screened is not the bottleneck: almost everyone lands on slates. What differs is whether a recruiter gets to you with an offer before someone ahead of you accepts. Bars: share with no offer in the last 4 quarters (hover for detail). Gini of screenings ' + v.gini.toFixed(2) + '.</p>'
      + block('By status', '', rowsOf(v.status))
      + block('By time looking', '', rowsOf(v.buckets))
      + block('By region', '', rowsOf(v.regions))
      + block('No offer in 4 quarters, over time', 'Share of everyone looking.', Charts.lineChart({
        labels: labels, label: 'Share with no offer', yFormat: function (x) { return fmt.pct(x, 0); }, height: 120,
        series: [{ name: 'No offer, 4 qtrs', color: 'var(--s-red)', values: pick('unofferedShare'), kind: 'line', format: fmt.pct },
          { name: 'Not on a slate, 4 qtrs', color: 'var(--s-gray)', values: pick('unseenShare'), kind: 'line', format: fmt.pct }],
      }));
  }
  function emptyChart() { return '<p class="muted" style="padding:28px 0;text-align:center">Run a quarter to see flows.</p>'; }

  function renderMovers() {
    var list = state.sim.companies.filter(function (c) { return c.kind === 'large' && c.startHc >= 150; }).map(function (c) {
      return { c: c, d: c.members.length / c.startHc - 1 };
    });
    var up = list.slice().sort(function (a, b) { return b.d - a.d; }).slice(0, 5);
    var down = list.slice().sort(function (a, b) { return a.d - b.d; }).slice(0, 5);
    var rowsOf = function (arr) {
      return arr.map(function (m) {
        return '<button class="row-link" type="button" data-company="' + m.c.idx + '"><span class="nm">' + esc(m.c.name) + '</span><span class="vv">'
          + delta(m.d, true, fmt.signedPct(m.d)) + '</span></button>';
      }).join('');
    };
    $('movers').innerHTML = state.sim.q === 0
      ? '<p class="muted">Start the run to see which companies grow and shrink.</p>'
      : '<div class="movers"><div><h4>Grew most</h4>' + rowsOf(up) + '</div><div><h4>Shrank most</h4>' + rowsOf(down) + '</div></div>';
  }

  function renderFocus() {
    var focus = $('map-focus'), c = map.selected;
    if (!c) { focus.hidden = true; return; }
    focus.hidden = false;
    focus.innerHTML = '<div>Commute lines: where <b>' + esc(c.name) + '</b>’s ' + fmt.int(c.members.length) + ' people live</div>'
      + '<button class="btn" type="button" data-company="' + c.idx + '">Profile</button><button class="btn icon" type="button" id="focus-clear" aria-label="Clear selection">✕</button>';
  }

  // ---------------------------------------------------------------- tooltip

  var tipEl = $('tooltip');
  function showTip(html, e) {
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    var pad = 14, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
    tipEl.style.left = Math.max(8, x) + 'px';
    tipEl.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tipEl.hidden = true; }
  document.addEventListener('mousemove', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (t) showTip(t.getAttribute('data-tip'), e);
    else if (!(e.target.closest && e.target.closest('#map .hq, #map .startup, #map .city-dot'))) hideTip();
  });

  function companyTip(c) {
    var hc = c.members.length, d = c.startHc ? hc / c.startHc - 1 : 0, last = c.series.hc.length - 1;
    return '<div class="tt-title">' + esc(c.name) + '</div><div class="tt-muted">' + esc(c.sector) + ' · ' + esc(c.cityName) + (c.synthetic ? ' · synthetic' : '') + '</div>'
      + '<div class="tt-row">Headcount<b>' + fmt.int(hc) + '</b></div>'
      + '<div class="tt-row">Change since start<b>' + fmt.signedPct(d) + '</b></div>'
      + '<div class="tt-row">Open reqs<b>' + fmt.int(c.reqs.length) + '</b></div>'
      + (last ? '<div class="tt-row">Hired last quarter<b>' + fmt.int(c.series.hires[last]) + '</b></div>' : '')
      + '<div class="tt-muted" style="margin-top:4px">Click for org chart and hiring plan</div>';
  }
  function cityTip(i) {
    var r = state.cityRows[i];
    return '<div class="tt-title">' + esc(r.name) + '</div><div class="tt-muted">' + esc(r.region) + ' · pop. ' + fmt.int(r.pop) + '</div>'
      + '<div class="tt-row">Engineers living here<b>' + fmt.int(r.laborForce) + '</b></div>'
      + '<div class="tt-row">Looking for work<b>' + fmt.int(r.pool) + '</b></div>'
      + '<div class="tt-row">Unemployment<b>' + fmt.pct(r.unemployment) + '</b></div>'
      + '<div class="tt-row">Avg commute<b>' + fmt.miles(r.avgCommute) + '</b></div>'
      + (state.sim.q >= 1 ? '<div class="tt-row">Looking, no offer in 4 qtrs<b>' + fmt.int(r.unoffered) + '</b></div>'
        + '<div class="tt-row">Looking, on no slate in 4 qtrs<b>' + fmt.int(r.unseen) + '</b></div>' : '')
      + '<div class="tt-muted" style="margin-top:4px">Click for residents</div>';
  }

  // ---------------------------------------------------------------- wiring

  var map = new window.BWMap($('map'), {
    geo: window.BAY_GEO, cities: DATA.cities,
    on: {
      company: function (c) { openOverlay(function () { overlays.company(c.idx); }); },
      city: function (i) {
        if (state.drawing) { pickCorridorCity(i); return; }
        openOverlay(function () { overlays.city(i); });
      },
      companyHover: function (c, e) { showTip(companyTip(c), e); },
      cityHover: function (i, e) { showTip(cityTip(i), e); },
      leave: hideTip,
    },
  });

  var lab = null;
  var overlays = new window.BWOverlays({
    overlay: $('overlay'), sheet: $('sheet'),
    app: {
      sim: function () { return state.sim; },
      lab: function () {
        if (!lab) {
          lab = new window.BWLab({
            sim: function () { return state.sim; },
            cfg: function () { return Object.assign({}, state.cfg); },
            extras: function () { return { corridors: state.corridors.slice() }; },
            upliftSettings: upliftSettings,
            applyPolicy: applyPolicy,
          });
        }
        return lab;
      },
      hideTip: hideTip,
      selectCompany: function (c) { map.select(c); map.focusOn(c, 2); renderFocus(); },
      applyPatch: function (patch) {
        overlays.close();
        Object.keys(patch).forEach(function (k) { state.cfg[k] = clamp(inputs[k].def, patch[k]); });
        syncControls();
        newRun();
        start();
      },
    },
  });

  // ---------------------------------------------------------------- Bay Corridors

  function corridorsChanged() {
    if (state.preset) { state.preset = null; renderPresets(); }
    state.drawing = false;
    state.drawFrom = null;
    newRun();
  }
  function pickCorridorCity(i) {
    if (locked()) { state.drawing = false; renderCorridors(); return; }
    if (state.drawFrom == null) { state.drawFrom = i; renderCorridors(); return; }
    if (i === state.drawFrom) { state.drawFrom = null; renderCorridors(); return; }
    var A = W.ASSUMPTIONS;
    state.corridors.push({ from: state.drawFrom, to: i, cutPct: A.corridorCutPct, spillMiles: A.corridorSpillMiles });
    corridorsChanged();
  }
  function renderCorridors() {
    var sim = state.sim, A = W.ASSUMPTIONS, last = sim.series[sim.series.length - 1];
    map.setCorridors(state.corridors, state.drawing ? (state.drawFrom == null ? -1 : state.drawFrom) : null);
    var hint = $('draw-hint');
    hint.hidden = !state.drawing;
    hint.textContent = state.drawFrom == null ? 'Draw a corridor: click the home city (where people live)…' : 'From ' + sim.cities[state.drawFrom].name + ': now click the job city (the hub). Click it again to cancel.';
    var name = function (i) { return esc(sim.cities[i].name); };
    var list = state.corridors.map(function (k, n) {
      return '<span class="corr-chip"><b>C' + (n + 1) + '</b> ' + name(k.from) + ' → ' + name(k.to) + ' <span class="muted">−' + k.cutPct + '%</span>'
        + '<button type="button" class="corr-x" data-corr-remove="' + n + '" aria-label="Remove corridor"' + (locked() ? ' disabled' : '') + '>✕</button></span>';
    }).join('');
    var hours = last.avgCommute * A.tripsPerDay * A.daysPerWeek / A.mph;
    var hours0 = last.avgCommuteNoCorridors * A.tripsPerDay * A.daysPerWeek / A.mph;
    var co2 = last.employed * last.avgCommute * A.tripsPerDay * A.daysPerWeek * A.weeksPerQuarter * A.kgCo2PerMile / 1000;
    var co20 = last.employed * last.avgCommuteNoCorridors * A.tripsPerDay * A.daysPerWeek * A.weeksPerQuarter * A.kgCo2PerMile / 1000;
    var us = state.cityRows.filter(function (r) { return r.laborForce > 200; }).map(function (r) { return r.unemployment; }).sort(function (a, b) { return a - b; });
    var q = function (p) { var i = (us.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return us.length ? us[lo] + (us[hi] - us[lo]) * (i - lo) : 0; };
    var has = state.corridors.length > 0;
    $('corridor-bar').innerHTML = '<div class="corr-tools"><b>Bay Corridors</b>'
      + '<button class="btn" type="button" id="corr-draw" aria-pressed="' + !!state.drawing + '"' + (locked() ? ' disabled' : '') + '>' + (state.drawing ? 'Cancel drawing' : 'Draw corridor') + '</button>'
      + '<button class="btn" type="button" id="corr-suggest"' + (locked() ? ' disabled' : '') + ' title="The 3 home → job city pairs with the most people looking (weighted by local unemployment) against open seats, where a corridor would most raise acceptance. Computed from the current run.">Suggest 3</button>'
      + (has ? '<button class="link" type="button" id="corr-clear"' + (locked() ? ' disabled' : '') + '>Clear</button>' : '')
      + '<span class="corr-list">' + (list || '<span class="muted">None. A corridor (shuttle line + hub) cuts effective commute miles between two cities and their neighbours. Measured: 3 suggested corridors cut the average commute ~1.3 mi but did not narrow the regional unemployment gap.</span>') + '</span></div>'
      + '<div class="corr-kpis">'
      + '<span title="ASSUMPTION: $' + fmt.k(A.corridorCostPerQuarter) + ' per corridor per quarter">Cost <b>' + fmt.money(state.corridors.length * A.corridorCostPerQuarter) + '</b>/qtr <i>assumed</i></span>'
      + '<span title="ASSUMPTION: 2 trips a day, 5 days a week, 30 mph">Commute <b>' + hours.toFixed(1) + ' h</b>/wk' + (has ? ' <span class="muted">(' + hours0.toFixed(1) + ' h without lines)</span>' : '') + ' <i>assumed</i></span>'
      + '<span title="ASSUMPTION: 0.4 kg CO2 per vehicle mile, one person per car">CO₂ <b>' + fmt.k(co2) + ' t</b>/qtr' + (has ? ' <span class="muted">(' + fmt.k(co20) + ' t without)</span>' : '') + ' <i>assumed</i></span>'
      + '<span title="Unemployment of the 90th-percentile city minus the 10th (cities with 200+ engineers)">City gap p90−p10 <b>' + fmt.pct(q(0.9) - q(0.1)) + '</b></span>'
      + '</div>';
  }
  $('corridor-bar').addEventListener('click', function (e) {
    if (locked()) return;
    var rm = e.target.closest('[data-corr-remove]');
    if (rm) { state.corridors.splice(Number(rm.getAttribute('data-corr-remove')), 1); corridorsChanged(); return; }
    if (e.target.closest('#corr-draw')) { state.drawing = !state.drawing; state.drawFrom = null; renderCorridors(); return; }
    if (e.target.closest('#corr-clear')) { state.corridors = []; corridorsChanged(); return; }
    if (e.target.closest('#corr-suggest')) {
      var have = {}, added = 0;
      state.corridors.forEach(function (k) { have[k.from + ':' + k.to] = true; });
      state.sim.suggestCorridors(6).forEach(function (k) {
        if (added < 3 && !have[k.from + ':' + k.to] && state.corridors.length < 8) { state.corridors.push(k); have[k.from + ':' + k.to] = true; added++; }
      });
      corridorsChanged();
    }
  });

  // The uplift settings that differ from the original model, for labels.
  function upliftSettings() {
    var out = {};
    UPLIFT_KEYS.forEach(function (k) {
      var on = { fairIdleBoostPct: 'fairScreening', fairRankDistance: 'fairScreening', fairRotationPct: 'fairRotation' }[k];
      if (on && !state.cfg[on]) return; // a knob of a feature that is off doesn't change anything
      if (state.cfg[k] !== W.DEFAULTS[k] || (!on && state.cfg[k])) out[k] = state.cfg[k];
    });
    if (state.corridors.length) out.corridors = state.corridors.slice();
    return out;
  }

  // Load a policy (from presets or the autopilot) into the sidebar and reset the run.
  function applyPolicy(patch) {
    if (locked()) stop();
    overlays.close();
    UPLIFT_KEYS.forEach(function (k) { state.cfg[k] = W.DEFAULTS[k]; });
    state.corridors = [];
    Object.keys(patch).forEach(function (k) {
      if (k === 'corridors') {
        state.corridors = patch[k] === 'suggest' && state.sim.suggestCorridors ? new W.WorkforceSim(state.cfg, DATA).suggestCorridors(3) : (Array.isArray(patch[k]) ? patch[k].slice() : []);
      } else if (inputs[k]) state.cfg[k] = clamp(inputs[k].def, patch[k]);
    });
    syncControls();
    newRun();
  }

  // Opening a detail view pauses the run so the numbers hold still.
  function openOverlay(fn) {
    if (state.status === 'running') stop();
    hideTip();
    fn();
  }

  $('btn-start').addEventListener('click', toggle);
  $('btn-step').addEventListener('click', function () { if (state.status !== 'running') stepOnce(); });
  $('btn-reset').addEventListener('click', function () { overlays.close(); newRun(); });
  $('btn-data').addEventListener('click', function () { openOverlay(function () { overlays.data('employees'); }); });
  $('btn-lab').addEventListener('click', function () { openOverlay(function () { overlays.lab(); }); });
  $('btn-summary').addEventListener('click', function () { openOverlay(function () { overlays.summary(); }); });
  $('btn-defaults').addEventListener('click', function () {
    if (locked()) return;
    state.cfg = Object.assign({}, W.DEFAULTS);
    state.corridors = [];
    state.preset = 'original';
    renderPresets();
    syncControls();
    newRun();
  });

  $('speed').innerHTML = SPEEDS.map(function (v) {
    return '<button class="seg" type="button" data-speed="' + v + '" aria-pressed="' + (v === state.speed) + '">' + (v < 1 ? '½' : v) + '×</button>';
  }).join('');
  $('speed').addEventListener('click', function (e) {
    var b = e.target.closest('[data-speed]');
    if (!b) return;
    state.speed = Number(b.getAttribute('data-speed'));
    $('speed').querySelectorAll('.seg').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
  });
  $('speed').title = 'Quarters per second';

  $('layers').innerHTML = LAYERS.map(function (l) {
    return '<button class="chip-btn" type="button" data-layer="' + l[0] + '" aria-pressed="true"><i class="dot" style="background:' + l[2] + '"></i>' + l[1] + '</button>';
  }).join('');
  $('layers').addEventListener('click', function (e) {
    var b = e.target.closest('[data-layer]');
    if (!b) return;
    var on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    map.setLayer(b.getAttribute('data-layer'), on);
  });

  $('chart-tabs').innerHTML = CHART_TABS.map(function (t) {
    return '<button class="tab" role="tab" type="button" data-tab="' + t[0] + '" aria-selected="' + (t[0] === state.chartTab) + '">' + t[1] + '</button>';
  }).join('');
  $('chart-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b) return;
    state.chartTab = b.getAttribute('data-tab');
    $('chart-tabs').querySelectorAll('.tab').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
    renderCharts();
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-company]');
    if (b && !e.target.closest('#overlay')) { openOverlay(function () { overlays.company(Number(b.getAttribute('data-company'))); }); return; }
    if (e.target.closest('#focus-clear')) { map.select(null); renderFocus(); }
  });

  $('company-search').addEventListener('change', function (e) {
    var q = e.target.value.trim().toLowerCase();
    var c = state.sim.companies.filter(function (x) { return x.name.toLowerCase() === q; })[0]
      || state.sim.companies.filter(function (x) { return x.name.toLowerCase().indexOf(q) === 0; })[0];
    if (!c) return;
    map.select(c);
    map.focusOn(c, 2.4);
    renderFocus();
    e.target.value = '';
  });

  $('zoom-in').addEventListener('click', function () { map.zoomButton(1.6); });
  $('zoom-out').addEventListener('click', function () { map.zoomButton(1 / 1.6); });
  $('zoom-reset').addEventListener('click', function () { map.resetView(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlays.isOpen()) { overlays.close(); return; }
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.code === 'Space' && !overlays.isOpen() && tag !== 'input' && tag !== 'button' && tag !== 'select') {
      e.preventDefault();
      toggle();
    }
  });

  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var onTheme = function () { map.setTheme(); renderLegend(); };
  if (mq.addEventListener) mq.addEventListener('change', onTheme); else if (mq.addListener) mq.addListener(onTheme);
  window.addEventListener('resize', function () { map.applyZoom(); });

  function renderLegend() {
    $('map-legend').innerHTML = '<button class="legend-close" type="button" aria-label="Hide legend">✕</button>' + map.legendHtml();
  }
  $('map-legend').addEventListener('click', function (e) {
    if (!e.target.closest('.legend-close')) return;
    $('map-legend').hidden = true;
    $('legend-open').hidden = false;
  });
  $('legend-open').addEventListener('click', function () {
    $('map-legend').hidden = false;
    $('legend-open').hidden = true;
  });

  // ---------------------------------------------------------------- presets and demo

  function renderPresets() {
    $('preset-list').innerHTML = PRESETS.map(function (p) {
      return '<button class="chip-btn preset" type="button" data-preset="' + p[0] + '" aria-pressed="' + (state.preset === p[0]) + '" title="' + Charts.attr(p[3]) + '"' + (locked() ? ' disabled' : '') + '>' + p[1] + '</button>';
    }).join('');
    $('btn-demo').disabled = false;
  }
  function loadPreset(id) {
    var p = PRESETS.filter(function (x) { return x[0] === id; })[0];
    if (!p) return;
    applyPolicy(p[2]);
    state.preset = id;
    renderPresets();
  }
  $('preset-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-preset]');
    if (b && !locked()) loadPreset(b.getAttribute('data-preset'));
  });
  $('btn-demo').addEventListener('click', function () {
    loadPreset('all');
    overlays.lab('compare');
    var l = overlays.app.lab();
    l.scale = 'quick';
    l.runCompare('compare', {});
  });

  buildControls();
  renderPresets();
  renderLegend();
  newRun();
})();
