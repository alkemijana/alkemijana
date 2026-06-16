/* ============================================================
   Alkemijana — Natalna karta · SVG KOTAČ I TABLICE NA STRANICI
   Ovisi o: natal-data.js (GLYPHS, PALETTES, helperi)
           natal-calc.js (computeChart rezultat) — samo čita
   Izvozi: buildChartSVG, renderNatalResult, currentScreenPalette,
           birthDataLine, currentChart (globalna state varijabla)
   ============================================================ */

'use strict';

let currentChart = null;
let currentSynastry = null;   // { a: chartA, b: chartB, aspects: [...] } — sinastrija
let currentTransit = null;    // { natal, transit, aspects } — tranziti (živi bi-wheel)

function currentScreenPalette() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? PALETTES.light : PALETTES.dark;
}

function birthDataLine(chart) {
  const i = chart.input;
  if (chart.noTime) {
    return i.d + '. ' + i.mo + '. ' + i.y + '. (vrijeme nepoznato) · ' + i.place.label;
  }
  const off = i.offsetMin;
  const offStr = 'UTC' + (off >= 0 ? '+' : '−') + Math.floor(Math.abs(off) / 60) + (Math.abs(off) % 60 ? ':' + pad2(Math.abs(off) % 60) : '');
  return i.d + '. ' + i.mo + '. ' + i.y + '. u ' + i.h + ':' + pad2(i.mi) + ' (' + offStr + ') · ' + i.place.label;
}

/* ============ SVG KOTAČ ============ */

/* Dasharray uzorci za crno-bijeli ispis — radna verzija (linetype mode).
   Jedinice su SVG user-units kotača; legenda u PDF-u skalira iste brojeve. */
function aspectDashPattern(aspId) {
  switch (aspId) {
    case 'conjunction': return '2,5';
    case 'sextile':     return '8,6';
    case 'square':      return null;          // puna linija
    case 'trine':       return '26,9';
    case 'opposition':  return '14,6,2.5,6';
    default:            return null;
  }
}

/* Debljina aspektne linije (SVG user-units kotača) — uz boju i dasharray,
   različita debljina dodatno olakšava raspoznavanje. Legenda u PDF-u koristi
   iste vrijednosti (skalirane) pa se uzorci poklapaju s nacrtanim aspektima. */
function aspectLineWidth(aspId) {
  switch (aspId) {
    case 'conjunction': return 2.4;
    case 'opposition':  return 2.0;
    case 'square':      return 1.6;
    case 'trine':       return 1.2;
    case 'sextile':     return 0.9;
    default:            return 1.5;
  }
}

