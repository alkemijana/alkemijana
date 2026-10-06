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

  /* Vrhunac tjedna: 31. 10. i 1. 11. Tada hero logo koristi animaciju „krv"
     (ispiše se pa s poteza kapne nekoliko kapi) - čita je js/logo.js.
     `?halloween=krv` ju uključi bilo kad radi pregleda. */
  function isBloodNight() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('halloween') === 'krv') return true;
    } catch (e) {}
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zagreb', month: 'numeric', day: 'numeric' })
        .formatToParts(new Date());
      const m = +parts.find(p => p.type === 'month').value;
      const d = +parts.find(p => p.type === 'day').value;
      return (m === 10 && d === 31) || (m === 11 && d === 1);
    } catch (e) { return false; }
  }

  const active = isHalloweenWeek();
  window.AJHalloween = { active, krvniHero: active && isBloodNight() };

  /* PRISILNO OSVJEŽAVANJE KAD SE TEMA PROMIJENI (vlasnik). Halloween se pali/gasi sam po datumu, ali
     kartica otvorena preko ponoći (SPA se ne učitava ponovno) bi ostala na staroj temi. Zato se
     svakih 30 s provjeri stanje - izvan tjedna 'off', u tjednu 'hw:<datum>' (svaki dan se mijenja
     mreža, krvavi logo, rečenica) - i kad se promijeni, stranica se SAMA ponovno učita. Ali nikad
     usred korištenja: samo ako je kartica u pozadini ili posjetitelj minutu ništa ne radi, nikad dok
     je Jana prijavljena u admin i nikad dok je fokus u polju za unos. Uz `?halloween` (pregled) ne
     radi ništa. Ništa se ne sprema. */
  (function () {
    try { if (new URLSearchParams(location.search).has('halloween')) return; } catch (e) { return; }
    const datum = () => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(new Date()); } catch (e) { return ''; } };
    const stanje = () => isHalloweenWeek() ? 'hw:' + datum() : 'off';
    const pocetno = stanje();
    let radnja = Date.now();
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'input'].forEach(ev =>
      addEventListener(ev, () => { radnja = Date.now(); }, { passive: true, capture: true }));
    const provjeri = () => {
      if (stanje() === pocetno) return;
      try { if (sessionStorage.getItem('aj_pass')) return; } catch (e) {}   // admin: ne gubi izmjene
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;     // netko upravo piše
      if (document.hidden || Date.now() - radnja > 60000) location.reload();
    };
    setInterval(provjeri, 30000);
    document.addEventListener('visibilitychange', provjeri);
  })();

  if (!active) return;

  // rečenica ispod loga na početnoj (app.js applyTexts) - samo ovaj tjedan, TEXTS ostaje netaknut
  // 31. 10. i 1. 11. (krvavi hero) granica je NAJTANJA - vrhunac tjedna
  window.AJHalloween.heroDesc = window.AJHalloween.krvniHero
    ? 'Granica između svjetova sada je najtanja. Pravo je vrijeme za prava pitanja.'
    : 'Granica između svjetova postaje sve tanja. Pravo je vrijeme za prava pitanja.';

  // obećanje s rokom: nijedan korak pripreme uvoda ne smije zaglaviti cijeli uvod
  // (npr. img.decode() zna zapeti u kartici u pozadini)
  const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise(r => setTimeout(r, ms))]);
  // stranica gotova s initom (app.js šalje 'aj:ready') - uvod čeka to prije prve munje
  const pageReady = new Promise(r => document.addEventListener('aj:ready', r, { once: true }));

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
     ŠIŠMIŠ - gotove siluete iz assets/halloween/bat-sheet.png: traka od 5
     sličica (140x149 svaka), TRASIRANE iz animacije koju je poslao vlasnik
     (animatedimages.org, "100% free... we welcome copying"). Maska je uzeta
     po prozirnosti pa je silueta potpuno crna, kao sjena.
     Mahanje = CSS animacija koja pomiče traku u 5 koraka (@keyframes hw-batflap),
     bez SVG-a, SMIL-a i filtera - najjeftinije što postoji, bitno za iPhone.
     Crtanje krila kodom (POSES/wingPath/batSvg) je OBRISANO: tri pokušaja
     (veća amplituda, različite faze krila, prikaz iz tri četvrtine) i vlasnik je
     svaki put rekao da izgleda kao leptir. Ne vraćati ga.
     ============================================================ */

  /* Jato u uvodu koristi ISTU traku silueta kao šišmiši na stranici (klasa hw-bat).
     Prije je imalo vlastiti, jednostavniji crtež u dvije gotove slike - obrisano kad
     je crtanje kodom zamijenjeno trasiranom trakom. Slika se učita u pripremi uvoda
     (preloadBatSheet) da se prvih 60 šišmiša ne iscrtava usred animacije. */
  function preloadBatSheet() {
    const im = new Image();
    im.src = 'assets/halloween/bat-sheet.png';
    return within(im.decode(), 2500).catch(() => {});
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
        '<div class="hwi-ml hwi-ml-n"></div>' +
        '<div class="hwi-ml hwi-ml-r"></div>' +
      '</div>' +
      '<div class="hwi-vig"></div>' +
      '<div class="hwi-bats"></div>' +
      '<div class="hwi-skyglow"></div>' +
      '<svg class="hwi-bolts"></svg>' +
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
    /* Munje se grade UNAPRIJED (u pripremi): buildBolt složi kanal i ubaci ga
       nevidljivog; bolt() samo uzme gotovu iz reda i pokrene treperenje. */
    const boltQueue = [];
    function bolt(xFrac) {
      const b = boltQueue.shift() || buildBolt(xFrac);
      const flick = [{ opacity: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 0.15, offset: 0.14 }, { opacity: 0.95, offset: 0.22 },
                     { opacity: 0.3, offset: 0.4 }, { opacity: 0.7, offset: 0.5 }, { opacity: 0 }];
      b.g.animate(flick, { duration: 450, easing: 'ease-out', fill: 'forwards' }).onfinish = () => b.g.remove();
      // osvjetljenje neba oko munje
      const glow = $('.hwi-skyglow');
      glow.style.left = f1(b.x0) + 'px';
      glow.animate(flick, { duration: 450, easing: 'ease-out' });   // munja kratka (~0,45 s) - 0,9 s je bilo predugo
    }
    function buildBolt(xFrac) {
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
        // sjaj = široki prozirni slojevi (bez filtera zamućenja - Safari ga je računao u svakom kadru)
        html += '<path class="hwi-b-glow" d="' + d + '" stroke-width="' + f1(c.w * 11) + '"/>' +
          '<path class="hwi-b-glow2" d="' + d + '" stroke-width="' + f1(c.w * 5.5) + '"/>' +
          '<path class="hwi-b-halo" d="' + d + '" stroke-width="' + f1(c.w * 2.4) + '"/>' +
          '<path class="hwi-b-core" d="' + d + '" stroke-width="' + c.w.toFixed(2) + '"/>';
      }
      g.innerHTML = html;
      g.style.opacity = '0';
      svg.appendChild(g);
      return { g, x0 };
    }
    function strike(peak) {
      bolt(0.2 + Math.random() * 0.6);
      flash(peak, 420);
      shake(360, 16);
    }
    /* JATO - šišmiši izlijeću iz DONJEG LIJEVOG KUTA i lete ravno PREKO
       MJESECA (svaki cilja nasumičnu točku na disku) i dalje van ekrana. Puno njih (~60), JEDNOSTAVNA
       silueta (swarmBatSvg - krilo s jednim urezom, bez detalja), zamućeni od
       brzine i u RAVNOJ crti: bez lelujanja, nagiba i poskakivanja.
       (Prijašnje verzije - veliki detaljni šišmiši s nemirnim letom -
       izgledale su kao leptirići.) Bliži su malo veći i brži. */
    /* Jato se SLOŽI UNAPRIJED (buildSwarm u pripremi): 60 elemenata je već u DOM-u,
       slike dekodirane, na startnim položajima izvan ekrana - swarm() samo pokrene
       animacije (inače je stvaranje 60 elemenata usred animacije znalo zapeti). */
    let swarmPlan = null;
    function swarm() {
      const plan = swarmPlan || buildSwarm();
      for (const p of plan) p.el.animate(p.frames, p.opts);
    }
    function buildSwarm() {
      const plan = [];
      const host = $('.hwi-bats');
      const vw = scrW(), vh = scrH(), m = Math.min(vw, vh), D = Math.hypot(vw, vh) * 1.15;
      // Mjesec (isto kao .hw-moon-geo u css/halloween.css)
      const mob = vw <= 768;
      const moonR = (mob ? Math.min(vw * 0.92, 440) : Math.min(m * 0.58, 560)) / 2;
      const moonX = vw / 2, moonY = vh * (mob ? 0.46 : 0.5);
      for (let i = 0; i < 60; i++) {
        const depth = Math.random();                              // 0 = daleko, 1 = blizu
        const size = m * (0.05 + depth * 0.11) + 20;              // duplo veći nego prije (vlasnik)
        const el = document.createElement('div');
        el.className = 'hw-bat hwi-bat';                            // traku silueta nosi .hw-bat
        el.style.width = f1(size) + 'px';
        el.style.animationDuration = (0.23 + Math.random() * 0.09).toFixed(2) + 's';  // jato maše brže (bilo 0,30-0,42 s)
        el.style.animationDelay = (-Math.random()).toFixed(2) + 's';
        el.style.zIndex = String(Math.round(depth * 10));
        host.appendChild(el);
        // iz kuta (malo raspršeno) RAVNO PREKO MJESECA: cilj je nasumična točka na
        // disku Mjeseca (geometrija kao .hw-moon-geo), pa let nastavi van ekrana
        const x0 = -size - Math.random() * vw * 0.06, y0 = vh + Math.random() * vh * 0.06;
        const a = Math.random() * Math.PI * 2, rr = moonR * 1.05 * Math.sqrt(Math.random());
        const tx = moonX + Math.cos(a) * rr - size / 2, ty = moonY + Math.sin(a) * rr - size / 2;
        const len = Math.hypot(tx - x0, ty - y0) || 1;
        const x1 = x0 + (tx - x0) / len * D, y1 = y0 + (ty - y0) / len * D;
        /* Silueta na traci gleda ULIJEVO, a jato leti iz donjeg lijevog kuta UDESNO -
           zato negativan scaleX, inače lete unatrag (vlasnik). */
        el.style.transform = 'translate(' + f1(x0) + 'px, ' + f1(y0) + 'px) scale(-1.15, 1.15)';   // čeka izvan ekrana
        plan.push({ el, frames: [
          { transform: 'translate(' + f1(x0) + 'px, ' + f1(y0) + 'px) scale(-1.15, 1.15)' },
          { transform: 'translate(' + f1(x1) + 'px, ' + f1(y1) + 'px) scale(-0.7, 0.7)' }
        ], opts: {
          // dio sa šišmišima je kratak (~1,5 s) - prvotnih 2,2 s je bilo predugo, 1,1 s malo prekratko (vlasnik)
          duration: 1000 + (1 - depth) * 850 + Math.random() * 200,
          delay: Math.pow(Math.random(), 1.4) * 1350,             // gušće na početku, kao da kuljaju van
          easing: 'linear', fill: 'both'
        } });
      }
      return plan;
    }

    function finale() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      try { localStorage.setItem(INTRO_KEY, YEAR); } catch (e) {}
      bolt(0.25 + Math.random() * 0.15); bolt(0.6 + Math.random() * 0.15);
      flash(1, 700, true);
      shake(450, 26);
      // na vrhuncu bljeska: tema se zamijeni, iza bljeska je crno
      setTimeout(() => { goSpooky(); addLoaderMoon(true); paintBgMoon(); $('.hwi-moon').classList.add('hwi-moon-ghost'); $('.hwi-black').style.opacity = '1'; $('.hwi-bats').remove(); }, 160);
      // REČENICE NEMA (izbačena na zahtjev vlasnika) - iza bljeska ostaje kratak crni
      // predah s Mjesecom na razini pozadine (0.15), pa se otkriva stranica. Mjesec se
      // ne zatamnjuje: zatamnjenje je služilo samo čitljivosti rečenice.
      const tOut = 2000;
      setTimeout(() => {
        ov.classList.add('hwi-out');
        if (window.AJHalloween._introDone) window.AJHalloween._introDone();   // loader kreće
      }, tOut);
      setTimeout(() => ov.remove(), tOut + 1200);
    }

    /* PRIPREMA prije prve munje (vlasnik: „sve se učita prije nego krene"):
       - stranica dovrši init (aj:ready iz app.js) - inače teški JS (živi kotač…)
         radi usred animacije i na iPhoneu zapinje
       - astronomy-engine + oba Mjeseca (obični i krvavi) unaprijed iscrtana
       - traka silueta za jato (preloadBatSheet), font rečenice
       Za to vrijeme vidi se normalni ekran učitavanja. Strop 8 s pa ide svejedno. */
    let t0 = performance.now();
    async function prepare() {
      if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
      const lib = window.Astronomy ? null :
        (typeof loadScript === 'function' ? loadScript('js/lib/astronomy.browser.min.js').catch(() => {}) : null);
      const fonts = document.fonts && document.fonts.load ? document.fonts.load('italic 400 1em "Playfair Display"').catch(() => {}) : null;
      await Promise.all([within(lib, 5000), within(fonts, 2500), within(pageReady, 6000), within(preloadBatSheet(), 4000), within(loadMoonMap(), 5000)]);
      const g = currentMoon();
      await paintMoon($('.hwi-ml-n'), g, false);
      await paintMoon($('.hwi-ml-r'), g, true);
      boltQueue.push(buildBolt(0.2 + Math.random() * 0.6), buildBolt(0.25 + Math.random() * 0.15), buildBolt(0.6 + Math.random() * 0.15));
      swarmPlan = buildSwarm();
      await new Promise(r => setTimeout(r, 60));          // neka se iscrtano jednom prikaže (skriveno) prije pokreta
    }
    function startTimeline() {
      /* Prve ~2 s overlay je PROZIRAN: vidi se normalni (ljubičasti) ekran
         učitavanja koji crta „Znak A". Udar munje ga prekine i pokrije nebom
         (.hwi-covered) - dalje ide uvod. Namjerno samo DVA bljeska (ovaj i
         završni) - s više sijevanja bilo je previše bljeskova (vlasnik).
         Ako je priprema trajala dulje, munja dolazi 0,4 s nakon nje. */
      if (!$('.hwi-ml-n canvas')) { paintMoon($('.hwi-ml-n'), currentMoon(), false); paintMoon($('.hwi-ml-r'), currentMoon(), true); }
      const sh = Math.max(400, 2100 - (performance.now() - t0)) - 2100;
      at(2100 + sh, () => {
        strike(0.9);
        setTimeout(() => ov.classList.add('hwi-covered'), 60);      // ispod vrha bljeska
        setTimeout(() => $('.hwi-sky').classList.add('hwi-gray'), 250);
      });
      at(3000 + sh, () => $('.hwi-moon').classList.add('hwi-moon-in'));
      at(5200 + sh, () => { $('.hwi-moon').classList.add('hwi-moon-blood'); $('.hwi-vig').classList.add('hwi-vig-beat'); });
      at(5400 + sh, swarm);
      at(6900 + sh, finale);      // šišmiši ~1,5 s
    }
    /* KARTICA U POZADINI: uvod čeka da je posjetitelj otvori. Inače bi se (npr. kad se kartica
       otvorena preko ponoći 25. 10. sama ponovno učita) odvrtio dok nitko ne gleda i zapisao
       se kao viđen. Priprema teče i u pozadini; munja dolazi ~2 s nakon što se kartica pokaže. */
    const whenVisible = () => !document.hidden ? Promise.resolve() : new Promise(r => {
      const f = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', f);
        t0 = performance.now();
        r();
      };
      document.addEventListener('visibilitychange', f);
    });
    const prep = prepare();
    prep.catch(() => {});
    whenVisible()
      .then(() => Promise.race([prep, new Promise(r => setTimeout(r, 8000))]))
      .catch(() => {}).then(startTimeline);
  }

  /* ---- 2. Šišmiš oko šešira u traci ---- */
  function initNavBat() {
    const logo = document.getElementById('nav-logo');
    if (!logo || logo.querySelector('.hw-navbat')) return;
    const b = document.createElement('span');
    b.className = 'hw-navbat';
    b.setAttribute('aria-hidden', 'true');
    // trajanja su u CSS-u (dvije animacije: kruženje oko šešira + mahanje)
    logo.appendChild(b);
  }

  /* ---- 3. Šišmiši na nebu ----
     Prelet je RAVNA CRTA stalnom brzinom; nasumičan je samo smjer i mjesto.
     (Prije je let bio nemiran - trzanje gore-dolje, nagla skretanja, „disanje"
     veličine - i to je, zajedno s plitkim zamahom krila, izgledalo kao leptir.) */
  function spawnBat(delay) {
    const el = document.createElement('div');
    el.className = 'hw-bat';
    el.setAttribute('aria-hidden', 'true');
    const size = 68 + Math.random() * 60;                 // duplo veći nego prije (vlasnik)
    el.style.width = size + 'px';
    el.style.animationDuration = (0.34 + Math.random() * 0.15).toFixed(2) + 's';  // mahanje (bilo 0,45-0,65 s)
    el.style.animationDelay = (-Math.random()).toFixed(2) + 's';                  // svaki u svojoj fazi
    document.body.appendChild(el);

    /* Let je POTPUNO RAVAN - bez skretanja, bez valovitog lebdenja, bez „disanja"
       veličine (sve je to izgledalo kao leptir). Nasumičan je samo SMJER.
       ŠIŠMIŠ SE NE ZAKREĆE PO PUTANJI - ostaje uspravan, kao na referentnoj
       animaciji. Zakretanje u smjer leta (rotate) je probano i vlasnik je rekao
       da „čudno lete, nekako su nagnuti": kosi šišmiš izgleda kao da pada, a ne
       kao da leti. Jedino što se mijenja je zrcaljenje kad let ide ulijevo. */
    const vw = window.innerWidth, vh = window.innerHeight;
    // uglavnom vodoravno (±32°), inače bi uspravan šišmiš letio ravno gore ili dolje
    const ltr = Math.random() < 0.5;
    const ang = (Math.random() - 0.5) * 1.12 + (ltr ? 0 : Math.PI);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const cx = vw * (0.2 + Math.random() * 0.6), cy = vh * (0.15 + Math.random() * 0.55);
    const L = Math.hypot(vw, vh) / 2 + size * 2;                 // dovoljno da krene i završi izvan ekrana
    // silueta na traci gleda ULIJEVO, pa se zrcali kad let ide UDESNO
    const rot = dx > 0 ? ' scale(-1,1)' : '';
    const frames = [
      { transform: 'translate(' + f1(cx - dx * L) + 'px, ' + f1(cy - dy * L) + 'px) ' + rot },
      { transform: 'translate(' + f1(cx + dx * L) + 'px, ' + f1(cy + dy * L) + 'px) ' + rot }
    ];
    const dur = 2 * L / (0.32 + Math.random() * 0.16);   // stalna brzina (px/ms), neovisno o veličini ekrana
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
  /* Mjesec se crta JEDNOM u canvas (obična slika) - NE kao SVG s filterima.
     Safari na iPhoneu je SVG filtere (feTurbulence tekstura, zamućenje mora,
     drop-shadow sjaj, maska) računao u svakom kadru: uvod je zapinjao, a sjaj
     krvavog sloja znao je ostati kao crveni obrub. Canvas = isti izgled
     (tekstura, mora na stvarnim mjestima, sjaj, faza i nagib), ali se poslije
     animira samo prozirnost gotove slike. Krvavi Mjesec je druga gotova slika. */
  /* Karta mora kao na stvarnom Mjesecu (sjever gore, pogled sa Zemlje), u koordinatama
     diska 0-200: [cx, cy, rx, ry, kut°]. Mora se preklapaju u povezane tamne površine
     („lice u Mjesecu") - odvojeni mali ovali su izgledali kao pjege. */
  const MARIA = [
    [40, 100, 26, 50, 8],     // Oceanus Procellarum (veliki, lijevo)
    [58, 128, 20, 18, 0],     //   … njegov južni dio prema Humorumu
    [78, 62, 28, 24, -10],    // Mare Imbrium
    [92, 34, 42, 8, -6],      // Mare Frigoris (tanki pojas na sjeveru)
    [118, 66, 17, 16, 0],     // Mare Serenitatis
    [100, 86, 12, 9, 0],      // Mare Vaporum / spoj
    [80, 100, 13, 11, 0],     // Mare Insularum / spoj
    [131, 92, 22, 16, 15],    // Mare Tranquillitatis
    [168, 76, 11, 9, 0],      // Mare Crisium
    [157, 113, 11, 17, 10],   // Mare Fecunditatis
    [139, 122, 9, 9, 0],      // Mare Nectaris
    [96, 138, 20, 13, 0],     // Mare Nubium
    [66, 142, 10, 10, 0]      // Mare Humorum
  ];
  function noiseCanvas(n, lo) {            // lo = najtamnija vrijednost (manji kontrast = blaži šum)
    const c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'), id = x.createImageData(n, n);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = lo + Math.random() * (255 - lo) | 0;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  let texCache = null;
  function moonTexture(D) {                          // pun Mjesec bez faze (lice), D x D
    if (texCache && texCache.D === D) return texCache.c;
    const c = document.createElement('canvas'); c.width = c.height = D;
    const x = c.getContext('2d'), R = D / 2, u = D / 200;
    x.save();
    x.beginPath(); x.arc(R, R, R, 0, Math.PI * 2); x.clip();
    const g = x.createRadialGradient(D * 0.46, D * 0.44, 0, D * 0.46, D * 0.44, D * 0.62);
    g.addColorStop(0, '#d8d0c1'); g.addColorStop(0.7, '#cbc2b2'); g.addColorStop(1, '#b4aa99');   // albedo - svjetlo/sjenu daje renderMoon
    x.fillStyle = g; x.fillRect(0, 0, D, D);
    x.globalCompositeOperation = 'darken';     // preklapanja mora se NE zbrajaju u tamnije mrlje
    // mora: mekane preklopljene površine (crtaju se PRIJE šuma, pa im šum razbije rubove)
    for (const [cx, cy, rx, ry, ang] of MARIA) {
      x.save(); x.translate(cx * u, cy * u); x.rotate(ang * Math.PI / 180); x.scale(rx * u, ry * u);
      const mg = x.createRadialGradient(0, 0, 0, 0, 0, 1.45);     // dugi mekani rub - bez vidljivog ovala
      mg.addColorStop(0, 'rgba(92,82,70,0.85)'); mg.addColorStop(0.45, 'rgba(92,82,70,0.7)'); mg.addColorStop(0.8, 'rgba(92,82,70,0.25)'); mg.addColorStop(1, 'rgba(92,82,70,0)');
      x.fillStyle = mg; x.beginPath(); x.arc(0, 0, 1.45, 0, Math.PI * 2); x.fill();
      x.restore();
    }
    // zrnata tekstura preko svega (multiply) - razbija rubove mora
    x.globalCompositeOperation = 'multiply';
    x.imageSmoothingEnabled = true;
    x.globalAlpha = 0.6; x.drawImage(noiseCanvas(9, 215), 0, 0, D, D);    // blage krupne mrlje (gorje) - mali kontrast, inače su pjege
    x.globalAlpha = 0.3; x.drawImage(noiseCanvas(40, 150), 0, 0, D, D);
    x.globalAlpha = 0.2; x.drawImage(noiseCanvas(140, 120), 0, 0, D, D);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    const tg = x.createRadialGradient(101 * u, 167 * u, 0, 101 * u, 167 * u, 6 * u);   // Tycho
    tg.addColorStop(0, 'rgba(239,237,243,0.5)'); tg.addColorStop(1, 'rgba(239,237,243,0)');
    x.fillStyle = tg; x.fillRect(0, 0, D, D);
    x.restore();
    texCache = { D, c };
    return c;
  }
  /* gotov Mjesec u fazi g: platno (D + 25 % ruba za sjaj sa svake strane), CSS ga razvuče na 150 %.
     Osvjetljenje se RAČUNA kao na kugli, piksel po piksel (jednom): normala točke na disku,
     smjer Sunca iz faze (k = (1 + cos i) / 2) i smjera osvijetljenog ruba, pa Lommel-Seeliger
     zakon (vrijedi za Mjesečevu površinu): I = 2·μ0 / (μ0 + μ). Zato je granica svjetla i
     tame mekana i postupna, uz nju je površina sve tamnija, a pun Mjesec ostaje jednoliko
     svijetao do ruba - kao pravi. (Prije: oštar rez maskom + plošan disk = „naljepnica".) */
  /* PRAVA FOTOGRAFIJA: NASA karta cijele površine Mjeseca (LRO, „CGI Moon Kit",
     NASA's Scientific Visualization Studio, svs.gsfc.nasa.gov/4720 - javno vlasništvo,
     NASA moli navođenje izvora). Ekvidistantna projekcija 1024×512: dužina -180..180
     slijeva nadesno (0 = sredina bliske strane), širina +90 gore. renderMoon je
     „omota" oko kugle: za svaku točku diska izračuna širinu/dužinu i uzme boju s karte.
     Ako se karta ne učita, ostaje Mjesec crtan kodom (moonTexture) - backup je i tag
     backup/halloween-mjesec-crtani. */
  const MOON_MAP = 'assets/halloween/moon-lroc-1k.jpg';
  let mapData = null, mapPromise = null;
  function loadMoonMap() {
    if (mapPromise) return mapPromise;
    return (mapPromise = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          // smanjena na 384×192 = mekša, manje detalja (puna oštrina je djelovala „previše" uz ostatak stranice)
          const c = document.createElement('canvas'); c.width = 384; c.height = 192;
          const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, 384, 192);
          mapData = { w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data };
        } catch (e) { mapData = null; }
        res();
      };
      im.onerror = () => res();
      im.src = MOON_MAP;
    }));
  }

  /* Crtanje je POSTUPNO (async): radi se u komadima od ~8 ms s predahom između, pa
     animacija loga koja se tada vrti ne zapne (u jednom komadu je blokiralo ~0,3 s).
     Jedan prolaz po pikselu: uzorak fotografije + osvjetljenje + maska svjetla. */
  const yieldFrame = () => new Promise(r => setTimeout(r, 0));
  async function renderMoon(D, g) {
    const P = Math.round(D * 0.25), W = D + 2 * P, R = D / 2;
    const face = document.createElement('canvas'); face.width = face.height = D;
    const fx = face.getContext('2d');
    const map = mapData;
    let img;
    if (map) img = fx.createImageData(D, D);
    else {                                            // bez fotografije: tekstura crtana kodom
      fx.translate(R, R); fx.rotate(g.faceDeg * Math.PI / 180); fx.drawImage(moonTexture(D), -R, -R);
      fx.setTransform(1, 0, 0, 1, 0, 0);
      img = fx.getImageData(0, 0, D, D);
    }
    const d = img.data, mask = fx.createImageData(D, D), m = mask.data;
    const fa = -g.faceDeg * Math.PI / 180, cf = Math.cos(fa), sf = Math.sin(fa);
    // smjer Sunca u koordinatama ekrana (x desno, y dolje, z prema gledatelju)
    const ph = Math.acos(Math.max(-1, Math.min(1, 2 * g.k - 1)));   // fazni kut (0 = pun Mjesec)
    const L = g.limbDeg * Math.PI / 180;
    const sx = Math.sin(ph) * Math.cos(L), sy = Math.sin(ph) * Math.sin(L), sz = Math.cos(ph);
    const EARTH = 0.025;                              // Zemljin odsjaj na tamnom dijelu - jedva (vlasnik: tamnije)
    const TINT = [1, 0.97, 0.9];                      // blago topla boja kosti
    let until = performance.now() + 8;
    for (let y = 0, k = 0; y < D; y++) {
      const ny = (y + 0.5 - R) / R;
      for (let x = 0; x < D; x++, k += 4) {
        const nx = (x + 0.5 - R) / R, r2 = nx * nx + ny * ny;
        if (r2 >= 1) { d[k + 3] = 0; m[k + 3] = 0; continue; }
        const nz = Math.sqrt(1 - r2);
        if (map) {                                    // NASA karta omotana oko kugle (bilinearno)
          const px = nx * cf - ny * sf, py = nx * sf + ny * cf;
          const lat = Math.asin(Math.max(-1, Math.min(1, -py))), lon = Math.atan2(px, nz);
          const mw = map.w, mh = map.h, md = map.d;
          let u = (lon / (2 * Math.PI) + 0.5) * mw - 0.5, v = (0.5 - lat / Math.PI) * mh - 0.5;
          if (u < 0) u += mw; if (v < 0) v = 0; if (v > mh - 1.001) v = mh - 1.001;
          const x0 = u | 0, y0 = v | 0, x1 = (x0 + 1) % mw, ax = u - x0, ay = v - y0;
          const i00 = (y0 * mw + x0) * 4, i10 = (y0 * mw + x1) * 4, i01 = ((y0 + 1) * mw + x0) * 4, i11 = ((y0 + 1) * mw + x1) * 4;
          for (let ch = 0; ch < 3; ch++) {
            const p = md[i00 + ch] + (md[i10 + ch] - md[i00 + ch]) * ax;
            const q = md[i01 + ch] + (md[i11 + ch] - md[i01 + ch]) * ax;
            const val = Math.max(0, Math.min(1, ((p + (q - p) * ay) / 255 - 0.55) * 0.95 + 0.55));   // blag kontrast
            d[k + ch] = val * 255 * TINT[ch];
          }
        }
        const edge = Math.min(1, (1 - Math.sqrt(r2)) * R * 1.2);     // zaglađen rub diska
        // hrapava granica: svjetlina teksture malo pomakne granicu (planine/krateri uz terminator)
        const tl = (d[k] + d[k + 1] + d[k + 2]) / 765;
        const mu0 = nx * sx + ny * sy + nz * sz + (tl - 0.72) * 0.07;
        let lit = 0;
        if (mu0 > -0.1) {
          const m0 = Math.max(mu0, 0);
          // Lommel-Seeliger (pravi Mjesec) + malo Lamberta = postupno tamnjenje prema granici
          lit = Math.min(1.1, 0.75 * (2 * m0 / (m0 + nz + 1e-4)) + 0.25 * m0);
          const t = Math.min(1, Math.max(0, (mu0 + 0.1) / 0.4));    // široki mekani prijelaz
          lit *= t * t * (3 - 2 * t);
        }
        const shade = EARTH + (1 - EARTH) * lit * 0.95;
        d[k] *= shade; d[k + 1] *= shade; d[k + 2] *= shade; d[k + 3] = 255 * edge;
        m[k] = m[k + 1] = m[k + 2] = 255; m[k + 3] = 255 * Math.min(1, lit) * edge;
      }
      if (performance.now() > until) { await yieldFrame(); until = performance.now() + 8; }
    }
    fx.putImageData(img, 0, 0);
    // sjaj SAMO od osvijetljenog dijela: sjena maske, računana na 1/4 veličine (16× manje posla) pa povećana
    const q = 4, gW = Math.ceil(W / q), gD = Math.ceil(D / q), gP = Math.round(P / q);
    const ms = document.createElement('canvas'); ms.width = ms.height = gD;
    const mx = ms.getContext('2d'); mx.putImageData(mask, 0, 0);          // (puna maska; crta se smanjeno niže)
    const mfull = document.createElement('canvas'); mfull.width = mfull.height = D; mfull.getContext('2d').putImageData(mask, 0, 0);
    mx.clearRect(0, 0, gD, gD); mx.drawImage(mfull, 0, 0, gD, gD);
    const gc = document.createElement('canvas'); gc.width = gc.height = gW;
    const gx = gc.getContext('2d'), OFF = gW * 3;
    gx.shadowOffsetX = OFF;
    gx.shadowColor = 'rgba(215,200,175,0.35)'; gx.shadowBlur = gD * 0.18; gx.drawImage(ms, gP - OFF, gP);
    gx.shadowColor = 'rgba(225,215,195,0.4)';  gx.shadowBlur = gD * 0.045; gx.drawImage(ms, gP - OFF, gP);
    await yieldFrame();
    const c = document.createElement('canvas'); c.width = c.height = W;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(gc, 0, 0, W, W);
    x.drawImage(face, P, P);
    return c;
  }
  // krvava verzija = preobojena obična (ne crta se ponovno), također postupno
  async function bloodFrom(src) {
    const W = src.width, c = document.createElement('canvas'); c.width = c.height = W;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0);
    const id = x.getImageData(0, 0, W, W), q = id.data, row = W * 4;
    let until = performance.now() + 8;
    for (let n = 0; n < q.length; n += 4) {
      const l = q[n] * 0.3 + q[n + 1] * 0.59 + q[n + 2] * 0.11;
      q[n] = l * 0.42; q[n + 1] = l * 0.035; q[n + 2] = l * 0.045;
      if (n % row === 0 && performance.now() > until) { await yieldFrame(); until = performance.now() + 8; }
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  // promjer Mjeseca u CSS px (isto kao .hw-moon-geo) - kad element još nema mjeru
  function moonCssDiam() {
    const vw = scrW(), vh = scrH();
    return vw <= 768 ? Math.min(vw * 0.92, 440) : Math.min(Math.min(vw, vh) * 0.58, 560);
  }
  /* Nacrtani Mjeseci se pamte (ključ = veličina + faza + varijanta): pozadina, ekran
     učitavanja i uvod traže ISTI Mjesec, a crtanje fotografije traje (na iPhoneu stotine
     ms) - drugi put se samo kopira, pa u završnom bljesku ništa ne zapne. */
  const moonCache = new Map();
  function moonKey(D, g, blood) {
    return [D, g.k.toFixed(3), g.limbDeg.toFixed(1), g.faceDeg.toFixed(1), blood ? 1 : 0, mapData ? 1 : 0].join('|');
  }
  function moonSize() {
    // strop 900 px: Mjesec je prigušen, veća rezolucija se ne vidi, a crtanje je sporije
    return Math.max(200, Math.min(900, Math.round(moonCssDiam() * Math.min(window.devicePixelRatio || 1, 2))));
  }
  async function moonCanvas(g, blood) {
    const D = moonSize(), key = moonKey(D, g, blood);
    let src = moonCache.get(key);
    if (src) return src;
    if (moonCache.size > 6) moonCache.clear();
    if (blood) src = await bloodFrom(await moonCanvas(g, false));
    else src = await renderMoon(D, g);
    moonCache.set(key, src);
    return src;
  }
  function putMoon(el, src, g) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    c.className = 'hw-moon-cv';
    const old = el.querySelector('canvas');
    if (old) old.replaceWith(c); else el.appendChild(c);
    el.classList.add('hw-moon-ready');
    window.AJHalloween.moon = g;   // za provjeru u konzoli
  }
  // ako je Mjesec već nacrtan (memorija) - umetne se ODMAH, sinkrono (završni bljesak); inače postupno
  function paintMoon(el, g, blood) {
    const src = moonCache.get(moonKey(moonSize(), g, blood));
    if (src) { putMoon(el, src, g); return Promise.resolve(); }
    return moonCanvas(g, blood).then(c => putMoon(el, c, g));
  }
  // izračun vrijedi 10 min (uvod, ekran učitavanja i pozadina tako dobiju ISTI Mjesec = jedno crtanje)
  let moonNow = null, moonNowT = 0;
  function currentMoon() {
    if (moonNow && Date.now() - moonNowT < 10 * 60 * 1000) return moonNow;
    if (!window.Astronomy) return { k: 1, limbDeg: 0, faceDeg: 0 };
    try { moonNow = moonGeometry(new Date()); moonNowT = Date.now(); return moonNow; } catch (e) { return { k: 1, limbDeg: 0, faceDeg: 0 }; }
  }
  function drawMoonWhenReady(el, blood) {
    const draw = () => paintMoon(el, currentMoon(), blood);
    const lib = window.Astronomy ? Promise.resolve() :
      (typeof loadScript === 'function') ? loadScript('js/lib/astronomy.browser.min.js') : Promise.reject();
    Promise.all([lib.catch(() => {}), within(loadMoonMap(), 5000)]).then(draw, draw);   // bez biblioteke: pun Mjesec
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
    ld.prepend(m);
    drawMoonWhenReady(m);
  }

  let bgMoonEl = null;
  function paintBgMoon() { if (bgMoonEl && !bgMoonEl.querySelector('canvas')) paintMoon(bgMoonEl, currentMoon(), false); }

  // Magla pri dnu + Mjesec u pozadini (css/halloween.css) - umjesto zviježđa
  function initScenery() {
    const sky = document.getElementById('sky-bg');
    const moon = document.createElement('div');
    moon.className = 'hw-moon hw-moon-geo';
    moon.setAttribute('aria-hidden', 'true');
    const fog = document.createElement('div');
    fog.className = 'hw-fog';
    fog.setAttribute('aria-hidden', 'true');
    if (sky && sky.parentNode) { sky.after(fog); sky.after(moon); }
    else { document.body.prepend(fog); document.body.prepend(moon); }

    bgMoonEl = moon;
    // s uvodom: NE crtati sad (teško crtanje bi zapelo usred animacije loga) - nacrta ga završni bljesak iz memorije
    if (!wantIntro) drawMoonWhenReady(moon);
    // faza i nagib se mijenjaju - osvježi svakih 30 min, kad je preglednik slobodan
    const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
    setInterval(() => { if (window.Astronomy) idle(() => paintMoon(moon, currentMoon())); }, 30 * 60 * 1000);
  }

  /* Lice Jack-o'-lanterna iza hero loga - naglo se upali u završnom bljesku
     ispisa „Potpisa" (logo.js šalje 'aj:hero-flash') i polako izblijedi.
     Obris je PRECRTAN s poslane slike (192x120 px, svijetli pikseli očitani po
     redovima): koordinate su u pikselima te slike, lice je simetrično oko x = 96
     pa je desna polovica zrcaljena. Gornji zubi vise, donji strše. */
  function jackSvg() {
    const eye = 'M58 35 Q78 52 91 56 Q86 64 72 65.5 Q66 66 63 62 Q51 50 58 35 Z';
    const up = [[59, 79], [62, 71], [73, 84], [77, 78], [86, 90], [91, 80], [96, 90]];
    const lo = [[68, 93], [74, 103], [78, 96], [84, 108], [91, 101], [96, 110]];
    const mir = pts => pts.slice(0, -1).reverse().map(([x, y]) => [192 - x, y]);
    const L = pts => pts.map(p => 'L' + p.join(' ')).join(' ');
    const mouth = 'M44 64 Q53 70 ' + up[0].join(' ') + ' ' + L([...up.slice(1), ...mir(up)]) +
      ' Q139 70 148 64 Q143 90 130 101 ' + L([...mir(lo).reverse(), ...lo.slice().reverse()]) +
      ' L62 101 Q49 90 44 64 Z';
    return '<svg viewBox="38 28 116 88" xmlns="http://www.w3.org/2000/svg">' +
      `<path d="${eye}"/><path d="${eye}" transform="matrix(-1 0 0 1 192 0)"/>` +
      `<path d="${mouth}"/></svg>`;
  }
  function initJack() {
    const art = document.getElementById('hero-logo');
    const h1 = art && art.parentNode;
    if (!h1) return;
    const face = document.createElement('span');
    // uz krvavi hero (31. 10. i 1. 11.) lice je CRVENO, u boji krvi koja kaplje s loga
    face.className = window.AJHalloween && window.AJHalloween.krvniHero ? 'hw-jack hw-jack-krv' : 'hw-jack';
    face.setAttribute('aria-hidden', 'true');
    face.innerHTML = jackSvg();
    h1.insertBefore(face, art);
    // bljesak cijele stranice u istom trenutku kad se upali lice (ista vremenska crta, v. hwPageFlash)
    const flash = document.createElement('div');
    flash.className = 'hw-pageflash';
    flash.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flash);
    art.addEventListener('aj:hero-flash', function () {
      face.classList.remove('hw-jack-on');
      flash.classList.remove('hw-pageflash-on');
      void face.offsetWidth;                            // ponovno pokretanje animacije
      face.classList.add('hw-jack-on');
      flash.classList.add('hw-pageflash-on');
    });
    face.addEventListener('animationend', () => face.classList.remove('hw-jack-on'));
    flash.addEventListener('animationend', () => flash.classList.remove('hw-pageflash-on'));
  }

  /* ==== PAUKOVE MREŽE + PAUK (vlasnik) ====
     Dvije mreže (gore desno, dolje lijevo) koje RASTU kroz Halloween tjedan (dan 0 = 25. 10. …
     dan 7 = 1. 11.). Mali, jedva vidljivi pauk isplete današnji dio dok je posjetitelj na
     stranici: prvo gornju mrežu, pa uz zid (izvan ekrana) dođe do donje.
     GRAĐA I REDOSLIJED KAO PRAVI PAUK U KUTU (vlasnik):
       1. prvi dan prvo RAVNA POPREČNA NIT preko kuta, od gornjeg do bočnog ruba ekrana;
          njezina SREDINA je središte mreže;
       2. iz središta zrake do rubova ekrana (svaka usidrena na rubu): pauk je isplete, vrati se
          po njoj u središte i NAPNE je - središte se pomakne prema sidru, a cijela mreža se
          elastično prilagodi (poprečna nit postane napeti „V", lukovi se malo povuku). Prva zraka
          ide prema kutu i vuče najjače; i kasnijih dana svaka nova zraka malo povuče;
       3. lukovi oko središta, od vanjskog prema unutra, smjer se izmjenjuje (lovna spirala);
          s luka na luk prelazi po poprečnoj niti.
     ZRAKE SE DODAJU I KASNIJIH DANA (prvi dan poprečna + 3, pa po 1-3 dnevno), a svaki dan se
     dopletu novi lukovi prema van; luk spaja samo zrake koje su postojale TOG dana.
     ELASTIČNOST: svaka točka luka je zadana kao UDIO duljine svoje zrake (0 = središte, 1 = sidro),
     ne kao fiksna koordinata - pa kad se središte pomakne, mreža se prirodno razvuče. Položaj
     središta za svaki dan je određen (svi povlaci do tog dana), pa je mreža svaki dan ista za sve.
     PAUK HODA SAMO PO NITIMA KOJE VEĆ POSTOJE i UVIJEK ISTOM BRZINOM (`BRZINA` px/s).
     - BEZ ŠTEKANJA: JS + rAF; u kadru se mijenja jedna nit (stroke-dashoffset) i transform pauka.
       Samo dok traje napinjanje (~1,5 s) preslože se sve niti te mreže. U skrivenoj kartici rAF
       stoji pa pletenje stane i nastavi gdje je stalo.
     - Sve je position:fixed, pa se plete i dok posjetitelj mijenja stranice.
     - Napredak se NE pamti (nema pohrane): nakon osvježavanja današnji dio kreće ispočetka.
     - Slučajni brojevi se uzimaju za SVAKU nit, i nevidljivu (inače se mreža mijenja iz dana u dan).
     Pregled: `?halloween&mreza=0..7`. prefers-reduced-motion: mreže odmah gotove, bez pauka. */
  function webDay() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.has('mreza')) return Math.max(0, Math.min(7, parseInt(q.get('mreza'), 10) || 0));
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zagreb', month: 'numeric', day: 'numeric' })
        .formatToParts(new Date());
      const m = +parts.find(p => p.type === 'month').value;
      const d = +parts.find(p => p.type === 'day').value;
      if (m === 10 && d >= 25) return d - 25;
      if (m === 11 && d === 1) return 7;
    } catch (e) {}
    return 7;                                             // pregled izvan tjedna: cijela mreža
  }
  // Jedna mreža. Gradi se uvijek u kutu GORE DESNO viewBoxa 0 0 400 400 (gornji rub y=0, desni x=400);
  // donja se u CSS-u zakrene za 180°.
  function buildWeb(o, DAN) {
    let sj = o.sjeme;
    const rnd = () => { sj |= 0; sj = sj + 0x6D2B79F5 | 0; let t = Math.imul(sj ^ sj >>> 15, 1 | sj); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const f = n => n.toFixed(1), M = o.mjera;
    const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    /* SIDRA na rubu ekrana zadana su jednim brojem s: s < 0 = gornji rub (|s| lijevo od kuta),
       s > 0 = bočni rub (s ispod kuta). Kut je s = 0. Redoslijed zraka = redoslijed po s. */
    const pS = s => s < 0 ? [400 + s, 0] : [400, s];
    // poprečna nit prvog dana (namjerno manja - mreža kroz tjedan naraste); sredina = početno središte
    /* KARAKTER mreže (vlasnik: gornja i donja su bile „previše slične"): o.uzA/o.uzB = koliko se
       mreža proteže uz jedan/drugi rub, o.razmak = razmak lukova, o.objesi = koliko se lukovi objese,
       o.vuce = koliko prva zraka povuče središte prema kutu. */
    const uzA = o.uzA || 1, uzB = o.uzB || 1;
    const a0 = (175 + rnd() * 30) * M * uzA, b0 = (165 + rnd() * 30) * M * uzB;
    const aMax = (540 + rnd() * 40) * M * uzA, bMax = (500 + rnd() * 40) * M * uzB;   // dokle se mreža raširi zadnji dan
    const sid = [{ s: -a0, dan: 0, uloga: 'T' }, { s: b0, dan: 0, uloga: 'R' }];
    [0.22, 0.5, 0.78].forEach(fr => {                     // prvi dan još tri zrake unutar poprečne
      let s = -a0 + (a0 + b0) * (fr + (rnd() - .5) * 0.12);
      if (Math.abs(s) < 10) s = s < 0 ? -10 : 10;
      sid.push({ s, dan: 0 });
    });
    /* SVAKI SLJEDEĆI DAN (vlasnik: mreža je „organski proizvod koji se svaki dan mijenja i
       proširuje"): dvije nove KRAJNJE zrake usidrene sve dalje uz gornji i bočni rub (mreža se
       širi), i često još jedna u najveću prazninu između postojećih. Svaka se napne i povuče sve. */
    for (let d = 1; d <= 7; d++) {
      const g = Math.pow(d / 7, 0.85);
      sid.push({ s: -(a0 + (aMax - a0) * g) + (rnd() - .5) * 14 * M, dan: d });
      sid.push({ s: b0 + (bMax - b0) * g + (rnd() - .5) * 14 * M, dan: d });
      const ima = rnd() < 0.5, pomak = (rnd() - .5) * 0.3;
      if (ima) {
        const ss = sid.filter(x => x.dan <= d).map(x => x.s).sort((p, q) => p - q);
        let gi = 0;
        for (let n = 1; n + 1 < ss.length; n++) if (ss[n + 1] - ss[n] > ss[gi + 1] - ss[gi]) gi = n;
        let s = (ss[gi] + ss[gi + 1]) / 2 + pomak * (ss[gi + 1] - ss[gi]);
        if (Math.abs(s) < 10) s = s < 0 ? -10 : 10;
        sid.push({ s, dan: d });
      }
    }
    sid.forEach((x, n) => { x.red = n; });                // redoslijed nastajanja
    sid.sort((p, q) => p.s - q.s);
    const E = sid.map(x => pS(x.s)), dan = sid.map(x => x.dan), NZ = E.length;
    const iT = sid.findIndex(x => x.uloga === 'T'), iR = sid.findIndex(x => x.uloga === 'R');
    const T = E[iT], R = E[iR], H0 = lerp(T, R, 0.5);
    const unutra = i => i !== iT && i !== iR;
    let iK = -1;                                          // prvog dana zraka najbliža kutu - prva i vuče najjače
    sid.forEach((x, i) => { if (x.dan === 0 && unutra(i) && (iK < 0 || Math.abs(x.s) < Math.abs(sid[iK].s))) iK = i; });
    const redZ = E.map((e, i) => i).filter(unutra)
      .sort((a, b) => dan[a] - dan[b] || (a === iK ? -1 : b === iK ? 1 : sid[a].red - sid[b].red));
    const skup = d => E.map((e, i) => i).filter(i => dan[i] <= d);
    const kraj = d => { const s = skup(d); return [s[0], s[s.length - 1]]; };   // krajnje zrake tog dana
    /* KUT U SREDIŠTU NE SMIJE BITI OŠTAR (vlasnik): središte mora ostati blizu crte između krajnjih
       sidara - onda krajnje zrake zatvaraju širok kut, a ne oštar „V". Ali POSTUPNO, kroz tjedan:
       - prvi dan prva zraka (prema kutu) vuče JAKO (0,24) - mreža je tada napeti „V" (vlasnik:
         „neka ga prvi dan povuče kako je i bio");
       - nove KRAJNJE zrake kasnijih dana ga POSTUPNO izvlače prema van (svaka 0,16 puta prema točki
         malo unutar crte između krajnjih sidara tog dana), pa se kut iz dana u dan otvara;
       - ostale zrake (u prazninama) vuku malo, prema svom sidru. */
    const Hnakon = [];                                    // središte nakon napinjanja zrake (po redu)
    let h = H0;
    redZ.forEach(i => {
      const d = dan[i], [lo, hi] = kraj(d);
      if (d > 0 && (i === lo || i === hi)) h = lerp(h, lerp(lerp(E[lo], E[hi], 0.5), [400, 0], 0.1), 0.16);
      else h = lerp(h, E[i], i === iK ? (o.vuce || 0.24) : 0.03);
      Hnakon.push(h);
    });
    const Hdana = d => { let x = H0; redZ.forEach((i, n) => { if (dan[i] <= d) x = Hnakon[n]; }); return x; };
    // lukovi: radijusi oko središta; koji dan koji luk - ograničeno da luk stane unutar krajnjih zraka
    const PLAN = [55, 100, 150, 205, 260, 320, 380, 440];
    const RD = PLAN.map((r, d) => { const [lo, hi] = kraj(d), Hd = Hdana(d); return Math.min(r * M, 0.92 * Math.min(dist(Hd, E[lo]), dist(Hd, E[hi]))); });
    const krugovi = [], rb = [];
    for (let r = 24 + rnd() * 8, k = 0;   // slobodna zona oko središta (kao prava mreža)
         r < Math.max(...RD) + 30; k++) {
      const pr = krugovi[k - 1];
      rb.push(r);
      krugovi.push(E.map((e, i) => {
        const v = r * (1 + (rnd() - .5) * 0.14) + (rnd() - .5) * 2;
        return pr ? Math.max(v, pr[i] + 4) : v;
      }));
      r += (11 + k * 0.8 + rnd() * 8) * (o.razmak || 1);   // razmak lukova (manji je bio pregust - vlasnik)
    }
    const par = krugovi.map(() => E.map(() => ({ s: 1 - (0.05 + rnd() * 0.13) * (o.objesi || 1), m: 0.36 + rnd() * 0.28 })));
    const K = [];
    RD.forEach((Rd, d) => { let k = 0; while (k + 1 < krugovi.length && rb[k + 1] * 1.08 <= Rd) k++; K.push(Math.max(k, d ? K[d - 1] : 0)); });
    const kDo = d => d < 0 ? -1 : K[d];
    const danLuka = k => K.findIndex(x => k <= x);
    // točka luka = UDIO duljine zrake, mjeren u središtu tog dana (elastično: kasnije se razvuče s mrežom)
    /* Luk NIKAD ne prelazi rub ekrana: na kratkim zrakama (prema kutu) se zbije uz zid - udio raste
       do 0,7 normalno, dalje se sve više sabija i ostaje < 0,98 (pa točke ostanu različite). Prije su
       lukovi išli iza ruba i pauk je pola vremena plelo izvan ekrana - izgledalo je kao da je nestao. */
    const zbij = u => u <= 0.7 ? u : 0.7 + 0.28 * (1 - Math.exp(-(u - 0.7) / 0.28));
    /* GRAVITACIJA: kod pravih okomitih mreža je dio ispod središta veći - lukovi prema dolje sežu
       dalje. „Dolje" na ekranu je u donjoj (zakrenutoj) mreži -y u njezinim koordinatama. */
    const dolje = o.cls ? -1 : 1;
    const grav = (i, Hd) => { const L = dist(Hd, E[i]); return 1 + 0.35 * Math.max(0, (E[i][1] - Hd[1]) / L * dolje); };
    const udio = krugovi.map((kr, k) => { const Hd = Hdana(Math.max(0, danLuka(k))); return kr.map((r, i) => zbij(r * grav(i, Hd) / dist(Hd, E[i]))); });
    /* KOJE ZRAKE LUK SPAJA: SVE zrake toga dana (od krajnje do krajnje; preko otvorene strane NE).
       Kad pauk doda novu zraku, stari lukovi se na nju PRIČVRSTE (zraka u praznini, v. 'spoji') ili
       se do nje PRODUŽE (nova krajnja zraka prema sredini ekrana) - vlasnik: „ne popunjava lukove
       kod novih zraka". */
    const spaja = (k, d) => skup(d);
    const dijelovi = lista => {                           // susjedne zrake [a, b]
      const out = [];
      for (let n = 0; n + 1 < lista.length; n++) out.push([lista[n], lista[n + 1]]);
      return out;
    };
    /* ŠTETE I POPRAVCI (vlasnik: prava mreža nije savršena - „nekad se dogode rupe, uleti mušica,
       pauk popravlja, pa ne izgleda više tako simetrično"). Svaki dan (od drugog) se na STARIJEM
       dijelu mreže pokida 2-3 niti luka; dio pauk isti dan popravi (nova nit, ali drugačijeg progiba
       i s pregibom), ostale ostanu rupe. Neke dane u mrežu uleti MUŠICA: pokida nit, koprca se,
       pauk dođe, zamota je i popravi nit. Sve je određeno danom (ista mreža za sve), a šteta se bira
       samo na nitima između zraka između kojih NIKAD ne dođe nova zraka (inače bi je 'spoji' rascijepio). */
    const stete = {};                                     // 'k:a:b' -> { dan, popravi, muha }
    for (let d = 1; d <= 7; d++) {
      let sj2 = (o.sjeme ^ Math.imul(d + 11, 0x2545F491)) | 0;
      const r2 = () => { sj2 = sj2 + 0x6D2B79F5 | 0; let t = Math.imul(sj2 ^ sj2 >>> 15, 1 | sj2); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const kand = [], zr = skup(d - 1);
      for (let k = 1; k <= kDo(d - 1); k++)               // ne najunutarnji luk (preblizu središtu)
        for (let n = 0; n + 1 < zr.length; n++)
          if (zr[n + 1] === zr[n] + 1 && !stete[k + ':' + zr[n] + ':' + zr[n + 1]]) kand.push(k + ':' + zr[n] + ':' + zr[n + 1]);
      const uzmi = () => kand.splice(Math.floor(r2() * kand.length), 1)[0];
      const nR = 2 + (r2() < 0.5 ? 1 : 0);
      r2();                                               // (bivši izbor mušice - slijed brojeva ostaje isti)
      for (let j = 0; j < nR && kand.length; j++) { const key = uzmi(); stete[key] = { dan: d, popravi: r2() < 0.55 }; }
    }
    const stanje = {};                                    // trenutni izgled oštećenih niti: 'rupa' | 'pop'
    Object.entries(stete).forEach(([key, x]) => {
      if (x.dan < DAN) stanje[key] = x.popravi ? 'pop' : 'rupa';
      else if (x.dan === DAN && !x.muha) stanje[key] = 'rupa';   // pokidala se noćas; mušica tek uleti
    });

    // ---- oblik ovisi samo o položaju središta Hc ----
    const pt = (i, t, Hc) => lerp(Hc, E[i], t);           // točka na zraci i, udio t
    const dRavna = (A, B) => `M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`;
    /* LUK VISI PO GRAVITACIJI (vlasnik): kontrolna točka je ispod tetive na EKRANU (u donjoj,
       zakrenutoj mreži je to -y), ne prema središtu mreže kao prije. Lukovi iznad središta se zato
       objese prema njemu, a oni ispod prema van; skoro okomita nit se gotovo ne objesi.
       Koliko visi: (1 - p.s) · duljina tetive, nesimetrično (p.m). */
    const objesi = (a, b, p, t, jace) => { const m = lerp(a, b, t), L = dist(a, b); return [m[0], m[1] + dolje * L * (1 - p.s) * (jace || 1)]; };
    const dLuk = (k, i, j, Hc) => {
      const a = pt(i, udio[k][i], Hc), b = pt(j, udio[k][j], Hc), p = par[k][Math.min(i, j)];
      const q = objesi(a, b, p, i < j ? p.m : 1 - p.m);
      return `M${f(a[0])} ${f(a[1])}Q${f(q[0])} ${f(q[1])},${f(b[0])} ${f(b[1])}`;
    };
    const dRupa = (k, i, j, Hc) => {                     // pokidana nit: dva komadića vise s dviju zraka
      const a = pt(i, udio[k][i], Hc), b = pt(j, udio[k][j], Hc), L = dist(a, b), g = [0, dolje * L * 0.2];
      const s1 = lerp(a, b, 0.26), s2 = lerp(b, a, 0.31);
      return `M${f(a[0])} ${f(a[1])}Q${f(s1[0])} ${f(s1[1])},${f(s1[0] + g[0])} ${f(s1[1] + g[1])}` +
        `M${f(b[0])} ${f(b[1])}Q${f(s2[0])} ${f(s2[1])},${f(s2[0] + g[0] * 0.7)} ${f(s2[1] + g[1] * 0.7)}`;
    };
    const dPop = (k, i, j, Hc) => {                       // popravljena nit: drugačiji progib i pregib u sredini
      const a = pt(i, udio[k][i], Hc), b = pt(j, udio[k][j], Hc), p = par[k][Math.min(i, j)];
      const c = objesi(a, b, p, i < j ? 0.42 : 0.58, 1.6);  // popravak visi jače i ima pregib
      const q1 = objesi(a, c, p, 0.5, 0.6), q2 = objesi(c, b, p, 0.5, 0.6);
      return `M${f(a[0])} ${f(a[1])}Q${f(q1[0])} ${f(q1[1])},${f(c[0])} ${f(c[1])}Q${f(q2[0])} ${f(q2[1])},${f(b[0])} ${f(b[1])}`;
    };
    const sredinaNiti = (k, i, j, Hc) => {                 // točka na sredini zdrave niti (tu zapne mušica)
      const a = pt(i, udio[k][i], Hc), b = pt(j, udio[k][j], Hc), p = par[k][Math.min(i, j)];
      const q = objesi(a, b, p, p.m);
      return [0.25 * a[0] + 0.5 * q[0] + 0.25 * b[0], 0.25 * a[1] + 0.5 * q[1] + 0.25 * b[1]];
    };
    const most = { gen: Hc => `M${f(T[0])} ${f(T[1])}L${f(Hc[0])} ${f(Hc[1])}L${f(R[0])} ${f(R[1])}`, z: 1, novo: DAN === 0 };
    if (most.novo) most.gen0 = () => dRavna(T, R);        // dok je još ravna (prije prvog napinjanja)
    const zrNit = [];
    E.forEach((e, i) => { if (unutra(i) && dan[i] <= DAN) zrNit[i] = { gen: Hc => dRavna(Hc, e), z: 1, novo: dan[i] === DAN }; });
    const nitLuka = (k, a, b, novo) => ({ gen: Hc => { const st = stanje[k + ':' + a + ':' + b]; return st === 'rupa' ? dRupa(k, a, b, Hc) : st === 'pop' ? dPop(k, a, b, Hc) : dLuk(k, a, b, Hc); }, novo });
    // lukovi: jučerašnji spajaju zrake do jučer (danas ih pauk pričvrsti na nove), današnji sve današnje
    const prsten = {};
    for (let k = 0; k <= kDo(DAN); k++) {
      const star = k <= kDo(DAN - 1), lista = spaja(k, star ? DAN - 1 : DAN);
      prsten[k] = { lista, niti: {} };
      dijelovi(lista).forEach(([a, b]) => { prsten[k].niti[a + ':' + b] = nitLuka(k, a, b, !star); });
    }

    /* Put pauka danas. Točke su ZADANE SIMBOLIČKI (zraka + udio, ili fiksna točka), jer se
       središte usput pomiče - položaj se računa tek u trenutku hoda. */
    const put = [];
    let Hc = DAN === 0 ? H0 : Hdana(DAN - 1);
    const Hpoc = Hc;
    const rj = (ref, H) => ref.xy ? ref.xy : pt(ref.i, ref.t, H);
    const hoda = (A, B) => { const l = dist(rj(A, Hc), rj(B, Hc)); if (l > 0.3) put.push({ tip: 'hoda', A, B, len: l }); };
    const plete = (nit, obrnuto) => put.push({ tip: 'plete', nit, len: 0, obrnuto });
    const van = e => ({ xy: e[1] === 0 ? [e[0], -40] : [440, e[1]] });   // iza sidra, s ekrana (uz zid)
    const S = { i: iT, t: 0 };                            // središte (bilo koja zraka, udio 0)
    let gdje;
    if (DAN === 0) {
      hoda(van(T), { xy: T });
      plete(most);                                        // prvo ravna poprečna nit
      gdje = { i: iR, t: 1 };
    } else {
      const ulaz = kraj(DAN - 1)[0];                      // dolazi uz zid do krajnje zrake od jučer
      hoda(van(E[ulaz]), { xy: E[ulaz] });
      gdje = { i: ulaz, t: 1 };
    }
    const spojiFn = (k, m) => H => {                      // luk k pričvrsti na novu zraku m
      const p = prsten[k];
      Object.values(p.niti).forEach(n => n.el && n.el.remove());
      p.lista = [...p.lista, m].sort((x, y) => x - y);
      p.niti = {};
      dijelovi(p.lista).forEach(([a, b]) => {
        const n = p.niti[a + ':' + b] = nitLuka(k, a, b, false);
        n.el = noviEl(n); n.el.setAttribute('d', n.gen(H));
      });
    };
    redZ.forEach((i, n) => {
      if (dan[i] !== DAN) return;
      hoda(gdje, S);                                      // po zraci do središta
      plete(zrNit[i]);
      /* NAPINJE S RUBA (vlasnik): pauk ostane uz sidro na rubu ekrana i povuče nit PREMA SEBI -
         središte mreže dođe prema njemu. Tek onda se po napetoj zraci vrati u središte. */
      const Hn = Hnakon[n];
      put.push({ tip: 'napni', H1: Hc, H2: Hn, kod: E[i], u: [(E[i][0] - Hc[0]) / dist(Hc, E[i]), (E[i][1] - Hc[1]) / dist(Hc, E[i])], len: 0 });
      Hc = Hn;
      let od = { i, t: 1 };
      const stari = Object.keys(prsten).map(Number).filter(k => k <= kDo(DAN - 1)).sort((a, b) => b - a);   // vanjski prvi
      const krajnja = i < prsten[stari[0]]?.lista[0] || i > prsten[stari[0]]?.lista.slice(-1)[0];
      if (stari.length && krajnja) {
        /* NOVA KRAJNJA ZRAKA: stari lukovi se do nje PRODUŽE. Pauk ide cik-cak, luk po luk od vanjskog
           prema unutra: po novoj zraci do luka, isplete komad do dosadašnje krajnje zrake, po njoj
           do sljedećeg luka, isplete natrag do nove zrake… (hoda samo po nitima koje postoje). */
        let na = i;
        stari.forEach(k => {
          const p = prsten[k], n2 = i < p.lista[0] ? p.lista[0] : p.lista[p.lista.length - 1];
          const a = Math.min(i, n2), b = Math.max(i, n2), nit = p.niti[a + ':' + b] = nitLuka(k, a, b, true);
          p.lista = [...p.lista, i].sort((x, y) => x - y);
          hoda(od, { i: na, t: udio[k][na] });
          plete(nit, na !== a);                           // obrnuto: od b prema a
          na = na === i ? n2 : i;
          od = { i: na, t: udio[k][na] };
        });
      } else {
        /* ZRAKA U PRAZNINI: na povratku u središte PRIČVRSTI stare lukove koje presijeca - kod
           svakog zastane i spoji ga (luk se podijeli na dva dijela koji se sastaju na zraci). */
        stari.filter(k => udio[k][i] < 1).sort((a, b) => udio[b][i] - udio[a][i]).forEach(k => {
          const tu = { i, t: udio[k][i] };
          hoda(od, tu);
          put.push({ tip: 'spoji', at: tu, fn: spojiFn(k, i), len: 0 });
          od = tu;
        });
      }
      hoda(od, S);                                        // natrag po niti u središte
      gdje = S;
    });
    const danas = Object.entries(stete).filter(([, x]) => x.dan === DAN);
    const popravi = (key, k, a, b) => {                  // do rupe po zraci, popravi, natrag po drugoj zraci
      hoda(gdje, S); hoda(S, { i: a, t: udio[k][a] });
      put.push({ tip: 'popravak', key, len: dist(pt(a, udio[k][a], Hc), pt(b, udio[k][b], Hc)) * 1.15 });
      hoda({ i: b, t: udio[k][b] }, S); gdje = S;
    };
    // današnji lukovi: od vanjskog prema unutra, smjer se izmjenjuje; s luka na luk po krajnjoj zraci
    const [lo, hi] = kraj(DAN);
    let ide = lo;
    for (let k = kDo(DAN); k > kDo(DAN - 1); k--) {
      hoda(gdje, { i: ide, t: udio[k][ide] });
      const dio = dijelovi(prsten[k].lista), nit = ([a, b]) => prsten[k].niti[a + ':' + b];
      (ide === lo ? dio : dio.slice().reverse()).forEach(x => plete(nit(x), ide !== lo));   // obrnuto: od b prema a
      ide = ide === lo ? hi : lo;
      gdje = { i: ide, t: udio[k][ide] };
    }
    danas.filter(([, x]) => x.popravi).forEach(([key]) => { const [k, a, b] = key.split(':').map(Number); popravi(key, k, a, b); });   // noćne rupe
    if (o.zadnja) hoda(gdje, S);                          // posao za danas gotov: po zraci u središte i ondje ostane (vlasnik)
    else { hoda(gdje, { i: ide, t: 1 }); hoda({ xy: E[ide] }, van(E[ide])); }   // po krajnjoj zraci do zida, pa s ekrana

    // ---- SVG ----
    const web = document.createElement('div');
    web.className = 'hw-web' + (o.cls ? ' ' + o.cls : '');
    web.setAttribute('aria-hidden', 'true');
    web.innerHTML = '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"></svg>';
    document.body.appendChild(web);
    const svg = web.firstChild;
    function noviEl(n) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      if (n.z) el.classList.add('hw-web-z');
      if (n.novo) { el.classList.add('hw-web-n'); el.setAttribute('pathLength', '1'); }
      svg.appendChild(el);
      return el;
    }
    const sveNiti = () => [most, ...zrNit.filter(Boolean), ...Object.values(prsten).flatMap(p => Object.values(p.niti))];
    sveNiti().forEach(n => { n.el = noviEl(n); });
    let ravnaJos = most.novo;                             // poprečna je ravna do prvog napinjanja
    const oblikuj = H => sveNiti().forEach(n => n.el.setAttribute('d', n === most && ravnaJos ? n.gen0() : n.gen(H)));
    oblikuj(Hpoc);
    return {
      web, svg, put, Hpoc, oblikuj, rj, okrenuta: !!o.cls,
      // šteta/popravak u trenutku (pletiMreze): promijeni izgled niti i vrati njezin element
      postavi: (key, st, H) => {
        stanje[key] = st;
        const [k, a, b] = key.split(':').map(Number), n = prsten[k] && prsten[k].niti[a + ':' + b];
        if (n && n.el) n.el.setAttribute('d', n.gen(H));
        return n && n.el;
      },
      /* za mušicu nakon današnjeg posla: nasumičan ZDRAV luk na vidljivom dijelu (ne uz sam zid) */
      zaMuhu: () => {
        const kand = [];
        for (let k = 1; k <= kDo(DAN); k++) dijelovi(prsten[k].lista).forEach(([a, b]) => {
          if (!stanje[k + ':' + a + ':' + b] && udio[k][a] < 0.6 && udio[k][b] < 0.6) kand.push([k, a, b]);
        });
        if (!kand.length) return null;
        const [k, a, b] = kand[Math.floor(Math.random() * kand.length)];
        return { k, a, b, el: prsten[k].niti[a + ':' + b].el, t: 0.3 + Math.random() * 0.4, at: { i: a, t: udio[k][a] } };
      },
      krajnja: kraj(DAN)[0],                              // zraka po kojoj pauk dolazi/odlazi uz zid
      sidro: i => E[i], vanZid: i => van(E[i]).xy,
      zavrsiStete: () => danas.forEach(([key, x]) => { stanje[key] = x.popravi ? 'pop' : 'rupa'; }),
      napeta: () => { ravnaJos = false; },
      kraj: () => { ravnaJos = false; oblikuj(Hdana(DAN)); },
    };
  }
  function pletiMreze() {
    const DAN = webDay();
    const mreze = [
      buildWeb({ sjeme: 0x5eed1031, mjera: 1 }, DAN),                          // gore desno
      // dolje lijevo (tu i ostane): drugačiji karakter - kraća uz donji, duža uz lijevi rub, rjeđi i jače
      // objesenih lukova, prvi dan jače povučena prema kutu
      buildWeb({ sjeme: 0x0b5c11a7, mjera: 0.86, cls: 'hw-web-dl', zadnja: true, uzA: 0.62, uzB: 1.3, razmak: 1.3, objesi: 1.7, vuce: 0.33 }, DAN),
    ];
    /* NITI U PRAZNIM KUTOVIMA (vlasnik: „nek tu i tamo provuče koju nit i u ostala dva kuta"):
       svaki dan 1-2 labave niti preko jednog od praznih kutova - naizmjence gore lijevo i dolje
       desno - od jednog ruba do drugog, objesene prema dolje. Stare ostaju. Pauk ih isplete na putu
       od gornje do donje mreže: uz zid dođe do sidra, isplete nit i ode uz zid dalje.
       Zaseban SVG preko cijelog ekrana u PIKSELIMA; mjere su u jedinicama mreže (pa prate njezinu
       veličinu) i preslože se na resize. */
    const kutovi = document.createElement('div');
    kutovi.className = 'hw-kutovi';
    kutovi.setAttribute('aria-hidden', 'true');
    kutovi.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    document.body.appendChild(kutovi);
    const kSvg = kutovi.firstChild, kNiti = [];
    for (let d = 0; d <= DAN; d++) {
      let sj = (0x6b75 + d * 977) | 0;
      const rnd = () => { sj = sj + 0x6D2B79F5 | 0; let t = Math.imul(sj ^ sj >>> 15, 1 | sj); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const kut = d % 2 ? 'gl' : 'dd', n = rnd() < 0.5 ? 2 : 1;
      for (let j = 0; j < n; j++) {
        const x = { d, kut, a: 50 + rnd() * 230, b: 50 + rnd() * 230, pg: 0.04 + rnd() * 0.14 };
        x.el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        if (d === DAN) { x.el.classList.add('hw-web-n'); x.el.setAttribute('pathLength', '1'); }
        kSvg.appendChild(x.el);
        kNiti.push(x);
      }
    }
    let kPx = 1, kW = 0, kH = 0;
    const kTocke = x => {                                 // sidra A (gornji/donji rub) i B (lijevi/desni rub) u px
      const a = x.a * kPx, b = x.b * kPx;
      return x.kut === 'gl' ? [[a, 0], [0, b]] : [[kW - a, kH], [kW, kH - b]];
    };
    const kSlozi = () => {
      kW = innerWidth || document.documentElement.clientWidth; kH = innerHeight || document.documentElement.clientHeight;
      kPx = (mreze[0].web.getBoundingClientRect().width || 400) / 400;
      kSvg.setAttribute('viewBox', `0 0 ${kW} ${kH}`);
      kNiti.forEach(x => {
        const [A, B] = kTocke(x), L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const q = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + L * x.pg];   // objesi se prema dolje
        x.el.setAttribute('d', `M${A[0].toFixed(1)} ${A[1].toFixed(1)}Q${q[0].toFixed(1)} ${q[1].toFixed(1)},${B[0].toFixed(1)} ${B[1].toFixed(1)}`);
      });
    };
    kSlozi();
    addEventListener('resize', kSlozi);
    const vanPx = P => P[1] === 0 ? [P[0], -25] : P[0] === 0 ? [-25, P[1]] : P[1] === kH ? [P[0], kH + 25] : [kW + 25, P[1]];

    const koraci = [];
    mreze.forEach((m, mi) => {
      m.Hc = m.Hpoc;
      m.put.forEach(k => koraci.push({ ...k, m }));
      if (mi === 0) {                                     // uz zid do praznog kuta, nit(i), pa uz zid do donje mreže
        koraci.push({ m, tip: 'stoji', len: 0, s: 2 });
        kNiti.filter(x => x.d === DAN).forEach(x => {
          koraci.push({ tip: 'px', A: () => vanPx(kTocke(x)[0]), B: () => kTocke(x)[0], len: 25 });
          koraci.push({ tip: 'kutNit', x, len: 0 });
          koraci.push({ tip: 'px', A: () => kTocke(x)[1], B: () => vanPx(kTocke(x)[1]), len: 25 });
        });
        koraci.push({ m, tip: 'stoji', len: 0, s: 2 });
      }
    });
    if (reduced()) {
      kNiti.forEach(x => { x.el.style.strokeDashoffset = 0; });
      koraci.forEach(k => { if (k.tip === 'spoji') k.fn(k.m.Hc); });
      mreze.forEach(m => { m.zavrsiStete(); m.kraj(); m.svg.querySelectorAll('.hw-web-n').forEach(e => { e.style.strokeDashoffset = 0; }); });
      return;
    }
    // UVIJEK ISTA BRZINA (vlasnik): trajanje = duljina na ekranu / BRZINA, i za pletenje i za hod
    const BRZINA = 32;                                    // px u sekundi (16 je bilo presporo - vlasnik)
    const mj = new Map(mreze.map(m => [m, (m.web.getBoundingClientRect().width || 400) / 400]));   // px po jedinici mreže
    // stvarna duljina niti (luk se objesi pa je dulji od tetive - inače bi pauk po lukovima jurio)
    koraci.forEach(k => { if (k.tip === 'plete') k.len = k.nit.el.getTotalLength(); });
    koraci.forEach(k => {
      if (k.tip === 'stoji') k.s = k.s || 4;
      else if (k.tip === 'napni') k.s = 1.5;
      else if (k.tip === 'spoji') k.s = 0.35;
      else if (k.tip === 'muha') k.s = 2.6;              // mušica uleti
      else if (k.tip === 'zamota') k.s = 1.8;            // pauk je zamota
      else if (k.tip === 'px') k.s = k.len / BRZINA;                       // već u pikselima
      else if (k.tip === 'kutNit') k.s = k.x.el.getTotalLength() / BRZINA;
      else k.s = k.len * mj.get(k.m) / BRZINA;
    });

    const pauk = document.createElement('div');
    pauk.className = 'hw-pauk';
    pauk.setAttribute('aria-hidden', 'true');
    /* Pauk odozgo, glava u +x: malo prednje tijelo, veći zadak iza struka, 4 para DUGIH nogu -
       dva para naprijed, dva natrag (ne u stranu, kao rak). Noge u dvije skupine (izmjenični hod). */
    const noga = (y0, x0, kx, ky, tx, ty) => `M${x0} ${y0}L${kx} ${ky}L${tx} ${ty}M${x0} ${-y0}L${kx} ${-ky}L${tx} ${-ty}`;
    pauk.innerHTML = '<svg viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg">' +
      `<g class="hw-pauk-n hw-pauk-n1"><path d="${noga(-1, 2.6, 6, -4.6, 10.5, -5.8)}${noga(-1.2, 0.6, -1.8, -5.6, -5.2, -8.6)}"/></g>` +
      `<g class="hw-pauk-n hw-pauk-n2"><path d="${noga(-1.3, 1.8, 3.8, -6, 7, -9.4)}${noga(-1, -0.2, -3.6, -4, -10, -5.4)}"/></g>` +
      '<path class="hw-pauk-p" d="M3.4 -0.7L4.8 -1.2M3.4 0.7L4.8 1.2"/>' +
      '<ellipse cx="1.5" cy="0" rx="2.1" ry="1.55"/><ellipse cx="-3.9" cy="0" rx="3.4" ry="2.5"/></svg>';
    document.body.appendChild(pauk);

    /* Točka mreže (viewBox 400) -> piksel ekrana. NE preko getScreenCTM: Firefox i Safari u njemu ne
       uračunaju CSS zakret (donja mreža je .hw-web-dl, rotate 180°), pa je pauk dok plete donju mrežu
       bio crtan na nezakrenutom mjestu - izvan ekrana (vlasnik: „nema ga dok plete donju mrežu").
       Zato: pravokutnik elementa (za 180° je isti kao nezakrenut) + zakret računamo sami. */
    const naEkran = (m, p) => {
      const r = m.web.getBoundingClientRect();
      if (!r.width) return null;
      const k = r.width / 400, x = p[0] * k, y = p[1] * k;
      return m.okrenuta ? [r.right - x, r.bottom - y] : [r.left + x, r.top + y];
    };
    const glatko = v => 1 - Math.pow(1 - v, 3);
    /* Točka na niti na udjelu w duljine. Mjeri se na POMOĆNOJ niti istog oblika BEZ pathLength: neki
       preglednici pathLength primjenjuju i na getPointAtLength, pa je pauk ondje išao ravno od zrake
       do zrake umjesto po luku (vlasnik). Pomoćna nit je nevidljiva, po jedna u svakom SVG-u. */
    const tockaNa = (el, w) => {
      const sv = el.ownerSVGElement;
      let mj2 = sv.__mjerac;
      if (!mj2) { mj2 = sv.__mjerac = document.createElementNS('http://www.w3.org/2000/svg', 'path'); mj2.setAttribute('visibility', 'hidden'); mj2.style.strokeDasharray = 'none'; sv.appendChild(mj2); }
      mj2.setAttribute('d', el.getAttribute('d'));
      const q = mj2.getPointAtLength(mj2.getTotalLength() * Math.max(0, Math.min(1, w)));
      return [q.x, q.y];
    };
    let i = 0, tk = 0, last = 0, kut = null, pr = null;
    /* MUŠICE NAKON POSLA (vlasnik): kad pauk završi današnji posao, svakih 30-90 s uleti mušica,
       nasumično u gornju ili donju mrežu - STALNOM brzinom, zabije se (mreža se trzne) - i zapne na
       luku (koprca se). Pauk dođe po njoj SAMO PO NITIMA (ako je u drugoj mreži: po krajnjoj zraci do
       zida, uz zid izvan ekrana, po krajnjoj zraci druge mreže u središte), po zraci do nje, zamota je
       u kuglicu, JEDE ~15 s (kuglica se smanjuje, mreža se povremeno trzne) i vrati se u središte.
       Ostatak izblijedi kroz minutu. Mušica i pauk su IZA sadržaja stranice (z-index 1). */
    const muhe = [];                                      // { el, m, seg, st: 'leti'|'zapela'|'kuglica' }
    const novaMuha = () => {
      const el = document.createElement('div');
      el.className = 'hw-muha hw-muha-leti';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg viewBox="-6 -6 12 12" xmlns="http://www.w3.org/2000/svg"><ellipse class="hw-muha-k1" cx="-0.6" cy="-2.2" rx="2.6" ry="1.3"/><ellipse class="hw-muha-k2" cx="-0.6" cy="2.2" rx="2.6" ry="1.3"/><ellipse class="hw-muha-t" cx="0" cy="0" rx="2.2" ry="1.3"/></svg>';
      document.body.appendChild(el);
      return el;
    };
    const muhaCilj = mu => naEkran(mu.m, tockaNa(mu.seg.el, mu.seg.t));
    const muhaPostavi = (mu, p, kut2) => { if (p) mu.el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) rotate(${(kut2 || 0).toFixed(0)}deg)` + (mu.sc != null && mu.sc !== 1 ? ` scale(${mu.sc.toFixed(3)})` : ''); };
    addEventListener('resize', () => muhe.forEach(mu => { if (mu.st === 'kuglica') muhaPostavi(mu, muhaCilj(mu)); }));
    let sjediU = mreze[mreze.length - 1], radi = true;   // u kojoj mreži pauk sjedi; radi = rAF petlja ide
    const sredina = m => m.rj({ i: 0, t: 0 }, m.Hc);
    const JEDE = 15;                                      // koliko pauk jede mušicu (s) - vlasnik
    const trajanje = k => k.tip === 'stoji' ? (k.s || 3) : k.tip === 'muha' ? 2.6 : k.tip === 'zamota' ? 1.8 : k.tip === 'jede' ? JEDE : k.len * mj.get(k.m) / BRZINA;
    const hodaK = (m, A, B) => { const a = m.rj(A, m.Hc), b = m.rj(B, m.Hc), len = Math.hypot(b[0] - a[0], b[1] - a[1]); return len > 0.3 ? [{ tip: 'hoda', m, A, B, len }] : []; };
    /* JEDE (vlasnik): ~15 s stoji uz zamotanu mušicu; kuglica se smanjuje, a mreža se tu i tamo
       kratko trzne (kao da je pauk čupa). Trzaji su unaprijed nasumično raspoređeni po koraku. */
    const trzaji = () => { const r = []; for (let t = 1 + Math.random() * 2; t < JEDE - 1; t += 1.5 + Math.random() * 3.5) r.push([t, 0.3 + Math.random() * 0.6]); return r; };
    /* VISI NA NITI (vlasnik): kad odmara u GORNJOJ mreži, pauk se ponekad iz središta spusti ravno
       dolje na svojoj niti i ondje visi (lagano se njiše) dok ne uleti mušica - onda se po niti
       popne natrag u središte i ode po nju. Nit je zaseban path u SVG-u mreže (jedinice mreže). */
    let spustT = null;
    const dolje = m => m.okrenuta ? -1 : 1;              // „dolje" na ekranu u jedinicama mreže
    const visiTocka = (m, Lu, now) => {
      const c = m.rj({ i: 0, t: 0 }, m.tresC || m.Hc), lj = now ? Math.sin(now / 1400) * Lu * 0.05 : 0;
      return [c, [c[0] + lj * dolje(m), c[1] + Lu * dolje(m)]];
    };
    const nitVisi = (m, Lu, now) => {
      if (!m.vlakno) { m.vlakno = document.createElementNS('http://www.w3.org/2000/svg', 'path'); m.svg.appendChild(m.vlakno); }
      if (!Lu) { m.vlakno.setAttribute('d', ''); return null; }
      const [c, p] = visiTocka(m, Lu, now);
      m.vlakno.setAttribute('d', `M${c[0].toFixed(2)} ${c[1].toFixed(2)}L${p[0].toFixed(2)} ${p[1].toFixed(2)}`);
      return naEkran(m, p);
    };
    function spusti() {
      spustT = null;
      if (radi) return;
      const m = sjediU, L = 70 + Math.random() * 110, Lu = L / mj.get(m);   // px na ekranu
      koraci.push({ tip: 'spusti', m, len: Lu, Lu, s: L / BRZINA }, { tip: 'visi', m, Lu, len: 0, s: Infinity });
      tk = 0; last = 0; radi = true;
      requestAnimationFrame(kadar);
    }
    function muhaDolazi() {
      clearTimeout(spustT); spustT = null;
      const m = mreze[Math.floor(Math.random() * mreze.length)], seg = m.zaMuhu();
      if (!seg) { setTimeout(muhaDolazi, 60000); return; }
      const mu = { el: novaMuha(), m, seg, st: 'leti' };
      muhe.push(mu);
      const S0 = { i: 0, t: 0 }, nk = [];
      // visi li pauk (ili se upravo spušta)? onda visi dok mušica ne udari, pa se popne po niti
      const vi = koraci.findIndex((k, j) => j >= i && k.tip === 'visi'), visiK = vi >= 0 ? koraci[vi] : null;
      if (visiK) visiK.s = vi === i ? tk : 0;             // prestane visjeti čim stigne do tog koraka
      nk.push({ tip: 'muha', m: sjediU, mu, visiLu: visiK ? visiK.Lu : 0 });   // uleti i zapne; pauk čeka
      if (visiK) nk.push({ tip: 'penje', m: visiK.m, len: visiK.Lu, Lu: visiK.Lu });
      if (sjediU !== m) {                                  // u drugu mrežu: po krajnjoj zraci do zida, uz zid, i natrag
        const a = sjediU, z = a.krajnja, z2 = m.krajnja;
        nk.push(...hodaK(a, S0, { i: z, t: 1 }), ...hodaK(a, { i: z, t: 1 }, { xy: a.vanZid(z) }));
        nk.push({ tip: 'stoji', m, s: 3 });
        nk.push(...hodaK(m, { xy: m.vanZid(z2) }, { i: z2, t: 1 }), ...hodaK(m, { i: z2, t: 1 }, S0));
      }
      nk.push(...hodaK(m, S0, seg.at));                    // po zraci do mušice
      nk.push({ tip: 'zamota', m, mu, at: seg.at });
      nk.push({ tip: 'jede', m, mu, at: seg.at, trz: trzaji() });
      nk.push(...hodaK(m, seg.at, S0));                    // i natrag u središte
      nk.forEach(k => { k.s = trajanje(k); });
      sjediU = m;
      koraci.push(...nk);
      if (visiK) return;                                   // petlja već ide (pauk visi)
      tk = 0; last = 0; radi = true;
      pauk.classList.add('hw-pauk-hoda');
      requestAnimationFrame(kadar);
    }
    const sljedecaMuha = () => setTimeout(muhaDolazi, (30 + Math.random() * 60) * 1000);   // 30-90 s (vlasnik)
    const sjedi = () => {                                 // pauk miruje u središtu mreže
      const e = naEkran(sjediU, sredina(sjediU));
      if (e) pauk.style.transform = `translate(${e[0].toFixed(1)}px, ${e[1].toFixed(1)}px) rotate(${(kut || 0).toFixed(1)}deg)`;
    };
    addEventListener('resize', () => { if (!radi) sjedi(); });
    const zavrsi = k => {                                 // korak gotov - konačno stanje
      if (k.tip === 'plete') k.nit.el.style.strokeDashoffset = 0;
      if (k.tip === 'kutNit') k.x.el.style.strokeDashoffset = 0;
      if (k.tip === 'napni') { k.m.Hc = k.H2; k.m.napeta(); k.m.oblikuj(k.H2); }
      if (k.tip === 'spoji') k.fn(k.m.Hc);              // luk se pričvrsti na zraku
      if (k.tip === 'muha') { k.mu.st = 'zapela'; k.mu.el.classList.remove('hw-muha-leti'); k.mu.m.udar = performance.now(); }   // udarac trzne mrežu
      if (k.tip === 'zamota') { const mu = k.mu; mu.st = 'kuglica'; mu.el.classList.add('hw-muha-zamotana'); muhaPostavi(mu, muhaCilj(mu)); }
      if (k.tip === 'jede') {                             // pojedena: ostatak izblijedi kroz minutu pa nestane
        const mu = k.mu;
        mu.sc = 0.5; muhaPostavi(mu, muhaCilj(mu));
        requestAnimationFrame(() => { mu.el.style.transition = 'opacity 60s linear'; mu.el.style.opacity = '0'; });
        setTimeout(() => { mu.el.remove(); muhe.splice(muhe.indexOf(mu), 1); }, 62000);
      }
      if (k.tip === 'penje') nitVisi(k.m, 0);             // nit se povuče s paukom
      if (k.tip === 'popravak') { if (!k.el) k.el = k.m.postavi(k.key, 'pop', k.m.Hc); if (k.el) k.el.style.strokeDashoffset = 0; }
    };
    function kadar(now) {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;   // skrivena kartica: rAF stoji, nema skoka
      last = now;
      tk += dt;
      while (i < koraci.length && tk >= koraci[i].s) { tk -= koraci[i].s; zavrsi(koraci[i]); i++; }
      if (i >= koraci.length) {                           // posao gotov: pauk SJEDI u središtu i čeka mušicu
        pauk.classList.remove('hw-pauk-hoda');            // noge mirne
        pauk.style.visibility = '';
        radi = false;
        sjedi();
        sljedecaMuha();
        // u gornjoj mreži se ponekad spusti na niti i visi dok ne dođe mušica (vlasnik)
        if (sjediU === mreze[0] && Math.random() < 0.4) spustT = setTimeout(spusti, (6 + Math.random() * 20) * 1000);
        return;
      }
      const k = koraci[i], v = k.s ? tk / k.s : 1;
      let e = null, okreni = null;
      /* TRESENJE MREŽE (vlasnik) - središte mreže titra pa se sve niti elastično njišu:
         - zapela mušica se koprca (stalno, blago)
         - udarac mušice u mrežu (kratak jak trzaj koji se smiri)
         - pauk jede (povremeni kratki trzaji)
         Mreža se preslaže svaki drugi kadar; m.tresC = trenutno (pomaknuto) središte. */
      mreze.forEach(m => {
        let dx = 0, dy = 0, ide = false;
        if (muhe.some(mu => mu.st === 'zapela' && mu.m === m)) {
          dx += (Math.sin(now / 41) + 0.6 * Math.sin(now / 17)) * 1.4; dy += (Math.cos(now / 53) + 0.5 * Math.sin(now / 23)) * 1.4; ide = true;
        }
        const ud = m.udar ? now - m.udar : 1e9;
        if (ud < 700) { const a = 6 * Math.exp(-ud / 150); dx += Math.sin(ud / 22) * a * 0.5; dy += Math.cos(ud / 22) * a; ide = true; }
        if (k.tip === 'jede' && k.m === m && k.trz.some(([a, d]) => tk >= a && tk < a + d)) {
          dx += (Math.sin(now / 11) + 0.5 * Math.sin(now / 7)) * 1.8; dy += (Math.cos(now / 13) + 0.5 * Math.sin(now / 5)) * 1.8; ide = true;
        }
        m.tresC = ide ? [m.Hc[0] + dx, m.Hc[1] + dy] : null;
        if (ide && (m.tresK = (m.tresK || 0) + 1) % 2 === 0) { m.oblikuj(m.tresC); m.tresla = true; }
        else if (!ide && m.tresla) { m.oblikuj(m.Hc); m.tresla = false; }
      });
      pauk.classList.toggle('hw-pauk-hoda', k.tip !== 'visi' && k.tip !== 'jede' && k.tip !== 'muha');   // noge mirne dok visi/jede/čeka
      muhe.forEach(mu => { if (mu.st === 'zapela') { const T2 = muhaCilj(mu); if (T2) muhaPostavi(mu, [T2[0] + Math.sin(now / 37) * 1.2, T2[1] + Math.cos(now / 53) * 1.2], Math.sin(now / 90) * 40); } });
      if (k.tip === 'plete') {
        const el = k.nit.el;
        el.style.strokeDashoffset = ((k.obrnuto ? -1 : 1) * (1 - v)).toFixed(4);   // obrnuto: crtica raste od kraja
        e = naEkran(k.m, tockaNa(el, k.obrnuto ? 1 - v : v));   // pauk ide PO luku
      } else if (k.tip === 'hoda') {
        const A = k.m.rj(k.A, k.m.Hc), B = k.m.rj(k.B, k.m.Hc);
        e = naEkran(k.m, [A[0] + (B[0] - A[0]) * v, A[1] + (B[1] - A[1]) * v]);
      } else if (k.tip === 'muha') {                      // pauk čeka (u središtu ili na niti), mušica uleti iz smjera sredine ekrana
        if (k.visiLu) { e = nitVisi(k.m, k.visiLu, now); okreni = 90 * dolje(k.m) + (k.m.okrenuta ? 180 : 0); }
        else e = naEkran(k.m, sredina(k.m));
        const T2 = muhaCilj(k.mu), W = innerWidth || 800, H2 = innerHeight || 600;
        if (T2) {
          const sm = [W / 2 - T2[0], H2 / 2 - T2[1]], sl = Math.hypot(...sm) || 1;
          const od = [T2[0] + sm[0] / sl * 420, T2[1] + sm[1] / sl * 420];
          // STALNOM brzinom ravno u mrežu - ne usporava pred njom, zabije se (vlasnik)
          const w = v, vij = Math.sin(v * Math.PI * 5) * 18 * (1 - v);
          muhaPostavi(k.mu, [od[0] + (T2[0] - od[0]) * w - sm[1] / sl * vij, od[1] + (T2[1] - od[1]) * w + sm[0] / sl * vij], Math.atan2(T2[1] - od[1], T2[0] - od[0]) * 180 / Math.PI);
        }
      } else if (k.tip === 'spusti' || k.tip === 'visi' || k.tip === 'penje') {   // na niti ispod središta
        const Lu = k.tip === 'spusti' ? k.Lu * v : k.tip === 'penje' ? k.Lu * (1 - v) : k.Lu;
        e = nitVisi(k.m, Math.max(0.01, Lu), k.tip === 'visi' ? now : 0);
        if (k.tip === 'visi') okreni = 90 * dolje(k.m) + (k.m.okrenuta ? 180 : 0);   // visi glavom prema dolje
      } else if (k.tip === 'zamota' || k.tip === 'jede') {   // stoji uz mušicu i zamata je / jede (miče se s mrežom)
        e = naEkran(k.m, k.m.rj(k.at, k.m.tresC || k.m.Hc));
        const T2 = muhaCilj(k.mu);
        if (k.tip === 'jede') {                           // kuglica se smanjuje i prati mrežu
          k.mu.sc = 1 - 0.5 * v;
          if (T2) muhaPostavi(k.mu, T2);
        }
        if (e && T2) okreni = Math.atan2(T2[1] - e[1], T2[0] - e[0]) * 180 / Math.PI;
      } else if (k.tip === 'popravak') {                  // isplete novu nit preko rupe
        if (!k.el) {
          k.el = k.m.postavi(k.key, 'pop', k.m.Hc); k.el.setAttribute('pathLength', '1'); k.el.classList.add('hw-web-n');
          k.s = k.el.getTotalLength() * mj.get(k.m) / BRZINA;   // stvarna duljina nove niti (s pregibom je dulja)
        }
        const vv = Math.min(1, tk / k.s);
        k.el.style.strokeDashoffset = (1 - vv).toFixed(4);
        e = naEkran(k.m, tockaNa(k.el, vv));
      } else if (k.tip === 'px') {                        // uz zid, u pikselima ekrana
        const A = k.A(), B = k.B();
        e = [A[0] + (B[0] - A[0]) * v, A[1] + (B[1] - A[1]) * v];
      } else if (k.tip === 'kutNit') {                    // nit u praznom kutu (SVG je već u pikselima)
        const el = k.x.el;
        el.style.strokeDashoffset = (1 - v).toFixed(4);
        e = tockaNa(el, v);
      } else if (k.tip === 'spoji') e = naEkran(k.m, k.m.rj(k.at, k.m.Hc));   // stoji i pričvršćuje
      else if (k.tip === 'napni') {                     // pauk uz sidro vuče nit prema sebi: središte dolazi k njemu
        if (!k.m.napetaV) { k.m.napeta(); k.m.napetaV = 1; }
        // tri potezanja: svako malo povuče središte, a pauk se pri potezu malo nagne unatrag (prema rubu)
        const P = 3, x = v * P, n = Math.min(P - 1, Math.floor(x)), fr = x - n;
        const w = (n + glatko(fr)) / P, c = [k.H1[0] + (k.H2[0] - k.H1[0]) * w, k.H1[1] + (k.H2[1] - k.H1[1]) * w];
        k.m.oblikuj(c);
        const trz = Math.sin(Math.PI * fr) * 1.6;
        e = naEkran(k.m, [k.kod[0] + k.u[0] * trz, k.kod[1] + k.u[1] * trz]);
        const sr = naEkran(k.m, c);                       // gleda prema središtu (koje vuče)
        if (e && sr) okreni = Math.atan2(sr[1] - e[1], sr[0] - e[0]) * 180 / Math.PI;
      }
      pauk.style.visibility = e ? '' : 'hidden';
      if (e) {
        if (okreni != null) kut = kut == null ? okreni : kut + ((okreni - kut + 540) % 360 - 180) * 0.15;
        else if (pr) {
          const dx = e[0] - pr[0], dy = e[1] - pr[1];
          if (dx * dx + dy * dy > 0.01) {
            const cilj = Math.atan2(dy, dx) * 180 / Math.PI;
            kut = kut == null ? cilj : kut + ((cilj - kut + 540) % 360 - 180) * 0.15;   // okreće se glatko
          }
        }
        pr = e;
        pauk.style.transform = `translate(${e[0].toFixed(1)}px, ${e[1].toFixed(1)}px) rotate(${(kut || 0).toFixed(1)}deg)`;
      } else pr = null;                                   // na putu između mreža (izvan ekrana)
      requestAnimationFrame(kadar);
    }
    pauk.classList.add('hw-pauk-hoda');
    const kreni = () => requestAnimationFrame(kadar);
    if (!root.classList.contains('aj-loading')) setTimeout(kreni, 1500);
    else document.addEventListener('aj:revealed', () => setTimeout(kreni, 1500), { once: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScenery();
    initJack();
    pletiMreze();
    if (!wantIntro) addLoaderMoon(false);   // s uvodom ga doda završni bljesak
    if (reduced()) return;
    initNavBat();
    setTimeout(scheduleBats, 15000 + Math.random() * 15000);
  });
})();
