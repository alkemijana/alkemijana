/* ============================================================
   Alkemijana — Natalna karta · SVG KOTAČ I TABLICE NA STRANICI
   Ovisi o: natal-data.js (GLYPHS, PALETTES, helperi)
           natal-calc.js (computeChart rezultat) — samo čita
   Izvozi: buildChartSVG, renderNatalResult, currentScreenPalette,
           birthDataLine, currentChart (globalna state varijabla)
   ============================================================ */

'use strict';

let currentChart = null;

function currentScreenPalette() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? PALETTES.light : PALETTES.dark;
}

function birthDataLine(chart) {
  const i = chart.input;
  const off = i.offsetMin;
  const offStr = 'UTC' + (off >= 0 ? '+' : '−') + Math.floor(Math.abs(off) / 60) + (Math.abs(off) % 60 ? ':' + pad2(Math.abs(off) % 60) : '');
  return i.d + '. ' + i.mo + '. ' + i.y + '. u ' + i.h + ':' + pad2(i.mi) + ' (' + offStr + ') · ' + i.place.label;
}

/* ============ SVG KOTAČ ============ */

/* Dasharray uzorci za crno-bijeli ispis — radna verzija (linetype mode) */
function aspectDashPattern(aspId) {
  switch (aspId) {
    case 'conjunction': return '1.5,2.8';
    case 'sextile':     return '4,3';
    case 'square':      return null;        // solid
    case 'trine':       return '9,4';
    case 'opposition':  return '8,3,1.5,3';
    default:            return null;
  }
}

