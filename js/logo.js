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

  function initHero(A) {
    var el = document.getElementById('hero-logo');
    if (!el) return;
    var anim = A.create(el, { vrsta: 'potpis', autoplay: false, mirovanje: false });
    var played = false, visible = false;
    var revealed = !document.documentElement.classList.contains('aj-loading');

    function tryPlay() {
      if (played || !revealed || !visible) return;
      played = true;
      anim.play();
    }
    document.addEventListener('aj:revealed', function () {
      revealed = true;
      setTimeout(tryPlay, 250);   // neka se sadržaj prvo pojavi
    });
    if (!('IntersectionObserver' in window)) { visible = true; tryPlay(); return; }
    /* Hero je vidljiv samo kad je početna aktivna I hero slide na ekranu
       (ostali slideovi su pomaknuti izvan ekrana transformom). Kad ode s
       ekrana usred ispisa, odmah se dovrši - povratak je uvijek statičan. */
    new IntersectionObserver(function (es) {
      visible = es.some(function (e) { return e.isIntersecting; });
      if (visible) tryPlay();
      else if (played) anim.seek(anim.duration + 1);
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
    if (!A) return;
    initFooter(A);
    initHero(A);
    initNav(A);
  });
})();