function buildChartSVG(chart, pal, opts) {
  opts = opts || {};
  const aspectsEnabled = opts.aspectsEnabled || { conjunction: true, sextile: true, square: true, trine: true, opposition: true };
  const showCuspDegrees = opts.showCuspDegrees !== false;
  const linetype = !!opts.linetype;
  const ls = opts.labelScale || 1;   // množi fontove/glifove (radni PDF — krupnije oznake)
  const noTime = !!chart.noTime;     // bez vremena rođenja: nema kuća/osi, 0° Ovna lijevo
  const biwheel = opts.biwheel || null;  // sinastrija/tranziti: vanjski prsten = druga karta (uže kuće)
  // sloj crtanja (samo bi-wheel): 'all' = sve; 'base' = statika bez vanjskog prstena/aspekata;
  // 'dynamic' = samo vanjski prsten + aspekti (za živo osvježavanje tranzita preko statične podloge)
  const layer = biwheel ? (opts.layer || 'all') : 'all';

  const C = 500;
  const R_OUT = 458, R_ZOD = 396, R_TICK = 386;
  // u bi-wheelu prsten kuća pomaknut prema sredini (mjesta za dva prstena planeta)
  // natalni krug nepromijenjen; bi-wheel ima MANJI unutarnji (aspektni) krug — mjesta za dva puna prstena
  const R_HOUT = biwheel ? 212 : 240, R_HIN = biwheel ? 194 : 220;
  // prsten planeta (širi, kao Astro-Seek): glif planeta, stupanj, glif znaka, minute
  const R_GLYPH = 360, R_DEG = 324, R_SGN = 294, R_MIN = 266;
  // bi-wheel: BEZ glifa znaka (kao Astro-Seek) → krupniji glif + stupanj, minute manjim fontom.
  // unutarnji (A) prsten malo širi, vanjski (B) malo uži; razdjelnica R_MID.
  const R_MID = 311;
  const R_B_GLYPH = 374, R_B_DEG = 341, R_B_MIN = 320;
  const R_A_GLYPH = 290, R_A_DEG = 257, R_A_MIN = 234;
  const R_PTICK = R_ZOD, R_SIGN = 427;
  // osi izvan kotača — stupanj se slaže prema van (ekranski) da ne dira kružnicu
  const R_AXIS_TICK = R_OUT + 12, R_AXIS_LBL = R_OUT + 34;
  // znak + stupanj cuspsi izvan kotača
  const R_CUSP_SIGN = R_OUT + 22;
  const asc = noTime ? 0 : chart.asc;

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
  // centrirani tekst — x i y računamo SAMI canvas metrikom stvarnog fonta,
  // jer svg2pdf centrira text-anchor="middle" helvetica metrikom (tekst bježi u PDF-u)
  function textC(x, y, fill, size, content, weight, family) {
    const fam = family || 'Quicksand, sans-serif';
    const txt = String(content);
    const wpx = measureTextPx(txt, size, fam, weight);
    const attrs = ' fill="' + fill + '" font-size="' + size + '" font-family="' + fam + '"' +
      (weight ? ' font-weight="' + weight + '"' : '');
    if (wpx > 0) {
      return '<text x="' + (x - wpx / 2).toFixed(1) + '" y="' + (y + size * 0.35).toFixed(1) + '"' + attrs + '>' + txt + '</text>';
    }
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + attrs + ' text-anchor="middle" dy=".35em">' + txt + '</text>';
  }

  let s = '';

  // ── STATIČNI SLOJ (zodijak, crtice, kuće, osi) — preskače se na 'dynamic' sloju ──
  if (layer !== 'dynamic') {
  // zodijački pojas
  for (let k = 0; k < 12; k++) {
    s += arcBand(k * 30, k * 30 + 30, R_ZOD, R_OUT, (k % 2 === 0) ? pal.bandA : pal.bandB);
  }
  s += circle(R_OUT, pal.ring, 1.6) + circle(R_ZOD, pal.ring, 1.2);
  for (let k = 0; k < 12; k++) {
    s += line(k * 30, R_ZOD, R_OUT, pal.ringSoft, 1);
    const [gx, gy] = pt(k * 30 + 15, R_SIGN);
    s += glyphSvgEl(SIGN_KEYS[k], gx, gy, 34 * ls, elementColor(k * 30, pal), 1.9);
  }

  // stupanjske crtice
  for (let d = 0; d < 360; d++) {
    const len = (d % 10 === 0) ? 10 : (d % 5 === 0) ? 7 : 4;
    s += line(d, R_ZOD, R_ZOD - len, pal.tick, d % 10 === 0 ? 1.1 : 0.6);
  }
  s += circle(R_TICK, pal.ringSoft, 0.8);

  if (!noTime) {
    // kuće — vrhovi (osim osi koje crtamo ispod s posebnim izgledom)
    for (let i = 1; i <= 12; i++) {
      if (i === 1 || i === 4 || i === 7 || i === 10) continue;
      s += line(chart.cusps[i], R_HIN, biwheel ? R_MID : R_ZOD, pal.cusp, 1.1);
    }

    // znak + stupanj cuspsi izvan kotača (stupanj ispod znaka, ekranski — bez preklapanja)
    // — u bi-wheelu preskačemo (vanjski prsten zauzima taj prostor)
    if (showCuspDegrees && !biwheel) {
      for (let i = 1; i <= 12; i++) {
        if (i === 1 || i === 4 || i === 7 || i === 10) continue; // osi imaju svoju oznaku
        const [cx, cy] = pt(chart.cusps[i], R_CUSP_SIGN);
        s += glyphSvgEl(signKey(chart.cusps[i]), cx, cy, 21 * ls, elementColor(chart.cusps[i], pal), 1.7);
        // u gornjoj polovici stupanj iznad glifa (prema van), u donjoj ispod — ne dira kružnicu
        s += textC(cx, cy + (cy < C ? -18 : 19) * ls, pal.degStrong, 14 * ls, fmtDegMin(chart.cusps[i]));
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
      s += line(ax.lon, R_HIN, biwheel ? R_MID : R_ZOD, pal.axis, 2.2);
      // kratka crtica izvan vanjske kružnice — kao oznaka na "rubu" kotača
      s += line(ax.lon, R_OUT, R_AXIS_TICK, pal.axis, 2);
      // oznaka izvan kotača, stupanj prema van (gore iznad, dolje ispod) — ne dira kružnicu
      const [tx, ty] = pt(ax.lon, R_AXIS_LBL);
      s += textC(tx, ty, pal.axisText, 19 * ls, ax.label, '600');
      s += textC(tx, ty + (ty < C ? -17 : 19) * ls, pal.degStrong, 14.5 * ls, fmtDegMin(ax.lon));
    }
  }

  // prsten brojeva kuća (bez vremena rođenja: samo unutarnja kružnica za aspekte)
  if (biwheel) s += circle(R_MID, pal.ringSoft, 0.9);  // razdjelnica: vanjski (B) / unutarnji (A) prsten
  s += circle(R_HIN, pal.ring, 1.2);
  if (!noTime) {
    s += circle(R_HOUT, pal.ringSoft, 1);
    for (let i = 1; i <= 12; i++) {
      const a = chart.cusps[i], b = chart.cusps[i === 12 ? 1 : i + 1];
      const mid = norm360(a + norm360(b - a) / 2);
      const [nx, ny] = pt(mid, (R_HOUT + R_HIN) / 2);
      s += textC(nx, ny, pal.houseNum, 17 * ls, i);
    }
  }
  }  // ── kraj statičnog sloja ──

  // ── helper: nacrtaj jedan prsten planeta (natalni prikaz = jedan poziv; bi-wheel = dva) ──
  // r: { glyph, deg, sgn, min, tickFrom, minShow, scale }; glyphColor = boja glifa planeta
  function drawRing(planets, r, glyphColor, retroColor) {
    let out = '';
    const sc = r.scale || 1;
    const atW = r.aspTickW || 1.6, atLen = r.aspTickLen || 9;  // aspektna crtica: debljina + duljina
    const srt = planets.slice().sort((p, q) => norm360(p.lon - asc) - norm360(q.lon - asc));
    // minimalan razmak — glifovi se smiju gotovo dodirivati (krupno i zbijeno)
    const MIN_SEP = 3.4 * (1 + (ls - 1) * 0.4) * sc;
    const adj = srt.map(p => norm360(p.lon - asc));
    for (let it = 0; it < 140; it++) {
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
    for (let i = 0; i < srt.length; i++) {
      const p = srt[i];
      const dispLon = norm360(asc + adj[i]);
      // crtica na stvarnoj poziciji — od ruba prstena prema glifu
      out += line(p.lon, r.tickFrom, r.glyph + 16 * sc, pal.tick, 1.2);
      // poveznica do glifa kad je razmaknut (gust skup simbola) — pokazuje na koji se stupanj odnosi
      const dispDelta = Math.abs(norm360(dispLon - p.lon + 180) - 180);
      if (dispDelta > 1.0) {
        const [lcx1, lcy1] = pt(p.lon, r.glyph + 16 * sc);
        const [lcx2, lcy2] = pt(dispLon, r.glyph + 10 * sc);
        out += '<line x1="' + lcx1.toFixed(1) + '" y1="' + lcy1.toFixed(1) + '" x2="' + lcx2.toFixed(1) + '" y2="' + lcy2.toFixed(1) +
          '" stroke="' + pal.degText + '" stroke-width="1" opacity="0.85"/>';
      }
      // aspektna crtica (gdje počinje aspektna linija) — boja i debljina ovise o prstenu
      out += line(p.lon, R_HIN, R_HIN - atLen, glyphColor, atW);
      const [gx, gy] = pt(dispLon, r.glyph);
      out += glyphSvgEl(p.id, gx, gy, 30 * ls * sc, glyphColor, 1.8);
      // R za retrogradno: natalna karta — zaseban uz glif (kako je bilo); bi-wheel (retroInline) —
      // dopisan uz minute, da NE dira glif planeta ni stupanj.
      if (p.retro && !r.retroInline) {
        out += textC(gx + 13 * ls * sc, gy - 11 * ls * sc, retroColor, 11 * ls * sc, 'R');
      }
      // stupanj — kontrastna boja (bijela na tamnoj, crna na svijetloj temi), obična debljina
      const dm = degMinParts(p.lon);
      const [dx, dy] = pt(dispLon, r.deg);
      out += textC(dx, dy, pal.degStrong, 16.5 * ls * sc, dm.d + '°');
      // glif znaka (samo natalni prikaz; sinastrija/tranziti ga izostavljaju — kao Astro-Seek)
      if (r.sgn != null) {
        const [sx, sy] = pt(dispLon, r.sgn);
        out += glyphSvgEl(signKey(p.lon), sx, sy, 21 * ls * sc, elementColor(p.lon, pal), 2.0);
      }
      if (r.minShow) {
        const [mx, my] = pt(dispLon, r.min);
        const minTxt = pad2(dm.m) + "'" + (r.retroInline && p.retro ? ' R' : '');
        out += textC(mx, my, pal.degStrong, (r.minFont || 14) * ls * sc, minTxt);
      }
    }
    return out;
  }

  // aspektne linije (ne crtaju se na 'base' sloju)
  if (opts.showAspects !== false && layer !== 'base') {
    if (biwheel) {
      // sinastrija: svaka linija spaja točku osobe A i točku osobe B (cross-aspekt)
      const lonA = {}, lonB = {};
      for (const p of chart.planets) lonA[p.id] = p.lon;
      for (const p of biwheel.planets) lonB[p.id] = p.lon;
      if (!noTime) { lonA.asc = chart.asc; lonA.mc = chart.mc; }
      if (!biwheel.noTime) { lonB.asc = biwheel.asc; lonB.mc = biwheel.mc; }
      for (const a of (opts.synAspects || [])) {
        if (!aspectsEnabled[a.aspect]) continue;
        if (lonA[a.a] == null || lonB[a.b] == null) continue;
        const [x1, y1] = pt(lonA[a.a], R_HIN - 9), [x2, y2] = pt(lonB[a.b], R_HIN - 9);
        const op = Math.max(0.32, 1 - a.orb / 8).toFixed(2);
        const dash = linetype ? aspectDashPattern(a.aspect) : null;
        const lw = aspectLineWidth(a.aspect);
        s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
          '" stroke="' + aspectColor(a.aspect, pal) + '" stroke-width="' + lw + '" opacity="' + op + '"' +
          (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
      }
    } else {
      const lonOf = {};
      for (const p of chart.planets) lonOf[p.id] = p.lon;
      if (!noTime) { lonOf.asc = chart.asc; lonOf.mc = chart.mc; }
      for (const a of chart.aspects) {
        if (!aspectsEnabled[a.aspect]) continue;
        // konjunkcije: kratka linija između stvarnih pozicija (gotovo iste)
        const [x1, y1] = pt(lonOf[a.a], R_HIN - 9), [x2, y2] = pt(lonOf[a.b], R_HIN - 9);
        const op = Math.max(0.3, 1 - a.orb / 9).toFixed(2);
        const dash = linetype ? aspectDashPattern(a.aspect) : null;
        const lw = aspectLineWidth(a.aspect);
        s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
          '" stroke="' + aspectColor(a.aspect, pal) + '" stroke-width="' + lw + '" opacity="' + op + '"' +
          (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
      }
    }
  }

  // planeti
  if (biwheel) {
    // unutarnji prsten = natalna/osoba A; vanjski = tranzit/osoba B — krupniji glifovi, bez glifa znaka.
    // aspektne crtice razlikovane: unutarnji tanji, vanjski deblji (uz boju prstena).
    if (layer !== 'dynamic')
      s += drawRing(chart.planets,   { glyph: R_A_GLYPH, deg: R_A_DEG, min: R_A_MIN, tickFrom: R_MID, minShow: true, minFont: 11.5, scale: 1.15, aspTickW: 2.2, aspTickLen: 10, retroInline: true }, pal.planet,    pal.tense);
    if (layer !== 'base')
      s += drawRing(biwheel.planets, { glyph: R_B_GLYPH, deg: R_B_DEG, min: R_B_MIN, tickFrom: R_ZOD, minShow: true, minFont: 11.5, scale: 1.15, aspTickW: 3.6, aspTickLen: 13, retroInline: true }, biwheel.color, pal.tense);
  } else {
    s += drawRing(chart.planets, { glyph: R_GLYPH, deg: R_DEG, sgn: R_SGN, min: R_MIN, tickFrom: R_PTICK, minShow: true, scale: 1, aspTickW: 1.6, aspTickLen: 9 }, pal.planet, pal.tense);
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
    showAspects: true, labelScale: 1.2,
    aspectsEnabled: NATAL_CHART_OPTS.aspectsEnabled,
    showCuspDegrees: NATAL_CHART_OPTS.showCuspDegrees
  } : { showAspects: true, labelScale: 1.2 };
  document.getElementById('natal-wheel').innerHTML =
    buildChartSVG(chart, currentScreenPalette(), chartOpts);

  // Tablica planeta
  const pal = currentScreenPalette();
  let rows = '';
  for (const p of chart.planets) {
    rows += '<tr><td>' + glyphSvgHtml(p.id, 19, pal.sign) + ' ' + p.name + '</td>' +
      '<td>' + glyphSvgHtml(signKey(p.lon), 17, elementColor(p.lon, pal)) + ' ' + signName(p.lon) + '</td>' +
      '<td class="nt-num">' + fmtDegMin(p.lon) + (p.retro ? ' <span class="nt-retro">R</span>' : '') + '</td>' +
      '<td class="nt-num">' + (p.house ? p.house + '.<span class="nt-kuca"> kuća</span>' : '—') + '</td></tr>';
  }
  if (!chart.noTime) {
    rows += '<tr class="nt-angle-row"><td>ASC (podznak)</td><td>' + glyphSvgHtml(signKey(chart.asc), 17, elementColor(chart.asc, pal)) + ' ' + signName(chart.asc) + '</td><td class="nt-num">' + fmtDegMin(chart.asc) + '</td><td></td></tr>';
    rows += '<tr class="nt-angle-row"><td>MC (sredina neba)</td><td>' + glyphSvgHtml(signKey(chart.mc), 17, elementColor(chart.mc, pal)) + ' ' + signName(chart.mc) + '</td><td class="nt-num">' + fmtDegMin(chart.mc) + '</td><td></td></tr>';
  }
  document.getElementById('natal-planets-tbody').innerHTML = rows;

  // Tablica kuća (bez vremena rođenja kuće ne postoje — sakrij karticu)
  const housesCard = document.getElementById('natal-houses-card');
  if (housesCard) housesCard.style.display = chart.noTime ? 'none' : '';
  let hrows = '';
  if (!chart.noTime) {
    for (let i = 1; i <= 12; i++) {
      hrows += '<tr><td class="nt-num">' + i + '.</td><td>' +
        glyphSvgHtml(signKey(chart.cusps[i]), 17, elementColor(chart.cusps[i], pal)) + ' ' + signName(chart.cusps[i]) +
        '</td><td class="nt-num">' + fmtDegMin(chart.cusps[i]) + '</td></tr>';
    }
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
    disc.textContent = chart.noTime
      ? 'Vrijeme rođenja nepoznato — pozicije izračunate za podne. Bez kuća, podznaka (ASC) i MC-a; ' +
        'Mjesec se pomakne do ±7° pa je njegova pozicija približna. Pozicije planeta: NASA JPL efemeride · Tropski zodijak · ' +
        (chart.input.nodeType === 'mean' ? 'Srednji' : 'Pravi') + ' Mjesečev čvor, srednja Lilith'
      : 'Pozicije planeta: NASA JPL efemeride · Sustav kuća: Placidus · Tropski zodijak · ' +
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
  if (!chart.noTime) pts.push({ id: 'asc', name: 'ASC' }, { id: 'mc', name: 'MC' });

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

/* ============ SINASTRIJA — BI-WHEEL + TABLICE ============ */

/* Kotač sinastrije: osoba A je baza (kuće/osi), osoba B je vanjski prsten. */
function buildSynastryWheel(chartA, chartB, pal) {
  const aspects = (currentSynastry && currentSynastry.aspects) || computeSynastryAspects(chartA, chartB, TRANSIT_ORB);
  const opts = {
    showAspects: true, labelScale: 1.2,
    biwheel: { planets: chartB.planets, asc: chartB.asc, mc: chartB.mc, noTime: chartB.noTime, color: pal.planetB },
    synAspects: aspects
  };
  if (typeof SYN_CHART_OPTS !== 'undefined') opts.aspectsEnabled = SYN_CHART_OPTS.aspectsEnabled;
  return buildChartSVG(chartA, pal, opts);
}

/* Naziv točaka karte za sinastriju (planeti + osi). */
function synNameMap(chart) {
  const m = {};
  for (const p of chart.planets) m[p.id] = p.name;
  m.asc = 'ASC'; m.mc = 'MC';
  return m;
}

/* Redovi tablice pozicija jedne osobe (planeti + ASC/MC). */
function synPositionsRows(chart, pal) {
  let rows = '';
  for (const p of chart.planets) {
    rows += '<tr><td>' + glyphSvgHtml(p.id, 18, pal.sign) + ' ' + p.name + '</td>' +
      '<td>' + glyphSvgHtml(signKey(p.lon), 16, elementColor(p.lon, pal)) + ' ' + signName(p.lon) + '</td>' +
      '<td class="nt-num">' + fmtDegMin(p.lon) + (p.retro ? ' <span class="nt-retro">R</span>' : '') + '</td>' +
      '<td class="nt-num">' + (p.house ? p.house + '.' : '—') + '</td></tr>';
  }
  if (!chart.noTime) {
    rows += '<tr class="nt-angle-row"><td>ASC</td><td>' + glyphSvgHtml(signKey(chart.asc), 16, elementColor(chart.asc, pal)) + ' ' + signName(chart.asc) + '</td><td class="nt-num">' + fmtDegMin(chart.asc) + '</td><td></td></tr>';
    rows += '<tr class="nt-angle-row"><td>MC</td><td>' + glyphSvgHtml(signKey(chart.mc), 16, elementColor(chart.mc, pal)) + ' ' + signName(chart.mc) + '</td><td class="nt-num">' + fmtDegMin(chart.mc) + '</td><td></td></tr>';
  }
  return rows;
}

/* Tablica međuaspekata (popis, sortiran po orbu): planet osobe A — aspekt — planet osobe B. */
function renderSynastryAspects(chartA, chartB, pal) {
  const el = document.getElementById('synastry-aspects');
  if (!el) return;
  const aspects = (currentSynastry && currentSynastry.aspects) || computeSynastryAspects(chartA, chartB, TRANSIT_ORB);
  const nameA = chartA.input.name || 'Prva osoba';
  const nameB = chartB.input.name || 'Druga osoba';
  const nmA = synNameMap(chartA), nmB = synNameMap(chartB);
  if (!aspects.length) {
    el.innerHTML = '<p class="syn-empty">Nema značajnih međuaspekata unutar orbisa.</p>';
    return;
  }
  let rows = '';
  for (const a of aspects) {
    rows += '<tr>' +
      '<td>' + (GLYPHS[a.a] ? glyphSvgHtml(a.a, 17, pal.planet) + ' ' : '') + (nmA[a.a] || a.a) + '</td>' +
      '<td class="nt-asp nt-asp-' + a.aspect + '">' + glyphSvgHtml(a.aspect, 16, aspectColor(a.aspect, pal)) + ' ' + a.aspectName + '</td>' +
      '<td>' + (GLYPHS[a.b] ? glyphSvgHtml(a.b, 17, pal.planetB) + ' ' : '') + (nmB[a.b] || a.b) + '</td>' +
      '<td class="nt-num">' + a.orb.toFixed(1) + '°</td></tr>';
  }
  el.innerHTML =
    '<table class="nt-table syn-asp-table"><thead><tr>' +
    '<th>' + escHtml(nameA) + '</th><th>Aspekt</th><th>' + escHtml(nameB) + '</th><th>Orb</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

/* Glavni prikaz rezultata sinastrije. */
function renderSynastryResult(chartA, chartB) {
  const wrap = document.getElementById('synastry-result');
  if (!wrap) return;
  currentSynastry = { a: chartA, b: chartB, aspects: computeSynastryAspects(chartA, chartB, TRANSIT_ORB) };

  // prebaci prikaz: sakrij natalni rezultat, pokaži sinastriju
  const nat = document.getElementById('natal-result');
  if (nat) nat.style.display = 'none';
  wrap.style.display = 'block';

  const pal = currentScreenPalette();
  const nameA = chartA.input.name || 'Prva osoba';
  const nameB = chartB.input.name || 'Druga osoba';

  document.getElementById('synastry-chart-title').textContent = nameA + ' & ' + nameB;
  document.getElementById('synastry-chart-sub').innerHTML =
    escHtml(birthDataLine(chartA)) + '<br>' + escHtml(birthDataLine(chartB));

  document.getElementById('synastry-legend').innerHTML =
    '<span class="syn-legend-item"><span class="syn-legend-dot" style="background:' + pal.planet + '"></span>' +
      '<strong>' + escHtml(nameA) + '</strong> <span class="syn-legend-meta">unutarnji prsten · kuće</span></span>' +
    '<span class="syn-legend-item"><span class="syn-legend-dot" style="background:' + pal.planetB + '"></span>' +
      '<strong>' + escHtml(nameB) + '</strong> <span class="syn-legend-meta">vanjski prsten</span></span>';

  document.getElementById('synastry-wheel').innerHTML = buildSynastryWheel(chartA, chartB, pal);

  renderSynastryAspects(chartA, chartB, pal);

  document.getElementById('synastry-pos1-title').textContent = nameA;
  document.getElementById('synastry-pos2-title').textContent = nameB;
  document.getElementById('synastry-pos1-tbody').innerHTML = synPositionsRows(chartA, pal);
  document.getElementById('synastry-pos2-tbody').innerHTML = synPositionsRows(chartB, pal);

  const disc = document.getElementById('synastry-disclaimer');
  if (disc) {
    disc.textContent = 'Bi-wheel: ' + nameA + ' (unutarnji prsten) i ' + nameB + ' (vanjski prsten). ' +
      'Linije u središtu su međuaspekti. Prikazane kuće i osi su ' + nameA + '-ine (Placidus). ' +
      'Pozicije: NASA JPL efemeride · tropski zodijak.';
  }
}

/* ============ TRANZITI — natalna karta + tranzitni planeti (živi bi-wheel) ============ */

/* Pozicije tranzitnih planeta (bez kuća — tranzit nema vlastite kuće u ovom prikazu). */
function transitPositionsRows(chart, pal) {
  let rows = '';
  for (const p of chart.planets) {
    rows += '<tr><td>' + glyphSvgHtml(p.id, 18, pal.sign) + ' ' + p.name + '</td>' +
      '<td>' + glyphSvgHtml(signKey(p.lon), 16, elementColor(p.lon, pal)) + ' ' + signName(p.lon) + '</td>' +
      '<td class="nt-num">' + fmtDegMin(p.lon) + (p.retro ? ' <span class="nt-retro">R</span>' : '') + '</td></tr>';
  }
  return rows;
}

/* SVG pomičnog (dinamičnog) sloja: tranzitni planeti + aspektne linije. */
function transitDynSVG(natalChart, transitChart, aspects, pal) {
  return buildChartSVG(natalChart, pal, {
    biwheel: { planets: transitChart.planets, noTime: true, color: pal.planetT },
    synAspects: aspects, labelScale: 1.2,
    aspectsEnabled: (typeof TRANSIT_CHART_OPTS !== 'undefined') ? TRANSIT_CHART_OPTS.aspectsEnabled : undefined,
    layer: 'dynamic'
  });
}

/* Brzo osvježavanje pomičnog sloja (za klizanje slidera) — bez diranja statične podloge i tablica. */
function redrawTransitDynamic(transitChart) {
  if (!currentTransit) return;
  const pal = currentScreenPalette();
  const aspects = computeSynastryAspects(currentTransit.natal, transitChart, TRANSIT_ORB);
  currentTransit.transit = transitChart;
  currentTransit.aspects = aspects;
  const dynEl = document.getElementById('transit-wheel-dyn');
  if (dynEl) dynEl.innerHTML = transitDynSVG(currentTransit.natal, transitChart, aspects, pal);
}

/* Osvježavanje tablica tranzita (aspekti + pozicije) — rjeđe (debounce iz transit modula). */
function renderTransitTables() {
  if (!currentTransit) return;
  const pal = currentScreenPalette();
  const natal = currentTransit.natal, transit = currentTransit.transit, aspects = currentTransit.aspects;
  const el = document.getElementById('transit-aspects');
  if (el) {
    if (!aspects.length) {
      el.innerHTML = '<p class="syn-empty">Trenutno nema aspekata unutar orbisa za ovaj datum.</p>';
    } else {
      const nmN = synNameMap(natal), nmT = synNameMap(transit);
      let rows = '';
      for (const a of aspects) {
        rows += '<tr>' +
          '<td>' + (GLYPHS[a.a] ? glyphSvgHtml(a.a, 17, pal.planet) + ' ' : '') + (nmN[a.a] || a.a) + '</td>' +
          '<td class="nt-asp nt-asp-' + a.aspect + '">' + glyphSvgHtml(a.aspect, 16, aspectColor(a.aspect, pal)) + ' ' + a.aspectName + '</td>' +
          '<td>' + (GLYPHS[a.b] ? glyphSvgHtml(a.b, 17, pal.planetT) + ' ' : '') + (nmT[a.b] || a.b) + '</td>' +
          '<td class="nt-num">' + a.orb.toFixed(1) + '°</td></tr>';
      }
      el.innerHTML = '<table class="nt-table syn-asp-table"><thead><tr>' +
        '<th>Natal</th><th>Aspekt</th><th>Tranzit</th><th>Orb</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
  }
  const t1 = document.getElementById('transit-pos-natal-tbody');
  const t2 = document.getElementById('transit-pos-transit-tbody');
  if (t1) t1.innerHTML = synPositionsRows(natal, pal);
  if (t2) t2.innerHTML = transitPositionsRows(transit, pal);
}

/* Puni prikaz tranzita (pri prvom prikazu i pri promjeni teme). */
function renderTransitResult(natalChart, transitChart) {
  const wrap = document.getElementById('transit-result');
  if (!wrap) return;
  const aspects = computeSynastryAspects(natalChart, transitChart, TRANSIT_ORB);
  currentTransit = { natal: natalChart, transit: transitChart, aspects: aspects };

  const nat = document.getElementById('natal-result'); if (nat) nat.style.display = 'none';
  const syn = document.getElementById('synastry-result'); if (syn) syn.style.display = 'none';
  wrap.style.display = 'block';

  const pal = currentScreenPalette();
  const nameN = natalChart.input.name || 'Natalna karta';

  document.getElementById('transit-chart-title').textContent = 'Tranziti — ' + nameN;
  document.getElementById('transit-chart-sub').textContent = birthDataLine(natalChart);

  document.getElementById('transit-legend').innerHTML =
    '<span class="syn-legend-item"><span class="syn-legend-dot" style="background:' + pal.planet + '"></span>' +
      '<strong>' + escHtml(nameN) + '</strong> <span class="syn-legend-meta">natalna · unutarnji prsten · kuće</span></span>' +
    '<span class="syn-legend-item"><span class="syn-legend-dot" style="background:' + pal.planetT + '"></span>' +
      '<strong>Tranziti</strong> <span class="syn-legend-meta">vanjski prsten</span></span>';

  const baseEl = document.getElementById('transit-wheel-base');
  const dynEl = document.getElementById('transit-wheel-dyn');
  if (baseEl) baseEl.innerHTML = buildChartSVG(natalChart, pal, { biwheel: { planets: [], color: pal.planetT }, labelScale: 1.2, layer: 'base' });
  if (dynEl) dynEl.innerHTML = transitDynSVG(natalChart, transitChart, aspects, pal);

  renderTransitTables();

  const disc = document.getElementById('transit-disclaimer');
  if (disc) disc.textContent = 'Bi-wheel: ' + nameN + ' (natalna — unutarnji prsten, Placidus kuće) i tranzitni planeti (vanjski prsten) za odabrani trenutak. ' +
    'Prikazani su samo aspekti tranzitnih na natalne točke, orb do 2,5°. Položaji: NASA JPL efemeride · tropski zodijak.';
}

/* Ponovno iscrtaj kotač kad se promijeni tema */
new MutationObserver(() => {
  if (currentChart && document.getElementById('natal-result').style.display !== 'none') {
    renderNatalResult(currentChart);
  }
  const synEl = document.getElementById('synastry-result');
  if (currentSynastry && synEl && synEl.style.display !== 'none') {
    renderSynastryResult(currentSynastry.a, currentSynastry.b);
  }
  const trEl = document.getElementById('transit-result');
  if (currentTransit && trEl && trEl.style.display !== 'none') {
    renderTransitResult(currentTransit.natal, currentTransit.transit);
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
