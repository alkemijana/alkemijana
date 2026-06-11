/* ============================================================
   Alkemijana — Natalna karta · PDF EKSPORT
   Ovisi o: natal-data.js (GLYPHS, PALETTES, loadScript, escHtml)
           natal-render.js (buildChartSVG, birthDataLine, currentChart)
           jsPDF + svg2pdf (lazy-load preko ensurePdfLibs)
   Izvozi: downloadPoster, downloadWorking, buildPosterSVG, pdfFileName
   ============================================================ */

'use strict';

const FONT_FILES = [
  { file: 'assets/fonts/Tangerine-Bold.ttf',        name: 'Tangerine',        style: 'bold' },
  { file: 'assets/fonts/DancingScript.ttf',         name: 'DancingScript',    style: 'bold' },
  { file: 'assets/fonts/PlayfairDisplay-Regular.ttf', name: 'PlayfairDisplay', style: 'normal' },
  { file: 'assets/fonts/Quicksand-Medium.ttf',      name: 'Quicksand',        style: 'normal' }
];
let fontsB64 = null;

async function ensurePdfLibs() {
  await loadScript('js/lib/jspdf.umd.min.js');
  await loadScript('js/lib/svg2pdf.umd.min.js');
  if (!fontsB64) {
    fontsB64 = {};
    for (const f of FONT_FILES) {
      const buf = await (await fetch(f.file)).arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 8192) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      }
      fontsB64[f.name] = btoa(bin);
    }
  }
}

function registerFonts(doc) {
  for (const f of FONT_FILES) {
    const vfsName = f.name + '.ttf';
    doc.addFileToVFS(vfsName, fontsB64[f.name]);
    doc.addFont(vfsName, f.name, f.style);
  }
}

/* SVG string → element (za svg2pdf) */
function svgToElement(svgStr) {
  const div = document.createElement('div');
  div.innerHTML = svgStr;
  return div.firstElementChild;
}

/* Nacrtaj mali glif (planet/znak/aspekt) u PDF na poziciji bazne linije teksta (x, y) */
async function drawGlyphPdf(doc, key, x, y, sizeMm, color) {
  const g = GLYPHS[key];
  if (!g) return;
  let inner = '';
  if (g.s) inner += '<path d="' + g.s + '" fill="none" stroke="' + color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>';
  if (g.f) inner += '<path d="' + g.f + '" fill="' + color + '" stroke="none"/>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + sizeMm + '" height="' + sizeMm + '">' + inner + '</svg>';
  const el = svgToElement(svg);
  document.body.appendChild(el); el.style.position = 'absolute'; el.style.left = '-99999px';
  try { await doc.svg(el, { x: x, y: y - sizeMm * 0.78, width: sizeMm, height: sizeMm }); }
  finally { el.remove(); }
}

const PAGE_MM = { A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189] };

/* Zvjezdano nebo za poster (deterministički pseudo-random).
   avoid = {x, y, r} — krug kotača u kojem ne crtamo veće ✦ iskre. */
function posterStars(w, h, seed, avoid) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  let out = '';
  const n = Math.round(w * h / 350);
  for (let i = 0; i < n; i++) {
    const x = (rnd() * w).toFixed(1), y = (rnd() * h).toFixed(1);
    const r = (0.2 + rnd() * 0.7).toFixed(2);
    const op = (0.25 + rnd() * 0.6).toFixed(2);
    out += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#cfc8e8" opacity="' + op + '"/>';
  }
  // nekoliko ✦ iskri — izvan kotača da ne smetaju karti
  let placed = 0, guard = 0;
  const want = Math.round(n / 40);
  while (placed < want && guard++ < want * 30) {
    const x = +(rnd() * w).toFixed(1), y = +(rnd() * h).toFixed(1);
    const sc = 1.2 + rnd() * 2.2;
    const op = (0.4 + rnd() * 0.4).toFixed(2);
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < avoid.r + sc * 3.5) continue;
    out += '<path transform="translate(' + x + ',' + y + ') scale(' + sc.toFixed(2) + ')" d="M0,-3 C0.4,-1 1,-0.4 3,0 C1,0.4 0.4,1 0,3 C-0.4,1 -1,0.4 -3,0 C-1,-0.4 -0.4,-1 0,-3 Z" fill="#d8d2ee" opacity="' + op + '"/>';
    placed++;
  }
  return out;
}

