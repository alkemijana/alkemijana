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

const ACG_BOUNDS = [[-85, -180], [85, 180]];

function acgInitMap() {
  if (acgMap) return acgMap;
  acgMap = L.map('acg-map', {
    minZoom: 2, maxZoom: 12, worldCopyJump: false,
    maxBounds: ACG_BOUNDS, maxBoundsViscosity: 1.0
  }).setView([20, 0], 2);
  // CARTO Voyager/Positron: nazivi gradova na engleskom/latinici (OSM piše lokalna pisma)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    maxZoom: 12, noWrap: true, subdomains: 'abcd'
  }).addTo(acgMap);
  acgAddGraticule(acgMap);
  acgAddCoordBox(acgMap);
  return acgMap;
}

/* Koordinatna mreža: linije svakih 30°, ekvator naglašen, stupnjevi uz ekvator/meridijan. */
function acgAddGraticule(map) {
  const g = L.layerGroup();
  const line = (pts, strong) => L.polyline(pts, {
    color: '#8a7dac', weight: strong ? 1.3 : 0.6, opacity: strong ? 0.55 : 0.3, interactive: false
  }).addTo(g);
  const degLabel = (latlng, text) => L.marker(latlng, {
    icon: L.divIcon({ className: 'acg-grid-label', html: '<span>' + text + '</span>', iconSize: [40, 14], iconAnchor: [20, 7] }),
    interactive: false
  }).addTo(g);

  for (let lat = -60; lat <= 60; lat += 30) {
    line([[lat, -180], [lat, 180]], lat === 0); // ekvator deblji
    if (lat !== 0) degLabel([lat, 0], Math.abs(lat) + '°' + (lat > 0 ? 'N' : 'S'));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    line([[-85, lon], [85, lon]], lon === 0);
    if (lon !== 0) degLabel([0, lon], Math.abs(lon) + '°' + (lon > 0 ? 'E' : 'W'));
  }
  degLabel([0, 0], '0°');
  g.addTo(map);
}

/* Kutija s GEO koordinatama + ASC/MC za točku pod mišem (kao Astro-Seek). */
let acgCoordDiv = null;

function fmtGeo(v, posCh, negCh) {
  const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60);
  return d + '°' + (m < 10 ? '0' : '') + m + "'" + (v >= 0 ? posCh : negCh);
}

function acgAddCoordBox(map) {
  const ctl = L.control({ position: 'bottomleft' });
  ctl.onAdd = () => {
    acgCoordDiv = L.DomUtil.create('div', 'acg-coord-box');
    acgCoordDiv.innerHTML = 'Pomakni miš preko karte…';
    return acgCoordDiv;
  };
  ctl.addTo(map);

  map.on('mousemove', (e) => {
    if (!acgCoordDiv || !currentAcg) return;
    const lat = e.latlng.lat, lon = e.latlng.lng;
    let astro = '';
    if (Math.abs(lat) < 89) {
      const am = computeAscMc(norm360(currentAcg.gastDeg + lon), currentAcg.eps, lat);
      astro = ' &nbsp;·&nbsp; <strong>ASC</strong> ' + fmtDegMin(am.asc) + ' ' + signName(am.asc) +
              ' &nbsp;·&nbsp; <strong>MC</strong> ' + fmtDegMin(am.mc) + ' ' + signName(am.mc);
    }
    acgCoordDiv.innerHTML = fmtGeo(lat, 'N', 'S') + ' ' + fmtGeo(lon, 'E', 'W') + astro;
  });
  map.on('mouseout', () => { if (acgCoordDiv) acgCoordDiv.innerHTML = 'Pomakni miš preko karte…'; });
}

function acgDrawLine(points, color, label, dashed) {
  const line = L.polyline(points, {
    color, weight: 2.2, opacity: 0.85,
    dashArray: dashed ? '5,5' : null
  });
  if (label) line.bindTooltip(label, { sticky: true, className: 'acg-tooltip' });
  return line;
}

/* Mala oznaka (samo glif planeta) uz vanjski kraj linije — kao na Astro-Seeku.
   Vrsta linije (puna = ASC/MC, isprekidana = DSC/IC) objašnjena je napomenom ispod karte. */
function acgAddLabel(group, latlng, color, planetId) {
  const html = '<div class="acg-label-badge" style="border-color:' + color + '">' +
    glyphSvgHtml(planetId, 13, color, 'nt-glyph') + '</div>';
  const icon = L.divIcon({ className: 'acg-label-icon', html, iconSize: [22, 22], iconAnchor: [11, 11] });
  L.marker(latlng, { icon, interactive: false }).addTo(group);
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

      // MC/IC: okomite linije (pol do pol) + glif-oznake na oba ruba karte
      acgDrawLine([[-85, pl.mc], [85, pl.mc]], color, pl.name + ' — MC').addTo(group);
      acgDrawLine([[-85, pl.ic], [85, pl.ic]], color, pl.name + ' — IC', true).addTo(group);
      acgAddLabel(group, [85, pl.mc], color, pl.id);
      acgAddLabel(group, [-85, pl.mc], color, pl.id);
      acgAddLabel(group, [85, pl.ic], color, pl.id);
      acgAddLabel(group, [-85, pl.ic], color, pl.id);

      // ASC/DSC: krive linije (segmentirane na antimeridianu) + glif-oznaka na vanjskom kraju krivulje
      pl.ascSegments.forEach(seg => { if (seg.length > 1) acgDrawLine(seg, color, pl.name + ' — ASC').addTo(group); });
      pl.dscSegments.forEach(seg => { if (seg.length > 1) acgDrawLine(seg, color, pl.name + ' — DSC', true).addTo(group); });
      if (pl.ascSegments.length) {
        acgAddLabel(group, pl.ascSegments[0][0], color, pl.id);
        const lastSeg = pl.ascSegments[pl.ascSegments.length - 1];
        acgAddLabel(group, lastSeg[lastSeg.length - 1], color, pl.id);
      }
      if (pl.dscSegments.length) {
        acgAddLabel(group, pl.dscSegments[0][0], color, pl.id);
        const lastSeg = pl.dscSegments[pl.dscSegments.length - 1];
        acgAddLabel(group, lastSeg[lastSeg.length - 1], color, pl.id);
      }

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
