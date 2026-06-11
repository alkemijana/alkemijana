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

function buildChartSVG(chart, pal, opts) {
  opts = opts || {};
  const C = 500;
  const R_OUT = 458, R_ZOD = 396, R_TICK = 386, R_HOUT = 256, R_HIN = 236;
  // prsten planeta (širi, kao Astro-Seek): glif planeta, stupanj, glif znaka, minute
  const R_GLYPH = 358, R_DEG = 322, R_SGN = 298, R_MIN = 276;
  const R_PTICK = R_ZOD, R_SIGN = 427;
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

  // kuće — vrhovi
  for (let i = 1; i <= 12; i++) {
    if (i === 1 || i === 4 || i === 7 || i === 10) continue;
    s += line(chart.cusps[i], R_HIN, R_ZOD, pal.cusp, 1.1);
  }
  // osi (ASC/DSC/MC/IC) — pune linije kroz središte, oznake unutar kotača
  // (kao Astro-Seek); strelice na ASC i MC kraju
  const axes = [
    { lon: chart.asc, label: 'ASC', arrow: true }, { lon: norm360(chart.asc + 180), label: 'DSC' },
    { lon: chart.mc, label: 'MC', arrow: true },   { lon: norm360(chart.mc + 180), label: 'IC' }
  ];
  for (const ax of axes) {
    s += line(ax.lon, 0, R_ZOD, pal.axis, 2.2);
    if (ax.arrow) {
      const [hx, hy] = pt(ax.lon, R_ZOD);
      const aRad = (180 + (ax.lon - asc)) * D2R;
      const ux = Math.cos(aRad), uy = -Math.sin(aRad);
      const px = -uy, py = ux;
      s += '<path d="M' + (hx + ux * 10).toFixed(1) + ',' + (hy + uy * 10).toFixed(1) +
        ' L' + (hx + px * 5).toFixed(1) + ',' + (hy + py * 5).toFixed(1) +
        ' L' + (hx - px * 5).toFixed(1) + ',' + (hy - py * 5).toFixed(1) + ' Z" fill="' + pal.axis + '"/>';
    }
    const [tx, ty] = pt(ax.lon + 7, 212);
    s += '<text x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" fill="' + pal.axisText +
      '" font-size="19" font-family="Quicksand, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="middle">' + ax.label + '</text>';
  }

  // prsten brojeva kuća
  s += circle(R_HOUT, pal.ringSoft, 1) + circle(R_HIN, pal.ring, 1.2);
  for (let i = 1; i <= 12; i++) {
    const a = chart.cusps[i], b = chart.cusps[i === 12 ? 1 : i + 1];
    const mid = norm360(a + norm360(b - a) / 2);
    const [nx, ny] = pt(mid, (R_HOUT + R_HIN) / 2);
    s += '<text x="' + nx.toFixed(1) + '" y="' + ny.toFixed(1) + '" fill="' + pal.houseNum +
      '" font-size="17" font-family="Quicksand, sans-serif" text-anchor="middle" dominant-baseline="middle">' + i + '</text>';
  }

  // aspektne linije
  if (opts.showAspects !== false) {
    const lonOf = {};
    for (const p of chart.planets) lonOf[p.id] = p.lon;
    lonOf.asc = chart.asc; lonOf.mc = chart.mc;
    for (const a of chart.aspects) {
      if (a.aspect === 'conjunction') continue;
      const [x1, y1] = pt(lonOf[a.a], R_HIN - 4), [x2, y2] = pt(lonOf[a.b], R_HIN - 4);
      const op = Math.max(0.25, 1 - a.orb / 9).toFixed(2);
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="' + aspectColor(a.aspect, pal) + '" stroke-width="1.5" opacity="' + op + '"/>';
    }
  }

  // planeti — razmicanje preklapanja
  const sorted = chart.planets.slice().sort((p, q) => norm360(p.lon - asc) - norm360(q.lon - asc));
  const MIN_SEP = 10.5;
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
    // crtica na stvarnoj poziciji + spojnica do prikazane
    s += line(p.lon, R_PTICK, R_PTICK - 12, pal.planet, 1.6);
    const [cx1, cy1] = pt(p.lon, R_PTICK - 12), [cx2, cy2] = pt(dispLon, R_GLYPH + 20);
    s += '<line x1="' + cx1.toFixed(1) + '" y1="' + cy1.toFixed(1) + '" x2="' + cx2.toFixed(1) + '" y2="' + cy2.toFixed(1) +
      '" stroke="' + pal.tick + '" stroke-width="0.7"/>';
    const [gx, gy] = pt(dispLon, R_GLYPH);
    s += glyphSvgEl(p.id, gx, gy, 34, pal.planet, 1.8);
    // stupanj · glif znaka (boja elementa) · minute — kao Astro-Seek
    const dm = degMinParts(p.lon);
    const [dx, dy] = pt(dispLon, R_DEG);
    s += '<text x="' + dx.toFixed(1) + '" y="' + dy.toFixed(1) + '" fill="' + pal.degText +
      '" font-size="15.5" font-family="Quicksand, sans-serif" text-anchor="middle" dominant-baseline="middle">' + dm.d + '°</text>';
    const [sx, sy] = pt(dispLon, R_SGN);
    s += glyphSvgEl(signKey(p.lon), sx, sy, 21, elementColor(p.lon, pal), 2.0);
    const [mx, my] = pt(dispLon, R_MIN);
    s += '<text x="' + mx.toFixed(1) + '" y="' + my.toFixed(1) + '" fill="' + pal.degText +
      '" font-size="13.5" font-family="Quicksand, sans-serif" text-anchor="middle" dominant-baseline="middle">' +
      pad2(dm.m) + '′' + (p.retro ? ' <tspan font-size="11">R</tspan>' : '') + '</text>';
  }

  return '<svg viewBox="-30 -30 1060 1060" xmlns="http://www.w3.org/2000/svg" font-family="Quicksand, sans-serif">' +
    (pal.bg && pal.bg !== 'none' ? '<rect x="-30" y="-30" width="1060" height="1060" fill="' + pal.bg + '"/>' : '') +
    s + '</svg>';
}

/* ============ TABLICE I PRIKAZ NA STRANICI ============ */

function renderNatalResult(chart) {
  const wrap = document.getElementById('natal-result');
  wrap.style.display = 'block';

  const title = chart.input.name ? escHtml(chart.input.name) : 'Natalna karta';
  document.getElementById('natal-chart-title').textContent = title;
  document.getElementById('natal-chart-sub').textContent = birthDataLine(chart);

  document.getElementById('natal-wheel').innerHTML =
    buildChartSVG(chart, currentScreenPalette(), { showAspects: true });

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
}

/* Ponovno iscrtaj kotač kad se promijeni tema */
new MutationObserver(() => {
  if (currentChart && document.getElementById('natal-result').style.display !== 'none') {
    renderNatalResult(currentChart);
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
