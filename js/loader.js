/* ============================================================
   Alkemijana - orkestracija ekrana učitavanja (v. css/loader.css)
   ------------------------------------------------------------
   Skida .aj-loading s <html> tek kad su ISPUNJENA OBA uvjeta:
     1. fontovi su stvarno učitani (inače bljesne fallback font)
     2. app.js je odradio init i poslao događaj 'aj:ready'
        (tada su TEXTS primijenjeni i sekcije renderirane)

   Uz to:
     - MIN_MS  - minimalno trajanje da ekran ne "bljesne" na brzoj vezi
                 (kraće ako je posjetitelj već vidio ekran u ovoj sesiji)
     - FONT_MS - fontove ne čekamo beskonačno
     - FAILSAFE_MS - ako nešto pukne, stranica se svejedno otvori

   Učitava se u <head> s defer: izvrši se nakon parsiranja DOM-a, a
   prije DOMContentLoaded, pa je slušač za 'aj:ready' sigurno spreman.
   ============================================================ */

(function () {
  'use strict';

  var SEEN_KEY    = 'aj_loader_seen';
  var FONT_MS     = 2500;
  var FAILSAFE_MS = 6000;
  var OUT_MS      = 800;   // trajanje fade-outa (mora pratiti transition u CSS-u)
  var ENTER_MS    = 2200;  // dulje od najduže ulazne animacije u loader.css

  var seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}
  var MIN_MS = seen ? 280 : 900;

  var started    = Date.now();
  var appReady   = false;
  var fontsReady = false;
  var revealed   = false;

  function loader() { return document.getElementById('aj-loader'); }

  /* ---- 1. Fontovi ---- */

  function markFonts() {
    if (fontsReady) return;
    fontsReady = true;
    var el = loader();
    if (el) el.classList.add('ajl-fonts');
    maybeReveal();
  }

  if (document.fonts && document.fonts.load) {
    /* document.fonts.ready sam po sebi zna biti prerano razriješen, pa
       eksplicitno tražimo fontove koji se vide "iznad pregiba". */
    Promise.all([
      document.fonts.load('400 1em Tangerine'),
      document.fonts.load('700 1em "Playfair Display"'),
      document.fonts.load('400 1em "Atkinson Hyperlegible"'),
      document.fonts.load('700 1em "Atkinson Hyperlegible"'),
      document.fonts.load('500 1em Quicksand')
    ])
      .then(function () { return document.fonts.ready; })
      .then(markFonts)
      .catch(markFonts);
  } else {
    markFonts();
  }

  setTimeout(markFonts, FONT_MS);

  /* ---- 2. App (app.js javi kad je init gotov) ---- */

  document.addEventListener('aj:ready', function () {
    appReady = true;
    maybeReveal();
  });

  /* ---- 3. Otkrivanje stranice ---- */

  function maybeReveal() {
    if (!appReady || !fontsReady) return;
    setTimeout(reveal, Math.max(0, MIN_MS - (Date.now() - started)));
  }

  function reveal() {
    if (revealed) return;
    revealed = true;

    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}

    var el = loader();
    if (el) el.classList.add('ajl-done');   // traka napretka do kraja

    setTimeout(function () {
      var root = document.documentElement;
      root.classList.remove('aj-loading');
      root.classList.add('aj-reveal');      // pokreće ulaznu animaciju sadržaja
      if (el) el.classList.add('ajl-out');

      setTimeout(function () { if (el) el.remove(); }, OUT_MS);

      /* Klasa se skida kad ulazna animacija završi - inače bi se kaskada
         ponavljala pri SVAKOJ promjeni stranice (showPage prebacuje
         .page.active), a tamo već postoji fadeIn iz style.css. */
      setTimeout(function () { root.classList.remove('aj-reveal'); }, ENTER_MS);
    }, 240);
  }

  setTimeout(reveal, FAILSAFE_MS);
})();
