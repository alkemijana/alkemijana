/* ============================================================
   Alkemijana - TRANZITI (natalna karta + tranzitni planeti, živi bi-wheel)
   Glue modul: treći mod, kontrola vremena (datum-sidro + kartice Dan/Mjesec/Godina
   i traka s odabirom u sredini - js/ui-wheel.js), živo osvježavanje (rAF), submit, PDF.
   Ovisi o:
     natal.js        - currentNodeType, showNatalError, loadScript, selectedPlace
     natal-synastry.js - readPerson, validatePerson, personToChart, serializePerson, fillPersonFields, setNatalMode
     natal-calc.js   - computeChart, computeSynastryAspects
     natal-render.js - renderTransitResult, redrawTransitDynamic, renderTransitTables, currentTransit
     natal-pdf.js    - downloadTransitPoster, downloadTransitWorking
   Učitava se nakon natal-synastry.js.
   ============================================================ */

'use strict';

/* uključeni aspekti na kotaču tranzita (neovisno o natalnoj/sinastriji) */
const TRANSIT_CHART_OPTS = {
  aspectsEnabled: { conjunction: true, sextile: true, square: true, trine: true, opposition: true }
};

let transitNatalChart = null;                                  // natalna baza (puna karta)
let transitAnchorMs = Date.now();                              // datum-sidro (apsolutni trenutak)
let transitOffsets = { hour: 0, day: 0, week: 0, month: 0, year: 0 };
let transitRAF = null;                                         // throttle pomičnog sloja
let transitTableTimer = null;                                  // debounce tablica

const TR_MONTHS = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja',
                   'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];

/* trenutni tranzitni datum = sidro + Σ(offseti); mjeseci/godine kalendarski */
function transitDate(o) {
  o = o || transitOffsets;
  const d = new Date(transitAnchorMs);
  d.setFullYear(d.getFullYear() + o.year);
  d.setMonth(d.getMonth() + o.month);
  d.setTime(d.getTime() + ((o.week * 7 + o.day) * 86400 + o.hour * 3600) * 1000);
  return d;
}

