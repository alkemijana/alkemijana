/* ============================================================
   Alkemijana - alat „Mjesec" na stranici Astro alati (prefiks ml-)
   ------------------------------------------------------------
   Kako Mjesec izgleda u odabranom trenutku s odabranog mjesta:
   mijena, osvijetljenost, nagib (paralaktički kut), znak, visina
   nad obzorom, izlazak/zalazak, sljedeći mlađak/uštap, udaljenost.

   Crtanje: js/moon-render.js (window.AJMoon) - isti Mjesec kao na
   Halloweenu i u traci. Izračun: astronomy-engine (lazy-load).
   Ponovno koristi iz natal*.js: initPlaceAutocomplete, localToUtc,
   tzOffsetMinutes, loadScript, SIGNS/SIGN_KEYS, glyphSvgHtml, fmtDegMin.

   Samostalan alat - NE ide kroz prekidač modova (setNatalMode): dok je
   otvoren, <body> ima klasu `moon-mode` (css/style.css skriva prekidač,
   formu i rezultate ostalih alata). setNatalMode() je skida.
   Ništa se ne sprema (sesijski alat).
   ============================================================ */
(function () {
  'use strict';

  // zadano: geografsko središte Hrvatske (isto kao mali Mjesec u traci)
  const DEFAULT_PLACE = { label: 'Središte Hrvatske', lat: 45.10, lon: 15.20, tz: 'Europe/Zagreb' };
  const AU_KM = 149597870.7;
  const SUPERMOON_KM = 361863;          // 90 % puta do perigeja (Nolleova definicija)
  const DIRS = ['sjeveru', 'sjeveroistoku', 'istoku', 'jugoistoku', 'jugu', 'jugozapadu', 'zapadu', 'sjeverozapadu'];

  let place = DEFAULT_PLACE;
  let inited = false, ready = false;
  let gen = 0, fullTimer = null;

  const $ = id => document.getElementById(id);

  /* ---------- vrijeme ---------- */

  // „sada" u zoni mjesta → { y, mo, d, h, mi }
  function wallNow(tz) {
    const p = {};
    for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date())) p[x.type] = x.value;
    return { y: +p.year, mo: +p.month, d: +p.day, h: p.hour === '24' ? 0 : +p.hour, mi: +p.minute };
  }
  const pad = n => String(n).padStart(2, '0');

  function setAnchorNow() {
    const w = wallNow(place.tz);
    $('ml-date').value = w.y + '-' + pad(w.mo) + '-' + pad(w.d);
    $('ml-time').value = pad(w.h) + ':' + pad(w.mi);
    $('ml-sl-hour').value = 0; $('ml-sl-day').value = 0;
  }

  // odabrani trenutak: sidro (mjesno vrijeme) + pomaci slidera; dani se dodaju u mjesnom
  // vremenu (Date.UTC normalizira prelijevanje), pa ljetno računanje vremena ne pomakne sat
  function selectedInstant(extraDays) {
    const dv = $('ml-date').value, tv = $('ml-time').value || '12:00';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dv);
    if (!m) return null;
    const [h, mi] = tv.split(':').map(Number);
    const dh = +$('ml-sl-hour').value, dd = +$('ml-sl-day').value;
    const r = localToUtc(+m[1], +m[2], +m[3] + dd + (extraDays || 0), h, mi + Math.round(dh * 60), place.tz);
    const y = r.date.getUTCFullYear();
    if (y < 1900 || y > 2099) return { error: 'Datum mora biti između 1900. i 2099. godine.' };
    return { date: r.date };
  }

  const fmt = (date, o) => new Intl.DateTimeFormat('hr-HR', Object.assign({ timeZone: place.tz }, o)).format(date);
  const fmtTime = d => fmt(d, { hour: '2-digit', minute: '2-digit' });
  // datum kao u hrvatskom pravopisu: „6. 10. 2026." (Intl za hr zna dati „06.")
  function dmy(date, withYear) {
    const p = {};
    for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: place.tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date)) p[x.type] = x.value;
    // neprelomivi razmaci: datum se nikad ne lomi u dva reda
    return +p.day + '. ' + +p.month + '.' + (withYear ? ' ' + p.year + '.' : '');
  }
  const fmtDay = d => fmt(d, { weekday: 'short' }) + ', ' + dmy(d, true);
  // dan i datum zajedno, sat zasebno - ako ne stane u red, lomi se samo ispred sata
  const when = d => '<span class="ml-nw">' + fmtDay(d) + ',</span> <span class="ml-nw">' + fmtTime(d) + '</span>';
  // tisućice odvojene razmakom (hrvatski pravopis), neprelomivim da broj ne pukne u dva reda
  const thousands = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ponoć mjesnog dana u kojem je `date`
  function localMidnight(date) {
    const p = {};
    for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: place.tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date)) p[x.type] = x.value;
    return localToUtc(+p.year, +p.month, +p.day, 0, 0, place.tz).date;
  }

  /* ---------- izračun ---------- */

  function compute(date) {
    const A = window.Astronomy;
    const obs = new A.Observer(place.lat, place.lon, 0);
    const eq = A.Equator('Moon', date, obs, true, true);
    const hor = A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
    const sEq = A.Equator('Sun', date, obs, true, true);
    const sunAlt = A.Horizon(date, obs, sEq.ra, sEq.dec, 'normal').altitude;
    const ecl = A.EclipticGeoMoon(date);
    const elong = A.MoonPhase(date);
    const k = A.Illumination('Moon', date).phase_fraction;

    const day0 = localMidnight(date), day1 = new Date(day0.getTime() + 86400000);
    const within = t => (t && t.date >= day0 && t.date < day1) ? t.date : null;
    const rise = within(A.SearchRiseSet('Moon', obs, +1, day0, 1.05));
    const set = within(A.SearchRiseSet('Moon', obs, -1, day0, 1.05));

    const nextNew = A.SearchMoonPhase(0, date, 35);
    const nextFull = A.SearchMoonPhase(180, date, 35);

    return {
      k, elong, name: window.AJMoon.phaseName(date),
      age: elong / 360 * 29.530589,
      alt: hor.altitude, az: hor.azimuth, sunAlt,
      lon: ecl.lon, km: ecl.dist * AU_KM,
      rise, set,
      nextNew: nextNew && nextNew.date, nextFull: nextFull && nextFull.date
    };
  }

  /* ---------- prikaz ---------- */

  function fact(label, value) {
    return '<div class="ml-fact"><dt>' + label + '</dt><dd>' + value + '</dd></div>';
  }

  function renderInfo(date, c) {
    $('ml-phase').textContent = c.name;
    $('ml-when').textContent = fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) +
      ' · ' + (place.shortLabel || place.label);

    const si = Math.floor(((c.lon % 360) + 360) % 360 / 30);
    const glyph = typeof glyphSvgHtml === 'function' ? glyphSvgHtml(SIGN_KEYS[si], 18, 'currentColor', 'ml-glyph') : '';
    const dir = DIRS[Math.round(c.az / 45) % 8];
    const up = c.alt > 0;
    const full = c.elong >= 170 && c.elong < 190;

    let html = '';
    html += fact('Osvijetljenost', Math.round(c.k * 100) + ' %');
    html += fact('Znak', glyph + ' ' + SIGNS[si] + ' ' + fmtDegMin(c.lon));
    html += fact('Starost Mjeseca', '≈ ' + c.age.toFixed(1).replace('.', ',') + ' dana');
    html += fact('Na nebu', up
      ? Math.round(c.alt) + '° iznad obzora, na ' + dir
      : 'ispod obzora (' + String(Math.round(c.alt)).replace('-', '−') + '°)');
    html += fact('Izlazak', c.rise ? fmtTime(c.rise) : 'toga dana ne izlazi');
    html += fact('Zalazak', c.set ? fmtTime(c.set) : 'toga dana ne zalazi');
    html += fact('Sljedeći mlađak', c.nextNew ? when(c.nextNew) : '–');
    html += fact('Sljedeći uštap', c.nextFull ? when(c.nextFull) : '–');
    html += fact('Udaljenost', thousands(Math.round(c.km)) + ' km' +
      (full && c.km < SUPERMOON_KM ? ' <span class="ml-badge">supermjesec</span>' : ''));
    $('ml-facts').innerHTML = html;

    const hz = $('ml-horizon');
    if (!up) hz.textContent = 'U tom trenutku Mjesec je ispod obzora pa se s ovog mjesta ne vidi.';
    else if (c.sunAlt > 0) hz.textContent = 'Mjesec je iznad obzora, ali je dan pa se slabije vidi.';
    else hz.textContent = '';
    $('ml-moon').classList.toggle('ml-below', !up);
  }

  // brzo = mali pregled dok se vuče klizač; puna kvaliteta kad se stane
  async function paintMoon(date, quick) {
    const el = $('ml-moon'), my = ++gen;
    const g = window.AJMoon.geometry(date, place.lat, place.lon);
    const css = el.clientWidth || 320;
    // konačna slika u PUNOJ razlučivosti ekrana (css px × devicePixelRatio, strop 2400 px) i iz
    // pune karte (vlasnik: najveća moguća razlučivost); dok se vuče klizač - mali brzi pregled
    const D = quick ? 140 : Math.min(2400, Math.round(css * (window.devicePixelRatio || 1)));
    // obje teme jednako: u svijetloj tamni dio leži na crnoj vinjeti (CSS), ne na bijeloj stranici
    const base = { earth: 0.05 };
    const put = c => {
      c.className = 'ml-moon-cv';
      const old = el.querySelector('canvas');
      if (old) old.replaceWith(c); else el.appendChild(c);
      el.classList.add('ml-ready');
    };
    // reljef i sjene kratera čim je karta visina tu - i u malom pregledu (malen je, pa brz), da
    // Mjesec ne skače iz meke granice u oštru; dok karte visina još nema, crta se bez reljefa
    const relief = window.AJMoon.hasHeight();
    const c = await window.AJMoon.render(D, g, Object.assign({ hi: !quick, relief }, base));
    if (my !== gen) return;                       // u međuvremenu je zatražen noviji trenutak
    put(c);
  }

  function update(quick) {
    if (!ready) return;
    const s = selectedInstant(), err = $('ml-error');
    if (!s || s.error) {
      err.textContent = s ? s.error : 'Upiši ispravan datum.';
      err.style.display = '';
      return;
    }
    err.style.display = 'none';
    renderInfo(s.date, compute(s.date));
    // točan trenutak na koji su klizači pomaknuli sidro (mjesno vrijeme mjesta)
    $('ml-readout').textContent = fmt(s.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
      ' u ' + fmtTime(s.date);
    renderHourWheel();
    clearTimeout(fullTimer);
    if (quick) {
      paintMoon(s.date, true);
      fullTimer = setTimeout(() => { paintMoon(s.date, false); renderWeek(); }, 220);
    } else { paintMoon(s.date, false); renderWeek(); }
  }

  /* ---------- TRAKE ZA DAN I SAT (vlasnik) ----------
     Umjesto klizača: sličice dana su vodoravna traka (±30 dana od datuma upisanog gore) i
     ODABRAN JE DAN U SREDINI; sati su druga takva traka (±24 h od upisanog vremena). Mobitel:
     lista se prstom; računalo: strelice lijevo/desno (i kotačić/touchpad). Svaki novi dan / sat
     koji dođe u sredinu kratko „klikne" (vibracija, gdje uređaj to podržava). Trake samo
     postavljaju vrijednosti skrivenih klizača (ml-sl-day / ml-sl-hour) - ostatak alata čita njih.
     (Prije: 7 dana u mreži + klizači - zamijenjeno na zahtjev.) */
  let weekKey = '', weekGen = 0;
  const renderWeek = () => renderDayWheel();
  const DAY_R = 30, HOUR_R = 24;

  // mehanika traka (sredina, „cak", strelice) je zajednička - js/ui-wheel.js
  const attachWheel = (el, fn) => window.AJWheel.attach(el, fn);
  const wheelJump = (el, idx) => window.AJWheel.jump(el, idx);

  function anchorParts() {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec($('ml-date').value);
    if (!m) return null;
    const [h, mi] = ($('ml-time').value || '12:00').split(':').map(Number);
    return { y: +m[1], mo: +m[2], d: +m[3], h, mi };
  }

  // traka dana: ±30 dana od sidra, u vrijeme sidra (bez pomaka sati - inače bi se svaki sat
  // morala ponovno crtati cijela traka); odabrani dan = ml-sl-day
  async function renderDayWheel() {
    const box = $('ml-week'), a = anchorParts();
    if (!box || !a) return;
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    const key = ['wheel', place.lat, place.lon, a.y, a.mo, a.d, a.h, a.mi, light, window.AJMoon.hasHeight()].join('|');
    const want = +$('ml-sl-day').value + DAY_R;
    if (key === weekKey) { if (box._idx !== want) wheelJump(box, want); return; }
    weekKey = key;
    const my = ++weekGen;
    box.classList.add('ml-wheel');
    const days = [];
    for (let j = -DAY_R; j <= DAY_R; j++) {
      const date = localToUtc(a.y, a.mo, a.d + j, a.h, a.mi, place.tz).date;
      days.push({ j, w: j + DAY_R, date });
    }
    box.innerHTML = days.map(d => {
      const k = window.Astronomy.Illumination('Moon', d.date).phase_fraction;
      return '<button type="button" class="ml-day" role="listitem" data-w="' + d.w + '">' +
        '<span class="ml-day-name">' + fmt(d.date, { weekday: 'short' }) + '</span>' +
        '<span class="ml-day-date">' + dmy(d.date) + '</span>' +
        '<span class="ml-day-moon"></span>' +
        '<span class="ml-day-phase">' + window.AJMoon.phaseName(d.date) + '</span>' +
        '<span class="ml-day-pct">' + Math.round(k * 100) + ' %</span></button>';
    }).join('');
    attachWheel(box, idx => {
      $('ml-sl-day').value = idx - DAY_R;
      sliderLabels(); update(true);
    });
    wheelJump(box, want);
    // sličice: od odabranog dana prema van (najprije one koje se vide)
    const D = Math.round(56 * Math.min(window.devicePixelRatio || 1, 2));
    const order = days.slice().sort((p, q) => Math.abs(p.w - want) - Math.abs(q.w - want));
    for (const d of order) {
      const g = window.AJMoon.geometry(d.date, place.lat, place.lon);
      const c = await window.AJMoon.render(D, g, Object.assign({ glow: false, relief: window.AJMoon.hasHeight() }, { earth: 0.07 }));
      if (my !== weekGen) return;
      const slot = box.children[d.w] && box.children[d.w].querySelector('.ml-day-moon');
      if (slot) slot.appendChild(c);
    }
  }

  // traka sati: ±24 h od vremena sidra, oznaka = mjesno vrijeme (uz „+1 d"/„−1 d" preko ponoći)
  let hourKey = '';
  function renderHourWheel() {
    const box = $('ml-hourwheel'), a = anchorParts();
    if (!box || !a) return;
    const want = Math.round(+$('ml-sl-hour').value) + HOUR_R;
    const key = a.h + ':' + a.mi;
    if (key !== hourKey) {
      hourKey = key;
      let html = '';
      for (let k = -HOUR_R; k <= HOUR_R; k++) {
        const t = a.h * 60 + a.mi + k * 60, dd = Math.floor(t / 1440), mm = ((t % 1440) + 1440) % 1440;
        html += '<button type="button" class="ml-hour" data-w="' + (k + HOUR_R) + '"><span class="ml-hour-t">' +
          pad(Math.floor(mm / 60)) + ':' + pad(mm % 60) + '</span><span class="ml-hour-d">' +
          (dd ? (dd > 0 ? '+' : '−') + Math.abs(dd) + ' d' : '') + '</span></button>';
      }
      box.innerHTML = html;
      attachWheel(box, idx => {
        $('ml-sl-hour').value = idx - HOUR_R;
        sliderLabels(); update(true);
      });
      box._idx = -1;
    }
    if (box._idx !== want) wheelJump(box, want);
  }

  function sliderLabels() {
    const h = +$('ml-sl-hour').value, d = +$('ml-sl-day').value;
    const hh = Math.trunc(h), mm = Math.round(Math.abs(h - hh) * 60);
    $('ml-sl-hour-val').textContent = (h > 0 ? '+' : h < 0 && hh === 0 ? '−' : '') + String(hh).replace('-', '−') + (mm ? ':' + pad(mm) : '') + ' h';
    $('ml-sl-day-val').textContent = (d > 0 ? '+' : '') + String(d).replace('-', '−') + ' d';
  }

  /* ---------- init ---------- */

  function init() {
    if (inited) return;
    inited = true;
    $('ml-place').value = DEFAULT_PLACE.label;
    $('ml-place-ok').style.display = 'inline';
    initPlaceAutocomplete({
      inputId: 'ml-place', ddId: 'ml-place-dd', okId: 'ml-place-ok',
      // dok se tipka (null) ostaje prethodno mjesto - Mjesec ne nestaje
      onSelect: p => { if (p) { place = p; update(); } }
    });
    setAnchorNow();
    sliderLabels();

    // strelice uz trake rješava js/ui-wheel.js (zajedničko s tranzitima)
    $('ml-now').addEventListener('click', () => { setAnchorNow(); sliderLabels(); update(); });
    // novi datum/vrijeme gore = nova sredina traka (pomaci dana i sati se vrate na 0)
    ['ml-date', 'ml-time'].forEach(id => $(id).addEventListener('change', () => {
      $('ml-sl-day').value = 0; $('ml-sl-hour').value = 0; sliderLabels(); update();
    }));
    ['ml-sl-hour', 'ml-sl-day'].forEach(id => {
      $(id).addEventListener('input', () => { sliderLabels(); update(true); });
    });
    // promjena širine (okretanje uređaja, prozor): elementi traka mijenjaju širinu - vrati odabrani u sredinu
    let rz = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => ['ml-week', 'ml-hourwheel'].forEach(id => {
        const el = $(id); if (el && el._idx >= 0) wheelJump(el, el._idx);
      }), 150);
    });
    new MutationObserver(() => { if (document.body.classList.contains('moon-mode')) update(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const lib = window.Astronomy ? Promise.resolve() : loadScript('js/lib/astronomy.browser.min.js');
    Promise.all([lib, window.AJMoon.loadMap(), window.AJMoon.loadMapHi(($('ml-moon').clientWidth || 380) * (window.devicePixelRatio || 1))]).then(() => {
      ready = true; update();
      // karta visina (2,2 MB) za reljef i sjene - ne čeka se; kad stigne, Mjesec i tjedan se ponovno nacrtaju
      window.AJMoon.loadHeight().then(() => { if (window.AJMoon.hasHeight()) { weekKey = ''; update(); } });
    }, () => {
      const err = $('ml-error');
      err.textContent = 'Astronomska biblioteka se nije učitala. Provjeri internetsku vezu.';
      err.style.display = '';
    });
  }

  function open() {
    if (typeof showPage === 'function') showPage('natal');
    document.body.classList.add('moon-mode');
    $('moon-tool').hidden = false;
    document.querySelectorAll('.tool-card[data-tool]').forEach(c => c.classList.toggle('is-active', c.dataset.tool === 'moon'));
    init();
    if (ready) update();
    requestAnimationFrame(() => {
      const t = $('moon-tool'), nav = document.getElementById('main-nav');
      const y = t.getBoundingClientRect().top + window.scrollY - ((nav ? nav.offsetHeight : 0) + 16);
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  }

  function close() {
    document.body.classList.remove('moon-mode');
    const t = $('moon-tool');
    if (t) t.hidden = true;
  }

  window.openMoonTool = open;
  window.MoonTool = { open, close };
})();