/* Smanji veličinu fonta dok tekst ne stane u maxWidth (mjereno preko canvasa) */
function fitFontSize(text, family, weight, maxSize, maxWidth, minSize) {
  minSize = minSize || maxSize * 0.35;
  const measured = textWidthPx(text, family, weight, maxSize);
  if (!measured || measured <= maxWidth) return maxSize;
  return Math.max(minSize, maxSize * (maxWidth / measured) * 0.98);
}

/* Širina teksta u px, mjerena stvarnim (web) fontom preko canvasa */
function textWidthPx(text, family, weight, sizePx) {
  try {
    const canvas = textWidthPx._c || (textWidthPx._c = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    ctx.font = (weight ? weight + ' ' : '') + sizePx + 'px ' + family;
    return ctx.measureText(text).width;
  } catch (e) { return 0; }
}

/* Centrirani tekst za poster: x računamo sami (canvas metrika stvarnog fonta)
   jer svg2pdf centrira text-anchor="middle" metrikom fallback fonta pa tekst pobjegne. */
function svgCenteredText(text, cx, y, sizePx, fill, pdfFamily, cssFamily, weight) {
  const w = textWidthPx(text, cssFamily, weight, sizePx);
  const attrs = ' fill="' + fill + '" font-family="' + pdfFamily + '"' +
    (weight ? ' font-weight="bold"' : '') + ' font-size="' + sizePx + '"';
  if (w > 0) {
    return '<text x="' + (cx - w / 2).toFixed(2) + '" y="' + y + '"' + attrs + '>' + escHtml(text) + '</text>';
  }
  return '<text x="' + cx + '" y="' + y + '"' + attrs + ' text-anchor="middle">' + escHtml(text) + '</text>';
}

/* Poster SVG — dizajn u mm jedinicama (1 user unit = 1 mm na A-formatu) */
function buildPosterSVG(chart, w, h) {
  const pal = PALETTES.poster;
  const cx = w / 2;
  const chartSize = w * 0.86;
  const chartX = (w - chartSize) / 2;
  const chartY = h * 0.205;

  const name = chart.input.name || 'Natalna karta';
  const dataLine = birthDataLine(chart);
  const sun = chart.planets.find(p => p.id === 'sun');
  const moon = chart.planets.find(p => p.id === 'moon');
  const trio = 'Sunce ' + signName(sun.lon) + ' · Mjesec ' + signName(moon.lon) + ' · Podznak ' + signName(chart.asc);

  const inner = buildChartSVG(chart, pal, { showAspects: true })
    .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  let s = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">';
  // pozadina — duboko ljubičasti gradijent
  s += '<defs><radialGradient id="pgrad" cx="50%" cy="32%" r="85%">' +
       '<stop offset="0%" stop-color="#1a1538"/><stop offset="55%" stop-color="#0e0c24"/><stop offset="100%" stop-color="#06080f"/>' +
       '</radialGradient></defs>';
  s += '<rect width="' + w + '" height="' + h + '" fill="url(#pgrad)"/>';
  s += posterStars(w, h, 977, { x: cx, y: chartY + chartSize / 2, r: chartSize / 2 });

  // tanki ukrasni okvir
  const m = w * 0.045;
  s += '<rect x="' + m + '" y="' + m + '" width="' + (w - 2 * m) + '" height="' + (h - 2 * m) +
       '" fill="none" stroke="rgba(168,144,208,0.4)" stroke-width="' + (w * 0.0012) + '"/>';
  s += '<rect x="' + (m + w * 0.008) + '" y="' + (m + w * 0.008) + '" width="' + (w - 2 * m - w * 0.016) + '" height="' + (h - 2 * m - w * 0.016) +
       '" fill="none" stroke="rgba(168,144,208,0.18)" stroke-width="' + (w * 0.0007) + '"/>';

  // naslov — font koji prikazuje sva slova (č, ć, š, ž, đ), suzi se ako je predugačak
  const maxTextW = w * 0.84;
  const f1 = fitFontSize(name, 'Dancing Script', '700', w * 0.105, maxTextW);
  s += svgCenteredText(name, cx, h * 0.105, f1, '#e4e0f4', 'DancingScript', 'Dancing Script', '700');
  // linija s zvjezdicom
  const ly = h * 0.125, lw = w * 0.3;
  s += '<line x1="' + (cx - lw) + '" y1="' + ly + '" x2="' + (cx - w * 0.022) + '" y2="' + ly + '" stroke="rgba(168,144,208,0.55)" stroke-width="' + (w * 0.0011) + '"/>';
  s += '<line x1="' + (cx + w * 0.022) + '" y1="' + ly + '" x2="' + (cx + lw) + '" y2="' + ly + '" stroke="rgba(168,144,208,0.55)" stroke-width="' + (w * 0.0011) + '"/>';
  s += '<path transform="translate(' + cx + ',' + ly + ') scale(' + (w * 0.0042) + ')" d="M0,-3 C0.4,-1 1,-0.4 3,0 C1,0.4 0.4,1 0,3 C-0.4,1 -1,0.4 -3,0 C-1,-0.4 -0.4,-1 0,-3 Z" fill="#b8a2dd"/>';
  // podaci rođenja
  const fData = fitFontSize(dataLine, 'Playfair Display', null, w * 0.0235, maxTextW);
  s += svgCenteredText(dataLine, cx, h * 0.152, fData, '#c4c0d8', 'PlayfairDisplay', 'Playfair Display', null);
  const fTrio = fitFontSize(trio, 'Quicksand', null, w * 0.0185, maxTextW);
  s += svgCenteredText(trio, cx, h * 0.175, fTrio, '#9d95c0', 'Quicksand', 'Quicksand', null);

  // kotač (unutarnje koordinate -60..1060 → 1120 jedinica)
  s += '<g transform="translate(' + chartX + ',' + chartY + ') scale(' + (chartSize / 1120) + ') translate(60,60)">' + inner + '</g>';

  // podnožje
  s += svgCenteredText('Alkemijana', cx, h * 0.925, w * 0.052, '#d8d2ee', 'Tangerine', 'Tangerine', '700');
  s += svgCenteredText('alkemijana.com · Placidus · tropski zodijak', cx, h * 0.945, w * 0.016, '#8a82ac', 'Quicksand', 'Quicksand', null);
  s += '</svg>';
  return s;
}

async function downloadPoster() {
  const size = document.getElementById('natal-poster-size').value || 'A2';
  const btn = document.getElementById('natal-poster-btn');
  await withBtnSpinner(btn, async () => {
    await ensurePdfLibs();
    const [w, h] = PAGE_MM[size];
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: size.toLowerCase() });
    registerFonts(doc);
    const el = svgToElement(buildPosterSVG(currentChart, w, h));
    document.body.appendChild(el); el.style.position = 'absolute'; el.style.left = '-99999px';
    try {
      await doc.svg(el, { x: 0, y: 0, width: w, height: h });
    } finally { el.remove(); }
    doc.save(pdfFileName('poster-' + size));
  });
}

