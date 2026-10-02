/* ============================================================
   Alkemijana - Halloween tjedan (samostalan modul, prefiks hw-)
   ------------------------------------------------------------
   Uključuje se SAM od 25. 10. do 1. 11. (uključivo) po hrvatskom
   vremenu i sam se gasi - ništa se ne pali ručno.
   Pregled bilo kad: ?halloween (uključi) / ?halloween=0 (isključi).

   Što radi dok je aktivan (html.hw-on, stilovi u css/halloween.css):
     0. Sablasna (još tamnija) tema, svijetla tema isključena.
     2. Traka: oko šešira gore lijevo povremeno proleti šišmiš.
     3. Nebo: povremeno prelete šišmiši (umjesto ✦ bljeska).
     4. Pozadina: Mjesec u sredini umjesto zviježđa - u STVARNOJ
        trenutnoj fazi i nagibu kako se vidi s Raba (astronomy-engine).
     5. Tarot: raspored „Samhain" (tarot/tarot-data.js čita
        window.AJHalloween.active i ubaci ga u popis).

   Učitava se SINKRONO u <head> (ne defer): tarot-data.js na dnu
   <body> mora već znati je li tjedan aktivan, a klasa na <html>
   mora biti tu prije prvog iscrtavanja.
   prefers-reduced-motion: nema šišmiša (tema, Mjesec i raspored ostaju).
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
  window.AJHalloween = { active };
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
  const f1 = n => n.toFixed(1);

  /* ============================================================
     ŠIŠMIŠ - silueta s pravim krilom (podlaktica + 4 prsta, nazubljen
     rub opne između vrhova prstiju). Mahanje = SMIL morph između tri
     poze krila (gore / raširena / dolje) - krilo se pri tome savija u
     zglobu, ne samo spljošti. Zamah prema dolje je brži od podizanja,
     a tijelo poskoči pri svakom zamahu (kao pravi šišmiš).
     viewBox -48 -30 96 60, tijelo u (0,0); desno krilo = zrcalo lijevog.
     ============================================================ */
  const POSES = {
    up:   { sh: [-2, -3], wr: [-13, -17], tip: [-27, -27], f2: [-33, -15], f3: [-30, -5], f4: [-21, 1], hip: [-3, 5] },
    mid:  { sh: [-2, -2], wr: [-17, -6],  tip: [-43, -9],  f2: [-40, 2],   f3: [-32, 9],  f4: [-20, 10], hip: [-3, 6] },
    down: { sh: [-2, -2], wr: [-15, 5],   tip: [-30, 19],  f2: [-24, 23],  f3: [-17, 22], f4: [-10, 16], hip: [-3, 7] }
  };
  // kontrolna točka opne između dva vrha: sredina povučena prema ramenu (luk prema unutra)
  function scal(a, b, sh, pull) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    return f1(mx + (sh[0] - mx) * pull) + ' ' + f1(my + (sh[1] - my) * pull);
  }
  const P = p => f1(p[0]) + ' ' + f1(p[1]);
  function wingPath(w) {
    const lead = f1((w.sh[0] + w.wr[0]) / 2) + ' ' + f1((w.sh[1] + w.wr[1]) / 2 - 3.5);
    return 'M' + P(w.sh) + ' Q' + lead + ' ' + P(w.wr) + ' L' + P(w.tip) +
      ' Q' + scal(w.tip, w.f2, w.sh, 0.2) + ' ' + P(w.f2) +
      ' Q' + scal(w.f2, w.f3, w.sh, 0.22) + ' ' + P(w.f3) +
      ' Q' + scal(w.f3, w.f4, w.sh, 0.24) + ' ' + P(w.f4) +
      ' Q' + scal(w.f4, w.hip, w.sh, 0.3) + ' ' + P(w.hip) + ' Z';
  }
  function bonePath(w) {
    return 'M' + P(w.sh) + ' L' + P(w.wr) + ' L' + P(w.tip) +
      ' M' + P(w.wr) + ' L' + P(w.f2) + ' M' + P(w.wr) + ' L' + P(w.f3) + ' M' + P(w.wr) + ' L' + P(w.f4);
  }
  const ORDER = ['up', 'mid', 'down', 'mid', 'up'];
  const KT = '0;0.2;0.42;0.72;1';
  const KS = '0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1';
  const WING_V = ORDER.map(k => wingPath(POSES[k])).join(';');
  const BONE_V = ORDER.map(k => bonePath(POSES[k])).join(';');

  function batSvg(beat) {
    const dur = beat.toFixed(3) + 's';
    const begin = (-Math.random() * beat).toFixed(3) + 's';
    const anim = v => '<animate attributeName="d" dur="' + dur + '" begin="' + begin + '" repeatCount="indefinite" ' +
      'calcMode="spline" keyTimes="' + KT + '" keySplines="' + KS + '" values="' + v + '"/>';
    const wing =
      '<path class="hw-wing" d="' + wingPath(POSES.up) + '">' + anim(WING_V) + '</path>' +
      '<path class="hw-bone" d="' + bonePath(POSES.up) + '">' + anim(BONE_V) + '</path>';
    return '<svg viewBox="-48 -30 96 60" aria-hidden="true" focusable="false">' +
      '<g>' +
        '<animateTransform attributeName="transform" type="translate" dur="' + dur + '" begin="' + begin + '" ' +
          'repeatCount="indefinite" calcMode="spline" keyTimes="0;0.42;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" values="0 2;0 -2;0 2"/>' +
        wing +
        '<g transform="scale(-1 1)">' + wing + '</g>' +
        '<ellipse class="hw-body" cx="0" cy="2.5" rx="3.3" ry="6.8"/>' +
        '<circle class="hw-body" cx="0" cy="-5" r="3"/>' +
        '<path class="hw-body" d="M-2.7 -6.3 L-2.4 -11.2 L-0.5 -7.4 Z M2.7 -6.3 L2.4 -11.2 L0.5 -7.4 Z"/>' +
        '<path class="hw-bone" d="M-1.4 9 L-2.2 12.2 M1.4 9 L2.2 12.2"/>' +
      '</g>' +
    '</svg>';
  }

  /* ---- 2. Šišmiš oko šešira u traci ---- */
  function initNavBat() {
    const logo = document.getElementById('nav-logo');
    if (!logo || logo.querySelector('.hw-navbat')) return;
    const b = document.createElement('span');
    b.className = 'hw-navbat';
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = batSvg(0.2);
    logo.appendChild(b);
  }

  /* ---- 3. Šišmiši na nebu ----
     Let je namjerno nemiran: brzina se mijenja, putanja trza gore-dolje
     (izglađen slučajni pomak + pokoji zaron), nagib prati smjer, a
     veličina blago „diše" kao da se šišmiš primiče i udaljava. */
  function spawnBat(delay) {
    const el = document.createElement('div');
    el.className = 'hw-bat';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = batSvg(0.17 + Math.random() * 0.1);
    const size = 30 + Math.random() * 34;
    el.style.width = size + 'px';
    document.body.appendChild(el);

    const vw = window.innerWidth, vh = window.innerHeight;
    const ltr = Math.random() < 0.5;
    const x0 = ltr ? -size * 1.5 : vw + size * 1.5, x1 = ltr ? vw + size * 1.5 : -size * 1.5;
    let y = vh * (0.1 + Math.random() * 0.55);
    const drift = (Math.random() - 0.6) * vh * 0.3;
    const N = 30;
    // izglađen slučajni hod za y
    let vy = 0;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      vy = vy * 0.6 + (Math.random() - 0.5) * vh * 0.05;
      if (Math.random() < 0.06) vy += vh * 0.06 * (Math.random() < 0.5 ? 1 : -1);   // nagli zaron / uspon
      y += vy + drift / N;
      pts.push(y);
    }
    // nejednaka brzina: x po t uz blago ubrzavanje/usporavanje
    const ph = Math.random() * Math.PI * 2;
    const frames = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const te = t + Math.sin(t * Math.PI * 3 + ph) * 0.025;
      const x = x0 + (x1 - x0) * te;
      const dy = i < N ? pts[i + 1] - pts[i] : pts[i] - pts[i - 1];
      const tilt = Math.max(-28, Math.min(28, Math.atan2(dy, Math.abs(x1 - x0) / N) * 57.3 * 0.7)) * (ltr ? 1 : -1);
      const sc = 0.88 + 0.16 * Math.sin(t * Math.PI * 2.2 + ph);
      frames.push({ transform: `translate(${f1(x)}px, ${f1(pts[i])}px) rotate(${f1(tilt)}deg) scale(${sc.toFixed(3)})` });
    }
    const dur = 5200 + Math.random() * 3800;
    const anim = el.animate(frames, { duration: dur, delay, easing: 'linear', fill: 'both' });
    anim.onfinish = () => el.remove();
  }

  function scheduleBats() {
    if (!document.hidden && !root.classList.contains('aj-loading')) {
      const n = Math.random() < 0.5 ? 1 : (Math.random() < 0.7 ? 2 : 3);
      for (let i = 0; i < n; i++) spawnBat(i * (250 + Math.random() * 700));
    }
    setTimeout(scheduleBats, 14000 + Math.random() * 16000);
  }

  /* ============================================================
     MJESEC - u stvarnoj trenutnoj fazi i nagibu, kako se vidi s Raba.
     astronomy-engine (js/lib, već ga koristi živi kotač na početnoj):
       k   = osvijetljeni dio (Illumination.phase_fraction)
       χ   = pozicijski kut osvijetljenog ruba (od sjevera prema istoku)
       q   = paralaktički kut (koliko je nebeski sjever nagnut od zenita)
       z   = χ − q  → smjer osvijetljenog ruba u odnosu na „gore"
     Lice Mjeseca (mora) se zakrene za q, osvijetljeni dio za z.
     Neosvijetljeni dio se samo nazire (Zemljin odsjaj).
     ============================================================ */
  const RAB = { lat: 44.757, lon: 14.760 };
  const MOON_SVG =
    '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<radialGradient id="hwMg" cx="46%" cy="44%" r="60%">' +
          '<stop offset="0" stop-color="#d6d3dc"/><stop offset="0.6" stop-color="#a7a3b3"/>' +
          '<stop offset="0.9" stop-color="#6a6677"/><stop offset="1" stop-color="#45424f"/>' +
        '</radialGradient>' +
        '<filter id="hwMt" x="0" y="0" width="100%" height="100%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="3" seed="11" result="n"/>' +
          '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.55 0.55 0 0 -0.4" result="m"/>' +
          '<feComposite in="m" in2="SourceGraphic" operator="in" result="mm"/>' +
          '<feBlend in="SourceGraphic" in2="mm" mode="multiply"/>' +
        '</filter>' +
        '<filter id="hwMb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter>' +
        '<filter id="hwMe" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.6"/></filter>' +
        '<clipPath id="hwMc"><circle cx="100" cy="100" r="100"/></clipPath>' +
        '<g id="hwMface">' +
          '<circle cx="100" cy="100" r="100" fill="url(#hwMg)" filter="url(#hwMt)"/>' +
          '<g clip-path="url(#hwMc)"><g filter="url(#hwMb)" fill="#2b2836" opacity="0.42">' +
            '<ellipse cx="52" cy="96" rx="24" ry="40"/>' +            // Oceanus Procellarum
            '<ellipse cx="80" cy="62" rx="23" ry="18"/>' +            // Imbrium
            '<ellipse cx="119" cy="70" rx="13" ry="12"/>' +           // Serenitatis
            '<ellipse cx="133" cy="94" rx="17" ry="13"/>' +           // Tranquillitatis
            '<ellipse cx="166" cy="78" rx="9" ry="7.5"/>' +           // Crisium
            '<ellipse cx="156" cy="117" rx="9" ry="13"/>' +           // Fecunditatis
            '<ellipse cx="97" cy="137" rx="17" ry="11"/>' +           // Nubium
            '<ellipse cx="70" cy="137" rx="8" ry="8"/>' +             // Humorum
          '</g>' +
          '<circle cx="101" cy="167" r="2.4" fill="#efedf3" opacity="0.5" filter="url(#hwMb)"/></g>' +  // Tycho
        '</g>' +
        '<mask id="hwMm" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">' +
          '<path class="hw-moon-lit" fill="#fff" filter="url(#hwMe)" d="M100 0 A100 100 0 0 1 100 200 A100 100 0 0 1 100 0 Z"/>' +
        '</mask>' +
      '</defs>' +
      '<g class="hw-moon-face">' +
        '<use href="#hwMface" class="hw-moon-earthshine"/>' +
        '<use href="#hwMface" mask="url(#hwMm)"/>' +
      '</g>' +
    '</svg>';

  // osvijetljeni dio za udio k, s osvijetljenim rubom DESNO (zakreće se poslije)
  function litPath(k) {
    if (k >= 0.995) return 'M100 0 A100 100 0 0 1 100 200 A100 100 0 0 1 100 0 Z';
    if (k <= 0.005) return 'M100 100 Z';
    const rx = f1(100 * Math.abs(1 - 2 * k));
    return 'M100 0 A100 100 0 0 1 100 200 A' + rx + ' 100 0 0 ' + (k > 0.5 ? 1 : 0) + ' 100 0 Z';
  }

  function moonGeometry(date) {
    const A = window.Astronomy, D = Math.PI / 180;
    const obs = new A.Observer(RAB.lat, RAB.lon, 10);
    const m = A.Equator('Moon', date, obs, true, true);
    const s = A.Equator('Sun', date, obs, true, true);
    const k = A.Illumination('Moon', date).phase_fraction;
    const am = m.ra * 15 * D, dm = m.dec * D, as = s.ra * 15 * D, ds = s.dec * D;
    const chi = Math.atan2(Math.cos(ds) * Math.sin(as - am),
      Math.sin(ds) * Math.cos(dm) - Math.cos(ds) * Math.sin(dm) * Math.cos(as - am));
    const lst = (A.SiderealTime(date) + RAB.lon / 15) * 15 * D;
    const H = lst - am, phi = RAB.lat * D;
    const q = Math.atan2(Math.sin(H), Math.tan(phi) * Math.cos(dm) - Math.sin(dm) * Math.cos(H));
    const z = chi - q;
    // na ekranu (y prema dolje): smjer osvijetljenog ruba = zakret za z suprotno od kazaljke od „gore"
    const limbDeg = Math.atan2(-Math.cos(z), -Math.sin(z)) / D;
    return { k, limbDeg, faceDeg: q / D };
  }

  function updateMoon(moonEl) {
    let g;
    try { g = moonGeometry(new Date()); } catch (e) { g = { k: 1, limbDeg: 0, faceDeg: 0 }; }
    const lit = moonEl.querySelector('.hw-moon-lit');
    const face = moonEl.querySelector('.hw-moon-face');
    // osvijetljeni dio: zakret oboda + zakret lica (maska je unutar lica pa se lice „vraća")
    lit.setAttribute('d', litPath(g.k));
    lit.setAttribute('transform', 'rotate(' + f1(g.limbDeg - g.faceDeg) + ' 100 100)');
    face.setAttribute('transform', 'rotate(' + f1(g.faceDeg) + ' 100 100)');
    moonEl.classList.add('hw-moon-ready');
    window.AJHalloween.moon = g;   // za provjeru u konzoli
  }

  // Magla pri dnu + Mjesec u pozadini (css/halloween.css) - umjesto zviježđa
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

    const draw = () => updateMoon(moon);
    const lib = (typeof loadScript === 'function') ? loadScript('js/lib/astronomy.browser.min.js') : Promise.reject();
    lib.then(draw, draw);                 // bez biblioteke: pun Mjesec
    setInterval(() => { if (window.Astronomy) draw(); }, 10 * 60 * 1000);   // faza i nagib se mijenjaju
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScenery();
    if (reduced()) return;
    initNavBat();
    setTimeout(scheduleBats, 6000 + Math.random() * 4000);
  });
})();
