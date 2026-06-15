/* ============================================================
   Alkemijana — SINASTRIJA (usporedba dviju karata)
   Glue modul: prekidač moda (natalna ↔ sinastrija), forma 2. osobe,
   submit, kontrole kotača i wiring PDF-ova. Samostalan — ovisi o:
     natal.js        — initPlaceAutocomplete, currentNodeType, showNatalError, loadScript
     natal-data.js   — localToUtc
     natal-calc.js   — computeChart, computeSynastryAspects
     natal-render.js — renderSynastryResult, buildSynastryWheel, currentSynastry, currentScreenPalette
     natal-pdf.js    — downloadSynastryPoster, downloadSynastryWorking
   Učitava se nakon natal.js.
   ============================================================ */

'use strict';

let selectedPlace2 = null;   // mjesto rođenja 2. osobe

/* Kontrole kotača sinastrije (uključeni aspekti) — neovisne o natalnima. */
const SYN_CHART_OPTS = {
  aspectsEnabled: { conjunction: true, sextile: true, square: true, trine: true, opposition: true }
};

/* ============ MOD (natalna karta ↔ sinastrija) ============ */

function currentNatalMode() {
  const wrap = document.getElementById('natal-form-wrap');
  return wrap ? (wrap.getAttribute('data-natal-mode') || 'natal') : 'natal';
}

function setNatalMode(mode, persist) {
  const seg  = document.getElementById('natal-mode-seg');
  const wrap = document.getElementById('natal-form-wrap');
  const p2   = document.getElementById('natal-person2');
  if (!seg || !wrap) return;
  seg.querySelectorAll('.nt-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  wrap.setAttribute('data-natal-mode', mode);
  document.body.classList.toggle('syn-mode', mode === 'synastry');
  document.body.classList.toggle('transit-mode', mode === 'transit');
  if (p2) p2.setAttribute('aria-hidden', mode === 'synastry' ? 'false' : 'true');

  // hint tekst po modu
  const hint = document.getElementById('natal-mode-hint');
  if (hint) {
    hint.textContent = mode === 'synastry'
      ? 'Usporedba dviju karata — kako se planeti dviju osoba međusobno povezuju.'
      : mode === 'transit'
        ? 'Položaji planeta (sada ili za odabrani trenutak) naspram tvoje natalne karte — pomiči slidere kroz vrijeme.'
        : '';
  }

  // tekst submit gumba
  const btn = document.getElementById('natal-submit');
  if (btn) {
    btn.textContent = mode === 'synastry' ? '✦ Izračunaj sinastriju'
      : mode === 'transit' ? '✦ Prikaži tranzite'
      : (typeof TEXTS !== 'undefined' && TEXTS.natalBtn ? TEXTS.natalBtn : '✦ Izračunaj natalnu kartu');
  }

  // prikaži samo rezultat koji odgovara modu (ostale sakrij)
  const results = { natal: 'natal-result', synastry: 'synastry-result', transit: 'transit-result' };
  for (const k in results) {
    if (k !== mode) { const el = document.getElementById(results[k]); if (el) el.style.display = 'none'; }
  }

  if (persist) { try { localStorage.setItem('aj_natal_mode', mode); } catch (e) {} }
}

function initModeToggle() {
  const seg = document.getElementById('natal-mode-seg');
  if (!seg) return;
  seg.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.nt-seg-btn');
    if (!btn || btn.classList.contains('active')) return;
    setNatalMode(btn.dataset.mode, true);
  });
}

/* ============ FORMA 2. OSOBE ============ */

function readPerson(suffix) {
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const noTime = (() => { const el = document.getElementById('natal-notime' + suffix); return el ? el.checked : false; })();
  return {
    name:   v('natal-name' + suffix),
    dateV:  v('natal-date' + suffix),
    noTime: noTime,
    timeV:  noTime ? '12:00' : v('natal-time' + suffix),
    place:  suffix === '-2' ? selectedPlace2 : selectedPlace
  };
}

function validatePerson(p, who) {
  if (!p.dateV)         return 'Upiši datum rođenja — ' + who + '.';
  if (!p.timeV)         return 'Upiši vrijeme rođenja ili označi „ne znam” — ' + who + '.';
  if (!p.place)         return 'Upiši mjesto rođenja i odaberi ga s popisa — ' + who + '.';
  const y = +p.dateV.split('-')[0];
  if (y < 1900 || y > 2099) return 'Podržane su godine rođenja 1900.–2099. — ' + who + '.';
  if (!p.noTime && Math.abs(p.place.lat) > 66) return 'Placidus kuće nisu definirane za polarne širine (>66°) — ' + who + '.';
  return null;
}

function personToChart(p) {
  const [y, mo, d] = p.dateV.split('-').map(Number);
  const [h, mi] = p.timeV.split(':').map(Number);
  const { date: utcDate, offsetMin } = localToUtc(y, mo, d, h, mi, p.place.tz);
  return computeChart({
    utcDate, lat: p.place.lat, lon: p.place.lon,
    name: p.name, y, mo, d, h, mi, offsetMin, noTime: p.noTime,
    place: p.place, nodeType: currentNodeType()
  });
}

function serializePerson(p) {
  return { name: p.name, dateV: p.dateV, timeV: p.noTime ? '' : p.timeV, noTime: p.noTime, place: p.place };
}

