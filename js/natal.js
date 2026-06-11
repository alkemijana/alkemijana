/* ============================================================
   Alkemijana — Natalna karta · FORMA, GEOCODING, INIT
   Glavni glue: forma za unos, autocomplete mjesta (Open-Meteo),
   submit handler i inicijalizacija. Ostatak je podijeljen u:
     natal-data.js   — konstante, glifovi, palete, helperi
     natal-calc.js   — astronomski izračun
     natal-render.js — SVG kotač + tablice na stranici
     natal-pdf.js    — PDF eksport (poster + radna verzija)
   Učitava se ZADNJI (ovisi o svemu gore).
   ============================================================ */

'use strict';

/* ============ GEOCODING (Open-Meteo) ============ */

let geoTimer = null;
let selectedPlace = null;

function initPlaceAutocomplete() {
  const inp = document.getElementById('natal-place');
  const dd  = document.getElementById('natal-place-dd');
  if (!inp) return;

  inp.addEventListener('input', () => {
    selectedPlace = null;
    document.getElementById('natal-place-ok').style.display = 'none';
    clearTimeout(geoTimer);
    const q = inp.value.trim();
    if (q.length < 2) { dd.style.display = 'none'; return; }
    geoTimer = setTimeout(async () => {
      try {
        const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' +
          encodeURIComponent(q) + '&count=6&language=hr&format=json');
        const j = await r.json();
        const res = (j.results || []);
        if (!res.length) { dd.innerHTML = '<div class="nt-dd-empty">Mjesto nije pronađeno…</div>'; dd.style.display = 'block'; return; }
        dd.innerHTML = res.map((p, i) => {
          const parts = [p.name, p.admin1, p.country].filter(Boolean);
          return '<div class="nt-dd-item" data-i="' + i + '">' + escHtml(parts.join(', ')) + '</div>';
        }).join('');
        dd.style.display = 'block';
        dd.querySelectorAll('.nt-dd-item').forEach(el => {
          el.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            const p = res[+el.dataset.i];
            selectedPlace = {
              label: [p.name, p.admin1, p.country].filter(Boolean).join(', '),
              shortLabel: [p.name, p.country].filter(Boolean).join(', '),
              lat: p.latitude, lon: p.longitude, tz: p.timezone
            };
            inp.value = selectedPlace.label;
            dd.style.display = 'none';
            document.getElementById('natal-place-ok').style.display = 'inline';
          });
        });
      } catch (e) {
        dd.innerHTML = '<div class="nt-dd-empty">Greška pri pretrazi — provjeri internet vezu.</div>';
        dd.style.display = 'block';
      }
    }, 350);
  });
  inp.addEventListener('blur', () => setTimeout(() => { dd.style.display = 'none'; }, 200));
}

/* ============ FORMA ============ */

async function natalSubmit(ev) {
  ev.preventDefault();
  const err = document.getElementById('natal-error');
  err.style.display = 'none';

  const name = document.getElementById('natal-name').value.trim();
  const dateV = document.getElementById('natal-date').value;
  const timeV = document.getElementById('natal-time').value;

  if (!dateV || !timeV) { return showNatalError('Upiši datum i vrijeme rođenja.'); }
  if (!selectedPlace)   { return showNatalError('Upiši mjesto rođenja i odaberi ga s popisa.'); }

  const [y, mo, d] = dateV.split('-').map(Number);
  const [h, mi] = timeV.split(':').map(Number);
  if (y < 1900 || y > 2099) return showNatalError('Podržane su godine rođenja od 1900. do 2099.');
  if (Math.abs(selectedPlace.lat) > 66) return showNatalError('Placidus sustav kuća nije definiran za polarne širine (>66°).');

  const btn = document.getElementById('natal-submit');
  const origTxt = btn.textContent;
  btn.disabled = true; btn.textContent = 'Računam…';

  try {
    await loadScript('js/lib/astronomy.browser.min.js');

    const { date: utcDate, offsetMin } = localToUtc(y, mo, d, h, mi, selectedPlace.tz);
    const chart = computeChart({
      utcDate, lat: selectedPlace.lat, lon: selectedPlace.lon,
      name, y, mo, d, h, mi, offsetMin,
      place: selectedPlace
    });
    currentChart = chart;
    renderNatalResult(chart);
    try { localStorage.setItem('aj_natal_form', JSON.stringify({ name, dateV, timeV, place: selectedPlace })); } catch (e) {}
    document.getElementById('natal-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showNatalError('Došlo je do greške pri izračunu: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = origTxt;
  }
}

function showNatalError(msg) {
  const err = document.getElementById('natal-error');
  err.textContent = msg;
  err.style.display = 'block';
}

/* ============ INIT ============ */

window.addEventListener('load', () => {
  const form = document.getElementById('natal-form');
  if (!form) return;
  form.addEventListener('submit', natalSubmit);
  initPlaceAutocomplete();
  document.getElementById('natal-poster-btn').addEventListener('click', downloadPoster);
  document.getElementById('natal-working-btn').addEventListener('click', downloadWorking);

  // vrati zadnji unos
  try {
    const saved = JSON.parse(localStorage.getItem('aj_natal_form') || 'null');
    if (saved) {
      document.getElementById('natal-name').value = saved.name || '';
      document.getElementById('natal-date').value = saved.dateV || '';
      document.getElementById('natal-time').value = saved.timeV || '';
      if (saved.place) {
        selectedPlace = saved.place;
        document.getElementById('natal-place').value = saved.place.label;
        document.getElementById('natal-place-ok').style.display = 'inline';
      }
    }
  } catch (e) {}

  if (window.location.hash === '#natal') showPage('natal');
});

/* javno za testiranje */
window.NATAL = { computeChart, localToUtc, chironLongitude, buildChartSVG, buildPosterSVG, placidusCusps, computeAscMc, PALETTES };