function buildChartSVG(chart, pal, opts) {
  opts = opts || {};
  const aspectsEnabled = opts.aspectsEnabled || { conjunction: false, sextile: true, square: true, trine: true, opposition: true };
  const showCuspDegrees = opts.showCuspDegrees !== false;
  const linetype = !!opts.linetype;

  const C = 500;
  const R_OUT = 458, R_ZOD = 396, R_TICK = 386, R_HOUT = 256, R_HIN = 236;
  // prsten planeta (širi, kao Astro-Seek): glif planeta, stupanj, glif znaka, minute
  const R_GLYPH = 358, R_DEG = 322, R_SGN = 298, R_MIN = 276;
  const R_PTICK = R_ZOD, R_SIGN = 427;
  // osi izvan kotača (item 2)
  const R_AXIS_TICK = R_OUT + 13, R_AXIS_LBL = R_OUT + 32, R_AXIS_DEG = R_OUT + 53;
  // stupnjevi cuspsi izvan kotača (item 4)
  const R_CUSP_DEG = R_OUT + 17;
  const asc = chart.asc;

  // kut na ekranu: ASC lijevo, longitude rastu suprotno od kazaljke
  function pt(lonDeg, r) {
    const a = (180 + (lonDeg - asc)) * D2R;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  }
  function line(lon, r1, r2, color, w, dash) {
    const [x1, y1] = pt(lon, r1), [x2, y2] = pt(lon, r2);
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
      '" stroke="' + color + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  }
  function circle(r, color, w, fill) {
    return '<circle cx="' + C + '" cy="' + C + '" r="' + r + '" fill="' + (fill || 'none') + '" stroke="' + color + '" stroke-width="' + w + '"/>';
  }
  function arcBand(lonFrom, lonTo, rIn, rOut, fill) {
    const [x1, y1] = pt(lonFrom, rOut), [x2, y2] = pt(lonTo, rOut);
    const [x3, y3] = pt(lonTo, rIn), [x4, y4] = pt(lonFrom, rIn);
    return '<path d="M' + x1.toFixed(1) + ',' + y1.toFixed(1) +
      ' A' + rOut + ',' + rOut + ' 0 0,0 ' + x2.toFixed(1) + ',' + y2.toFixed(1) +
      ' L' + x3.toFixed(1) + ',' + y3.toFixed(1) +
      ' A' + rIn + ',' + rIn + ' 0 0,1 ' + x4.toFixed(1) + ',' + y4.toFixed(1) + ' Z" fill="' + fill + '" stroke="none"/>';
  }
  // centrirani tekst — koristi dy=".35em" umjesto dominant-baseline (pouzdano u svg2pdf)
  function textC(x, y, fill, size, content, weight, family) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + fill +
      '" font-size="' + size + '" font-family="' + (family || 'Quicksand, sans-serif') + '"' +
      (weight ? ' font-weight="' + weight + '"' : '') +
      ' text-anchor="middle" dy=".35em">' + content + '</text>';
  }

  let s = '';

  // zodijački pojas
  for (let k = 0; k < 12; k++) {
    s += arcBand(k * 30, k * 30 + 30, R_ZOD, R_OUT, (k % 2 === 0) ? pal.bandA : pal.bandB);
  }
  s += circle(R_OUT, pal.ring, 1.6) + circle(R_ZOD, pal.ring, 1.2);
  for (let k = 0; k < 12; k++) {
    s += line(k * 30, R_ZOD, R_OUT, pal.ringSoft, 1);
    const [gx, gy] = pt(k * 30 + 15, R_SIGN);
    s += glyphSvgEl(SIGN_KEYS[k], gx, gy, 34, elementColor(k * 30, pal), 1.9);
  }

  // stupanjske crtice
  for (let d = 0; d < 360; d++) {
    const len = (d % 10 === 0) ? 10 : (d % 5 === 0) ? 7 : 4;
    s += line(d, R_ZOD, R_ZOD - len, pal.tick, d % 10 === 0 ? 1.1 : 0.6);
  }
  s += circle(R_TICK, pal.ringSoft, 0.8);

  // kuće — vrhovi (osim osi koje crtamo ispod s posebnim izgledom)
  for (let i = 1; i <= 12; i++) {
    if (i === 1 || i === 4 || i === 7 || i === 10) continue;
    s += line(chart.cusps[i], R_HIN, R_ZOD, pal.cusp, 1.1);
  }

  // stupnjevi cuspsi izvan kotača (item 4)
  if (showCuspDegrees) {
    for (let i = 1; i <= 12; i++) {
      if (i === 1 || i === 4 || i === 7 || i === 10) continue; // osi imaju svoj stupanj
      const [cx, cy] = pt(chart.cusps[i], R_CUSP_DEG);
      s += textC(cx, cy, pal.houseNum, 11, fmtDegMin(chart.cusps[i]));
    }
  }

  // osi (ASC/DSC/MC/IC) — prekinute u unutarnjoj kružnici (ne smetaju aspektima),
  // oznake i stupnjevi IZVAN kotača (item 2)
  const axes = [
    { lon: chart.asc, label: 'ASC' }, { lon: norm360(chart.asc + 180), label: 'DSC' },
    { lon: chart.mc, label: 'MC' },   { lon: norm360(chart.mc + 180), label: 'IC' }
  ];
  for (const ax of axes) {
    // linija osi unutar kotača (prekinuta u sredini ostaje, aspekti se vide)
    s += line(ax.lon, R_HIN, R_ZOD, pal.axis, 2.2);
    // kratka crtica izvan vanjske kružnice — kao oznaka na "rubu" kotača
    s += line(ax.lon, R_OUT, R_AXIS_TICK, pal.axis, 2);
    // oznaka i stupanj izvan kotača
    const [tx, ty] = pt(ax.lon, R_AXIS_LBL);
    s += textC(tx, ty, pal.axisText, 19, ax.label, '600');
    const [dx, dy] = pt(ax.lon, R_AXIS_DEG);
    s += textC(dx, dy, pal.degText, 13.5, fmtDegMin(ax.lon));
  }

  // prsten brojeva kuća
  s += circle(R_HOUT, pal.ringSoft, 1) + circle(R_HIN, pal.ring, 1.2);
  for (let i = 1; i <= 12; i++) {
    const a = chart.cusps[i], b = chart.cusps[i === 12 ? 1 : i + 1];
    const mid = norm360(a + norm360(b - a) / 2);
    const [nx, ny] = pt(mid, (R_HOUT + R_HIN) / 2);
    s += textC(nx, ny, pal.houseNum, 17, i);
  }

  // aspektne linije
  if (opts.showAspects !== false) {
    const lonOf = {};
    for (const p of chart.planets) lonOf[p.id] = p.lon;
    lonOf.asc = chart.asc; lonOf.mc = chart.mc;
    for (const a of chart.aspects) {
      if (!aspectsEnabled[a.aspect]) continue;
      // konjunkcije: kratka linija između stvarnih pozicija (gotovo iste) — preskoči ako orb=0 vizualno nema smisla
      const [x1, y1] = pt(lonOf[a.a], R_HIN - 9), [x2, y2] = pt(lonOf[a.b], R_HIN - 9);
      const op = Math.max(0.3, 1 - a.orb / 9).toFixed(2);
      const dash = linetype ? aspectDashPattern(a.aspect) : null;
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="' + aspectColor(a.aspect, pal) + '" stroke-width="1.5" opacity="' + op + '"' +
        (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
    }
  }

  // planeti — razmicanje preklapanja (item 1: što manji razmak da spojnice budu kratke)
  const sorted = chart.planets.slice().sort((p, q) => norm360(p.lon - asc) - norm360(q.lon - asc));
  const MIN_SEP = 7.2;
  const adj = sorted.map(p => norm360(p.lon - asc));
  for (let it = 0; it < 120; it++) {
    let moved = false;
    for (let i = 0; i < adj.length; i++) {
      const j = (i + 1) % adj.length;
      let gap = adj[j] - adj[i];
      if (j === 0) gap += 360;
      if (gap < MIN_SEP) {
        const push = (MIN_SEP - gap) / 2 + 0.05;
        adj[i] -= push; adj[j] += push;
        if (j === 0) adj[j] = adj[j] % 360;
        moved = true;
      }
    }
    if (!moved) break;
  }

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const dispLon = norm360(asc + adj[i]);
    // crtica na stvarnoj poziciji (kratka — item 1)
    s += line(p.lon, R_PTICK, R_PTICK - 8, pal.planet, 1.6);
    // crtica s unutarnje strane kružnice — pokazuje gdje počinje aspektna linija
    s += line(p.lon, R_HIN, R_HIN - 9, pal.planet, 1.4);
    // spojnica od stvarne pozicije do glifa (kratka spojnica)
    const [cx1, cy1] = pt(p.lon, R_PTICK - 8), [cx2, cy2] = pt(dispLon, R_GLYPH + 18);
    s += '<line x1="' + cx1.toFixed(1) + '" y1="' + cy1.toFixed(1) + '" x2="' + cx2.toFixed(1) + '" y2="' + cy2.toFixed(1) +
      '" stroke="' + pal.tick + '" stroke-width="0.7"/>';
    const [gx, gy] = pt(dispLon, R_GLYPH);
    s += glyphSvgEl(p.id, gx, gy, 30, pal.planet, 1.8);
    // retrogradna oznaka — malo R uz glif planeta
    if (p.retro) {
      s += '<text x="' + (gx + 14).toFixed(1) + '" y="' + (gy - 9).toFixed(1) + '" fill="' + pal.tense +
        '" font-size="12" font-family="Quicksand, sans-serif" text-anchor="middle" dy=".35em">R</text>';
    }
    // stupanj · glif znaka (boja elementa) · minute — kao Astro-Seek
    const dm = degMinParts(p.lon);
    const [dx, dy] = pt(dispLon, R_DEG);
    s += textC(dx, dy, pal.degText, 15.5, dm.d + '°');
    const [sx, sy] = pt(dispLon, R_SGN);
    s += glyphSvgEl(signKey(p.lon), sx, sy, 21, elementColor(p.lon, pal), 2.0);
    const [mx, my] = pt(dispLon, R_MIN);
    s += textC(mx, my, pal.degText, 13.5, pad2(dm.m) + '′');
  }

  // viewBox prošireni za labele osi izvan kotača
  return '<svg viewBox="-60 -60 1120 1120" xmlns="http://www.w3.org/2000/svg" font-family="Quicksand, sans-serif">' +
    (pal.bg && pal.bg !== 'none' ? '<rect x="-60" y="-60" width="1120" height="1120" fill="' + pal.bg + '"/>' : '') +
    s + '</svg>';
}

