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

let selectedPlace = null;

/* Autocomplete mjesta (Open-Meteo). Generaliziran da ga može koristiti i forma
   sinastrije (2. osoba) — primi config:
     { inputId, ddId, okId, onSelect(place|null) }
   Bez configa radi za natalnu formu (1. osoba → selectedPlace). */
function initPlaceAutocomplete(cfg) {
  cfg = cfg || { inputId: 'natal-place', ddId: 'natal-place-dd', okId: 'natal-place-ok',
                 onSelect: p => { selectedPlace = p; } };
  const inp = document.getElementById(cfg.inputId);
  const dd  = document.getElementById(cfg.ddId);
  if (!inp) return;
  const okEl = () => document.getElementById(cfg.okId);
  let timer = null;

  inp.addEventListener('input', () => {
    cfg.onSelect(null);
    if (okEl()) okEl().style.display = 'none';
    clearTimeout(timer);
    const q = inp.value.trim();
    if (q.length < 2) { dd.style.display = 'none'; return; }
    timer = setTimeout(async () => {
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
            const place = {
              label: [p.name, p.admin1, p.country].filter(Boolean).join(', '),
              shortLabel: [p.name, p.country].filter(Boolean).join(', '),
              lat: p.latitude, lon: p.longitude, tz: p.timezone
            };
            cfg.onSelect(place);
            inp.value = place.label;
            dd.style.display = 'none';
            if (okEl()) okEl().style.display = 'inline';
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

/* ============ POSTAVKE (čvor) I KARTICE ============ */

function currentNodeType() {
  const btn = document.querySelector('#natal-node-seg .nt-seg-btn.active');
  return btn ? btn.dataset.node : 'true';
}

function initNodeToggle() {
  const seg = document.getElementById('natal-node-seg');
  if (!seg) return;
  // vrati spremljeni izbor
  try {
    const saved = localStorage.getItem('aj_natal_node');
    if (saved) {
      seg.querySelectorAll('.nt-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.node === saved));
    }
  } catch (e) {}
  seg.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.nt-seg-btn');
    if (!btn || btn.classList.contains('active')) return;
    seg.querySelectorAll('.nt-seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    try { localStorage.setItem('aj_natal_node', btn.dataset.node); } catch (e) {}
    // ako je karta već izračunata — preračunaj s novim tipom čvora
    if (currentChart) {
      const inp = Object.assign({}, currentChart.input, { nodeType: btn.dataset.node });
      currentChart = computeChart(inp);
      renderNatalResult(currentChart);
    }
  });
}

/* ============ KONTROLE KOTAČA (aspekti, stupnjevi kuća) ============ */

const NATAL_CHART_OPTS = {
  aspectsEnabled: { conjunction: true, sextile: true, square: true, trine: true, opposition: true },
  showCuspDegrees: true
};

function initChartControls() {
  // vrati spremljene postavke
  try {
    const saved = JSON.parse(localStorage.getItem('aj_natal_chart_opts') || 'null');
    if (saved) {
      if (saved.aspectsEnabled) Object.assign(NATAL_CHART_OPTS.aspectsEnabled, saved.aspectsEnabled);
      if (typeof saved.showCuspDegrees === 'boolean') NATAL_CHART_OPTS.showCuspDegrees = saved.showCuspDegrees;
    }
    // jednokratna migracija: konjunkcije su prije bile isključene po defaultu — uključi ih
    if (!localStorage.getItem('aj_natal_conj_migrated')) {
      NATAL_CHART_OPTS.aspectsEnabled.conjunction = true;
      localStorage.setItem('aj_natal_conj_migrated', '1');
      persistChartOpts();
    }
  } catch (e) {}
  // sinkroniziraj checkboxove s NATAL_CHART_OPTS
  document.querySelectorAll('#natal-chart-controls input[type="checkbox"][data-asp]').forEach(cb => {
    cb.checked = !!NATAL_CHART_OPTS.aspectsEnabled[cb.dataset.asp];
    cb.addEventListener('change', () => {
      NATAL_CHART_OPTS.aspectsEnabled[cb.dataset.asp] = cb.checked;
      persistChartOpts();
      redrawChartWheel();
    });
  });
  const cdEl = document.getElementById('natal-cc-cuspdeg');
  if (cdEl) {
    cdEl.checked = NATAL_CHART_OPTS.showCuspDegrees;
    cdEl.addEventListener('change', () => {
      NATAL_CHART_OPTS.showCuspDegrees = cdEl.checked;
      persistChartOpts();
      redrawChartWheel();
    });
  }
}

function persistChartOpts() {
  try { localStorage.setItem('aj_natal_chart_opts', JSON.stringify(NATAL_CHART_OPTS)); } catch (e) {}
}

function redrawChartWheel() {
  if (!currentChart) return;
  const wheel = document.getElementById('natal-wheel');
  if (wheel) wheel.innerHTML = buildChartSVG(currentChart, currentScreenPalette(), {
    showAspects: true,
    aspectsEnabled: NATAL_CHART_OPTS.aspectsEnabled,
    showCuspDegrees: NATAL_CHART_OPTS.showCuspDegrees
  });
}

/* Otvori stranicu Astro alati s odabranim modom (natal/synastry/transit/acg) i
   scrolla do prekidača moda (Natalna karta/Sinastrija/...) — zajednička ulazna
   točka za kartice alata i kolut na početnoj. */
function openAstroTool(mode) {
  showPage('natal');
  if (window.Synastry && typeof window.Synastry.setNatalMode === 'function') {
    window.Synastry.setNatalMode(mode, true);
  }
  requestAnimationFrame(() => {
    const target = document.getElementById('natal-mode-seg');
    if (!target) return;
    const navEl = document.querySelector('nav');
    const offset = (navEl ? navEl.offsetHeight : 0) + 16;
    const y = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
}

function initNatalTabs() {
  const tabs = document.getElementById('natal-tabs');
  if (!tabs) return;
  tabs.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.nt-tab');
    if (!btn) return;
    tabs.querySelectorAll('.nt-tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.nt-tabpane').forEach(p => {
      p.style.display = (p.id === 'natal-tab-' + btn.dataset.tab) ? 'block' : 'none';
    });
  });
}

/* ============ FORMA ============ */

async function natalSubmit(ev) {
  ev.preventDefault();
  // u modu sinastrije / tranzita submit preuzimaju drugi moduli
  const wrap = document.getElementById('natal-form-wrap');
  const mode = wrap && wrap.getAttribute('data-natal-mode');
  if (mode === 'synastry' && typeof synastrySubmit === 'function') return synastrySubmit(ev);
  if (mode === 'transit' && typeof transitSubmit === 'function') return transitSubmit(ev);
  if (mode === 'acg' && typeof acgSubmit === 'function') return acgSubmit(ev);
  const err = document.getElementById('natal-error');
  err.style.display = 'none';

  const name = document.getElementById('natal-name').value.trim();
  const dateV = document.getElementById('natal-date').value;
  const noTime = document.getElementById('natal-notime').checked;
  const timeV = noTime ? '12:00' : document.getElementById('natal-time').value;

  if (!dateV)           { return showNatalError('Upiši datum rođenja.'); }
  if (!timeV)           { return showNatalError('Upiši vrijeme rođenja ili označi da ga ne znaš.'); }
  if (!selectedPlace)   { return showNatalError('Upiši mjesto rođenja i odaberi ga s popisa.'); }

  const [y, mo, d] = dateV.split('-').map(Number);
  const [h, mi] = timeV.split(':').map(Number);
  if (y < 1900 || y > 2099) return showNatalError('Podržane su godine rođenja od 1900. do 2099.');
  if (!noTime && Math.abs(selectedPlace.lat) > 66) return showNatalError('Placidus sustav kuća nije definiran za polarne širine (>66°).');

  const btn = document.getElementById('natal-submit');
  const origTxt = btn.textContent;
  btn.disabled = true; btn.textContent = 'Računam…';

  try {
    await loadScript('js/lib/astronomy.browser.min.js');

    const { date: utcDate, offsetMin } = localToUtc(y, mo, d, h, mi, selectedPlace.tz);
    const chart = computeChart({
      utcDate, lat: selectedPlace.lat, lon: selectedPlace.lon,
      name, y, mo, d, h, mi, offsetMin, noTime,
      place: selectedPlace, nodeType: currentNodeType()
    });
    currentChart = chart;
    renderNatalResult(chart);
    // nova karta — preda je AI modulu (js/natal-ai.js) i resetira staro tumačenje
    if (window.AInatal) window.AInatal.setChart(chart);
    try { localStorage.setItem('aj_natal_form', JSON.stringify({ name, dateV, timeV: noTime ? '' : timeV, noTime, place: selectedPlace })); } catch (e) {}
    logNatalCreation(chart);
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

/* Anoniman brojač izrada — šalje SAMO hash unosa (bez imena i bez ikakvih osobnih
   podataka u čistom obliku). Server broji jedinstvene hasheve. Ne blokira/ne ruši UI. */
function logNatalCreation(chart) {
  try {
    const i = chart.input;
    // normaliziran opis unosa (bez imena) — koristi se isključivo za hash
    const norm = [
      i.y, i.mo, i.d,
      chart.noTime ? 'NT' : (i.h + ':' + i.mi),
      (typeof i.lat === 'number' ? i.lat.toFixed(4) : ''),
      (typeof i.lon === 'number' ? i.lon.toFixed(4) : ''),
      i.nodeType || ''
    ].join('|');
    sha256Hex(norm).then(h => {
      fetch('/log-natal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ h })
      }).catch(() => {});
    }).catch(() => {});
  } catch (e) {}
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ============ INIT ============ */

window.addEventListener('load', () => {
  const form = document.getElementById('natal-form');
  if (!form) return;
  form.addEventListener('submit', natalSubmit);
  // checkbox "ne znam vrijeme rođenja" — isključuje polje vremena
  const ntCb = document.getElementById('natal-notime');
  ntCb.addEventListener('change', () => {
    document.getElementById('natal-time').disabled = ntCb.checked;
  });
  initPlaceAutocomplete();
  initNodeToggle();
  initNatalTabs();
  initChartControls();
  document.getElementById('natal-poster-btn').addEventListener('click', downloadPoster);
  document.getElementById('natal-working-btn').addEventListener('click', downloadWorking);

  // vrati zadnji unos
  try {
    const saved = JSON.parse(localStorage.getItem('aj_natal_form') || 'null');
    if (saved) {
      document.getElementById('natal-name').value = saved.name || '';
      document.getElementById('natal-date').value = saved.dateV || '';
      document.getElementById('natal-time').value = saved.timeV || '';
      if (saved.noTime) {
        document.getElementById('natal-notime').checked = true;
        document.getElementById('natal-time').disabled = true;
      }
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
