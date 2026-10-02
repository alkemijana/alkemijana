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
  // innerWidth zna biti 0 (skrivena kartica / okno u pozadini) - tada mjere dokumenta ili ekrana
  const scrW = () => innerWidth || document.documentElement.clientWidth || screen.width || 800;
  const scrH = () => innerHeight || document.documentElement.clientHeight || screen.height || 600;

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
     ŠIŠMIŠ - klasična silueta: dugačak šiljat vrh krila, samo TRI velika
     duboka luka kožice (između prstiju, lukovi se savijaju prema zglobu
     gdje se prsti sastaju) i mala kandža na zglobu. Prijašnja verzija s
     4 vrha i puno sitnih ureza izgledala je kao „leptirić s perjem".
     Mahanje = SMIL morph između tri poze krila (gore / raširena / dolje);
     zamah prema dolje je brži od podizanja, tijelo poskoči pri zamahu.
     viewBox -48 -30 96 60, tijelo u (0,0); desno krilo = zrcalo lijevog.
     Potpuno crn, bez obruba i žilica (css/halloween.css).
     ============================================================ */
  const POSES = {
    // sh = rame, wr = zglob, th = kandža, tip = vrh krila, f2/f3 = vrhovi prstiju, hip = kuk
    up:   { sh: [-3, -3], wr: [-14, -15], th: [-11, -18.5], tip: [-35, -24], f2: [-35, -9], f3: [-25, -1], hip: [-4, 6] },
    mid:  { sh: [-3, -3], wr: [-17, -9],  th: [-15.5, -13], tip: [-46, -3],  f2: [-37, 9],  f3: [-24, 12], hip: [-4, 7] },
    down: { sh: [-3, -2], wr: [-16, 3],   th: [-18.5, -0.5], tip: [-30, 20],  f2: [-21, 22], f3: [-13, 17], hip: [-4, 8] }
  };
  // luk kožice između dva vrha: sredina tetive povučena prema ZGLOBU (tamo se prsti sastaju)
  function arc(a, b, wr, pull) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    return f1(mx + (wr[0] - mx) * pull) + ' ' + f1(my + (wr[1] - my) * pull);
  }
  const P = p => f1(p[0]) + ' ' + f1(p[1]);
  function wingPath(w) {
    const lead = f1((w.sh[0] + w.wr[0]) / 2) + ' ' + f1((w.sh[1] + w.wr[1]) / 2 - 3);     // prednji rub do zgloba
    const lead2 = f1((w.wr[0] + w.tip[0]) / 2) + ' ' + f1((w.wr[1] + w.tip[1]) / 2 - 2.5); // od zgloba do vrha
    return 'M' + P(w.sh) + ' Q' + lead + ' ' + P(w.wr) +
      ' L' + P(w.th) + ' L' + P([w.wr[0] - 1.2, w.wr[1] + 0.6]) +                        // kandža
      ' Q' + lead2 + ' ' + P(w.tip) +
      ' Q' + arc(w.tip, w.f2, w.wr, 0.42) + ' ' + P(w.f2) +
      ' Q' + arc(w.f2, w.f3, w.wr, 0.45) + ' ' + P(w.f3) +
      ' Q' + arc(w.f3, w.hip, w.wr, 0.35) + ' ' + P(w.hip) + ' Z';
  }
  const ORDER = ['up', 'mid', 'down', 'mid', 'up'];
  const KT = '0;0.2;0.42;0.72;1';
  const KS = '0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1';
  const WING_V = ORDER.map(k => wingPath(POSES[k])).join(';');

  /* Jednostavan šišmiš za JATO u uvodu: krilo = vrh + jedan urez, bez prstiju,
     kandži i poskakivanja tijela - sitan i brz, pa detalji samo smetaju. */
  const SW_UP   = 'M-1.5 -1 Q-9 -10 -21 -13 Q-17 -6 -18 -2 Q-12 -4 -9 1 Q-5 0 -1.5 3 Z';
  const SW_DOWN = 'M-1.5 -1 Q-9 2 -19 12 Q-13 9 -11 11 Q-9 6 -6 7 Q-4 3 -1.5 3 Z';
  function swarmBatSvg(beat) {
    const dur = beat.toFixed(3) + 's', begin = (-Math.random() * beat).toFixed(3) + 's';
    const wing = '<path class="hw-wing" d="' + SW_UP + '"><animate attributeName="d" dur="' + dur + '" begin="' + begin +
      '" repeatCount="indefinite" values="' + SW_UP + ';' + SW_DOWN + ';' + SW_UP + '"/></path>';
    return '<svg viewBox="-24 -16 48 32" aria-hidden="true" focusable="false">' +
      wing + '<g transform="scale(-1 1)">' + wing + '</g>' +
      '<ellipse class="hw-body" cx="0" cy="1" rx="2.4" ry="4.2"/>' +
      '<path class="hw-body" d="M-2 -2 L-1.6 -5.6 L-0.4 -3 Z M2 -2 L1.6 -5.6 L0.4 -3 Z"/>' +
    '</svg>';
  }

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
        '<ellipse class="hw-body" cx="0" cy="3" rx="4" ry="8"/>' +
        '<circle class="hw-body" cx="0" cy="-5.5" r="3.6"/>' +
        '<path class="hw-body" d="M-3.2 -7 L-2.8 -12.8 L-0.6 -8.6 Z M3.2 -7 L2.8 -12.8 L0.6 -8.6 Z"/>' +
      '</g>' +
    '</svg>';
  }

  /* ============================================================
     UVOD (#hw-intro, stilovi .hwi-* u css/halloween.css) - ~11 s:
       normalni ekran učitavanja → udar munje (bljesak,
       potres) → boje se isperu u sivo → izlazi Mjesec → zacrveni (otkucaji
       srca) → jato šišmiša → završna munja: u bljesku se tema zamijeni →
       na crnom rečenica → overlay nestane i ekran učitavanja krene ISPOČETKA
       u Halloween boji i odigra se do kraja (šešir) - v. js/loader.js.
     Na početku se vidi NORMALNI ekran učitavanja (overlay je proziran) dok ga
     munja ne prekine. Ne može se preskočiti (vlasnik).
     Bljeskovi su razmaknuti (najviše ~2-3 u sekundi, nijedan crveni) zbog
     fotosenzitivnosti.
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
      '<div class="hwi-black"></div>' +
      // dva sloja: običan i krvavi (statičan filter) - krvavljenje je samo pretapanje
      // prozirnosti, bez filtera u pokretu (na mobitelu je to zapinjalo)
      '<div class="hwi-moon hw-moon-geo">' +
        '<div class="hwi-ml hwi-ml-n">' + moonSvg('i') + '</div>' +
        '<div class="hwi-ml hwi-ml-r">' + moonSvg('r') + '</div>' +
      '</div>' +
      '<div class="hwi-vig"></div>' +
      '<div class="hwi-bats"></div>' +
      '<div class="hwi-skyglow"></div>' +
      '<svg class="hwi-bolts"><defs><filter id="hwiBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs></svg>' +
      '<p class="hwi-text">Veo između svjetova je tanak…</p>' +
      '<div class="hwi-flash"></div>';
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
    /* MUNJA - ne crta se kao linija nego kao kanal: izlomljena metodom
       pomicanja sredine (sitni i krupni lomovi), grane koje se granaju dalje,
       debljina pada prema granama, a svaki kanal je u tri sloja (široki
       zamućeni sjaj, svjetlina, tanka bijela jezgra). Uz munju se osvijetli
       nebo oko nje, a sve zajedno treperi (bljesak ekrana je odvojen).
       Koordinate su u pikselima ekrana (viewBox = ekran) da se ne izobliče. */
    function jag(ax, ay, bx, by, rough, depth) {
      if (depth === 0) return [[ax, ay], [bx, by]];
      const len = Math.hypot(bx - ax, by - ay);
      const mx = (ax + bx) / 2 + (Math.random() - 0.5) * len * rough;
      const my = (ay + by) / 2 + (Math.random() - 0.5) * len * rough * 0.35;
      const l = jag(ax, ay, mx, my, rough, depth - 1);
      return l.concat(jag(mx, my, bx, by, rough, depth - 1).slice(1));
    }
    function bolt(xFrac) {
      const svg = $('.hwi-bolts');
      const W = scrW(), H = scrH(), U = Math.max(0.6, Math.min(W, H) / 800);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const toD = p => 'M' + p.map(q => f1(q[0]) + ' ' + f1(q[1])).join(' L');
      const chans = [];
      const x0 = W * xFrac, y1 = H * (0.62 + Math.random() * 0.3);
      const main = jag(x0, -20, x0 + (Math.random() - 0.5) * W * 0.25, y1, 0.42, 7);
      chans.push({ p: main, w: 3.4 * U });
      for (let b = 0; b < 4 + Math.random() * 3; b++) {
        const i = 8 + Math.floor(Math.random() * (main.length * 0.7));
        const st = main[Math.min(i, main.length - 2)];
        const dir = Math.random() < 0.5 ? -1 : 1, L = H * (0.12 + Math.random() * 0.25);
        const br = jag(st[0], st[1], st[0] + dir * L * (0.4 + Math.random() * 0.6), st[1] + L, 0.5, 5);
        chans.push({ p: br, w: 1.6 * U });
        if (Math.random() < 0.6) {                              // grana grane
          const s2 = br[Math.floor(br.length * (0.3 + Math.random() * 0.4))], L2 = L * 0.5;
          chans.push({ p: jag(s2[0], s2[1], s2[0] + dir * L2 * 0.7, s2[1] + L2, 0.55, 4), w: 0.9 * U });
        }
      }
      let html = '';
      for (const c of chans) {
        const d = toD(c.p);
        html += '<path class="hwi-b-glow" d="' + d + '" stroke-width="' + f1(c.w * 7) + '"/>' +
          '<path class="hwi-b-halo" d="' + d + '" stroke-width="' + f1(c.w * 2.4) + '"/>' +
          '<path class="hwi-b-core" d="' + d + '" stroke-width="' + c.w.toFixed(2) + '"/>';
      }
      g.innerHTML = html;
      svg.appendChild(g);
      const flick = [{ opacity: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 0.15, offset: 0.14 }, { opacity: 0.95, offset: 0.22 },
                     { opacity: 0.3, offset: 0.4 }, { opacity: 0.7, offset: 0.5 }, { opacity: 0 }];
      g.animate(flick, { duration: 900, easing: 'ease-out', fill: 'forwards' }).onfinish = () => g.remove();
      // osvjetljenje neba oko munje
      const glow = $('.hwi-skyglow');
      glow.style.left = f1(x0) + 'px';
      glow.animate(flick, { duration: 900, easing: 'ease-out' });
    }
    function strike(peak) {
      bolt(0.2 + Math.random() * 0.6);
      flash(peak, 700);
      shake(520, 16);
    }
    /* JATO - šišmiši izlijeću iz DONJEG LIJEVOG KUTA i lete ravno PREKO
       MJESECA (svaki cilja nasumičnu točku na disku) i dalje van ekrana. Mali, puno njih (~60), JEDNOSTAVNA
       silueta (swarmBatSvg - krilo s jednim urezom, bez detalja), zamućeni od
       brzine i u RAVNOJ crti: bez lelujanja, nagiba i poskakivanja.
       (Prijašnje verzije - veliki detaljni šišmiši s nemirnim letom -
       izgledale su kao leptirići.) Bliži su malo veći i brži. */
    function swarm() {
      const host = $('.hwi-bats');
      const vw = scrW(), vh = scrH(), m = Math.min(vw, vh), D = Math.hypot(vw, vh) * 1.15;
      // Mjesec (isto kao .hw-moon-geo u css/halloween.css)
      const mob = vw <= 768;
      const moonR = (mob ? Math.min(vw * 0.92, 440) : Math.min(m * 0.58, 560)) / 2;
      const moonX = vw / 2, moonY = vh * (mob ? 0.46 : 0.5);
      for (let i = 0; i < 60; i++) {
        const depth = Math.random();                              // 0 = daleko, 1 = blizu
        const size = m * (0.025 + depth * 0.055) + 10;            // mali
        const el = document.createElement('div');
        el.className = 'hw-bat hwi-bat';
        el.innerHTML = swarmBatSvg(0.07 + Math.random() * 0.04);
        el.style.width = size + 'px';
        el.style.zIndex = String(Math.round(depth * 10));
        el.style.filter = 'blur(' + f1(0.8 + depth * 1.6) + 'px)';    // statično zamućenje = dojam brzine
        host.appendChild(el);
        // iz kuta (malo raspršeno) RAVNO PREKO MJESECA: cilj je nasumična točka na
        // disku Mjeseca (geometrija kao .hw-moon-geo), pa let nastavi van ekrana
        const x0 = -size - Math.random() * vw * 0.06, y0 = vh + Math.random() * vh * 0.06;
        const a = Math.random() * Math.PI * 2, rr = moonR * 1.05 * Math.sqrt(Math.random());
        const tx = moonX + Math.cos(a) * rr - size / 2, ty = moonY + Math.sin(a) * rr - size / 2;
        const len = Math.hypot(tx - x0, ty - y0) || 1;
        const x1 = x0 + (tx - x0) / len * D, y1 = y0 + (ty - y0) / len * D;
        el.animate([
          { transform: 'translate(' + f1(x0) + 'px, ' + f1(y0) + 'px) scale(1.15)' },
          { transform: 'translate(' + f1(x1) + 'px, ' + f1(y1) + 'px) scale(0.7)' }
        ], {
          // dio sa šišmišima je namjerno kratak (~1,1 s) - duplo kraći od prvotnog (vlasnik)
          duration: 750 + (1 - depth) * 650 + Math.random() * 150,
          delay: Math.pow(Math.random(), 1.4) * 1000,             // gušće na početku, kao da kuljaju van
          easing: 'linear', fill: 'both'
        });
      }
    }

    function finale() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      try { localStorage.setItem(INTRO_KEY, YEAR); } catch (e) {}
      bolt(0.25 + Math.random() * 0.15); bolt(0.6 + Math.random() * 0.15);
      flash(1, 1100, true);
      shake(700, 26);
      // na vrhuncu bljeska: tema se zamijeni, iza bljeska je crno
      setTimeout(() => { goSpooky(); addLoaderMoon(true); $('.hwi-moon').classList.add('hwi-moon-ghost'); $('.hwi-black').style.opacity = '1'; $('.hwi-bats').remove(); }, 160);
      const tText = 1300, tOut = 4100;
      setTimeout(() => $('.hwi-text').classList.add('hwi-text-in'), tText);
      setTimeout(() => $('.hwi-text').classList.remove('hwi-text-in'), tOut - 900);
      setTimeout(() => {
        ov.classList.add('hwi-out');
        if (window.AJHalloween._introDone) window.AJHalloween._introDone();   // loader kreće
      }, tOut);
      setTimeout(() => ov.remove(), tOut + 1200);
    }

    /* Prve ~2 s overlay je PROZIRAN: vidi se normalni (ljubičasti) ekran
       učitavanja koji crta „Znak A". Udar munje ga prekine i pokrije nebom
       (.hwi-covered) - dalje ide uvod. Namjerno samo DVA bljeska (ovaj i
       završni) - s više sijevanja bilo je previše bljeskova (vlasnik). */
    at(2100, () => {
      strike(0.9);
      setTimeout(() => ov.classList.add('hwi-covered'), 60);      // ispod vrha bljeska
      setTimeout(() => $('.hwi-sky').classList.add('hwi-gray'), 250);
    });
    // faza tek sad: astronomy-engine (loadScript iz natal-data.js) na početku još ne postoji
    at(3000, () => { drawMoonWhenReady($('.hwi-ml-n')); drawMoonWhenReady($('.hwi-ml-r')); $('.hwi-moon').classList.add('hwi-moon-in'); });
    at(6400, () => { $('.hwi-moon').classList.add('hwi-moon-blood'); $('.hwi-vig').classList.add('hwi-vig-beat'); });
    at(6600, swarm);
    at(7700, finale);      // šišmiši ~1,1 s (duplo kraće od prvotnih 2,2 s)
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
    el.innerHTML = batSvg(0.1 + Math.random() * 0.05);    // brzo mahanje - sporo je izgledalo kao leptir
    const size = 34 + Math.random() * 30;
    el.style.width = size + 'px';
    document.body.appendChild(el);

    const vw = window.innerWidth, vh = window.innerHeight;
    const ltr = Math.random() < 0.5;
    const x0 = ltr ? -size * 1.5 : vw + size * 1.5, x1 = ltr ? vw + size * 1.5 : -size * 1.5;
    /* Let: dionice ravnog leta s NAGLIM skretanjem između njih (šišmiš lovi),
       bez valovitog lebdenja i bez „disanja" veličine - to je izgledalo kao leptir. */
    let y = vh * (0.12 + Math.random() * 0.5);
    const N = 7, frames = [];
    let slope = (Math.random() - 0.5) * 0.5;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = x0 + (x1 - x0) * t;
      if (i > 0) {
        if (Math.random() < 0.55) slope = (Math.random() - 0.5) * 0.9;     // naglo skretanje
        y += slope * Math.abs(x1 - x0) / N;
        y = Math.max(vh * 0.05, Math.min(vh * 0.85, y));
      }
      const tilt = Math.max(-22, Math.min(22, Math.atan(slope) * 57.3 * 0.6)) * (ltr ? 1 : -1);
      frames.push({ transform: 'translate(' + f1(x) + 'px, ' + f1(y) + 'px) rotate(' + f1(tilt) + 'deg)', offset: t });
    }
    const dur = 3600 + Math.random() * 2400;   // šišmiš je brz
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

  // isti Mjesec s drugim id-evima (uvod i pozadina su istovremeno u DOM-u)
  function moonSvg(sfx) { return MOON_SVG.replace(/hwM([a-z]+)/g, 'hwM$1' + sfx); }
  function drawMoonWhenReady(el) {
    const draw = () => updateMoon(el);
    const lib = window.Astronomy ? Promise.resolve() :
      (typeof loadScript === 'function') ? loadScript('js/lib/astronomy.browser.min.js') : Promise.reject();
    lib.then(draw, draw);                 // bez biblioteke: pun Mjesec
  }

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

  /* Mjesec i na EKRANU UČITAVANJA (svako učitavanje u tjednu): isti Mjesec, isto
     mjesto i veličina (.hw-moon-geo) kao u uvodu i u pozadini, krvav kao na kraju
     uvoda - pa se prijelazi uvod → učitavanje → stranica ne vide. instant = bez
     fade-a (poslije uvoda je već bio na ekranu). */
  function addLoaderMoon(instant) {
    const ld = document.getElementById('aj-loader');
    if (!ld || ld.querySelector('.ajl-hwmoon')) return;
    const m = document.createElement('div');
    m.className = 'ajl-hwmoon hw-moon-geo' + (instant ? ' ajl-hwmoon-instant' : '');
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = moonSvg('l');
    ld.prepend(m);
    drawMoonWhenReady(m);
  }

  // Magla pri dnu + Mjesec u pozadini (css/halloween.css) - umjesto zviježđa
  function initScenery() {
    const sky = document.getElementById('sky-bg');
    const moon = document.createElement('div');
    moon.className = 'hw-moon hw-moon-geo';
    moon.setAttribute('aria-hidden', 'true');
    moon.innerHTML = moonSvg('');
    const fog = document.createElement('div');
    fog.className = 'hw-fog';
    fog.setAttribute('aria-hidden', 'true');
    if (sky && sky.parentNode) { sky.after(fog); sky.after(moon); }
    else { document.body.prepend(fog); document.body.prepend(moon); }

    drawMoonWhenReady(moon);
    setInterval(() => { if (window.Astronomy) updateMoon(moon); }, 10 * 60 * 1000);   // faza i nagib se mijenjaju
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScenery();
    if (!wantIntro) addLoaderMoon(false);   // s uvodom ga doda završni bljesak
    if (reduced()) return;
    initNavBat();
    setTimeout(scheduleBats, 15000 + Math.random() * 15000);
  });
})();