/* Submit u modu sinastrije (poziva ga natalSubmit iz natal.js). */
async function synastrySubmit(ev) {
  if (ev && ev.preventDefault) ev.preventDefault();
  const err = document.getElementById('natal-error');
  if (err) err.style.display = 'none';

  const p1 = readPerson('');
  const p2 = readPerson('-2');
  const e1 = validatePerson(p1, 'prva osoba');
  if (e1) return showNatalError(e1);
  const e2 = validatePerson(p2, 'druga osoba');
  if (e2) return showNatalError(e2);

  const btn = document.getElementById('natal-submit');
  const origTxt = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Računam…'; }

  try {
    await loadScript('js/lib/astronomy.browser.min.js');
    const chartA = personToChart(p1);
    const chartB = personToChart(p2);
    renderSynastryResult(chartA, chartB);
    try {
      localStorage.setItem('aj_synastry_form', JSON.stringify({ p1: serializePerson(p1), p2: serializePerson(p2) }));
    } catch (e) {}
    document.getElementById('synastry-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showNatalError('Došlo je do greške pri izračunu: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origTxt; }
  }
}

/* ============ KONTROLE KOTAČA (aspekti) ============ */

function persistSynChartOpts() {
  try { localStorage.setItem('aj_syn_chart_opts', JSON.stringify(SYN_CHART_OPTS)); } catch (e) {}
}

function redrawSynastryWheel() {
  if (!currentSynastry) return;
  const wheelEl = document.getElementById('synastry-wheel');
  if (wheelEl) wheelEl.innerHTML = buildSynastryWheel(currentSynastry.a, currentSynastry.b, currentScreenPalette());
}

function initSynChartControls() {
  try {
    const saved = JSON.parse(localStorage.getItem('aj_syn_chart_opts') || 'null');
    if (saved && saved.aspectsEnabled) Object.assign(SYN_CHART_OPTS.aspectsEnabled, saved.aspectsEnabled);
  } catch (e) {}
  document.querySelectorAll('#synastry-chart-controls input[type="checkbox"][data-asp]').forEach(cb => {
    cb.checked = !!SYN_CHART_OPTS.aspectsEnabled[cb.dataset.asp];
    cb.addEventListener('change', () => {
      SYN_CHART_OPTS.aspectsEnabled[cb.dataset.asp] = cb.checked;
      persistSynChartOpts();
      redrawSynastryWheel();
    });
  });
}

/* ============ KARTICE (tabovi) ============ */

function initSynastryTabs() {
  const tabs = document.getElementById('synastry-tabs');
  if (!tabs) return;
  tabs.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.nt-tab');
    if (!btn) return;
    tabs.querySelectorAll('.nt-tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('#synastry-result .nt-tabpane').forEach(p => {
      p.style.display = (p.id === 'synastry-tab-' + btn.dataset.tab) ? 'block' : 'none';
    });
  });
}

/* ============ INIT ============ */

function fillPersonFields(suffix, data, onPlace) {
  if (!data) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('natal-name' + suffix, data.name);
  set('natal-date' + suffix, data.dateV);
  set('natal-time' + suffix, data.timeV);
  const nt = document.getElementById('natal-notime' + suffix);
  const tm = document.getElementById('natal-time' + suffix);
  if (nt && data.noTime) { nt.checked = true; if (tm) tm.disabled = true; }
  if (data.place) {
    onPlace(data.place);
    const inp = document.getElementById('natal-place' + suffix);
    const ok  = document.getElementById('natal-place-ok' + suffix);
    if (inp) inp.value = data.place.label;
    if (ok) ok.style.display = 'inline';
  }
}

window.addEventListener('load', () => {
  const seg = document.getElementById('natal-mode-seg');
  if (!seg) return;

  initModeToggle();
  initSynChartControls();
  initSynastryTabs();

  // autocomplete za 2. osobu (1. osoba je natal.js)
  initPlaceAutocomplete({
    inputId: 'natal-place-2', ddId: 'natal-place-dd-2', okId: 'natal-place-ok-2',
    onSelect: p => { selectedPlace2 = p; }
  });

  // checkbox „ne znam vrijeme” za 2. osobu
  const nt2 = document.getElementById('natal-notime-2');
  if (nt2) nt2.addEventListener('change', () => {
    const t2 = document.getElementById('natal-time-2');
    if (t2) t2.disabled = nt2.checked;
  });

  // PDF gumbi sinastrije
  const pb = document.getElementById('synastry-poster-btn');
  const wb = document.getElementById('synastry-working-btn');
  if (pb && typeof downloadSynastryPoster === 'function') pb.addEventListener('click', downloadSynastryPoster);
  if (wb && typeof downloadSynastryWorking === 'function') wb.addEventListener('click', downloadSynastryWorking);

  // zamjena unutarnje/vanjske osobe (prebacuje čije se kuće prikazuju)
  const swapBtn = document.getElementById('synastry-swap-btn');
  if (swapBtn) swapBtn.addEventListener('click', () => {
    if (currentSynastry) renderSynastryResult(currentSynastry.b, currentSynastry.a);
  });

  // vrati spremljeni unos sinastrije
  let savedMode = 'natal';
  try { savedMode = localStorage.getItem('aj_natal_mode') || 'natal'; } catch (e) {}
  try {
    const saved = JSON.parse(localStorage.getItem('aj_synastry_form') || 'null');
    if (saved) {
      fillPersonFields('-2', saved.p2, p => { selectedPlace2 = p; });
      // 1. osobu vraćamo samo ako je mod sinastrija (inače natal.js vlada tim poljima)
      if (savedMode === 'synastry') fillPersonFields('', saved.p1, p => { selectedPlace = p; });
    }
  } catch (e) {}

  if (savedMode === 'synastry') setNatalMode('synastry', false);
});

/* javno za testiranje */
window.Synastry = { computeSynastryAspects, synastrySubmit, setNatalMode };
