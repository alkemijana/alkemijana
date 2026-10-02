/* ============================================================
   Alkemijana - Halloween tjedan (samostalan modul, prefiks hw-)
   ------------------------------------------------------------
   Uključuje se SAM od 25. 10. do 1. 11. (uključivo) po hrvatskom
   vremenu i sam se gasi - ništa se ne pali ručno.
   Pregled bilo kad: ?halloween (uključi) / ?halloween=0 (isključi).

   Što radi dok je aktivan (html.hw-on, stilovi u css/halloween.css):
     1. Ekran učitavanja: kad se „Znak A" preobrazi u šešir, šešir
        sjedne na metlu i odleti (flyLoader - zove ga js/loader.js).
     2. Traka: oko šešira gore lijevo povremeno proleti šišmiš.
     3. Nebo: povremeno preko zvijezda prelete šišmiši.
     4. Tarot: raspored „Samhain" (tarot/tarot-data.js čita
        window.AJHalloween.active i ubaci ga u popis).

   Učitava se SINKRONO u <head> (ne defer): tarot-data.js na dnu
   <body> mora već znati je li tjedan aktivan, a klasa na <html>
   mora biti tu prije prvog iscrtavanja.
   prefers-reduced-motion: nema leta, nema šišmiša (raspored ostaje).
   Ništa se ne sprema i ništa se ne mjeri.
   ============================================================ */