/* ============ TABLICE I PRIKAZ NA STRANICI ============ */

function renderNatalResult(chart) {
  const wrap = document.getElementById('natal-result');
  wrap.style.display = 'block';

  const title = chart.input.name ? escHtml(chart.input.name) : 'Natalna karta';
  document.getElementById('natal-chart-title').textContent = title;
  document.getElementById('natal-chart-sub').textContent = birthDataLine(chart);

  const chartOpts = (typeof NATAL_CHART_OPTS !== 'undefined') ? {
    showAspects: true,
    aspectsEnabled: NATAL_CHART_OPTS.aspectsEnabled,
    showCuspDegrees: NATAL_CHART_OPTS.showCuspDegrees
  } : { showAspects: true };
  document.getElementById('natal-wheel').innerHTML =
    buildChartSVG(chart, currentScreenPalette(), chartOpts);

  // Tablica planeta
  const pal = currentScreenPalette();
  let rows = '';
  for (const p of chart.planets) {
    rows += '<tr><td>' + glyphSvgHtml(p.id, 19, pal.sign) + ' ' + p.name + '</td>' +
      '<td>' + glyphSvgHtml(signKey(p.lon), 17, elementColor(p.lon, pal)) + ' ' + signName(p.lon) + '</td>' +
      '<td class="nt-num">' + fmtDegMin(p.lon) + (p.retro ? ' <span class="nt-retro">R</span>' : '') + '</td>' +
      '<td class="nt-num">' + p.house + '.<span class="nt-kuca"> kuća</span></td></tr>';
  }
  rows += '<tr class="nt-angle-row"><td>ASC (podznak)</td><td>' + glyphSvgHtml(signKey(chart.asc), 17, elementColor(chart.asc, pal)) + ' ' + signName(chart.asc) + '</td><td class="nt-num">' + fmtDegMin(chart.asc) + '</td><td></td></tr>';
  rows += '<tr class="nt-angle-row"><td>MC (sredina neba)</td><td>' + glyphSvgHtml(signKey(chart.mc), 17, elementColor(chart.mc, pal)) + ' ' + signName(chart.mc) + '</td><td class="nt-num">' + fmtDegMin(chart.mc) + '</td><td></td></tr>';
  document.getElementById('natal-planets-tbody').innerHTML = rows;

  // Tablica kuća
  let hrows = '';
  for (let i = 1; i <= 12; i++) {
    hrows += '<tr><td class="nt-num">' + i + '.</td><td>' +
      glyphSvgHtml(signKey(chart.cusps[i]), 17, elementColor(chart.cusps[i], pal)) + ' ' + signName(chart.cusps[i]) +
      '</td><td class="nt-num">' + fmtDegMin(chart.cusps[i]) + '</td></tr>';
  }
  document.getElementById('natal-houses-tbody').innerHTML = hrows;

  // Aspekti
  const nameOf = {};
  for (const p of chart.planets) nameOf[p.id] = p.name;
  nameOf.asc = 'ASC'; nameOf.mc = 'MC';
  let arows = '';
  for (const a of chart.aspects) {
    arows += '<tr><td>' + (GLYPHS[a.a] ? glyphSvgHtml(a.a, 17, pal.sign) + ' ' : '') + nameOf[a.a] + '</td>' +
      '<td class="nt-asp nt-asp-' + a.aspect + '">' + glyphSvgHtml(a.aspect, 16, aspectColor(a.aspect, pal)) + ' ' + a.aspectName + '</td>' +
      '<td>' + (GLYPHS[a.b] ? glyphSvgHtml(a.b, 17, pal.sign) + ' ' : '') + nameOf[a.b] + '</td>' +
      '<td class="nt-num">' + a.orb.toFixed(1) + '°</td></tr>';
  }
  document.getElementById('natal-aspects-tbody').innerHTML = arows;

  renderAspectGrid(chart, pal);
  renderDominants(chart, pal);
  renderShape(chart);

  const disc = document.getElementById('natal-disclaimer');
  if (disc) {
    disc.textContent = 'Pozicije planeta: NASA JPL efemeride · Sustav kuća: Placidus · Tropski zodijak · ' +
      (chart.input.nodeType === 'mean' ? 'Srednji' : 'Pravi') + ' Mjesečev čvor, srednja Lilith';
  }
}

