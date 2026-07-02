/* ============================================================
   Alkemijana — ASTROCARTOGRAPHY: LEAFLET KARTA
   Lazy-load Leaflet (CDN, isti obrazac kao ensurePdfLibs u natal-pdf.js),
   crtanje MC/IC/ASC/DSC linija po planetu, glif-oznake u okviru oko karte
   (prate zoom/pan), koordinatna mreža, živi GEO/ASC/MC prikaz, projekcija Mundo/Zodiaco.
   Ovisi o: natal-data.js (glyphSvgHtml, norm360, signName, fmtDegMin, escHtml),
            natal-calc.js (computeAscMc), natal-acg.js (currentAcg)
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

const ACG_GUTTER = 30; // px — širina okvira oko karte (mora se poklapati s CSS paddingom .acg-map-wrap)

let acgMap = null;
let acgLayerGroups = {};   // id -> L.layerGroup (linije)
let acgEdgeLines = [];     // [{ id, color, pts:[[lat,lon]...] }] — za glif-oznake u okviru
let acgEdgeOverlay = null; // div preko okvira gdje se crtaju glif-oznake
let acgListenersBound = false;
let acgRafPending = false;

function acgProjectionMode() {
  const sel = document.getElementById('acg-projection');
  return sel ? sel.value : 'mundo';
}

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

const ACG_WORLD = [[-85, -180], [85, 180]];

function acgInitMap() {
  if (acgMap) return acgMap;
  acgMap = L.map('acg-map', {
    minZoom: 2, maxZoom: 12, worldCopyJump: false,
    maxBounds: ACG_WORLD, maxBoundsViscosity: 1.0
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

/* Minimalni zoom = onaj na kojem svijet ispuni cijelu širinu okvira (bez bijelih rubova). */
function acgFitMinZoom() {
  if (!acgMap) return;
  const z = acgMap.getBoundsZoom(L.latLngBounds(ACG_WORLD), true); // najmanji zoom da pogled stane U svijet
  acgMap.setMinZoom(z);
  if (acgMap.getZoom() < z) acgMap.setView([20, 0], z);
}

/* Koordinatna mreža: linije svakih 30°, ekvator/nulti meridijan naglašeni, stupnjevi. */
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
    line([[lat, -180], [lat, 180]], lat === 0);
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

let acgSelectedVis = null; // trenutno odabrana (podebljana) vidljiva linija

/* Odaberi liniju: podebljaj ju i pokaži oznaku (naziv) uz nju. */
function acgSelectLine(vis, label, color, latlng) {
  if (acgSelectedVis && acgSelectedVis !== vis) acgSelectedVis.setStyle({ weight: 2.2 });
  acgSelectedVis = vis;
  vis.setStyle({ weight: 5 });
  L.popup({ className: 'acg-sel-popup', autoPan: false, offset: [0, -2] })
    .setLatLng(latlng)
    .setContent('<span class="acg-sel-line" style="color:' + color + '">' + escHtml(label) + '</span>')
    .openOn(acgMap);
}

/* Crtaj liniju: tanka vidljiva + široka prozirna "hit" linija (lakši klik/tap, pogotovo mobitel).
   Hover podeblja, klik/tap odabere (podebljanje + oznaka). */
function acgDrawLine(group, points, color, label, dashed) {
  const vis = L.polyline(points, {
    color, weight: 2.2, opacity: 0.9,
    dashArray: dashed ? '6,6' : null, interactive: false
  });
  const hit = L.polyline(points, { color: '#ffffff', weight: 16, opacity: 0, interactive: true });
  hit.bindTooltip(label, { sticky: true, className: 'acg-tooltip' });
  hit.on('mouseover', () => { if (acgSelectedVis !== vis) vis.setStyle({ weight: 4 }); });
  hit.on('mouseout',  () => { if (acgSelectedVis !== vis) vis.setStyle({ weight: 2.2 }); });
  hit.on('click', (e) => { acgSelectLine(vis, label, color, e.latlng); L.DomEvent.stopPropagation(e); });
  vis.addTo(group);
  hit.addTo(group);
  return vis;
}

/* ---- crtanje linija + priprema geometrije za glif-oznake u okviru ---- */

function acgEnabledSet() {
  const set = {};
  document.querySelectorAll('#acg-legend input[data-acg-planet]').forEach(cb => {
    set[cb.getAttribute('data-acg-planet')] = cb.checked;
  });
  return set;
}

