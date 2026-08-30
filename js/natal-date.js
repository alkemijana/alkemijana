/* ============================================================
   UNOS DATUMA: DAN / MJESEC / GODINA
   ------------------------------------------------------------
   Nativni <input type="date"> je na Androidu za datum ROĐENJA vrlo nezgodan:
   otvori se kalendar na današnjem mjesecu, pa se do 1985. dolazi tapkanjem po
   zaglavlju i listanjem duge liste godina. Zato se svaki <input type="date">
   ovdje "nadogradi" u tri polja - dan (tipkovnica s brojkama), mjesec (padajući
   popis s imenima mjeseci) i godina (tipkovnica s brojkama). Upis godine je
   tako četiri dodira umjesto listanja.

   Izvorni <input type="date"> OSTAJE u DOM-u (samo skriven) i i dalje je jedini
   izvor istine: sav postojeći kod (natal.js, natal-synastry.js, natal-transit.js)
   čita i piše document.getElementById('natal-date').value u obliku YYYY-MM-DD
   i nije ga trebalo mijenjati.

   Zato je i `value` na tom skrivenom polju presložen (getter/setter): kad mu
   BILO TKO iz koda pridijeli vrijednost, tri vidljiva polja se sama osvježe.
   Bez toga bi svako novo mjesto koje postavlja datum moralo pamtiti da pozove
   sinkronizaciju - a upravo takve "ne zaboravi pozvati" veze su u ovom projektu
   već bile izvor kvarova.

   Ako se skripta ne učita, u HTML-u ostaje obični <input type="date"> koji radi
   kao i prije - zato se skrivanje radi iz JS-a, a ne u HTML-u.
   ============================================================ */
(function () {
  'use strict';

  var MONTHS = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj',
                'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'];

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function daysInMonth(y, m) {
    if (m === 2) return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : 28;
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] || 31;
  }

  function digits(s) { return String(s == null ? '' : s).replace(/[^0-9]/g, ''); }

  function upgrade(hidden) {
    if (!hidden || hidden.dataset.dmyReady) return;
    hidden.dataset.dmyReady = '1';

    var id   = hidden.id || ('dmy-' + Math.random().toString(36).slice(2));
    var wrap = document.createElement('div');
    wrap.className = 'nt-dmy';

    var dayEl = document.createElement('input');
    dayEl.type = 'text';
    dayEl.className = 'nt-dmy-f nt-dmy-d';
    dayEl.id = id + '-d';
    dayEl.inputMode = 'numeric';
    dayEl.setAttribute('pattern', '[0-9]*');
    dayEl.maxLength = 2;
    dayEl.placeholder = 'dan';
    dayEl.autocomplete = 'off';
    dayEl.setAttribute('aria-label', 'Dan');

    var monEl = document.createElement('select');
    monEl.className = 'nt-dmy-f nt-dmy-m';
    monEl.id = id + '-m';
    monEl.setAttribute('aria-label', 'Mjesec');
    monEl.appendChild(new Option('mjesec', ''));
    MONTHS.forEach(function (name, i) { monEl.appendChild(new Option(name, String(i + 1))); });

    var yearEl = document.createElement('input');
    yearEl.type = 'text';
    yearEl.className = 'nt-dmy-f nt-dmy-y';
    yearEl.id = id + '-y';
    yearEl.inputMode = 'numeric';
    yearEl.setAttribute('pattern', '[0-9]*');
    yearEl.maxLength = 4;
    yearEl.placeholder = 'godina';
    yearEl.autocomplete = 'off';
    yearEl.setAttribute('aria-label', 'Godina');

    hidden.parentNode.insertBefore(wrap, hidden);
    wrap.appendChild(dayEl);
    wrap.appendChild(monEl);
    wrap.appendChild(yearEl);
    wrap.appendChild(hidden);
    hidden.hidden = true;

    // Natpis iznad polja neka fokusira dan, a ne skriveno polje.
    var lab = document.querySelector('label[for="' + id + '"]');
    if (lab) lab.setAttribute('for', dayEl.id);

    var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    var syncing = false;   // brani petlju setter -> sync -> compose -> setter

    function setHidden(v) {
      if (desc.get.call(hidden) === v) return false;
      desc.set.call(hidden, v);
      return true;
    }

    /* Tri polja -> skriveno polje. Datum se sastavi tek kad su sva tri popunjena
       i strukturno ispravna. Raspon godina (1900.-2099.) se NE provjerava ovdje
       nego ga i dalje javlja validacija u natal.js, da poruka ostane ista. */
    function compose() {
      if (syncing) return;
      var d = digits(dayEl.value);
      var m = parseInt(monEl.value, 10);
      var y = digits(yearEl.value);
      var out = '';
      if (d && m >= 1 && m <= 12 && y.length === 4) {
        var yy = parseInt(y, 10);
        var dd = Math.min(Math.max(parseInt(d, 10), 1), daysInMonth(yy, m));
        out = yy + '-' + pad2(m) + '-' + pad2(dd);
      }
      if (setHidden(out)) {
        hidden.dispatchEvent(new Event('input',  { bubbles: true }));
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    /* Skriveno polje -> tri polja (kad datum postavi kod: vraćanje zadnjeg
       unosa, "Sada" kod tranzita, popunjavanje druge osobe...). */
    function syncFromHidden() {
      var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(desc.get.call(hidden) || '');
      syncing = true;
      if (parts) {
        yearEl.value = parts[1];
        monEl.value  = String(parseInt(parts[2], 10));
        dayEl.value  = String(parseInt(parts[3], 10));
      } else {
        dayEl.value = ''; monEl.value = ''; yearEl.value = '';
      }
      syncing = false;
    }

    Object.defineProperty(hidden, 'value', {
      configurable: true,
      get: function () { return desc.get.call(this); },
      set: function (v) { setHidden(v); syncFromHidden(); }
    });

    dayEl.addEventListener('input', function () {
      var clean = digits(dayEl.value).slice(0, 2);
      if (clean !== dayEl.value) dayEl.value = clean;
      compose();
      // Dva upisana broja - skok na mjesec, da se ne mora ciljati prstom.
      if (clean.length === 2) monEl.focus();
    });
    dayEl.addEventListener('blur', function () {
      var n = parseInt(digits(dayEl.value), 10);
      if (!n) { dayEl.value = ''; compose(); return; }
      var m  = parseInt(monEl.value, 10);
      var y  = parseInt(digits(yearEl.value), 10);
      var mx = (m >= 1 && m <= 12) ? daysInMonth(y || 2000, m) : 31;
      dayEl.value = String(Math.min(Math.max(n, 1), mx));
      compose();
    });

    monEl.addEventListener('change', function () {
      compose();
      if (monEl.value && !digits(yearEl.value)) yearEl.focus();
    });

    yearEl.addEventListener('input', function () {
      var clean = digits(yearEl.value).slice(0, 4);
      if (clean !== yearEl.value) yearEl.value = clean;
      compose();
    });
    yearEl.addEventListener('blur', compose);

    syncFromHidden();
  }

  function upgradeAll(root) {
    var list = (root || document).querySelectorAll('input[type="date"]:not([data-no-dmy])');
    Array.prototype.forEach.call(list, upgrade);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { upgradeAll(); });
  } else {
    upgradeAll();
  }

  window.NatalDateField = { upgradeAll: upgradeAll };
})();