/* ============ ASPEKTNA TABLICA (trokutasta mreža) ============ */

function renderAspectGrid(chart, pal) {
  const wrap = document.getElementById('natal-aspgrid');
  if (!wrap) return;
  // točke koje sudjeluju u aspektima, redoslijedom karte + ASC/MC
  const pts = chart.planets
    .filter(p => p.id !== 'fortune' && p.id !== 'vertex' && p.id !== 'snode')
    .map(p => ({ id: p.id, name: p.name }));
  pts.push({ id: 'asc', name: 'ASC' }, { id: 'mc', name: 'MC' });

  const byPair = {};
  for (const a of chart.aspects) { byPair[a.a + '|' + a.b] = a; byPair[a.b + '|' + a.a] = a; }

  let h = '<table class="nt-aspgrid"><tbody>';
  for (let i = 0; i < pts.length; i++) {
    h += '<tr>';
    for (let j = 0; j < i; j++) {
      const a = byPair[pts[i].id + '|' + pts[j].id];
      if (a) {
        h += '<td class="nt-ag-cell" title="' + escHtml(pts[i].name + ' ' + a.aspectName.toLowerCase() + ' ' + pts[j].name + ' (orb ' + a.orb.toFixed(1) + '°)') + '">' +
          glyphSvgHtml(a.aspect, 15, aspectColor(a.aspect, pal)) +
          '<span class="nt-ag-orb">' + Math.round(a.orb) + '</span></td>';
      } else {
        h += '<td class="nt-ag-cell nt-ag-empty"></td>';
      }
    }
    // dijagonala — glif točke
    h += '<td class="nt-ag-diag" title="' + escHtml(pts[i].name) + '">' +
      (GLYPHS[pts[i].id] ? glyphSvgHtml(pts[i].id, 17, pal.planet) : '<span class="nt-ag-lbl">' + pts[i].name + '</span>') + '</td>';
    h += '</tr>';
  }
  h += '</tbody></table>';
  wrap.innerHTML = h;
}