function transitLabel(d) {
  return d.getDate() + '. ' + TR_MONTHS[d.getMonth()] + ' ' + d.getFullYear() + '. u ' +
    pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/* tranzitni planeti za zadani trenutak (bez kuća - položaji su geocentrični) */
function computeTransitChart(d) {
  const n = transitNatalChart;
  return computeChart({
    utcDate: d, lat: n.input.lat, lon: n.input.lon, noTime: true,
    nodeType: n.input.nodeType || 'true', name: ''
  });
}

/* ============ KONTROLA VREMENA ============ */

function syncAnchorInputs() {
  const d = new Date(transitAnchorMs);
  const di = document.getElementById('transit-anchor-date');
  const ti = document.getElementById('transit-anchor-time');
  if (di) di.value = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  if (ti) ti.value = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

function setAnchorToNow() {
  transitAnchorMs = Date.now();
  syncAnchorInputs();
}

function resetTransitOffsets() {
  transitOffsets = { hour: 0, day: 0, week: 0, month: 0, year: 0 };
  document.querySelectorAll('#transit-sliders .tr-slider').forEach(s => { s.value = 0; });
  document.querySelectorAll('#transit-sliders .tr-num').forEach(n => { n.value = 0; });
}

/* napomena ako datum izađe iz raspona Kiron efemeride (1900–2099) */
function checkTransitRange(d) {
  const warn = document.getElementById('transit-warn');
  if (!warn) return;
  const y = d.getFullYear();
  if (y < 1900 || y > 2099) {
    warn.textContent = 'Izvan razdoblja 1900.–2099. - Kiron se ne prikazuje (nema efemeride), ostali planeti rade normalno.';
    warn.style.display = 'block';
  } else {
    warn.style.display = 'none';
  }
}

/* primijeni trenutni datum: izračun + render (full = puni prikaz, inače samo pomični sloj) */
function applyTransit(full) {
  if (!transitNatalChart) return;
  const d = transitDate();
  const label = transitLabel(d);
  const ro = document.getElementById('transit-readout');
  if (ro) ro.textContent = label;
  checkTransitRange(d);
  const tChart = computeTransitChart(d);
  if (full) {
    renderTransitResult(transitNatalChart, tChart);
    // traka: nakon punog iscrtavanja (rezultat je tada vidljiv pa traka ima mjere)
    requestAnimationFrame(buildTransitStrip);
  } else {
    redrawTransitDynamic(tChart);
    scheduleTransitTables();
  }
  if (currentTransit) currentTransit.label = label;   // za PDF
}

/* throttle: najviše jedan render pomičnog sloja po frameu */
function requestTransitUpdate() {
  if (transitRAF) return;
  transitRAF = requestAnimationFrame(() => { transitRAF = null; applyTransit(false); });
}

/* tablice se osvježavaju rjeđe (da klizanje ostane glatko) */
function scheduleTransitTables() {
  clearTimeout(transitTableTimer);
  transitTableTimer = setTimeout(() => { renderTransitTables(); }, 160);
}

/* ============ TRAKA ZA POMAK (vlasnik: „cak cak" kao kod Mjeseca) ============
   Umjesto tri klizača: kartice Dan · Mjesec · Godina + JEDNA traka (js/ui-wheel.js) za
   odabranu jedinicu; odabran je element u sredini, svaki korak „klikne". Na elementu piše
   stvarni datum za taj pomak (uz pomake ostalih jedinica) i sam pomak. Traka postavlja
   transitOffsets i skrivene klizače/brojeve - izračun je isti kao prije. */
const TR_RANGE = { day: 31, month: 12, year: 100 };
const TR_MON_SHORT = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];
let transitUnit = 'day';

function setTransitOffset(unit, v) {
  transitOffsets[unit] = v;
  const s = document.querySelector('#transit-sliders .tr-slider[data-unit="' + unit + '"]');
  const n = document.querySelector('#transit-sliders .tr-num[data-unit="' + unit + '"]');
  if (s) s.value = v;
  if (n) n.value = v;
  requestTransitUpdate();
}

function buildTransitStrip() {
  const el = document.getElementById('transit-strip');
  if (!el || !transitNatalChart || !el.offsetWidth) return;   // skrivena traka nema mjere
  const unit = transitUnit, R = TR_RANGE[unit];
  let html = '';
  for (let k = -R; k <= R; k++) {
    const d = transitDate(Object.assign({}, transitOffsets, { [unit]: k }));
    const main = unit === 'day' ? d.getDate() + '. ' + (d.getMonth() + 1) + '.'
      : unit === 'month' ? TR_MON_SHORT[d.getMonth()] + ' ' + d.getFullYear()
      : String(d.getFullYear());
    const sub = k ? (k > 0 ? '+' : '−') + Math.abs(k) : '·';
    html += '<button type="button" class="ml-hour" data-w="' + (k + R) + '"><span class="ml-hour-t">' + main +
      '</span><span class="ml-hour-d">' + sub + '</span></button>';
  }
  el.innerHTML = html;
  el.dataset.unit = unit;
  window.AJWheel.attach(el, idx => setTransitOffset(transitUnit, idx - TR_RANGE[transitUnit]));
  const cur = Math.max(-R, Math.min(R, transitOffsets[unit] || 0));
  window.AJWheel.jump(el, cur + R);
}

function initTransitUnits() {
  const box = document.getElementById('transit-units');
  if (!box) return;
  box.addEventListener('click', e => {
    const b = e.target.closest('.tr-unit');
    if (!b || b.dataset.unit === transitUnit) return;
    transitUnit = b.dataset.unit;
    box.querySelectorAll('.tr-unit').forEach(x => {
      const on = x === b;
      x.classList.toggle('active', on); x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    buildTransitStrip();
  });
  // promjena širine: elementi mijenjaju razmak - vrati odabrani u sredinu
  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { const el = document.getElementById('transit-strip'); if (el && el._idx >= 0) window.AJWheel.jump(el, el._idx); }, 150);
  });
}

/* ============ INICIJALIZACIJA KONTROLA ============ */

function initTransitSliders() {
  document.querySelectorAll('#transit-sliders .tr-row').forEach(row => {
    const slider = row.querySelector('.tr-slider');
    const num = row.querySelector('.tr-num');
    if (!slider || !num) return;
    const unit = slider.dataset.unit;
    slider.addEventListener('input', () => {
      transitOffsets[unit] = +slider.value;
      num.value = slider.value;
      requestTransitUpdate();
    });
    num.addEventListener('input', () => {
      let v = parseInt(num.value, 10);
      if (isNaN(v)) v = 0;
      transitOffsets[unit] = v;
      const mn = +slider.min, mx = +slider.max;
      slider.value = Math.max(mn, Math.min(mx, v));   // slider prati broj (unutar svog raspona)
      requestTransitUpdate();
    });
  });
}

