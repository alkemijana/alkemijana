/* ============================================================
   js/perf.js - LITE način za slabije uređaje (window.AJPerf)
   ------------------------------------------------------------
   Cilj (vlasnik): glatko na SVAKOM uređaju. Očito slab uređaj
   (≤ 2 jezgre, ≤ 2 GB memorije, ušteda podataka) dobiva html.aj-lite
   već u inline skripti u <head>. Ovdje se uz to MJERI: dok se nešto
   pomiče (scroll, kotačić, prst, tipke, prijelaz slidea) broje se
   kadrovi koji kasne. Ako ih kasni previše, uključi se aj-lite i
   css/lite.css ugasi najskuplje efekte (zamućenja, sjaj).
   - mjeri se samo dok je kartica vidljiva i samo u kratkim prozorima
     nakon pokreta - nema stalne rAF petlje (baterija)
   - ukupno najviše ~60 s pokreta, onda se mjerenje gasi
   - jednom uključen lite ostaje do kraja posjeta (bez treperenja)
   - ništa se ne sprema i ništa se ne šalje
   ============================================================ */
(function () {
  'use strict';
  const root = document.documentElement;
  const q = location.search;
  const forced = /[?&]lite(=1|&|$)/.test(q) ? true : /[?&]lite=0/.test(q) ? false : null;

  function enable(reason) {
    if (root.classList.contains('aj-lite')) return;
    root.classList.add('aj-lite');
    window.AJPerf.lite = true;
    window.AJPerf.reason = reason;
    window.dispatchEvent(new CustomEvent('aj:lite', { detail: { reason: reason } }));
  }

  window.AJPerf = { lite: root.classList.contains('aj-lite'), reason: null, enable: enable };
  if (forced === true) { enable('url'); return; }
  if (forced === false) { root.classList.remove('aj-lite'); window.AJPerf.lite = false; return; }
  if (window.AJPerf.lite) { window.AJPerf.reason = 'device'; return; }
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const WINDOW_MS = 900;        // koliko dugo se mjeri nakon zadnjeg pokreta
  const MIN_FRAMES = 90;        // procjena tek nakon toliko izmjerenih kadrova
  const JANK_RATIO = 0.18;      // udio zakašnjelih kadrova koji uključi lite
  const BUDGET_MS = 60000;      // ukupno mjerenje (ms pokreta), pa kraj

  let deltas = [], until = 0, running = false, last = 0, spent = 0, done = false;

  function frame(t) {
    if (done) { running = false; return; }
    if (document.hidden) { running = false; last = 0; return; }
    if (last) {
      const d = t - last;
      if (d < 250) { deltas.push(d); spent += d; }   // > 250 ms = kartica je bila u pozadini/pauza
    }
    last = t;
    if (deltas.length >= MIN_FRAMES) evaluate();
    if (spent > BUDGET_MS) stop();
    if (!done && t < until) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }

  function evaluate() {
    const s = deltas.slice().sort((a, b) => a - b);
    // osvježavanje ekrana = brži kraj izmjerenog (60 Hz → ~16,7 ms, 120 Hz → ~8,3 ms), ali
    // najviše 60 Hz - inače bi uređaj koji SVE crta sporo (stalno 30 kadrova/s) sam sebi
    // postavio mjerilo i nikad ne bi bio prepoznat kao spor
    const refresh = Math.min(17, Math.max(6, s[Math.floor(s.length * 0.1)]));
    const late = Math.max(1.6 * refresh, 24);   // zakašnjeli = propušteno barem jedno osvježavanje
    const bad = deltas.filter(d => d > late).length / deltas.length;
    window.AJPerf.last = { frames: deltas.length, refresh: +refresh.toFixed(1), bad: +bad.toFixed(2) };
    deltas = [];
    if (bad > JANK_RATIO) { enable('fps'); stop(); }
  }

  function poke(ms) {
    if (done || document.hidden) return;
    until = Math.max(until, performance.now() + (typeof ms === 'number' ? ms : WINDOW_MS));
    if (!running) { running = true; last = 0; requestAnimationFrame(frame); }
  }

  const EVENTS = ['scroll', 'wheel', 'touchmove', 'keydown', 'pointerdown'];
  function stop() {
    done = true;
    EVENTS.forEach(e => window.removeEventListener(e, poke, true));
  }
  EVENTS.forEach(e => window.addEventListener(e, poke, { capture: true, passive: true }));
  // ulazna animacija stranice je i sama dobar test
  window.addEventListener('aj:revealed', () => poke(2500));
})();