/* ============ DOMINANTE ============ */

function renderDominants(chart, pal) {
  const el = document.getElementById('natal-dominants');
  if (!el) return;
  const dom = computeDominants(chart);

  const bar = (label, pct, color) =>
    '<div class="nt-dom-row"><span class="nt-dom-lbl">' + label + '</span>' +
    '<div class="nt-dom-bar"><div class="nt-dom-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
    '<span class="nt-dom-pct">' + pct + '%</span></div>';

  let h = '<div class="nt-dom-grid">';
  h += '<div class="nt-table-card"><h4>Elementi</h4>' +
    bar('Vatra', dom.elements[0], pal.fire) +
    bar('Zemlja', dom.elements[1], pal.earth) +
    bar('Zrak', dom.elements[2], pal.air) +
    bar('Voda', dom.elements[3], pal.water) + '</div>';
  h += '<div class="nt-table-card"><h4>Kvalitete</h4>' +
    bar('Kardinalno', dom.qualities[0], pal.axis) +
    bar('Fiksno', dom.qualities[1], pal.harm) +
    bar('Promjenjivo', dom.qualities[2], pal.conj) + '</div>';

  let rows = '';
  for (const c of dom.aspectCounts.slice(0, 8)) {
    rows += '<tr><td>' + (GLYPHS[c.id] ? glyphSvgHtml(c.id, 17, pal.sign) + ' ' : '') + c.name +
      '</td><td class="nt-num">' + c.count + '</td></tr>';
  }
  h += '<div class="nt-table-card"><h4>Najaspektiraniji</h4><table class="nt-table nt-table-dom">' +
    '<thead><tr><th>Točka</th><th>Aspekata</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  h += '</div>';
  el.innerHTML = h;
}

/* ============ OBLIK KARTE ============ */

function renderShape(chart) {
  const el = document.getElementById('natal-shape');
  if (!el) return;
  const sh = detectShape(chart);
  el.innerHTML = '<div class="nt-table-card nt-shape-card">' +
    '<h4>Oblik karte</h4>' +
    '<div class="nt-shape-name">' + escHtml(sh.name) + '</div>' +
    (sh.handle ? '<div class="nt-shape-handle">Ručka: <strong>' + escHtml(sh.handle) + '</strong></div>' : '') +
    '<p class="nt-shape-desc">' + escHtml(sh.desc) + '</p>' +
    '<p class="nt-shape-note">Oblik se određuje prema rasporedu 10 klasičnih planeta (Jonesovi uzorci).</p>' +
    '</div>';
}

/* Ponovno iscrtaj kotač kad se promijeni tema */
new MutationObserver(() => {
  if (currentChart && document.getElementById('natal-result').style.display !== 'none') {
    renderNatalResult(currentChart);
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