/* Radna A4 verzija — karta + tablice za iščitavanje */
/* SVG inline glyph (za korištenje unutar drugog SVG-a, koord. centra glifa) */
function inlineGlyph(key, cx, cy, size, color, strokeW) {
  const g = GLYPHS[key];
  if (!g) return '';
  const sc = size / 24;
  let out = '<g transform="translate(' + (cx - size / 2).toFixed(2) + ',' + (cy - size / 2).toFixed(2) + ') scale(' + sc.toFixed(4) + ')">';
  if (g.s) out += '<path d="' + g.s + '" fill="none" stroke="' + color + '" stroke-width="' + (strokeW || 1.5) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  if (g.f) out += '<path d="' + g.f + '" fill="' + color + '" stroke="none"/>';
  return out + '</g>';
}

/* Astro-Seek aspektna tablica + dominante — SVG (interno mm-jedinice,
   pozivatelj skalira po potrebi). Vraća { svg, viewW, viewH }. */
function buildAstroSeekSVG(chart) {
  const PAL = PALETTES.ink;
  const INK = '#2a2348';
  const MUT = '#6a5d8c';
  const BORDER = '#a89fc0';

  // Točke (redoslijed kao Astro-Seek)
  const order = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','node','lilith','chiron','fortune','vertex'];
  const pts = [];
  for (const id of order) {
    const cp = chart.planets.find(x => x.id === id);
    if (cp) pts.push({ id, name: cp.name, lon: cp.lon, house: cp.house, retro: cp.retro });
  }
  pts.push({ id: 'asc', name: 'ASC', lon: chart.asc, house: 1 });
  pts.push({ id: 'mc',  name: 'MC',  lon: chart.mc,  house: 10 });

  const byPair = {};
  for (const a of chart.aspects) { byPair[a.a + '|' + a.b] = a; byPair[a.b + '|' + a.a] = a; }

  // Layout (sve u mm, viewBox točno po sadržaju)
  const cs   = 6.5;            // veličina ćelije
  const labW = 34;             // širina label dijela (glif + ime + znak + stupanj + kuća)
  const domW = 56;             // širina dominantnog bloka
  const gx0  = labW;           // x grida
  const gy0  = 5;              // y grida (nakon header retka)
  const n    = pts.length;
  const gridH = n * cs;
  const w    = labW + n * cs + 4 + domW; // ukupna širina sadržaja

  let s = '';

  // Naslov sekcije
  s += '<text x="0" y="0" fill="' + INK + '" font-size="3.6" font-family="PlayfairDisplay, serif" font-weight="400">Aspektna tablica</text>';

  for (let i = 0; i < n; i++) {
    const p  = pts[i];
    const ry = gy0 + i * cs;

    // — Label dio
    // glif planeta
    s += inlineGlyph(p.id, 1.8, ry + cs / 2, 3.6, INK, 0.5);
    // ime
    s += '<text x="4.2" y="' + (ry + cs / 2).toFixed(2) + '" fill="' + INK + '" font-size="2.4" font-family="Quicksand, sans-serif" dy=".35em">' + escHtml(p.name) + '</text>';
    // glif znaka
    s += inlineGlyph(signKey(p.lon), 17.2, ry + cs / 2, 3.2, elementColor(p.lon, PAL), 0.5);
    // stupanj + R
    const dm = degMinParts(p.lon);
    const dmTxt = dm.d + '°' + pad2(dm.m) + "'" + (p.retro ? ' R' : '');
    s += '<text x="19.6" y="' + (ry + cs / 2).toFixed(2) + '" fill="' + INK + '" font-size="2.3" font-family="Quicksand, sans-serif" dy=".35em">' + dmTxt + '</text>';
    // kuća
    s += '<text x="' + (labW - 1.2).toFixed(2) + '" y="' + (ry + cs / 2).toFixed(2) + '" fill="' + MUT + '" font-size="2.3" font-family="Quicksand, sans-serif" text-anchor="end" dy=".35em">' + p.house + '</text>';

    // — Cells: 0..i (diagonal at i)
    for (let j = 0; j <= i; j++) {
      const cx = gx0 + j * cs;
      const cy = ry;
      s += '<rect x="' + cx.toFixed(2) + '" y="' + cy.toFixed(2) + '" width="' + cs + '" height="' + cs + '" fill="none" stroke="' + BORDER + '" stroke-width="0.15"/>';
      if (j === i) {
        // diagonala — glif planeta
        s += inlineGlyph(p.id, cx + cs / 2, cy + cs / 2, 3.4, INK, 0.5);
      } else {
        const ap = byPair[pts[i].id + '|' + pts[j].id];
        if (ap) {
          s += inlineGlyph(ap.aspect, cx + cs / 2 - 0.6, cy + cs / 2 - 0.4, 3, aspectColor(ap.aspect, PAL), 0.5);
          s += '<text x="' + (cx + cs - 0.3).toFixed(2) + '" y="' + (cy + cs - 0.5).toFixed(2) +
            '" fill="' + MUT + '" font-size="1.6" font-family="Quicksand, sans-serif" text-anchor="end">' + Math.round(ap.orb) + '</text>';
        }
      }
    }
  }

  // ====== DOMINANTE ====== (desno od grida)
  const domX = gx0 + n * cs + 4;

  // izračun
  const elemCounts = [0, 0, 0, 0]; // fire(0), earth(1), air(2), water(3)
  const qualCounts = [0, 0, 0];    // card(0), fix(1), mut(2)
  const bucket = {}; for (let e = 0; e < 4; e++) bucket[e] = [[], [], []];
  for (const p of pts) {
    if (p.lon == null) continue;
    const si = signIndex(p.lon);
    const e = si % 4, q = si % 3;
    elemCounts[e]++; qualCounts[q]++;
    bucket[e][q].push(p);
  }

  s += '<text x="' + domX + '" y="0" fill="' + INK + '" font-size="3.6" font-family="PlayfairDisplay, serif">Dominante</text>';

  const qHeaderY = gy0 + 1.5;
  const elOrder  = [0, 2, 1, 3];  // FIR, AIR, EAR, WAT (kao u Astro-Seek attachmentu)
  const elLabels = ['FIR', 'AIR', 'EAR', 'WAT'];
  const qLabels  = ['CAR', 'FIX', 'MUT'];

  const lhW = 11;                                 // širina lijevog stupca (element + count)
  const qcW = Math.max(11, (domW - lhW) / 3);     // širina svake kvalitetne ćelije
  const rowH = 12;

  // Headers stupaca
  for (let q = 0; q < 3; q++) {
    const cx = domX + lhW + q * qcW;
    s += '<text x="' + (cx + 2).toFixed(2) + '" y="' + qHeaderY.toFixed(2) +
      '" fill="' + INK + '" font-size="2.4" font-family="Quicksand, sans-serif" font-weight="600">' + qLabels[q] + '</text>';
    s += '<text x="' + (cx + 8).toFixed(2) + '" y="' + qHeaderY.toFixed(2) +
      '" fill="' + MUT + '" font-size="2.4" font-family="Quicksand, sans-serif">' + qualCounts[q] + '</text>';
  }

  // Redovi elemenata
  for (let ei = 0; ei < 4; ei++) {
    const e = elOrder[ei];
    const ry = gy0 + 4 + ei * rowH;
    // header reda
    s += '<text x="' + domX + '" y="' + (ry + rowH / 2).toFixed(2) +
      '" fill="' + INK + '" font-size="2.6" font-family="Quicksand, sans-serif" font-weight="600" dy=".35em">' + elLabels[ei] + '</text>';
    s += '<text x="' + (domX + 6.5).toFixed(2) + '" y="' + (ry + rowH / 2).toFixed(2) +
      '" fill="' + MUT + '" font-size="2.6" font-family="Quicksand, sans-serif" dy=".35em">' + elemCounts[e] + '</text>';

    for (let q = 0; q < 3; q++) {
      const cx = domX + lhW + q * qcW;
      // ćelija
      s += '<rect x="' + cx.toFixed(2) + '" y="' + ry.toFixed(2) + '" width="' + (qcW - 0.5).toFixed(2) + '" height="' + rowH +
        '" fill="none" stroke="' + BORDER + '" stroke-width="0.2"/>';
      const cellPts = bucket[e][q];
      // glifovi planeta u ćeliji
      const gsize = 3.1, gap = 0.5;
      const perRow = Math.max(1, Math.floor((qcW - 1.5) / (gsize + gap)));
      for (let k = 0; k < cellPts.length; k++) {
        const col = k % perRow, row = Math.floor(k / perRow);
        const px = cx + 1.2 + col * (gsize + gap) + gsize / 2;
        const py = ry + 2.4 + row * (gsize + 0.6) + gsize / 2;
        if (py > ry + rowH - 0.5) break;
        s += inlineGlyph(cellPts[k].id, px, py, gsize, INK, 0.45);
      }
    }
  }

  // Određi ukupnu visinu SVG-a
  const svgH = Math.max(gy0 + gridH + 2, gy0 + 4 + 4 * rowH + 4);
  return {
    svg: '<svg viewBox="0 0 ' + w + ' ' + svgH + '" xmlns="http://www.w3.org/2000/svg" font-family="Quicksand, sans-serif">' + s + '</svg>',
    viewW: w,
    viewH: svgH
  };
}