function initTransitAnchor() {
  const di = document.getElementById('transit-anchor-date');
  const ti = document.getElementById('transit-anchor-time');
  const apply = () => {
    if (!di || !di.value) return;
    const [y, mo, d] = di.value.split('-').map(Number);
    let h = 12, mi = 0;
    if (ti && ti.value) { const t = ti.value.split(':').map(Number); h = t[0]; mi = t[1]; }
    transitAnchorMs = new Date(y, mo - 1, d, h, mi, 0).getTime();
    applyTransit(true);
  };
  if (di) di.addEventListener('change', apply);
  if (ti) ti.addEventListener('change', apply);
  const nowBtn = document.getElementById('transit-now-btn');
  if (nowBtn) nowBtn.addEventListener('click', () => {
    setAnchorToNow();
    resetTransitOffsets();
    applyTransit(true);
  });
}

function initTransitChartControls() {
  try {
    const saved = JSON.parse(localStorage.getItem('aj_transit_chart_opts') || 'null');
    if (saved && saved.aspectsEnabled) Object.assign(TRANSIT_CHART_OPTS.aspectsEnabled, saved.aspectsEnabled);
  } catch (e) {}
  document.querySelectorAll('#transit-chart-controls input[type="checkbox"][data-asp]').forEach(cb => {
    cb.checked = !!TRANSIT_CHART_OPTS.aspectsEnabled[cb.dataset.asp];
    cb.addEventListener('change', () => {
      TRANSIT_CHART_OPTS.aspectsEnabled[cb.dataset.asp] = cb.checked;
      try { localStorage.setItem('aj_transit_chart_opts', JSON.stringify(TRANSIT_CHART_OPTS)); } catch (e) {}
      if (currentTransit) redrawTransitDynamic(currentTransit.transit);
    });
  });
}

function initTransitTabs() {
  const tabs = document.getElementById('transit-tabs');
  if (!tabs) return;
  tabs.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.nt-tab');
    if (!btn) return;
    tabs.querySelectorAll('.nt-tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('#transit-result .nt-tabpane').forEach(p => {
      p.style.display = (p.id === 'transit-tab-' + btn.dataset.tab) ? 'block' : 'none';
    });
  });
}

/* ============ SUBMIT ============ */

async function transitSubmit(ev) {
  if (ev && ev.preventDefault) ev.preventDefault();
  const err = document.getElementById('natal-error');
  if (err) err.style.display = 'none';

  const p = readPerson('');
  const e1 = validatePerson(p, 'natalna karta');
  if (e1) return showNatalError(e1);

  const btn = document.getElementById('natal-submit');
  const origTxt = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Računam…'; }

  try {
    await loadScript('js/lib/astronomy.browser.min.js');
    transitNatalChart = personToChart(p);
    setAnchorToNow();
    resetTransitOffsets();
    applyTransit(true);
    try { localStorage.setItem('aj_transit_form', JSON.stringify(serializePerson(p))); } catch (e) {}
    if (window.AJTrack) window.AJTrack('natal_chart_created', { tool: 'transit' });
    document.getElementById('transit-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showNatalError('Došlo je do greške pri izračunu: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origTxt; }
  }
}

/* ============ INIT ============ */

window.addEventListener('load', () => {
  if (!document.getElementById('transit-result')) return;
  initTransitSliders();
  initTransitUnits();
  initTransitAnchor();
  initTransitChartControls();
  initTransitTabs();

  const pb = document.getElementById('transit-poster-btn');
  const wb = document.getElementById('transit-working-btn');
  if (pb && typeof downloadTransitPoster === 'function') pb.addEventListener('click', downloadTransitPoster);
  if (wb && typeof downloadTransitWorking === 'function') wb.addEventListener('click', downloadTransitWorking);

  setAnchorToNow();   // popuni polja sidra (zadano: sada)

  // ako je zadnji mod bio tranzit, vrati natalnu osobu i prebaci mod
  let savedMode = 'natal';
  try { savedMode = localStorage.getItem('aj_natal_mode') || 'natal'; } catch (e) {}
  if (savedMode === 'transit') {
    try {
      const saved = JSON.parse(localStorage.getItem('aj_transit_form') || 'null');
      if (saved && typeof fillPersonFields === 'function') fillPersonFields('', saved, p => { selectedPlace = p; });
    } catch (e) {}
    if (typeof setNatalMode === 'function') setNatalMode('transit', false);
  }
});

/* javno za testiranje */
window.Transit = { transitSubmit, applyTransit, transitDate, computeTransitChart };
