/* ============================================================
   Alkemijana - logo na stranici (hero, traka, podnožje)
   ------------------------------------------------------------
   Crta ga js/alkemijana-anim.js (generiran iz logo/animacije/ -
   ne uređivati ručno). Ovdje je samo KADA i KOJA verzija:

   - HERO (#hero-logo): „Potpis" se ispiše SAMO prvi put kad posjetitelj
     vidi hero slide; svaki sljedeći put je statičan cijeli logo. Čeka
     'aj:revealed' iz js/loader.js - inače bi se ispisivao iza ekrana
     učitavanja.
   - TRAKA (#nav-logo): šešir.
       mobitel / dodir → statičan šešir
       miš (hover)     → šešir se na hover pretvori u A pa dopiše
                         „lkemijana"; na odlazak miša: ako su slova već
                         počela → brisanje pa natrag u šešir, inače odmah
                         natrag u šešir (logika u hoverIn/hoverOut modula).
     Uvijek bez bljeska, zvjezdica i lebdenja (pero: false).
   - PODNOŽJE (#footer-logo): statičan „Potpis".

   Učitava se kao obična skripta na dnu <body>, a modul je `defer` u
   <head> - zato sve ide na DOMContentLoaded (defer skripte se izvrše
   prije tog događaja).
   ============================================================ */

(function () {
  'use strict';

  var NO_A11Y = 'aria-hidden="true" focusable="false"';

  function initFooter(A) {
    var el = document.getElementById('footer-logo');
    if (el) el.innerHTML = A.staticSvg('potpis', { attrs: NO_A11Y });
  }

  /* 'aj:hero-done' = hero je gotov (ispisan, preskočen ili se uopće ne
     prikazuje) - na njega čeka traka za kolačiće (js/consent.js), da ne
     uleti usred ispisa loga. Javi se TOČNO JEDNOM; window.AJHeroDone ostaje
     true za skripte koje se jave kasnije. */
  function heroDone() {
    if (window.AJHeroDone) return;
    window.AJHeroDone = true;
    document.dispatchEvent(new CustomEvent('aj:hero-done'));
  }

  function initHero(A) {
    var el = document.getElementById('hero-logo');
    if (!el) { heroDone(); return; }
    /* 31. 10. i 1. 11. hero se ispisuje „krvlju" - isti potez, ali na kraju s
       loga kapne nekoliko kapi koje se slijevaju. Boju ne diramo: pod html.hw-on
       je --lavender ionako već prebojan u tamnu krv, a --aa-boja ga prati. */
    var krv = !!(window.AJHalloween && window.AJHalloween.krvniHero);
    var anim = A.create(el, { vrsta: krv ? 'krv' : 'potpis', autoplay: false, mirovanje: false });
    var played = false, visible = false, flashT = 0;
    var revealed = !document.documentElement.classList.contains('aj-loading');

    function tryPlay() {
      if (played || !revealed || !visible) return;
      played = true;
      anim.play();
      // kraj ispisa + završni bljesak (i Halloween lice) + kratki predah
      setTimeout(heroDone, anim.duration * 1000 + 500);
      /* Završni bljesak („bloom" u alkemijana-anim.js) traje 1,3 s / tempo (1,7)
         i završava s animacijom - tad se javi 'aj:hero-flash' (Halloween: lice
         Jack-o'-lanterna iza loga). Bez kretanja nema ni bljeska. */
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { heroDone(); return; }
      var FLASH = 1.3 / 1.7;
      flashT = setTimeout(function () {
        flashT = 0;
        el.dispatchEvent(new CustomEvent('aj:hero-flash', { bubbles: true, detail: { dur: FLASH } }));
      }, Math.max(0, anim.duration - FLASH) * 1000);
    }
    document.addEventListener('aj:revealed', function () {
      revealed = true;
      setTimeout(tryPlay, 250);   // neka se sadržaj prvo pojavi
      /* Hero nije na ekranu (npr. ulaz ravno na #blog) - nema što čekati.
         Odluka po stanju stranice, NE po IntersectionObserveru: on se u
         kartici u pozadini ne javi, pa bi „nije vidljiv" bio lažan. Ako je
         hero slide aktivan, čeka se ispis - uz rok od 3 s, koji se broji tek
         kad je kartica vidljiva (otvorena u pozadini = još ništa ne vidi). */
      var slide = el.closest('.hs-slide');
      var onScreen = document.getElementById('home').classList.contains('active') &&
        (!slide || slide.classList.contains('hs-active'));
      if (!onScreen) { heroDone(); return; }
      var arm = function () { setTimeout(function () { if (!played) heroDone(); }, 3000); };
      if (!document.hidden) arm();
      else document.addEventListener('visibilitychange', function once() {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', once);
        arm();
      });
    });
    if (!('IntersectionObserver' in window)) { visible = true; tryPlay(); return; }
    /* Hero je vidljiv samo kad je početna aktivna I hero slide na ekranu
       (ostali slideovi su pomaknuti izvan ekrana transformom). Kad ode s
       ekrana usred ispisa, odmah se dovrši - povratak je uvijek statičan. */
    new IntersectionObserver(function (es) {
      visible = es.some(function (e) { return e.isIntersecting; });
      if (visible) tryPlay();
      else if (played) { anim.seek(anim.duration + 1); clearTimeout(flashT); flashT = 0; heroDone(); }
    }, { threshold: 0.35 }).observe(el);
  }

  function initNav(A) {
    var logo = document.getElementById('nav-logo');
    var art = logo && logo.querySelector('.logo-art');
    if (!art) return;
    var mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    var anim = null;

    function build() {
      if (anim) { anim.destroy(); anim = null; }
      logo.classList.remove('is-open');
      if (mq.matches) {
        art.classList.remove('is-static');
        anim = A.create(art, {
          vrsta: 'navigacija', autoplay: false, pero: false,
          // dok lik nije šešir, hover-područje pokriva i slova (.logo.is-open::after)
          onStanje: function (st) { logo.classList.toggle('is-open', st !== 'hat'); }
        });
        var svg = art.querySelector('svg');
        if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.removeAttribute('role'); }
      } else {
        art.classList.add('is-static');
        art.innerHTML = A.staticSvg('sesir', { attrs: NO_A11Y });
      }
    }

    logo.addEventListener('pointerenter', function (e) { if (anim && e.pointerType === 'mouse') anim.hoverIn(); });
    logo.addEventListener('pointerleave', function (e) { if (anim && e.pointerType === 'mouse') anim.hoverOut(); });
    if (mq.addEventListener) mq.addEventListener('change', build); else if (mq.addListener) mq.addListener(build);
    build();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var A = window.AlkemijanaAnim;
    if (!A) { heroDone(); return; }
    initFooter(A);
    initHero(A);
    initNav(A);
  });
})();
