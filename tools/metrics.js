// Node entry point for the persona metrics. The logic lives in js/metrics.js so
// the browser (Policy Lab) and these tools share one implementation.
'use strict';
const path = require('path');
const W = require(path.join(__dirname, '..', 'js', 'engine.js'));
const M = require(path.join(__dirname, '..', 'js', 'metrics.js'));
const data = {
  cities: require(path.join(__dirname, '..', 'js', 'data', 'cities.js')),
  companies: require(path.join(__dirname, '..', 'js', 'data', 'companies.js')),
};

// Run one config to the end and return { sim, metrics, ms }.
// Non-numeric extras (e.g. corridors) are passed through as the third
// constructor argument once the engine supports them.
function runConfig(cfg) {
  const t0 = Date.now();
  const extras = {};
  const numeric = {};
  Object.keys(cfg || {}).forEach((k) => { if (k === 'corridors' || Array.isArray(cfg[k])) extras[k] = cfg[k]; else numeric[k] = cfg[k]; });
  // corridors: 'suggest' = the engine's top 3 suggestions for this config at the start of the run.
  if (extras.corridors === 'suggest') extras.corridors = new W.WorkforceSim(numeric, data).suggestCorridors(3);
  const sim = new W.WorkforceSim(numeric, data, extras).runToEnd();
  return { sim, metrics: M.personaMetrics(sim, W), ms: Date.now() - t0 };
}

function fmtVal(v, kind) {
  if (v == null || !isFinite(v)) return '—';
  if (kind === 'pct') return (v * 100).toFixed(1) + '%';
  if (kind === 'ratio') return v.toFixed(3);
  if (kind === 'q') return v.toFixed(2) + 'q';
  if (kind === 'mi') return v.toFixed(1) + 'mi';
  return Math.round(v).toLocaleString('en-US');
}
function fmtDelta(d, kind) {
  if (d == null || !isFinite(d)) return '—';
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
  const a = Math.abs(d);
  if (kind === 'pct') return sign + (a * 100).toFixed(1) + 'pt';
  if (kind === 'ratio') return sign + a.toFixed(3);
  if (kind === 'q') return sign + a.toFixed(2) + 'q';
  if (kind === 'mi') return sign + a.toFixed(1) + 'mi';
  return sign + Math.round(a).toLocaleString('en-US');
}

module.exports = Object.assign({}, M, { W, data, runConfig, fmtVal, fmtDelta });
