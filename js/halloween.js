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
    const t0 = performance.now();
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
    Promise.race([prepare(), new Promise(r => setTimeout(r, 8000))]).catch(() => {}).then(startTimeline);
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

  /* Paukova mreža u gornjem desnom kutu - RASTE kroz tjedan (dan 0 = 25. 10. … dan 7 = 1. 11.).
     NE skalira se: cijela mreža je jedna fiksna geometrija (iz fiksnog sjemena, ista svima i
     svaki dan), a dan određuje samo DOKLE se crta (polumjer R po danu). Niti od jučer zato
     ostanu točno gdje su bile, a dodaju se novi vanjski krugovi i produženja zraka.
     Današnji novi dio se pri otvaranju stranice polako ispreda (crta od središta prema van).
     Pauka NEMA (vlasnik: bez paukova). Pregled: `?mreza=0..7` (uz ?halloween). */
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
  function initWeb() {
    const DAN = webDay();
    const RD = [72, 112, 152, 194, 236, 280, 328, 385];   // dokle mreža seže koji dan (viewBox 400)
    let sj = 0x5eed1031;                                   // fiksno sjeme: ista mreža svaki dan
    const rnd = () => { sj |= 0; sj = sj + 0x6D2B79F5 | 0; let t = Math.imul(sj ^ sj >>> 15, 1 | sj); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const CX = 400, CY = 0, f = n => n.toFixed(1);
    // zrake: od uz gornji rub (kut 0) do uz desni rub (kut 90), nepravilno razmaknute
    /* Uz gornji i desni rub mreža NE završava ravnom zrakom (vlasnik): prva i zadnja zraka
       su NEVIDLJIVE i leže izvan ekrana (iznad gornjeg / desno od desnog ruba - nit je
       pričvršćena za „zid"), pa lukovi uz rubove izlaze van ekrana. Vidljive zrake su između. */
    const NZ = 12, zrake = [];
    for (let i = 0; i < NZ; i++) {
      const rubna = i === 0 || i === NZ - 1;
      const kut = i === 0 ? -16 : i === NZ - 1 ? 106 : 7 + (i - 1) * (76 / (NZ - 3)) + (rnd() - .5) * 5;
      const a = kut * Math.PI / 180;
      zrake.push({ dx: -Math.cos(a), dy: Math.sin(a), skrivena: rubna });
    }
    const tocka = (z, r) => [CX + z.dx * r, CY + z.dy * r];
    // krugovi: razmak lagano raste prema van, svaka zraka ima malo svoj pomak (ručni rad)
    const krugovi = [];
    for (let r = 16, k = 0; r < 400; k++) {
      krugovi.push(zrake.map(() => r + (rnd() - .5) * 4));
      r += 11 + k * 0.55 + rnd() * 3;
    }
    /* Mreža SVAKI DAN ZAVRŠAVA LUKOM: zrake idu točno do najvanjskijeg kruga tog dana, nikad
       dalje (zraka koja viri van zadnjeg luka fizički ne može stajati - vlasnik). Sutra se
       zraka iz te točke produži do novog vanjskog kruga. Zato se dan broji u KRUGOVIMA:
       K[d] = zadnji krug koji 'd'-tog dana stane unutar RD[d]. */
    const K = RD.map(R => { let k = 0; while (k + 1 < krugovi.length && Math.max(...krugovi[k + 1]) <= R) k++; return k; });
    const rub = new Set(K);                               // krug koji je ikad bio vanjski rub - nikad pokidan
    const kDo = d => d < 0 ? -1 : K[d];
    const staro = [], novoZ = [], novoK = [];            // današnje zrake i današnji lukovi (ispredaju se)
    zrake.forEach((z, i) => {
      if (z.skrivena) return;                             // zraka izvan ekrana se ne crta
      const k0 = kDo(DAN - 1), k1 = kDo(DAN);
      const [x0, y0] = k0 < 0 ? [CX, CY] : tocka(z, krugovi[k0][i]), [x1, y1] = tocka(z, krugovi[k1][i]);
      if (k0 >= 0) staro.push({ d: `M${CX} ${CY}L${f(x0)} ${f(y0)}`, r: 0, z: 1 });
      if (k1 > k0) novoZ.push({ d: `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`, z: 1 });
    });
    krugovi.forEach((kr, k) => {
      for (let i = 0; i < NZ - 1; i++) {
        // slučajni brojevi se uzimaju UVIJEK, i za nevidljive niti - inače bi se slijed
        // pomaknuo i vanjske niti bi svaki dan izgledale drugačije
        const pokidana = rnd() < 0.05 && !rub.has(k), s = 0.94 - rnd() * 0.03;
        if (pokidana || k > kDo(DAN)) continue;           // poneka unutarnja nit nedostaje
        const a = zrake[i], b = zrake[i + 1], ra = kr[i], rb = kr[i + 1];
        const [x0, y0] = tocka(a, ra), [x1, y1] = tocka(b, rb);
        // nit se blago objesi prema kutu (kontrolna točka bliže središtu)
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const q = `${f(CX + (mx - CX) * s)} ${f(CY + (my - CY) * s)}`, A = `${f(x0)} ${f(y0)}`, B = `${f(x1)} ${f(y1)}`;
        if (k <= kDo(DAN - 1)) staro.push({ d: `M${A}Q${q},${B}` });
        else novoK.push({ k, i, A, B, q });
      }
    });
    /* Današnji dio se ispreda KAO ŠTO BI PAUK: prvo jedna po jedna zraka (od dosadašnjeg ruba
       prema van), tek onda lukovi - JEDNOM neprekinutom niti, luk po luk od vanjskog prema
       unutra, sa smjerom koji se izmjenjuje (kao lovna spirala). Svaki komad krene točno kad
       prethodni završi, pa se vidi jedna nit koja putuje. Prije su se lukovi i zrake crtali
       istodobno pa su lukovi znali visjeti u zraku prije nego što ih je zraka dosegla. */
    const novo = [];
    let t = 0;
    novoZ.forEach((x, i) => { novo.push({ ...x, t0: t + i * 0.16, dur: 0.55 }); });
    t += novoZ.length * 0.16 + 0.55 + 0.25;
    const kr = [...new Set(novoK.map(x => x.k))].sort((a, b) => b - a);   // vanjski prvi
    kr.forEach((k, n) => {
      let red = novoK.filter(x => x.k === k).sort((a, b) => a.i - b.i);
      if (n % 2) red = red.reverse();                       // spirala: smjer se izmjenjuje
      red.forEach(x => {
        const d = n % 2 ? `M${x.B}Q${x.q},${x.A}` : `M${x.A}Q${x.q},${x.B}`;
        novo.push({ d, t0: t, dur: 0.13 });
        t += 0.13;
      });
    });
    const put = (x, cls) => `<path class="${cls}${x.z ? ' hw-web-z' : ''}" d="${x.d}"${cls === 'hw-web-n' ? ` pathLength="1" style="--hw-wd:${x.t0.toFixed(2)}s;--hw-wdur:${x.dur}s"` : ''}/>`;
    const web = document.createElement('div');
    web.className = 'hw-web';
    web.setAttribute('aria-hidden', 'true');
    web.innerHTML = '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">' +
      staro.map(x => put(x, 'hw-web-s')).join('') + novo.map(x => put(x, 'hw-web-n')).join('') + '</svg>';
    document.body.appendChild(web);
    // ispredanje kreće tek kad se stranica otkrije (ekran učitavanja je inače preko nje)
    const kreni = () => web.classList.add('hw-web-go');
    if (!root.classList.contains('aj-loading')) setTimeout(kreni, 400);
    else document.addEventListener('aj:revealed', () => setTimeout(kreni, 600), { once: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScenery();
    initJack();
    initWeb();
    if (!wantIntro) addLoaderMoon(false);   // s uvodom ga doda završni bljesak
    if (reduced()) return;
    initNavBat();
    setTimeout(scheduleBats, 15000 + Math.random() * 15000);
  });
})();