(function () {
  'use strict';

  function isHalloweenWeek() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.has('halloween')) return q.get('halloween') !== '0';
    } catch (e) {}
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zagreb', month: 'numeric', day: 'numeric' })
        .formatToParts(new Date());
      const m = +parts.find(p => p.type === 'month').value;
      const d = +parts.find(p => p.type === 'day').value;
      return (m === 10 && d >= 25) || (m === 11 && d === 1);
    } catch (e) { return false; }
  }

  const active = isHalloweenWeek();
  window.AJHalloween = { active, flyLoader: () => 0 };
  if (!active) return;

  const root = document.documentElement;
  root.classList.add('hw-on');

  /* Sablasna tema je uvijek tamna: svijetla se taj tjedan ne pali (ni iz
     localStorage-a u app.js). aj_theme se NE dira, pa se nakon tjedna
     posjetitelju vrati tema koju je sam izabrao. */
  function noLight() { if (root.getAttribute('data-theme') === 'light') root.removeAttribute('data-theme'); }
  noLight();
  new MutationObserver(noLight).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Šišmiš: krila su dvije polovice istog obrisa; .hw-flap maše oko ramena. */
  const WING = 'M32 14 C27 7 17 4 5 7 C9 9.5 10 12.5 9 16 C12.5 14 15.5 15 16.5 18.5 C19 15.5 22.5 15.5 24.5 18.5 C26.5 15.5 29.5 15.5 32 18 Z';
  const BAT_SVG =
    '<svg viewBox="0 0 64 30" aria-hidden="true" focusable="false">' +
      '<g class="hw-flap"><path d="' + WING + '"/></g>' +
      '<g transform="matrix(-1 0 0 1 64 0)"><g class="hw-flap"><path d="' + WING + '"/></g></g>' +
      '<path d="M29.6 11.5 L30.2 7.6 L31.6 10.4 L32.4 10.4 L33.8 7.6 L34.4 11.5 C35 14 34.6 18.5 32 21.5 C29.4 18.5 29 14 29.6 11.5 Z"/>' +
    '</svg>';

  /* Metla u koordinatama viewBoxa šešira (isti kao u alkemijana-anim.js 'uvod'):
     drška ispod oboda, slama straga (lijevo) jer šešir leti udesno. */
  const BROOM_SVG =
    '<svg class="hw-broom" viewBox="-2.294 -0.545 31.25 26.342" aria-hidden="true" focusable="false">' +
      '<path class="hw-broom-stick" d="M-1.5 25.4 L31 22.2"/>' +
      '<path class="hw-broom-tie" d="M-1.9 24.1 L-1.2 26.7"/>' +
      '<path class="hw-broom-straw" d="M-1.6 25.4 L-9 23 M-1.6 25.4 L-9.6 24.4 M-1.6 25.4 L-9.8 25.9 M-1.6 25.4 L-9.4 27.4 M-1.6 25.4 L-8.6 28.7 M-1.6 25.4 L-7.2 22.2"/>' +
    '</svg>';

  /* ---- 1. Ekran učitavanja: šešir odleti na metli ----
     loader.js zove ovo u reveal() i čeka vraćeni broj ms prije nego
     što ugasi ekran. Animacija loga se prvo dovrši (šešir), pa let. */
  const FLY_MS = 1300;
  window.AJHalloween.flyLoader = function (loaderEl, logoAnim) {
    if (reduced() || !loaderEl) return 0;
    const logo = loaderEl.querySelector('.ajl-logo');
    if (!logo) return 0;
    try { if (logoAnim) logoAnim.seek(logoAnim.duration + 1); } catch (e) {}
    logo.insertAdjacentHTML('beforeend', BROOM_SVG);
    void logo.offsetWidth;            // prisilni reflow - inače klasa i umetanje padnu u isti kadar
    logo.classList.add('hw-fly');
    sparkleTrail(loaderEl, logo, FLY_MS);
    return FLY_MS;
  };

  // Iskrice iza metle dok leti (prate stvarni položaj loga)
  function sparkleTrail(host, logo, ms) {
    const t0 = performance.now();
    let last = 0;
    function tick(now) {
      if (now - t0 > ms || !host.isConnected) return;
      if (now - last > 55 && now - t0 > ms * 0.25) {
        last = now;
        const r = logo.getBoundingClientRect();
        const s = document.createElement('span');
        s.className = 'hw-spark';
        s.textContent = '✦';
        s.style.left = (r.left + r.width * 0.02) + 'px';
        s.style.top = (r.top + r.height * 0.95) + 'px';
        s.style.fontSize = (6 + Math.random() * 7) + 'px';
        host.appendChild(s);
        setTimeout(() => s.remove(), 900);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---- 2. Šišmiš oko šešira u traci ---- */
  function initNavBat() {
    const logo = document.getElementById('nav-logo');
    if (!logo || logo.querySelector('.hw-navbat')) return;
    const b = document.createElement('span');
    b.className = 'hw-navbat';
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = BAT_SVG;
    logo.appendChild(b);
  }

  /* ---- 3. Šišmiši na nebu ---- */
  function spawnBat(delay) {
    const el = document.createElement('div');
    el.className = 'hw-bat';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = BAT_SVG;
    const size = 26 + Math.random() * 26;
    el.style.width = size + 'px';
    document.body.appendChild(el);

    const vw = window.innerWidth, vh = window.innerHeight;
    const ltr = Math.random() < 0.5;
    const x0 = ltr ? -size * 2 : vw + size * 2, x1 = ltr ? vw + size * 2 : -size * 2;
    const y0 = vh * (0.12 + Math.random() * 0.55);
    const rise = (Math.random() - 0.65) * vh * 0.35;
    const amp = 14 + Math.random() * 26, waves = 2 + Math.random() * 2;
    const N = 14, frames = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + rise * t + Math.sin(t * Math.PI * 2 * waves) * amp;
      const tilt = Math.cos(t * Math.PI * 2 * waves) * 10 * (ltr ? 1 : -1);
      frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)` });
    }
    const dur = 6500 + Math.random() * 3500;
    const anim = el.animate(frames, { duration: dur, delay, easing: 'linear', fill: 'both' });
    el.style.setProperty('--hw-flap', (0.16 + Math.random() * 0.1).toFixed(2) + 's');
    anim.onfinish = () => el.remove();
  }

  function scheduleBats() {
    if (!document.hidden && !document.documentElement.classList.contains('aj-loading')) {
      const n = Math.random() < 0.55 ? 1 : (Math.random() < 0.7 ? 2 : 3);
      for (let i = 0; i < n; i++) spawnBat(i * (350 + Math.random() * 600));
    }
    setTimeout(scheduleBats, 14000 + Math.random() * 16000);
  }

  /* Mjesec: gradijent + tekstura (feTurbulence) + mora na stvarnim mjestima
     (pogled sa sjeverne polutke). Statičan SVG - iscrta se jednom. */
  const MOON_SVG =
    '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<radialGradient id="hwMg" cx="42%" cy="40%" r="62%">' +
          '<stop offset="0" stop-color="#e4e1ea"/><stop offset="0.55" stop-color="#b3afbf"/>' +
          '<stop offset="0.86" stop-color="#6c6879"/><stop offset="1" stop-color="#383543"/>' +
        '</radialGradient>' +
        '<filter id="hwMt" x="0" y="0" width="100%" height="100%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="3" seed="11" result="n"/>' +
          '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.55 0.55 0 0 -0.4" result="m"/>' +
          '<feComposite in="m" in2="SourceGraphic" operator="in" result="mm"/>' +
          '<feBlend in="SourceGraphic" in2="mm" mode="multiply"/>' +
        '</filter>' +
        '<filter id="hwMb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter>' +
        '<clipPath id="hwMc"><circle cx="100" cy="100" r="100"/></clipPath>' +
      '</defs>' +
      '<circle cx="100" cy="100" r="100" fill="url(#hwMg)" filter="url(#hwMt)"/>' +
      '<g clip-path="url(#hwMc)"><g filter="url(#hwMb)" fill="#2b2836" opacity="0.4">' +
        '<ellipse cx="52" cy="96" rx="24" ry="40"/>' +            // Oceanus Procellarum
        '<ellipse cx="80" cy="62" rx="23" ry="18"/>' +            // Imbrium
        '<ellipse cx="119" cy="70" rx="13" ry="12"/>' +           // Serenitatis
        '<ellipse cx="133" cy="94" rx="17" ry="13"/>' +           // Tranquillitatis
        '<ellipse cx="166" cy="78" rx="9" ry="7.5"/>' +           // Crisium
        '<ellipse cx="156" cy="117" rx="9" ry="13"/>' +           // Fecunditatis
        '<ellipse cx="97" cy="137" rx="17" ry="11"/>' +           // Nubium
        '<ellipse cx="70" cy="137" rx="8" ry="8"/>' +             // Humorum
      '</g>' +
      '<circle cx="101" cy="167" r="2.4" fill="#efedf3" opacity="0.55" filter="url(#hwMb)"/></g>' +  // Tycho
    '</svg>';

  // Magla pri dnu + zatamnjen Mjesec u pozadini (css/halloween.css) - umjesto zviježđa
  function initScenery() {
    const sky = document.getElementById('sky-bg');
    const moon = document.createElement('div');
    moon.className = 'hw-moon';
    moon.setAttribute('aria-hidden', 'true');
    moon.innerHTML = MOON_SVG;
    const fog = document.createElement('div');
    fog.className = 'hw-fog';
    fog.setAttribute('aria-hidden', 'true');
    if (sky && sky.parentNode) { sky.after(fog); sky.after(moon); }
    else { document.body.prepend(fog); document.body.prepend(moon); }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScenery();
    if (reduced()) return;
    initNavBat();
    setTimeout(scheduleBats, 6000 + Math.random() * 4000);
  });
})();
