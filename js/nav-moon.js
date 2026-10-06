/* ============================================================
   Alkemijana - mali Mjesec u traci, uz ☰ (prefiks nd-moon)
   ------------------------------------------------------------
   Isti Mjesec kao u Halloween tjednu (crtanje: js/moon-render.js):
   NASA karta površine omotana oko kugle, stvarna trenutna faza i
   nagib kako se vidi iz Hrvatske (astronomy-engine). Samo malen i u
   običnoj temi; u Halloween tjednu se ne prikazuje (ondje je veliki
   u pozadini). Klik MIJENJA TEMU (svijetla/tamna, toggleTheme u app.js) -
   NE otvara alat „Mjesec" (vlasnik: preblizu je gumbu ☰ za navigaciju).
   ============================================================ */
(function () {
  'use strict';
  if (window.AJHalloween && window.AJHalloween.active) return;

  // geografsko središte Hrvatske (kod Slunja) - razlika prema bilo kojem mjestu u Hrvatskoj je par stupnjeva nagiba, okom nevidljiva
  const HR = { lat: 45.10, lon: 15.20 };

  /* Bez sjaja (premalen je), malo jači Zemljin odsjaj, a tamni dio djelomično proziran
     (0.28) - u svijetloj temi potpuno skriven (0): na svijetloj podlozi je bio sivi krug
     koji guta srp. */
  async function paint() {
    const el = document.getElementById('nd-moon');
    if (!el || !window.Astronomy || !window.AJMoon) return;
    const now = new Date();
    const g = window.AJMoon.geometry(now, HR.lat, HR.lon);
    const css = el.clientWidth || 30;
    const D = Math.round(css * Math.min(window.devicePixelRatio || 1, 3));
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    const c = await window.AJMoon.render(D, g, { glow: false, earth: 0.13, dark: light ? 0 : 0.28 });
    const old = el.querySelector('canvas');
    if (old) old.replaceWith(c); else el.appendChild(c);
    el.title = 'Mjesec sada, viđen iz Hrvatske: ' + lcFirst(window.AJMoon.phaseName(now)) +
      ', osvijetljen ' + Math.round(g.k * 100) + ' %. Klik mijenja svijetlu/tamnu temu.';
    el.classList.add('nd-moon-ready');
  }

  // „Rastući Mjesec" → „rastući Mjesec" (Mjesec kao nebesko tijelo ostaje velikim slovom)
  function lcFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  window.AJNavMoon = { paint };   // za provjeru u konzoli

  function start() {
    if (!window.AJMoon) return;
    const lib = window.Astronomy ? Promise.resolve() :
      (typeof loadScript === 'function') ? loadScript('js/lib/astronomy.browser.min.js') : Promise.reject();
    Promise.all([lib.catch(() => {}), window.AJMoon.loadMap()]).then(() => {
      paint();
      setInterval(() => { if (!document.hidden) paint(); }, 10 * 60 * 1000);
      // svijetla tema: tamni dio se potpuno sakrije, pa se pri promjeni teme crta ponovno
      new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
