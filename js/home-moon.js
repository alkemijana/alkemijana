/* ============================================================
   Alkemijana - slide „Mjesec sada" na početnoj (prefiks hm-)
   ------------------------------------------------------------
   Veliki Mjesec kakav je upravo sada, viđen iz Hrvatske (isto kao
   mali Mjesec u traci), naziv mijene, osvijetljenost i znak. Klik
   otvara alat „Mjesec" (openMoonTool u js/moon-tool.js).
   Crtanje: js/moon-render.js (window.AJMoon). Osvježava se svakih
   10 min i pri promjeni teme.

   HALLOWEEN (vlasnik): slide NE crta svoj Mjesec - Mjesec slidea je
   onaj iz pozadine (.hw-moon), a dok je slide na ekranu <html> dobije
   klasu `hm-lit` pa pozadinski Mjesec zasvijetli (css/home-slides.css).
   Reljef i sjene kratera (karta visina) - v. reliefWhenNear().
   ============================================================ */
(function () {
  'use strict';
  const HW = !!(window.AJHalloween && window.AJHalloween.active);

  const HR = { lat: 45.10, lon: 15.20 };   // geografsko središte Hrvatske (kao u nav-moon.js)
  // znakovi u lokativu („Mjesec je u Lavu")
  const SIGN_LOC = ['Ovnu', 'Biku', 'Blizancima', 'Raku', 'Lavu', 'Djevici', 'Vagi', 'Škorpionu', 'Strijelcu', 'Jarcu', 'Vodenjaku', 'Ribama'];

  function paintText(now, k) {
    const lon = window.Astronomy.EclipticGeoMoon(now).lon;
    const si = Math.floor(((lon % 360) + 360) % 360 / 30);
    document.getElementById('hm-phase').textContent = window.AJMoon.phaseName(now);
    document.getElementById('hm-meta').textContent = 'osvijetljen ' + Math.round(k * 100) + ' % · u ' + SIGN_LOC[si];
  }

  async function paint() {
    const el = document.getElementById('hm-moon');
    if (!el || !window.Astronomy || !window.AJMoon) return;
    const now = new Date();
    const g = window.AJMoon.geometry(now, HR.lat, HR.lon);
    paintText(now, g.k);
    if (HW) return;                                   // Halloween: Mjesec je onaj u pozadini
    const css = el.clientWidth || 300;
    // najveća moguća razlučivost (vlasnik): puna karta + platno = css px × devicePixelRatio (strop 2400)
    const D = Math.max(200, Math.min(2400, Math.round(css * (window.devicePixelRatio || 1))));
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    const c = await window.AJMoon.render(D, g, Object.assign({ hi: true, relief: window.AJMoon.hasHeight() }, light ? { dark: 0 } : { earth: 0.05 }));
    c.className = 'hm-moon-cv';
    const old = el.querySelector('canvas');
    if (old) old.replaceWith(c); else el.appendChild(c);
    el.classList.add('hm-ready');
  }

  // Halloween: pozadinski Mjesec svijetli samo dok je ovaj slide na ekranu (i početna otvorena)
  function watchSlide() {
    const slide = document.querySelector('.hs-slide[data-hs-name="mjesec"]');
    const home = document.getElementById('home');
    if (!slide || !home) return;
    const sync = () => document.documentElement.classList.toggle('hm-lit',
      slide.classList.contains('hs-active') && home.classList.contains('active'));
    const mo = new MutationObserver(sync);
    mo.observe(slide, { attributes: true, attributeFilter: ['class'] });
    mo.observe(home, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  /* Karta visina (2,2 MB, reljef i sjene kratera) se NE skida sa svakom početnom - tek kad
     posjetitelj dođe na kartu dana (slide prije) ili na sam slide Mjeseca; onda se Mjesec
     ponovno nacrta sa sjenama. */
  function reliefWhenNear() {
    const slides = ['karta-dana', 'mjesec'].map(n => document.querySelector('.hs-slide[data-hs-name="' + n + '"]')).filter(Boolean);
    if (!slides.length) return;
    let done = false;
    const check = () => {
      if (done || !slides.some(s => s.classList.contains('hs-active'))) return;
      done = true; mo.disconnect();
      window.AJMoon.loadHeight().then(() => { if (window.AJMoon.hasHeight()) paint(); });
    };
    const mo = new MutationObserver(check);
    slides.forEach(s => mo.observe(s, { attributes: true, attributeFilter: ['class'] }));
    check();
  }

  function start() {
    if (!window.AJMoon) return;
    if (HW) watchSlide();
    else reliefWhenNear();
    const lib = window.Astronomy ? Promise.resolve() :
      (typeof loadScript === 'function') ? loadScript('js/lib/astronomy.browser.min.js') : Promise.reject();
    Promise.all([lib.catch(() => {}), HW ? null : window.AJMoon.loadMapHi((document.getElementById('hm-moon') || {}).clientWidth * (window.devicePixelRatio || 1) || 0)]).then(() => {
      paint();
      setInterval(() => { if (!document.hidden) paint(); }, 10 * 60 * 1000);
      if (!HW) new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
