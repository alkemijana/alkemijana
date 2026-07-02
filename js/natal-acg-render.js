/* ============================================================
   Alkemijana — ASTROCARTOGRAPHY: LEAFLET KARTA
   Lazy-load Leaflet (CDN, isti obrazac kao ensurePdfLibs u natal-pdf.js),
   crtanje MC/IC/ASC/DSC linija po planetu, legenda s toggle checkboxovima.
   Ovisi o: natal-data.js (glyphSvgHtml, loadScript), natal-acg.js (currentAcg)
   Učitava se nakon natal-acg.js.
   ============================================================ */

'use strict';

/* 10 razlučivih boja unutar tonske obitelji Alkemijane (bez zlatne) —
   PALETTES u natal-data.js ima samo 3 boje (planet/planetB/planetT), nedovoljno. */
const ACG_PLANET_COLORS = {
  sun:     '#c98f9b',
  moon:    '#c4c0d8',
  mercury: '#7fae90',
  venus:   '#d4a5c9',
  mars:    '#b0637a',
  jupiter: '#a890d0',
  saturn:  '#6a5d8c',
  uranus:  '#4f9fe6',
  neptune: '#4cc79c',
  pluto:   '#8a7dac'
};

let acgMap = null;
let acgLayerGroups = {}; // id -> L.layerGroup

async function ensureLeaflet() {
  if (window.L) return window.L;
  if (!document.querySelector('link[data-acg-leaflet]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    css.setAttribute('data-acg-leaflet', '1');
    document.head.appendChild(css);
  }
  await loadScript('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js');
  return window.L;
}

function acgInitMap() {
  if (acgMap) return acgMap;
  acgMap = L.map('acg-map', { worldCopyJump: true, minZoom: 1, maxZoom: 7 }).setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 7
  }).addTo(acgMap);
  return acgMap;
}

function acgDrawLine(points, color, label, dashed) {
  const line = L.polyline(points, {
    color, weight: 2.2, opacity: 0.85,
    dashArray: dashed ? '5,5' : null
  });
  if (label) line.bindTooltip(label, { sticky: true, className: 'acg-tooltip' });
  return line;
}

function renderAcgResult(acg) {
  const wrap = document.getElementById('acg-result');
  if (!wrap) return;
  wrap.style.display = 'block';

  const title = document.getElementById('acg-chart-title');
  const sub = document.getElementById('acg-chart-sub');
  if (title) title.textContent = acg.name ? 'AstroCartography — ' + acg.name : 'AstroCartography';
  if (sub) sub.textContent = acg.dateV + ' · ' + acg.timeV + ' · ' + (acg.place ? acg.place.label : '');

  ensureLeaflet().then(() => {
    const map = acgInitMap();
    // ukloni stare slojeve
    for (const id in acgLayerGroups) { map.removeLayer(acgLayerGroups[id]); }
    acgLayerGroups = {};

    acg.lines.forEach(pl => {
      const color = ACG_PLANET_COLORS[pl.id] || '#a890d0';
      const group = L.layerGroup();

      // MC/IC: okomite linije (pol do pol)
      acgDrawLine([[-85, pl.mc], [85, pl.mc]], color, pl.name + ' — MC').addTo(group);
      acgDrawLine([[-85, pl.ic], [85, pl.ic]], color, pl.name + ' — IC', true).addTo(group);

      // ASC/DSC: krive linije (segmentirane na antimeridianu)
      pl.ascSegments.forEach(seg => { if (seg.length > 1) acgDrawLine(seg, color, pl.name + ' — ASC').addTo(group); });
      pl.dscSegments.forEach(seg => { if (seg.length > 1) acgDrawLine(seg, color, pl.name + ' — DSC', true).addTo(group); });

      group.addTo(map);
      acgLayerGroups[pl.id] = group;
    });

    renderAcgLegend(acg.lines);
    setTimeout(() => map.invalidateSize(), 50);
  }).catch(e => {
    showNatalError('Ne mogu učitati kartu: ' + e.message);
  });
}

function renderAcgLegend(lines) {
  const el = document.getElementById('acg-legend');
  if (!el) return;
  el.innerHTML = lines.map(pl => {
    const color = ACG_PLANET_COLORS[pl.id] || '#a890d0';
    return '<label class="acg-legend-item">' +
      '<input type="checkbox" checked data-acg-planet="' + pl.id + '">' +
      '<span class="acg-legend-swatch" style="background:' + color + '"></span>' +
      glyphSvgHtml(pl.id, 16, color, 'nt-glyph') +
      '<span>' + escHtml(pl.name) + '</span>' +
      '</label>';
  }).join('');

  el.querySelectorAll('input[data-acg-planet]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.getAttribute('data-acg-planet');
      const group = acgLayerGroups[id];
      if (!group || !acgMap) return;
      if (cb.checked) group.addTo(acgMap); else acgMap.removeLayer(group);
    });
  });
}
