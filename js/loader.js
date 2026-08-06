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

  /* Ekran učitavanja se namjerno zadržava i kad je sve već spremno -
     ulaz je dio dojma. Prvi dolazak 1.8 s, ponovni posjet u istoj
     sesiji 0.8 s da ne smeta pri navigaciji. Ne dizati preko ~2 s. */
  var seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}
  var MIN_MS = seen ? 800 : 1800;

  var started    = Date.now();
  var appReady   = false;
  var fontsReady = false;
  var revealed   = false;
  var warming    = false;   // zagrijavanje se pokreće samo jednom

  function loader() { return document.getElementById('aj-loader'); }

  /* ---- Traka napretka ----
     Jedna jedina tranzicija `transform: scaleX()` (v. css/loader.css):
       - puzanje: od 6 % do 90 % kroz CREEP_MS, s jakim usporavanjem pri
         kraju, pa traka nikad ne stane dok se čeka
       - dovršetak: prekid te tranzicije i kratki potez do 100 %
     Prekinuta tranzicija kreće od TRENUTNE vrijednosti, pa nema skoka
     bez obzira kad stranica bude spremna (brz reload ili spora veza).
     Ne vraćati na @keyframes s međutočkama ni na animaciju širine -
     oboje daje vidljivo zastajkivanje dok je glavna dretva zauzeta. */

  var CREEP_MS = 4200;   // dulje od MIN_MS: traka jos puze kad se otkriva

  function bar() {
    var el = loader();
    return el ? el.querySelector('.ajl-bar > i') : null;
  }

  function startBar() {
    var b = bar();
    if (!b) return;
    /* Čitanje offsetWidth prisili preglednik da prvo primijeni početno
       stanje iz CSS-a (scaleX(0.06)); bez toga bi obje vrijednosti pale
       u isti kadar i tranzicija se ne bi ni pokrenula. Namjerno NIJE
       requestAnimationFrame - taj u pozadinskoj kartici ne okine. */
    void b.offsetWidth;
    b.style.transition = 'transform ' + CREEP_MS + 'ms cubic-bezier(0.05, 0.75, 0.2, 1)';
    b.style.transform  = 'scaleX(0.9)';
  }

  function finishBar() {
    var b = bar();
    if (!b) return;
    b.style.transition = 'transform 300ms cubic-bezier(0.3, 0.8, 0.4, 1)';
    b.style.transform  = 'scaleX(1)';
  }

  startBar();

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
    if (!appReady || !fontsReady || warming) return;
    warming = true;

    /* Prije otkrivanja pusti deck početne da se "zagrije": svaki slide
       se jednom iscrta i sve slike se dekodiraju dok je ekran učitavanja
       još gore. Tako prvi prelazak na neki slide ne mora rasterizirati
       sadržaj usred animacije. Ako HomeSlides nije tu (druga stranica),
       ide se odmah dalje. */
    var warm = (window.HomeSlides && window.HomeSlides.warmup)
      ? window.HomeSlides.warmup()
      : Promise.resolve();

    warm.catch(function () {}).then(function () {
      setTimeout(reveal, Math.max(0, MIN_MS - (Date.now() - started)));
    });
  }

  function reveal() {
    if (revealed) return;
    revealed = true;

    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}

    var el = loader();
    if (el) el.classList.add('ajl-done');
    finishBar();   // traka dovrši potez prije nego ekran nestane

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
    }, 300);   // koliko traje dovršetak trake (finishBar)
  }

  setTimeout(reveal, FAILSAFE_MS);
})();