async function downloadWorking() {
  const btn = document.getElementById('natal-working-btn');
  await withBtnSpinner(btn, async () => {
    await ensurePdfLibs();
    const chart = currentChart;
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    registerFonts(doc);
    const W = 210, H = 297;
    const INK_PLANET = '#2a2348';
    const INK_MUT    = '#6a5d8c';
    const PAGE_M     = 14;
    const CONTENT_W  = W - 2 * PAGE_M;
    const nameOf = {};
    for (const p of chart.planets) nameOf[p.id] = p.name;
    nameOf.asc = 'ASC'; nameOf.mc = 'MC';

    function pageHeader(title, sub) {
      doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(18); doc.setTextColor(42, 35, 72);
      doc.text(title, W / 2, 16, { align: 'center' });
      if (sub) {
        doc.setFont('Quicksand', 'normal'); doc.setFontSize(9.5); doc.setTextColor(90, 80, 130);
        doc.text(sub, W / 2, 22.5, { align: 'center' });
      }
      doc.setDrawColor(154, 143, 192); doc.setLineWidth(0.25);
      doc.line(PAGE_M, 26, W - PAGE_M, 26);
    }
    function pageFooter(pageNum, totalPages) {
      doc.setFont('Quicksand', 'normal'); doc.setFontSize(7.5); doc.setTextColor(138, 130, 172);
      doc.text('Alkemijana · alkemijana.com', W / 2, H - 8, { align: 'center' });
      doc.text(pageNum + ' / ' + totalPages, W - PAGE_M, H - 8, { align: 'right' });
    }
    async function renderSvgOnDoc(svgStr, x, y, ww, hh) {
      const el = svgToElement(svgStr);
      document.body.appendChild(el); el.style.position = 'absolute'; el.style.left = '-99999px';
      try { await doc.svg(el, { x, y, width: ww, height: hh }); }
      finally { el.remove(); }
    }

    const TOTAL_PAGES = 3;

    // ===== STRANICA 1: zaglavlje + kotač + legenda =====
    pageHeader(chart.input.name || 'Natalna karta', birthDataLine(chart));

    const chartSize = 175;
    await renderSvgOnDoc(
      buildChartSVG(chart, PALETTES.ink, {
        showAspects: true,
        aspectsEnabled: { conjunction: false, sextile: true, square: true, trine: true, opposition: true },
        showCuspDegrees: true,
        linetype: true
      }),
      (W - chartSize) / 2, 30, chartSize, chartSize
    );

    // legenda aspekata s linetype prikazom
    let ly = 30 + chartSize + 6;
    doc.setFontSize(8.5);
    const leg = [
      ['Konjunkcija 0°',  aspectColor('conjunction', PALETTES.ink), aspectDashPattern('conjunction')],
      ['Sekstil 60°',     aspectColor('sextile',     PALETTES.ink), aspectDashPattern('sextile')],
      ['Kvadrat 90°',     aspectColor('square',      PALETTES.ink), aspectDashPattern('square')],
      ['Trigon 120°',     aspectColor('trine',       PALETTES.ink), aspectDashPattern('trine')],
      ['Opozicija 180°',  aspectColor('opposition',  PALETTES.ink), aspectDashPattern('opposition')]
    ];
    function hexToRgb(h) {
      const m = h.replace('#', '');
      return [parseInt(m.substr(0, 2), 16), parseInt(m.substr(2, 2), 16), parseInt(m.substr(4, 2), 16)];
    }
    let lx = PAGE_M + 6;
    for (const [t, color, dash] of leg) {
      const rgb = hexToRgb(color);
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setLineWidth(0.7);
      if (dash) {
        const parts = dash.split(',').map(Number);
        doc.setLineDashPattern(parts, 0);
      } else {
        doc.setLineDashPattern([], 0);
      }
      doc.line(lx, ly - 1.2, lx + 9, ly - 1.2);
      doc.setLineDashPattern([], 0);
      doc.setTextColor(74, 63, 110);
      doc.text(t, lx + 10.5, ly);
      lx += doc.getTextWidth(t) + 16;
    }
    pageFooter(1, TOTAL_PAGES);

    // ===== STRANICA 2: Astro-Seek aspektna tablica + dominante =====
    doc.addPage();
    pageHeader('Aspektna tablica i dominante', chart.input.name || '');
    const a2 = buildAstroSeekSVG(chart);
    // skaliraj proporcionalno tako da širina ispuni stranicu
    const a2H = a2.viewH * (CONTENT_W / a2.viewW);
    await renderSvgOnDoc(a2.svg, PAGE_M, 32, CONTENT_W, a2H);

    pageFooter(2, TOTAL_PAGES);

    // ===== STRANICA 3: Pozicije + Kuće + Aspekti (planet-aspekt-planet) =====
    doc.addPage();
    pageHeader('Pozicije, kuće i aspekti', chart.input.name || '');

    // — Pozicije planeta
    let y = 34;
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(12); doc.setTextColor(42, 35, 72);
    doc.text('Pozicije planeta', PAGE_M, y);
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(9);
    y += 5;

    const posColW = CONTENT_W / 2;
    const posRows = chart.planets.length + 2; // + ASC + MC
    const posPerCol = Math.ceil(posRows / 2);
    const rowDy = 5.3;
    const allPositions = chart.planets.slice();
    allPositions.push({ id: 'asc', name: 'ASC (podznak)', lon: chart.asc });
    allPositions.push({ id: 'mc',  name: 'MC (sredina neba)', lon: chart.mc });

    for (let i = 0; i < allPositions.length; i++) {
      const p = allPositions[i];
      const col = i < posPerCol ? 0 : 1;
      const yy = y + (i % posPerCol) * rowDy;
      const x0 = PAGE_M + col * posColW;
      doc.setTextColor(46, 39, 82);
      if (GLYPHS[p.id]) await drawGlyphPdf(doc, p.id, x0, yy, 3.6, INK_PLANET);
      doc.text(p.name, x0 + 5, yy);
      await drawGlyphPdf(doc, signKey(p.lon), x0 + 38, yy, 3.6, elementColor(p.lon, PALETTES.ink));
      doc.text(signName(p.lon), x0 + 43, yy);
      doc.setTextColor(70, 60, 110);
      doc.text(fmtDegMin(p.lon) + (p.retro ? '  R' : ''), x0 + 68, yy);
      if (p.house) {
        doc.setTextColor(110, 100, 150);
        doc.text(p.house + '. kuća', x0 + 84, yy);
      }
    }
    y += posPerCol * rowDy + 4;

    // — Kuće (Placidus)
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(12); doc.setTextColor(42, 35, 72);
    doc.text('Kuće (Placidus)', PAGE_M, y);
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(9);
    y += 5;

    const hColW = CONTENT_W / 3;
    for (let i = 1; i <= 12; i++) {
      const col = Math.floor((i - 1) / 4);
      const yy = y + ((i - 1) % 4) * rowDy;
      const x0 = PAGE_M + col * hColW;
      doc.setTextColor(46, 39, 82);
      doc.text(i + '.', x0, yy);
      await drawGlyphPdf(doc, signKey(chart.cusps[i]), x0 + 7, yy, 3.6, elementColor(chart.cusps[i], PALETTES.ink));
      doc.text(signName(chart.cusps[i]), x0 + 12, yy);
      doc.setTextColor(70, 60, 110);
      doc.text(fmtDegMin(chart.cusps[i]), x0 + 36, yy);
    }
    y += 4 * rowDy + 4;

    // — Aspekti (planet — aspekt — planet — orb), 2 stupca
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(12); doc.setTextColor(42, 35, 72);
    doc.text('Aspekti', PAGE_M, y);
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(8.6);
    y += 5;

    const aColW = CONTENT_W / 2;
    const aHalf = Math.ceil(chart.aspects.length / 2);
    const aRowDy = 5.0;
    for (let i = 0; i < chart.aspects.length; i++) {
      const a = chart.aspects[i];
      const col = i < aHalf ? 0 : 1;
      const yy = y + (i % aHalf) * aRowDy;
      if (yy > H - 18) continue;
      const x0 = PAGE_M + col * aColW;
      let cx = x0;
      // planet 1
      if (GLYPHS[a.a]) { await drawGlyphPdf(doc, a.a, cx, yy, 3.5, INK_PLANET); cx += 4.4; }
      doc.setTextColor(46, 39, 82);
      doc.text(nameOf[a.a], cx, yy);
      cx += doc.getTextWidth(nameOf[a.a]) + 2.2;
      // aspekt — UMETNUT IZMEĐU PLANETA (item 10)
      await drawGlyphPdf(doc, a.aspect, cx, yy, 3.5, aspectColor(a.aspect, PALETTES.ink));
      cx += 4.4;
      doc.setTextColor(80, 65, 130);
      doc.text(a.aspectName, cx, yy);
      cx += doc.getTextWidth(a.aspectName) + 2.2;
      // planet 2
      if (GLYPHS[a.b]) { await drawGlyphPdf(doc, a.b, cx, yy, 3.5, INK_PLANET); cx += 4.4; }
      doc.setTextColor(46, 39, 82);
      doc.text(nameOf[a.b], cx, yy);
      // orb na kraju stupca
      doc.setTextColor(110, 100, 150);
      doc.text(a.orb.toFixed(1) + '°', x0 + aColW - 5, yy, { align: 'right' });
    }

    pageFooter(3, TOTAL_PAGES);

    doc.save(pdfFileName('radna-A4'));
  });
}

function pdfFileName(suffix) {
  const base = (currentChart.input.name || 'natalna-karta')
    .toLowerCase().replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'natalna-karta';
  return base + '-' + suffix + '.pdf';
}

async function withBtnSpinner(btn, fn) {
  if (!currentChart) return;
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Pripremam PDF…';
  try { await fn(); }
  catch (e) { showNatalError('Greška pri izradi PDF-a: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = orig; }
}
