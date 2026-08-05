/* ============================================================
   Alkemijana - Slide deck početne stranice (v. css/home-slides.css)
   ------------------------------------------------------------
   Početna se ne scrolla: svaki .hs-slide je jedan puni ekran, a
   kotačić / tipkovnica / swipe prebacuju slideove uz "kozmički zoom".

   Blog slide (data-hs-rail) je vodoravan - daljnje scrollanje pomiče
   članke lijevo-desno, pa tek kad dođe do kraja nastavlja okomito.

   Slideovi s data-hs-requires="<id>" postoje samo dok je taj element
   vidljiv (usluge/CTA/recenzije ovise o togglovima u adminu), zato se
   popis računa iz STVARNE vidljivosti, a ne iz fiksnog niza -
   applySettings() zove HomeSlides.refresh().

   Javni API: window.HomeSlides = { activate, deactivate, refresh, goTo }
   ============================================================ */

(function () {
  'use strict';

  /* Kratka pauza između koraka, NAMJERNO puno kraća od trajanja animacije:
     služi samo da jedan zamah kotačića ne preskoči tri slidea. Novi korak
     smije prekinuti prijelaz u tijeku - CSS tranzicija nastavi od trenutne
     vrijednosti pa nema trzaja, a čekanje kraja animacije ne blokira. */
  var LOCK_MS   = 270;
  var WHEEL_MIN = 42;    // prag akumuliranog kotačića za jedan korak
  var SWIPE_MIN = 46;    // prag swipea u px
  var IDLE_MS   = 220;   // pauza nakon koje se akumulator kotačića resetira

  var deck, dotsEl, hintEl;
  var slides   = [];     // samo VIDLJIVI slideovi, redom
  var current  = 0;
  var locked   = false;
  var lockT    = null;
  var active   = false;  // je li početna trenutno prikazana
  var wheelAcc = 0;
  var wheelT   = null;
  var moved    = false;  // je li korisnik već pomaknuo deck (za nagovještaj)

  var touchX = 0, touchY = 0, touchLive = false;

  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---- Popis vidljivih slideova ---- */

  function collect() {
    if (!deck) return;
    var all = Array.prototype.slice.call(deck.querySelectorAll('.hs-slide'));
    slides = all.filter(function (el) {
      var reqId = el.getAttribute('data-hs-requires');
      if (!reqId) return true;
      var req = document.getElementById(reqId);
      if (!req) return false;
      return getComputedStyle(req).display !== 'none';
    });

    // isključeni slideovi ne smiju ostati vidljivi iz prethodnog stanja
    all.forEach(function (el) {
      if (slides.indexOf(el) === -1) {
        el.classList.remove('hs-active', 'hs-past', 'hs-future');
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    });

    if (current >= slides.length) current = Math.max(0, slides.length - 1);
  }

  /* ---- Vodoravna traka (blog) ---- */

  function isRail(el) { return !!el && el.hasAttribute('data-hs-rail'); }

  function railParts(slide) {
    var track = slide.querySelector('.hs-rail-track');
    if (!track) return null;
    var cards = Array.prototype.slice.call(track.children);
    return cards.length ? { track: track, cards: cards } : null;
  }

  function layoutRail(slide) {
    var p = railParts(slide);
    if (!p) return;
    var viewport = slide.querySelector('.hs-rail-viewport');
    if (!viewport) return;

    var vw = viewport.clientWidth;
    if (!vw) return;   // slide još nije izmjeren (npr. skriven)

    /* Kartica raste s ekranom: na uskom zauzme skoro cijelu širinu, na
       širokom je ograničava i VISINA (inače na 4K TV-u kartica bude
       visoka pola ekrana i sadržaj se prelije). */
    var vh   = window.innerHeight || 800;
    var gap  = vw < 640 ? 16 : Math.round(Math.min(48, vw * 0.026));
    var card = vw < 640
      ? Math.round(vw * 0.84)
      : Math.round(Math.min(vw * 0.32, vh * 0.46, 560));

    p.track.style.setProperty('--hs-rail-gap', gap + 'px');
    p.track.style.setProperty('--hs-rail-card', card + 'px');

    var idx = parseInt(slide.dataset.hsRailIndex || '0', 10);
    if (idx >= p.cards.length) idx = Math.max(0, p.cards.length - 1);

    /* Sve kartice imaju istu širinu i razmak (postavljeni gore) pa je
       položaj čista aritmetika nad širinom trake. NE koristiti
       getBoundingClientRect: slide je u 3D prostoru pa su izmjereni
       pravokutnici skalirani dok traje prijelaz. */
    var x = vw / 2 - (idx * (card + gap) + card / 2);
    p.track.style.setProperty('--hs-rail-x', Math.round(x) + 'px');

    p.cards.forEach(function (c, i) { c.classList.toggle('hs-rail-current', i === idx); });
    paintRailDots(slide, idx, p.cards.length);
  }

  /* Traka se premjeri kad god joj se promijeni širina (promjena prozora,
     zoom, učitani fontovi) - pouzdanije od oslanjanja na 'resize'. */
  function watchRail(slide) {
    if (slide._hsRO || typeof ResizeObserver === 'undefined') return;
    var viewport = slide.querySelector('.hs-rail-viewport');
    if (!viewport) return;
    slide._hsRO = new ResizeObserver(function () { layoutRail(slide); });
    slide._hsRO.observe(viewport);
  }

  function paintRailDots(slide, idx, count) {
    var wrap = slide.querySelector('.hs-rail-dots');
    if (!wrap) return;
    if (wrap.children.length !== count) {
      wrap.innerHTML = '';
      for (var i = 0; i < count; i++) wrap.appendChild(document.createElement('i'));
    }
    Array.prototype.forEach.call(wrap.children, function (d, i) {
      d.classList.toggle('hs-on', i === idx);
    });
  }

  function railCount(slide) {
    var p = railParts(slide);
    return p ? p.cards.length : 0;
  }

  function setRail(slide, idx) {
    slide.dataset.hsRailIndex = String(idx);
    layoutRail(slide);
  }

  /* ---- Prebacivanje slideova ---- */

  function paint() {
    slides.forEach(function (el, i) {
      el.classList.toggle('hs-active', i === current);
      el.classList.toggle('hs-past',   i <  current);
      el.classList.toggle('hs-future', i >  current);
      /* Samo aktivan slide smije biti dohvatljiv tipkovnicom i čitačem
         ekrana - `inert` izbacuje ostale iz tab redoslijeda (sadržaj
         ostaje u DOM-u pa ga tražilice i dalje vide). */
      var hidden = i !== current;
      el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      if (hidden) el.setAttribute('inert', '');
      else        el.removeAttribute('inert');
    });

    document.documentElement.style.setProperty('--hs-sky', String(current));
    paintDots();

    // traka se premjeri kad postane vidljiva (prije toga clientWidth je 0)
    var act = slides[current];
    if (isRail(act)) layoutRail(act);
  }

  function goTo(idx, dir) {
    if (!slides.length) return;
    idx = Math.max(0, Math.min(slides.length - 1, idx));
    if (idx === current) return;

    var prev = current;
    current = idx;

    // ulazak u vodoravnu traku: odozgo na prvi članak, odozdo na zadnji
    var slide = slides[current];
    if (isRail(slide)) {
      var goingDown = (typeof dir === 'number') ? dir > 0 : current > prev;
      setRail(slide, goingDown ? 0 : Math.max(0, railCount(slide) - 1));
    }

    paint();
    markMoved();
    lock();
  }

  function step(dir) {
    if (!slides.length) return;
    var slide = slides[current];

    if (isRail(slide)) {
      var count = railCount(slide);
      var idx   = parseInt(slide.dataset.hsRailIndex || '0', 10);
      var next  = idx + dir;
      if (count && next >= 0 && next < count) {
        setRail(slide, next);
        markMoved();
        lock();
        return;
      }
      // traka je na kraju (ili početku) -> nastavi okomito
    }

    goTo(current + dir, dir);
  }

  function lock() {
    if (reduced()) return;
    locked = true;
    clearTimeout(lockT);
    lockT = setTimeout(function () { locked = false; }, LOCK_MS);
  }

  function markMoved() {
    if (moved) return;
    moved = true;
    if (hintEl) hintEl.classList.add('hs-gone');
  }

  /* ---- Indikator slideova ---- */

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    slides.forEach(function (el, i) {
      var b = document.createElement('button');
      var name = el.getAttribute('data-hs-name') || ('slide ' + (i + 1));
      b.type = 'button';
      b.setAttribute('aria-label', 'Prikaži: ' + name);
      b.addEventListener('click', function () { goTo(i); });
      dotsEl.appendChild(b);
    });
    paintDots();
  }

  function paintDots() {
    if (!dotsEl) return;
    Array.prototype.forEach.call(dotsEl.children, function (b, i) {
      b.classList.toggle('hs-on', i === current);
      b.setAttribute('aria-current', i === current ? 'true' : 'false');
    });
  }

  /* ---- Ulazni događaji ---- */

  /* Događaji iz admin panela, ladice izbornika i privole ne smiju
     pomicati deck (te površine imaju vlastiti scroll). */
  function fromOverlay(e) {
    var t = e.target;
    if (!t || !t.closest) return false;
    return !!t.closest('#admin-panel-overlay, #admin-login-overlay, .nd-drawer, .cc-banner, .cc-panel, .cc-overlay');
  }

  function busy(e) {
    return !active || fromOverlay(e) ||
           document.documentElement.classList.contains('nd-locked') ||
           document.documentElement.classList.contains('aj-loading');
  }

  function onWheel(e) {
    if (busy(e)) return;
    e.preventDefault();
    if (locked) { wheelAcc = 0; return; }

    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;            // deltaMode: reci
    else if (e.deltaMode === 2) d *= window.innerHeight;

    // promjena smjera poništava dosad skupljeno
    if (wheelAcc && Math.sign(d) !== Math.sign(wheelAcc)) wheelAcc = 0;
    wheelAcc += d;

    clearTimeout(wheelT);
    wheelT = setTimeout(function () { wheelAcc = 0; }, IDLE_MS);

    if (Math.abs(wheelAcc) >= WHEEL_MIN) {
      var dir = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      step(dir);
    }
  }

  function onKey(e) {
    if (busy(e)) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

    var k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Spacebar') { e.preventDefault(); step(1); }
    else if (k === 'ArrowUp' || k === 'PageUp')  { e.preventDefault(); step(-1); }
    else if (k === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (k === 'ArrowLeft')  { e.preventDefault(); step(-1); }
    else if (k === 'Home') { e.preventDefault(); goTo(0, -1); }
    else if (k === 'End')  { e.preventDefault(); goTo(slides.length - 1, 1); }
  }

  function onTouchStart(e) {
    if (busy(e) || !e.touches || e.touches.length !== 1) { touchLive = false; return; }
    touchLive = true;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (!touchLive || busy(e)) return;
    // spriječi gumeno povlačenje cijele stranice na mobitelu
    if (e.cancelable) e.preventDefault();
  }

  function onTouchEnd(e) {
    if (!touchLive || busy(e)) return;
    touchLive = false;
    if (locked) return;

    var t = (e.changedTouches && e.changedTouches[0]) || null;
    if (!t) return;

    var dx = touchX - t.clientX;
    var dy = touchY - t.clientY;

    // vodoravni swipe se broji samo ako je izraženiji od okomitog
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) >= SWIPE_MIN) step(dx > 0 ? 1 : -1);
    } else if (Math.abs(dy) >= SWIPE_MIN) {
      step(dy > 0 ? 1 : -1);
    }
  }

  /* ---- Uključivanje / isključivanje ---- */

  function activate() {
    if (!deck) return;
    active = true;
    document.documentElement.classList.add('hs-lock');
    refresh();
  }

  function deactivate() {
    active = false;
    document.documentElement.classList.remove('hs-lock');
    document.documentElement.style.removeProperty('--hs-sky');
  }

  function refresh() {
    if (!deck) return;
    collect();
    buildDots();
    paint();
    slides.forEach(function (s) {
      if (!isRail(s)) return;
      watchRail(s);
      layoutRail(s);
    });
  }

  function onResize() {
    slides.forEach(function (s) { if (isRail(s)) layoutRail(s); });
  }

  /* ---- Init ---- */

  function init() {
    deck   = document.getElementById('hs-deck');
    dotsEl = document.getElementById('hs-dots');
    hintEl = document.getElementById('hs-hint');
    if (!deck) return;

    // wheel/touchmove moraju biti non-passive da preventDefault radi
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    var home = document.getElementById('home');
    if (home && home.classList.contains('active')) activate();
    else refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HomeSlides = {
    activate:   activate,
    deactivate: deactivate,
    refresh:    refresh,
    goTo:       goTo
  };
})();