function acgRedraw() {
  if (!acgMap || !currentAcg) return;
  const mode = acgProjectionMode();
  const enabled = acgEnabledSet();

  for (const id in acgLayerGroups) { acgMap.removeLayer(acgLayerGroups[id]); }
  acgLayerGroups = {};
  acgEdgeLines = [];
  acgSelectedVis = null;
  acgMap.closePopup();

  currentAcg.lines.forEach(pl => {
    if (enabled[pl.id] === false) return;
    const color = ACG_PLANET_COLORS[pl.id] || '#a890d0';
    const group = L.layerGroup();

    if (mode === 'local') {
      // Local Space: jedna linija (veliki krug) po planetu — smjer azimuta iz mjesta rođenja
      (pl.local.lsSegments || []).forEach(seg => {
        if (seg.length > 1) { acgDrawLine(group, seg, color, pl.name + ' — Local Space', false); acgEdgeLines.push({ id: pl.id, color, pts: seg }); }
      });
    } else {
      const geom = pl[mode] || pl.mundo;
      // MC/IC: okomite linije (pol do pol)
      acgDrawLine(group, [[-85, geom.mc], [85, geom.mc]], color, pl.name + ' — MC', false);
      acgDrawLine(group, [[-85, geom.ic], [85, geom.ic]], color, pl.name + ' — IC', true);
      acgEdgeLines.push({ id: pl.id, color, pts: [[-85, geom.mc], [85, geom.mc]] });
      acgEdgeLines.push({ id: pl.id, color, pts: [[-85, geom.ic], [85, geom.ic]] });

      // ASC/DSC: zakrivljene linije (segmentirane na antimeridianu)
      geom.ascSegments.forEach(seg => {
        if (seg.length > 1) { acgDrawLine(group, seg, color, pl.name + ' — ASC', false); acgEdgeLines.push({ id: pl.id, color, pts: seg }); }
      });
      geom.dscSegments.forEach(seg => {
        if (seg.length > 1) { acgDrawLine(group, seg, color, pl.name + ' — DSC', true); acgEdgeLines.push({ id: pl.id, color, pts: seg }); }
      });
    }

    group.addTo(acgMap);
    acgLayerGroups[pl.id] = group;
  });

  acgUpdateNote(mode);
  updateAcgEdgeLabels();
}

/* Napomena ispod karte ovisi o projekciji (Local Space nema ASC/MC vs DSC/IC). */
function acgUpdateNote(mode) {
  const el = document.getElementById('acg-line-note');
  if (!el) return;
  if (mode === 'local') {
    el.innerHTML = 'Local Space: svaka linija je veliki krug iz mjesta rođenja u smjeru azimuta tog planeta. ' +
      'Glifovi u okviru oko karte pokazuju koja je linija koja. Prijeđi mišem preko linije za naziv.';
  } else {
    el.innerHTML = '<span class="acg-line-sample acg-line-solid"></span> puna linija = <strong>ASC / MC</strong> &nbsp;·&nbsp; ' +
      '<span class="acg-line-sample acg-line-dashed"></span> isprekidana linija = <strong>DSC / IC</strong> &nbsp;·&nbsp; ' +
      'okomite linije su MC/IC, zakrivljene ASC/DSC. Glifovi u okviru oko karte pokazuju koja je linija koja. Prijeđi mišem preko linije za naziv.';
  }
}

/* Svi presjeci dužine a→b s rubovima pravokutnika [0,0,W,H] (0, 1 ili 2 točke). */
function acgSegCrossAll(a, b, W, H) {
  const dx = b.x - a.x, dy = b.y - a.y, cand = [];
  if (dx !== 0) {
    let t = (0 - a.x) / dx; if (t >= 0 && t <= 1) { const y = a.y + t * dy; if (y >= 0 && y <= H) cand.push({ t, x: 0, y, edge: 'left' }); }
    t = (W - a.x) / dx;     if (t >= 0 && t <= 1) { const y = a.y + t * dy; if (y >= 0 && y <= H) cand.push({ t, x: W, y, edge: 'right' }); }
  }
  if (dy !== 0) {
    let t = (0 - a.y) / dy; if (t >= 0 && t <= 1) { const x = a.x + t * dx; if (x >= 0 && x <= W) cand.push({ t, x, y: 0, edge: 'top' }); }
    t = (H - a.y) / dy;     if (t >= 0 && t <= 1) { const x = a.x + t * dx; if (x >= 0 && x <= W) cand.push({ t, x, y: H, edge: 'bottom' }); }
  }
  return cand;
}

/* Glif-oznake u okviru oko karte: gdje god linija izađe iz vidljivog dijela karte,
   njezin glif se pojavi u okviru na tom rubu. Prate zoom/pan (računaju se iz projekcije). */
