/* ============================================================
   PRIVOLA ZA KOLAČIĆE (GDPR / ePrivacy)
   ============================================================

   Samostalan modul - nema ovisnosti o ostatku stranice.

   NAČELO (strogo tumačenje ePrivacy direktive):
   Google Analytics skripta se NE UČITAVA dok posjetitelj izričito
   ne pristane. Dok nema privole, prema Googleu ne ide NIJEDAN
   zahtjev - dakle ni IP adresa posjetitelja. Uz to je postavljen
   i Google Consent Mode v2 (u index.html, defaults = denied) pa je
   pokriven i slučaj da se gtag ikad učita nekim drugim putem.

   Odbijanje mora biti jednako lako kao prihvaćanje (čl. 7 GDPR),
   zato su "Prihvaćam" i "Odbijam" vizualno ravnopravni gumbi.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'aj_consent';
  var VERSION     = 1;              // povećaj ako se skup kolačića promijeni -> ponovno pitanje
  var GA_ID       = 'G-ZEYLD5W4RS';

  var gaLoaded = false;

  /* ---------- pohrana odluke ---------- */

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || c.v !== VERSION) return null;   // stara verzija -> pitaj ponovno
      return c;
    } catch (e) { return null; }
  }

  function writeConsent(analytics) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: VERSION,
        analytics: !!analytics,
        ts: new Date().toISOString()
      }));
    } catch (e) {}
  }

  /* ---------- Google Analytics ---------- */

  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    if (typeof window.gtag === 'function') {
      window.gtag('js', new Date());
      window.gtag('config', GA_ID, { anonymize_ip: true });
    }
  }

  /* Briše _ga kolačiće pri povlačenju privole. Postavljeni su na
     ".alkemijana.com" pa ih treba obrisati i s točkom i bez nje. */
  function clearGACookies() {
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    var parts = host.split('.');
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));

    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0 && name.indexOf('_gid') !== 0) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' +
          (d ? '; domain=' + d : '');
      });
    });
  }

  function applyConsent(analytics) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied'
      });
    }
    if (analytics) {
      loadGA();
    } else {
      clearGACookies();
    }
  }

  /* ---------- izgradnja DOM-a ---------- */

  var banner = null, panel = null;

  function buildBanner() {
    if (banner) return banner;

    banner = document.createElement('div');
    banner.className = 'cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Obavijest o kolačićima');
    /* Tekst je namjerno kratak - objašnjenje čemu kolačići služe stoji u
       pravilima privatnosti, iza poveznice "Više informacija".
       Gumb "Odbijam" MORA ostati uz "Prihvaćam" i biti jednako istaknut:
       privola po GDPR-u mora biti dobrovoljna, a samo-"Prihvaćam" banner
       (tzv. prešutna privola) nije valjana privola. */
    banner.innerHTML =
      '<div class="cc-banner-inner">' +
        '<div class="cc-text">' +
          '<span class="cc-star">✧</span> ' +
          'Ova stranica koristi kolačiće. ' +
          '<a href="#privatnost" onclick="showPage(\'privatnost\')">Više informacija</a>.' +
        '</div>' +
        '<div class="cc-actions">' +
          '<button type="button" class="cc-btn" data-cc="reject">Odbijam</button>' +
          '<button type="button" class="cc-btn cc-btn-primary" data-cc="accept">Prihvaćam</button>' +
        '</div>' +
      '</div>';

    banner.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-cc');
      if (act === 'accept')   { writeConsent(true);  applyConsent(true);  hideBanner(); }
      if (act === 'reject')   { writeConsent(false); applyConsent(false); hideBanner(); }
      if (act === 'settings') { hideBanner(); openPanel(); }
    });

    document.body.appendChild(banner);
    return banner;
  }

  function showBanner() {
    buildBanner();
    requestAnimationFrame(function () { banner.classList.add('cc-show'); });
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('cc-show');
  }

  function buildPanel() {
    if (panel) return panel;

    panel = document.createElement('div');
    panel.className = 'cc-overlay';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Postavke kolačića');
    panel.innerHTML =
      '<div class="cc-panel">' +
        '<button type="button" class="cc-close" data-cc="close" aria-label="Zatvori">×</button>' +
        '<h3>Postavke kolačića</h3>' +
        '<p class="cc-panel-sub">Odaberi što dopuštaš. Odluku možeš promijeniti bilo kada ' +
          'preko poveznice „Postavke kolačića” u podnožju stranice.</p>' +

        '<div class="cc-group">' +
          '<div class="cc-group-head">' +
            '<span class="cc-group-title">Nužni</span>' +
            '<span class="cc-always">Uvijek uključeno</span>' +
          '</div>' +
          '<p class="cc-group-desc">Potrebni su da stranica uopće radi: pamćenje tvoje odluke o ' +
            'kolačićima, odabir tamne/svijetle teme i podaci koje upišeš u astro alate. ' +
            'Sve to ostaje samo u tvom pregledniku i ne šalje se nikome.</p>' +
        '</div>' +

        '<div class="cc-group">' +
          '<div class="cc-group-head">' +
            '<label class="cc-group-title" for="cc-analytics">Analitika</label>' +
            '<label class="cc-switch">' +
              '<input type="checkbox" id="cc-analytics">' +
              '<span class="cc-slider"></span>' +
            '</label>' +
          '</div>' +
          '<p class="cc-group-desc">Google Analytics (kolačići <code>_ga</code>, traju do 2 godine). ' +
            'Pokazuje mi koliko je posjeta i koje su stranice najčitanije. ' +
            'Ako ovo ne uključiš, Google se uopće ne kontaktira.</p>' +
        '</div>' +

        '<div class="cc-panel-actions">' +
          '<button type="button" class="cc-btn" data-cc="reject-all">Odbij sve</button>' +
          '<button type="button" class="cc-btn cc-btn-primary" data-cc="save">Spremi odabir</button>' +
        '</div>' +
      '</div>';

    panel.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-cc');
      if (e.target === panel || act === 'close') { closePanel(); maybeReshowBanner(); return; }
      if (act === 'save') {
        var on = document.getElementById('cc-analytics').checked;
        writeConsent(on); applyConsent(on); closePanel(); hideBanner();
      }
      if (act === 'reject-all') {
        writeConsent(false); applyConsent(false); closePanel(); hideBanner();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel && panel.classList.contains('cc-show')) {
        closePanel(); maybeReshowBanner();
      }
    });

    document.body.appendChild(panel);
    return panel;
  }

  function openPanel() {
    buildPanel();
    var cur = readConsent();
    document.getElementById('cc-analytics').checked = !!(cur && cur.analytics);
    requestAnimationFrame(function () { panel.classList.add('cc-show'); });
  }

  function closePanel() {
    if (panel) panel.classList.remove('cc-show');
  }

  /* Ako je panel zatvoren bez odluke, banner se mora vratiti -
     inače bi posjetitelj ostao bez ikakvog izbora. */
  function maybeReshowBanner() {
    if (!readConsent()) showBanner();
  }

  /* ---------- mjerenje događaja (GA4) ----------

     Jedina točka iz koje ostatak stranice šalje događaje u Google Analytics.
     Šalje SAMO ako je posjetitelj pristao na analitiku i ako je gtag stvarno
     učitan - bez privole ne ide nijedan zahtjev prema Googleu, kao i za
     preglede stranica.

     PRAVILO: u parametre NIKAD ne smije ući osobni podatak (ime, datum ili
     mjesto rođenja, sadržaj kontakt forme). Šalje se samo KOJI je alat
     korišten, ne S ČIME. Inače bi se izračun karte, koji se cijeli odvija u
     pregledniku, počeo curiti prema Googleu - a pravila privatnosti tvrde
     suprotno (v. CLAUDE.md, GDPR odjeljak).

     GA4 ograničenja kojih se držimo: naziv događaja i parametra do 40 znakova
     (mala slova, brojke, donja crta), vrijednost parametra do 100 znakova. */
  function track(name, params) {
    try {
      if (!gaLoaded || typeof window.gtag !== 'function') return;
      var c = readConsent();
      if (!c || !c.analytics) return;
      var p = {}, k;
      for (k in (params || {})) {
        if (!Object.prototype.hasOwnProperty.call(params, k)) continue;
        var v = params[k];
        if (v === undefined || v === null) continue;
        p[k] = (typeof v === 'string') ? v.slice(0, 100) : v;
      }
      window.gtag('event', name, p);
    } catch (e) {}
  }

  /* ---------- javni API ---------- */

  window.AJConsent = {
    open: openPanel,
    get:  readConsent
  };

  /* Pozivati uvijek obranjeno: `if (window.AJTrack) window.AJTrack('ime', {...})`
     - consent.js se učitava POSLIJE ostalih skripti. */
  window.AJTrack = track;

  /* Poveznica u podnožju */
  window.openCookieSettings = function () { openPanel(); };

  /* ---------- start ---------- */

  function init() {
    var c = readConsent();
    if (c) {
      applyConsent(c.analytics);   // ranija odluka - bez bannera
    } else {
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
