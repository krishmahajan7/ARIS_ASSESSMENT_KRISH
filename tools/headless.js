// Headless Chrome check over the DevTools protocol (Node ≥ 22, no dependencies).
// Loads index.html from file://, runs page-side checks, reports console errors.
//   node tools/headless.js                 smoke test (load, step, run, open views)
//   node tools/headless.js --shot=out.png  also save a screenshot
//   CHROME=/path/to/chrome node tools/headless.js
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => fs.existsSync(p));
const PAGE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(opts) {
  opts = opts || {};
  if (!CHROME) throw new Error('Chrome not found; set CHROME=/path/to/chrome');
  const port = 9300 + Math.floor(Math.random() * 500);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + dir,
    '--window-size=' + (opts.size || '1500,950'), '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); if (targets.length) break; } catch (e) { /* not up yet */ }
    await sleep(150);
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map(), errors = [], logs = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = m.params.args.map((a) => a.value != null ? a.value : a.description).join(' ');
      (m.params.type === 'error' || m.params.type === 'warning' ? errors : logs).push(m.params.type + ': ' + text);
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('log: ' + m.params.entry.text);
  });
  const send = (method, params) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  const evaluate = async (expr, timeoutMs) => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: timeoutMs || 120000 });
    if (res.result.exceptionDetails) throw new Error('page: ' + (res.result.exceptionDetails.exception ? res.result.exceptionDetails.exception.description : res.result.exceptionDetails.text));
    return res.result.result.value;
  };
  const shot = async (file) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  };
  await send('Page.navigate', { url: opts.url || PAGE });
  for (let i = 0; i < 100; i++) { if (await evaluate('document.readyState') === 'complete') break; await sleep(100); }
  await sleep(300);
  const close = async () => { try { ws.close(); } catch (e) { /* ignore */ } proc.kill(); await sleep(300); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* locked on Windows */ } };
  return { evaluate, shot, errors, logs, close, send };
}

// The default smoke test: everything an evaluator would click.
const SMOKE = `(async () => {
  const $ = (id) => document.getElementById(id), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  out.title = document.title;
  out.kpis = document.querySelectorAll('#kpis .kpi').length;
  out.controls = document.querySelectorAll('#config .ctl').length;
  $('btn-step').click(); await wait(50);
  out.afterStep = $('clock').textContent;
  document.querySelectorAll('#chart-tabs .tab').forEach((t) => t.click());
  out.tabs = Array.from(document.querySelectorAll('#chart-tabs .tab')).map((t) => t.textContent);
  const t0 = performance.now();
  const sim = new Workforce.WorkforceSim({}, { cities: BAY_CITIES, companies: BAY_COMPANIES });
  sim.runToEnd();
  out.fullRunMs = Math.round(performance.now() - t0);
  out.fullRunUnemployment = sim.series[sim.series.length - 1].unemployment;
  $('btn-data').click(); await wait(50);
  document.querySelectorAll('#sheet [data-tabs="data"] .tab').forEach((t) => t.click());
  document.querySelector('#overlay [data-close]').click();
  document.querySelector('#map .hq').dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(50);
  document.querySelectorAll('#sheet [data-tabs="company"] .tab').forEach((t) => t.click());
  document.querySelector('#overlay [data-close]').click();
  document.querySelector('#map .city-dot').dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(50);
  document.querySelector('#overlay [data-close]').click();
  $('btn-summary').click(); await wait(50);
  out.summaryCards = document.querySelectorAll('#sheet .insight').length;
  document.querySelector('#overlay [data-close]').click();
  return out;
})()`;

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const b = await open();
    try {
      const extra = args.find((a) => a.startsWith('--eval='));
      const res = await b.evaluate(extra ? extra.slice(7) : SMOKE, 300000);
      console.log(JSON.stringify(res, null, 2));
      const shotArg = args.find((a) => a.startsWith('--shot='));
      if (shotArg) { await b.shot(shotArg.slice(7)); console.log('screenshot: ' + shotArg.slice(7)); }
    } catch (e) { b.errors.push(String(e.message || e)); }
    console.log(b.errors.length ? 'CONSOLE ERRORS:\n  ' + b.errors.join('\n  ') : 'Console clean.');
    await b.close();
    process.exitCode = b.errors.length ? 1 : 0;
  })();
}

module.exports = { open, SMOKE, PAGE };
