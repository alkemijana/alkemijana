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

  /* Paleta natalnog kotača NA EKRANU (natal-render.js currentScreenPalette i
     natal-live.js je preuzmu umjesto ljubičaste). PDF palete se ne diraju. */
  window.AJHalloween.wheelPalette = {
    ring: 'rgba(196,182,160,0.42)', ringSoft: 'rgba(122,26,30,0.32)',
    bandA: 'rgba(122,26,30,0.08)', bandB: 'rgba(122,26,30,0.02)',
    sign: '#8a2a2e', tick: 'rgba(190,178,158,0.32)',
    planet: '#e2d8c4', degText: 'rgba(190,178,158,0.8)', degStrong: '#f2ead8', houseNum: 'rgba(160,148,128,0.72)',
    cusp: 'rgba(122,26,30,0.45)', axis: '#8a2a2e', axisText: '#c4baa6',
    conj: '#a89e8c', harm: '#7f9a80', tense: '#9a3236',
    fire: '#9a4244', earth: '#8c9a7a', air: '#bcae94', water: '#7d8ca2'
  };

  const root = document.documentElement;
  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  const f1 = n => n.toFixed(1);

  /* Sablasna tema je uvijek tamna: svijetla se taj tjedan ne pali (ni iz
     localStorage-a u app.js). aj_theme se NE dira, pa se nakon tjedna
     posjetitelju vrati tema koju je sam izabrao. */
  function noLight() { if (root.getAttribute('data-theme') === 'light') root.removeAttribute('data-theme'); }
  function goSpooky() {
    root.classList.add('hw-on');
    root.classList.remove('hw-intro');
    noLight();
    new MutationObserver(noLight).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---- UVOD: prvi posjet u tjednu ----
     Prvi put (po pregledniku, po godini) stranica se pojavi u NORMALNOJ temi pa
     je dramatičan uvod (#hw-intro, mountIntro niže) prebaci u Halloween - tema se
     zamijeni u završnom bljesku. js/loader.js čeka AJHalloween.introPromise prije
     nego što pokrene svoju animaciju. Pamti se u localStorage 'aj_hw_intro' =
     godina (navedeno u Pravilima privatnosti, t. 6). ?halloween=intro ga ponovi. */
  const INTRO_KEY = 'aj_hw_intro';
  const YEAR = String(new Date().getFullYear());
  let wantIntro = false;
  try {
    wantIntro = new URLSearchParams(location.search).get('halloween') === 'intro' ||
      localStorage.getItem(INTRO_KEY) !== YEAR;
  } catch (e) { wantIntro = false; }      // bez pohrane ne možemo zapamtiti - bez uvoda
  if (reduced()) wantIntro = false;

  if (wantIntro) {
    root.classList.add('hw-intro');
    window.AJHalloween.introPromise = new Promise(res => { window.AJHalloween._introDone = res; });
    // overlay čim <body> postoji - prije nego se išta drugo iscrta
    const mo = new MutationObserver(() => { if (document.body) { mo.disconnect(); mountIntro(); } });
    if (document.body) mountIntro(); else mo.observe(root, { childList: true });
  } else {
    goSpooky();
  }

  /* ============================================================
     ŠIŠMIŠ - silueta s pravim krilom (podlaktica + 4 prsta, nazubljen
     rub opne između vrhova prstiju). Mahanje = SMIL morph između tri
     poze krila (gore / raširena / dolje) - krilo se pri tome savija u
     zglobu, ne samo spljošti. Zamah prema dolje je brži od podizanja,
     a tijelo poskoči pri svakom zamahu (kao pravi šišmiš).
     viewBox -48 -30 96 60, tijelo u (0,0); desno krilo = zrcalo lijevog.
     Potpuno crn, bez obruba i žilica (css/halloween.css).
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
  const ORDER = ['up', 'mid', 'down', 'mid', 'up'];
  const KT = '0;0.2;0.42;0.72;1';
  const KS = '0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1';
  const WING_V = ORDER.map(k => wingPath(POSES[k])).join(';');

  function batSvg(beat) {
    const dur = beat.toFixed(3) + 's';
    const begin = (-Math.random() * beat).toFixed(3) + 's';
    const anim = v => '<animate attributeName="d" dur="' + dur + '" begin="' + begin + '" repeatCount="indefinite" ' +
      'calcMode="spline" keyTimes="' + KT + '" keySplines="' + KS + '" values="' + v + '"/>';
    const wing =
      '<path class="hw-wing" d="' + wingPath(POSES.up) + '">' + anim(WING_V) + '</path>';
    return '<svg viewBox="-48 -30 96 60" aria-hidden="true" focusable="false">' +
      '<g>' +
        '<animateTransform attributeName="transform" type="translate" dur="' + dur + '" begin="' + begin + '" ' +
          'repeatCount="indefinite" calcMode="spline" keyTimes="0;0.42;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" values="0 2;0 -2;0 2"/>' +
        wing +
        '<g transform="scale(-1 1)">' + wing + '</g>' +
        '<ellipse class="hw-body" cx="0" cy="2.5" rx="3.3" ry="6.8"/>' +
        '<circle class="hw-body" cx="0" cy="-5" r="3"/>' +
        '<path class="hw-body" d="M-2.7 -6.3 L-2.4 -11.2 L-0.5 -7.4 Z M2.7 -6.3 L2.4 -11.2 L0.5 -7.4 Z"/>' +
      '</g>' +
    '</svg>';
  }

  /* ============================================================
     UVOD (#hw-intro, stilovi .hwi-* u css/halloween.css) - ~11 s:
       mirna ljubičasta noć → sijevanje u daljini → udar munje (bljesak,
       potres) → boje se isperu u sivo → izlazi Mjesec → zacrveni (otkucaji
       srca) → jato šišmiša → završna munja: u bljesku se tema zamijeni →
       na crnom rečenica → overlay nestane i kreće ekran učitavanja.
     Bljeskovi su razmaknuti (najviše ~2-3 u sekundi, nijedan crveni) zbog
     fotosenzitivnosti. Klik / dodir / tipka → odmah na završetak.
     ============================================================ */
  function mountIntro() {
    const ov = document.createElement('div');
    ov.id = 'hw-intro';
    ov.setAttribute('aria-hidden', 'true');
    // zvijezde: jedan 1px element s puno box-shadowa (jeftino)
    const stars = [];
    for (let i = 0; i < 170; i++) {
      const s = (Math.random() < 0.85 ? 1 : 2);
      stars.push(`${f1(Math.random() * 100)}vw ${f1(Math.random() * 100)}vh 0 ${s === 1 ? 0 : 0.6}px rgba(228,224,244,${(0.35 + Math.random() * 0.6).toFixed(2)})`);
    }
    ov.innerHTML =
      '<div class="hwi-sky"><div class="hwi-stars" style="box-shadow:' + stars.join(',') + '"></div></div>' +
      '<div class="hwi-moon"><div class="hwi-blood"></div></div>' +
      '<div class="hwi-vig"></div>' +
      '<div class="hwi-bats"></div>' +
      '<svg class="hwi-bolts" viewBox="0 0 1000 1000" preserveAspectRatio="none"></svg>' +
      '<div class="hwi-black"></div>' +
      '<p class="hwi-text">Veo između svjetova je tanak…</p>' +
      '<div class="hwi-flash"></div>' +
      '<span class="hwi-skip">dodirni za preskakanje</span>';
    document.body.prepend(ov);

    const $ = s => ov.querySelector(s);
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    let finished = false;

    function flash(peak, ms, hold) {
      return $('.hwi-flash').animate(
        [{ opacity: 0 }, { opacity: peak, offset: 0.08 }, { opacity: peak, offset: hold ? 0.3 : 0.1 }, { opacity: 0 }],
        { duration: ms, easing: 'ease-out' });
    }
    function shake(ms, px) {
      const k = [];
      for (let i = 0; i <= 10; i++) k.push({ transform: `translate(${f1((Math.random() - 0.5) * px * (1 - i / 10))}px, ${f1((Math.random() - 0.5) * px * (1 - i / 10))}px)` });
      k[10] = { transform: 'none' };
      $('.hwi-sky').animate(k, { duration: ms });
    }
    // munja: izlomljena linija od vrha + 1-2 grane
    function bolt(x0) {
      const svg = $('.hwi-bolts');
      let x = x0, y = -20;
      const yEnd = 550 + Math.random() * 400;
      const pts = [[x, y]];
      while (y < yEnd) { y += 30 + Math.random() * 55; x += (Math.random() - 0.5) * 90; pts.push([x, y]); }
      const toD = p => 'M' + p.map(q => f1(q[0]) + ' ' + f1(q[1])).join(' L');
      let d = toD(pts);
      for (let b = 0; b < 2; b++) {
        const st = pts[2 + Math.floor(Math.random() * (pts.length - 4))];
        let bx = st[0], by = st[1];
        const br = [[bx, by]], dir = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < 4 + Math.random() * 3; i++) { by += 25 + Math.random() * 40; bx += dir * (15 + Math.random() * 45); br.push([bx, by]); }
        d += ' ' + toD(br);
      }
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
      p.animate([{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 0.25, offset: 0.25 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }],
        { duration: 650, easing: 'ease-out', fill: 'forwards' }).onfinish = () => p.remove();
    }
    function strike(peak) {
      bolt(150 + Math.random() * 700);
      flash(peak, 700);
      shake(520, 16);
    }
    function swarm() {
      const host = $('.hwi-bats');
      const vw = innerWidth, vh = innerHeight, R = Math.hypot(vw, vh) * 0.62;
      for (let i = 0; i < 24; i++) {
        const el = document.createElement('div');
        el.className = 'hw-bat hwi-bat';
        el.innerHTML = batSvg(0.12 + Math.random() * 0.08);
        const size = 26 + Math.random() * 60;
        el.style.width = size + 'px';
        host.appendChild(el);
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7;   // uglavnom prema gore i u stranu
        const tx = Math.cos(a) * R, ty = Math.sin(a) * R;
        const cx = vw / 2 - size / 2, cy = vh * 0.48;
        el.animate([
          { transform: `translate(${f1(cx)}px, ${f1(cy)}px) scale(0.15)`, opacity: 0 },
          { transform: `translate(${f1(cx + tx * 0.25)}px, ${f1(cy + ty * 0.25 + (Math.random() - 0.5) * 60)}px) scale(0.6)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${f1(cx + tx)}px, ${f1(cy + ty)}px) scale(1.5)`, opacity: 1 }
        ], { duration: 1500 + Math.random() * 1100, delay: Math.random() * 1000, easing: 'cubic-bezier(0.4, 0, 0.9, 0.6)', fill: 'both' });
      }
    }

    function finale(fast) {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      try { localStorage.setItem(INTRO_KEY, YEAR); } catch (e) {}
      bolt(250 + Math.random() * 200); bolt(550 + Math.random() * 200);
      flash(1, 1100, true);
      shake(700, 26);
      // na vrhuncu bljeska: tema se zamijeni, iza bljeska je crno
      setTimeout(() => { goSpooky(); $('.hwi-black').style.opacity = '1'; $('.hwi-bats').remove(); }, 160);
      const tText = fast ? 900 : 1300, tOut = fast ? 2300 : 4100;
      setTimeout(() => { if (!fast) $('.hwi-text').classList.add('hwi-text-in'); }, tText);
      setTimeout(() => $('.hwi-text').classList.remove('hwi-text-in'), tOut - 900);
      setTimeout(() => {
        ov.classList.add('hwi-out');
        if (window.AJHalloween._introDone) window.AJHalloween._introDone();   // loader kreće
      }, tOut);
      setTimeout(() => { ov.remove(); document.removeEventListener('pointerdown', skip, true); document.removeEventListener('keydown', skip, true); }, tOut + 1200);
    }
    function skip() { finale(true); }
    document.addEventListener('pointerdown', skip, true);
    document.addEventListener('keydown', skip, true);

    at(1100, () => flash(0.16, 380));
    at(1550, () => flash(0.1, 320));
    at(2000, () => $('.hwi-skip').classList.add('hwi-skip-in'));
    at(2500, () => { strike(0.85); $('.hwi-sky').classList.add('hwi-gray'); });
    at(3350, () => flash(0.32, 500));
    at(3900, () => $('.hwi-moon').classList.add('hwi-moon-in'));
    at(5300, () => { $('.hwi-moon').classList.add('hwi-moon-blood'); $('.hwi-vig').classList.add('hwi-vig-beat'); });
    at(5800, swarm);
    at(7400, () => finale(false));
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
    if (!document.hidden && root.classList.contains('hw-on') && !root.classList.contains('aj-loading')) {
      const n = Math.random() < 0.8 ? 1 : 2;   // rijetko i uglavnom po jedan
      for (let i = 0; i < n; i++) spawnBat(i * (250 + Math.random() * 700));
    }
    setTimeout(scheduleBats, 45000 + Math.random() * 45000);   // svakih 45-90 s
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
          '<stop offset="0" stop-color="#ddd5c6"/><stop offset="0.6" stop-color="#ada392"/>' +
          '<stop offset="0.9" stop-color="#6e6458"/><stop offset="1" stop-color="#463e36"/>' +
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
          '<g clip-path="url(#hwMc)"><g filter="url(#hwMb)" fill="#2e2620" opacity="0.42">' +
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
    setTimeout(scheduleBats, 15000 + Math.random() * 15000);
  });
})();