function updateAcgEdgeLabels() {
  if (!acgMap || !acgEdgeOverlay) return;
  const size = acgMap.getSize(), W = size.x, H = size.y, G = ACG_GUTTER;
  const buckets = { top: [], bottom: [], left: [], right: [] };

  acgEdgeLines.forEach(ln => {
    const pix = ln.pts.map(ll => acgMap.latLngToContainerPoint(L.latLng(ll[0], ll[1])));
    const crossings = [];
    for (let i = 1; i < pix.length; i++) {
      acgSegCrossAll(pix[i - 1], pix[i], W, H).forEach(c => { c.g = (i - 1) + c.t; crossings.push(c); });
    }
    if (!crossings.length) return;
    // zadrži prvi i zadnji presjek uzduž linije (ulaz/izlaz iz vidljivog dijela)
    crossings.sort((p, q) => p.g - q.g);
    const keep = crossings.length > 1 ? [crossings[0], crossings[crossings.length - 1]] : [crossings[0]];
    keep.forEach(c => buckets[c.edge].push({ id: ln.id, color: ln.color, x: c.x, y: c.y }));
  });

  // ukloni dvostruke glifove istog planeta koji padnu na skoro isto mjesto na istom rubu
  const dedupe = (arr, key) => {
    arr.sort((a, b) => a[key] - b[key]);
    const out = [];
    for (const it of arr) {
      const last = out[out.length - 1];
      if (last && last.id === it.id && Math.abs(it[key] - last[key]) < 34) continue;
      out.push(it);
    }
    return out;
  };
  const spread = (arr, key, min, lo, hi) => {
    for (let i = 0; i < arr.length; i++) {
      if (i > 0 && arr[i][key] - arr[i - 1][key] < min) arr[i][key] = arr[i - 1][key] + min;
      arr[i][key] = Math.max(lo, Math.min(hi, arr[i][key]));
    }
  };
  buckets.top = dedupe(buckets.top, 'x');       spread(buckets.top, 'x', 20, 0, W);
  buckets.bottom = dedupe(buckets.bottom, 'x'); spread(buckets.bottom, 'x', 20, 0, W);
  buckets.left = dedupe(buckets.left, 'y');     spread(buckets.left, 'y', 20, 0, H);
  buckets.right = dedupe(buckets.right, 'y');   spread(buckets.right, 'y', 20, 0, H);

  // spoji sve rubove u zajednički popis piksel-pozicija
  const badges = [];
  buckets.top.forEach(o => badges.push({ px: o.x + G, py: G / 2, id: o.id, color: o.color }));
  buckets.bottom.forEach(o => badges.push({ px: o.x + G, py: H + G + G / 2, id: o.id, color: o.color }));
  buckets.left.forEach(o => badges.push({ px: G / 2, py: o.y + G, id: o.id, color: o.color }));
  buckets.right.forEach(o => badges.push({ px: W + G + G / 2, py: o.y + G, id: o.id, color: o.color }));

  // završni globalni dedup: isti planet blizu (npr. u kutu, top+left) → jedan glif
  const kept = [];
  badges.forEach(b => {
    if (kept.some(k => k.id === b.id && Math.abs(k.px - b.px) < 26 && Math.abs(k.py - b.py) < 26)) return;
    kept.push(b);
  });

  acgEdgeOverlay.innerHTML = kept.map(b =>
    '<div class="acg-edge-glyph" style="left:' + b.px.toFixed(1) + 'px;top:' + b.py.toFixed(1) + 'px;border-color:' + b.color + '">' +
    glyphSvgHtml(b.id, 13, b.color, 'nt-glyph') + '</div>'
  ).join('');
}

function scheduleEdgeLabels() {
  if (acgRafPending) return;
  acgRafPending = true;
  requestAnimationFrame(() => { acgRafPending = false; updateAcgEdgeLabels(); });
}

function renderAcgResult(acg) {
  const wrap = document.getElementById('acg-result');
  if (!wrap) return;
  wrap.style.display = 'block';

  const title = document.getElementById('acg-chart-title');
  const sub = document.getElementById('acg-chart-sub');
  if (title) title.textContent = acg.name ? 'Astrokartografija — ' + acg.name : 'Astrokartografija';
  if (sub) sub.textContent = acg.dateV + ' · ' + acg.timeV + ' · ' + (acg.place ? acg.place.label : '');

  ensureLeaflet().then(() => {
    const map = acgInitMap();
    acgEdgeOverlay = document.getElementById('acg-edge-overlay');

    if (!acgListenersBound) {
      map.on('move zoom', scheduleEdgeLabels);
      map.on('moveend zoomend', updateAcgEdgeLabels);
      map.on('resize', () => { acgFitMinZoom(); updateAcgEdgeLabels(); });
      map.on('popupclose', () => { if (acgSelectedVis) { acgSelectedVis.setStyle({ weight: 2.2 }); acgSelectedVis = null; } });
      const sel = document.getElementById('acg-projection');
      if (sel) sel.addEventListener('change', acgRedraw);
      acgListenersBound = true;
    }

    renderAcgLegend(acg.lines);
    acgRedraw();
    setTimeout(() => { map.invalidateSize(); acgFitMinZoom(); updateAcgEdgeLabels(); }, 60);
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
    cb.addEventListener('change', acgRedraw);
  });
}
