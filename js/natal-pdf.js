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
  // Quicksand i kao "bold" (koristimo Medium fajl) — da font-weight:bold u SVG-u
  // (aspektna tablica/dominante) ostane u Quicksandu umjesto helvetica fallbacka.
  doc.addFont('Quicksand.ttf', 'Quicksand', 'bold');
}

/* SVG string → element (za svg2pdf) */
function svgToElement(svgStr) {
  const div = document.createElement('div');
  div.innerHTML = svgStr;
  return div.firstElementChild;
}

/* Nacrtaj mali glif (planet/znak/aspekt) u PDF na poziciji bazne linije teksta (x, y).
   Stroke glifovi (planeti) — debela linija (2.4) → izgledaju boldano.
   Fill glifovi (zodijak, Lilith, aspekti iz DejaVu) — fill + dodatni stroke iste boje da
   se vizualno izjednače s boldanim stroke glifovima (inače djeluju tanki / "regular"). */
async function drawGlyphPdf(doc, key, x, y, sizeMm, color) {
  const g = GLYPHS[key];
  if (!g) return;
  let inner = '';
  if (g.s) inner += '<path d="' + g.s + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  if (g.f) inner += '<path d="' + g.f + '" fill="' + color + '" stroke="' + color + '" stroke-width="0.7" stroke-linejoin="round"/>';
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
  const trio = 'Sunce ' + signName(sun.lon) + ' · Mjesec ' + signName(moon.lon) +
    (chart.noTime ? '' : ' · Podznak ' + signName(chart.asc));

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
  s += svgCenteredText(chart.noTime ? 'alkemijana.com · tropski zodijak' : 'alkemijana.com · Placidus · tropski zodijak',
    cx, h * 0.945, w * 0.016, '#8a82ac', 'Quicksand', 'Quicksand', null);
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
  if (g.f) out += '<path d="' + g.f + '" fill="' + color + '" stroke="' + color + '" stroke-width="' + ((strokeW || 1.0) * 0.45) + '" stroke-linejoin="round"/>';
  return out + '</g>';
}

/* Astro-Seek aspektna tablica + dominante — SVG (interno mm-jedinice,
   pozivatelj skalira po potrebi). Vraća { svg, viewW, viewH }. */
function buildAstroSeekSVG(chart) {
  const PAL = PALETTES.ink;
  const INK = '#1c1638';       // tamnije za jasniji ispis
  const MUT = '#473b70';       // tamnije (orb brojevi, kuće) — bolje vidljivo na A4
  const BORDER = '#675a92';    // tamniji obrub tablice

  // Kraći nazivi da stanu u label stupac
  const shortName = { node: 'Sj. čvor', snode: 'J. čvor' };

  // Točke (redoslijed kao Astro-Seek)
  const order = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','node','lilith','chiron','fortune','vertex'];
  const pts = [];
  for (const id of order) {
    const cp = chart.planets.find(x => x.id === id);
    if (cp) pts.push({ id, name: shortName[id] || cp.name, lon: cp.lon, house: cp.house, retro: cp.retro });
  }
  if (!chart.noTime) {
    pts.push({ id: 'asc', name: 'ASC', lon: chart.asc, house: 1 });
    pts.push({ id: 'mc',  name: 'MC',  lon: chart.mc,  house: 10 });
  }

  const byPair = {};
  for (const a of chart.aspects) { byPair[a.a + '|' + a.b] = a; byPair[a.b + '|' + a.a] = a; }

  // Layout (sve u mm, viewBox točno po sadržaju). Legenda aspekata je sada
  // pokraj karte (desno) u downloadWorking — ovdje je nema.
  const cs   = 6.8;            // veličina ćelije
  const labW = 47;             // širina label dijela (glif + ime + znak + stupanj + kuća)
  const domW = 62;             // širina dominantnog bloka (veće — ima mjesta)
  const gx0  = labW;           // x grida
  const gy0  = 7;              // y grida (nakon naslova)
  const n    = pts.length;
  const gridH = n * cs;
  const w    = labW + n * cs + 5 + domW; // ukupna širina sadržaja

  // širina teksta u mm (canvas metrika; px širina je proporcionalna veličini fonta)
  function tw(text, sizeMm, weight) {
    return textWidthPx(String(text), 'Quicksand, sans-serif', weight, 100) / 100 * sizeMm;
  }
  const B = ' font-weight="bold"';   // bold = Quicksand Medium (registriran i kao bold)

  let s = '';

  // Naslov sekcije (Playfair, normal — da ne padne na helvetica fallback)
  s += '<text x="0" y="3.6" fill="' + INK + '" font-size="4.6" font-family="PlayfairDisplay, serif">Aspektna tablica</text>';

  for (let i = 0; i < n; i++) {
    const p  = pts[i];
    const ry = gy0 + i * cs;

    // — Label dio — u kućici spojenoj s mrežom (rub jednak ćelijama)
    s += '<rect x="0" y="' + ry.toFixed(2) + '" width="' + labW + '" height="' + cs + '" fill="none" stroke="' + BORDER + '" stroke-width="0.35"/>';
    // glif planeta
    s += inlineGlyph(p.id, 2.9, ry + cs / 2, 5.0, INK, 1.0);
    // ime — vertikalno centrirano (svg2pdf ne poštuje dy pouzdano → eksplicitan baseline)
    s += '<text x="6.2" y="' + (ry + cs / 2 + 1.1).toFixed(2) + '" fill="' + INK + '" font-size="3.15"' + B + ' font-family="Quicksand, sans-serif">' + escHtml(p.name) + '</text>';
    // glif znaka
    s += inlineGlyph(signKey(p.lon), 26.0, ry + cs / 2, 4.5, elementColor(p.lon, PAL), 1.0);
    // stupanj + R — vertikalno centrirano
    const dm = degMinParts(p.lon);
    const dmTxt = dm.d + '°' + pad2(dm.m) + "'" + (p.retro ? ' R' : '');
    s += '<text x="28.8" y="' + (ry + cs / 2 + 1.05).toFixed(2) + '" fill="' + INK + '" font-size="3.0"' + B + ' font-family="Quicksand, sans-serif">' + dmTxt + '</text>';
    // kuća (desno poravnato — x računamo sami, svg2pdf ne centrira pouzdano)
    if (p.house) {
      s += '<text x="' + (labW - 1.6 - tw(p.house, 3.0)).toFixed(2) + '" y="' + (ry + cs / 2 + 1.05).toFixed(2) + '" fill="' + MUT + '" font-size="3.0"' + B + ' font-family="Quicksand, sans-serif">' + p.house + '</text>';
    }

    // — Cells: 0..i (diagonal at i)
    for (let j = 0; j <= i; j++) {
      const cx = gx0 + j * cs;
      const cy = ry;
      s += '<rect x="' + cx.toFixed(2) + '" y="' + cy.toFixed(2) + '" width="' + cs + '" height="' + cs + '" fill="none" stroke="' + BORDER + '" stroke-width="0.35"/>';
      if (j === i) {
        // diagonala — glif planeta, ili tekst za ASC/MC (nemaju glif)
        if (GLYPHS[p.id]) {
          s += inlineGlyph(p.id, cx + cs / 2, cy + cs / 2, 5.0, INK, 1.0);
        } else {
          const lbl = p.id === 'asc' ? 'AC' : 'MC';
          s += '<text x="' + (cx + cs / 2 - tw(lbl, 3.0) / 2).toFixed(2) + '" y="' + (cy + cs / 2 + 1.05).toFixed(2) +
            '" fill="' + INK + '" font-size="3.0"' + B + ' font-family="Quicksand, sans-serif">' + lbl + '</text>';
        }
      } else {
        const ap = byPair[pts[i].id + '|' + pts[j].id];
        if (ap) {
          s += inlineGlyph(ap.aspect, cx + cs / 2 - 0.9, cy + cs / 2 - 0.6, 4.4, aspectColor(ap.aspect, PAL), 1.0);
          const orbTxt = Math.round(ap.orb);
          s += '<text x="' + (cx + cs - 0.5 - tw(orbTxt, 2.95)).toFixed(2) + '" y="' + (cy + cs - 0.7).toFixed(2) +
            '" fill="' + MUT + '" font-size="2.95"' + B + ' font-family="Quicksand, sans-serif">' + orbTxt + '</text>';
        }
      }
    }
  }

  // ====== DOMINANTE ====== (desno od grida — veće, ima vertikalnog mjesta)
  const domX = gx0 + n * cs + 5;

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

  s += '<text x="' + domX + '" y="3.6" fill="' + INK + '" font-size="4.6" font-family="PlayfairDisplay, serif">Dominante</text>';

  const qHeaderY = gy0 + 2.5;
  const elOrder  = [0, 2, 1, 3];  // FIR, AIR, EAR, WAT (kao u Astro-Seek attachmentu)
  const elLabels = ['FIR', 'AIR', 'EAR', 'WAT'];
  const qLabels  = ['CAR', 'FIX', 'MUT'];

  const lhW = 14;                                 // širina lijevog stupca (element + count)
  const qcW = Math.max(14, (domW - lhW) / 3);     // širina svake kvalitetne ćelije
  const rowH = 18;

  // Headers stupaca
  for (let q = 0; q < 3; q++) {
    const cx = domX + lhW + q * qcW;
    s += '<text x="' + (cx + 1.8).toFixed(2) + '" y="' + qHeaderY.toFixed(2) +
      '" fill="' + INK + '" font-size="3.2"' + B + ' font-family="Quicksand, sans-serif">' + qLabels[q] + '</text>';
    s += '<text x="' + (cx + 10).toFixed(2) + '" y="' + qHeaderY.toFixed(2) +
      '" fill="' + MUT + '" font-size="3.2"' + B + ' font-family="Quicksand, sans-serif">' + qualCounts[q] + '</text>';
  }

  // Redovi elemenata
  for (let ei = 0; ei < 4; ei++) {
    const e = elOrder[ei];
    const ry = gy0 + 5 + ei * rowH;
    // header reda
    s += '<text x="' + domX + '" y="' + (ry + rowH / 2).toFixed(2) +
      '" fill="' + INK + '" font-size="3.6"' + B + ' font-family="Quicksand, sans-serif" dy=".35em">' + elLabels[ei] + '</text>';
    s += '<text x="' + (domX + 8.5).toFixed(2) + '" y="' + (ry + rowH / 2).toFixed(2) +
      '" fill="' + MUT + '" font-size="3.6"' + B + ' font-family="Quicksand, sans-serif" dy=".35em">' + elemCounts[e] + '</text>';

    for (let q = 0; q < 3; q++) {
      const cx = domX + lhW + q * qcW;
      // ćelija
      s += '<rect x="' + cx.toFixed(2) + '" y="' + ry.toFixed(2) + '" width="' + (qcW - 0.5).toFixed(2) + '" height="' + rowH +
        '" fill="none" stroke="' + BORDER + '" stroke-width="0.4"/>';
      const cellPts = bucket[e][q];
      // glifovi planeta u ćeliji — veći da se vide na ispisu
      const gsize = 5.0, gap = 0.8;
      const perRow = Math.max(1, Math.floor((qcW - 1.5) / (gsize + gap)));
      for (let k = 0; k < cellPts.length; k++) {
        const col = k % perRow, row = Math.floor(k / perRow);
        const px = cx + 1.5 + col * (gsize + gap) + gsize / 2;
        const py = ry + 3.0 + row * (gsize + 1.1) + gsize / 2;
        if (py > ry + rowH - 0.5) break;
        s += inlineGlyph(cellPts[k].id, px, py, gsize, INK, 1.0);
      }
    }
  }

  // Određi ukupnu visinu SVG-a
  const svgH = Math.max(gy0 + gridH + 2, gy0 + 5 + 4 * rowH + 4);
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
    const PAGE_M     = 5;
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

    const TOTAL_PAGES = 2;

    // ===== STRANICA 1: velika karta (lijevo, do margina) + naslov i legenda (desni stupac) =====
    const chartSize = 164;
    const chartX = PAGE_M;          // lijeva margina (5mm)
    const chartY = 5;               // gornja margina
    await renderSvgOnDoc(
      buildChartSVG(chart, PALETTES.ink, {
        showAspects: true,
        aspectsEnabled: { conjunction: true, sextile: true, square: true, trine: true, opposition: true },
        showCuspDegrees: true,
        linetype: true,
        labelScale: 1.2
      }),
      chartX, chartY, chartSize, chartSize
    );

    // — Desni stupac: naslov (ime + podaci rođenja) gore, pa legenda aspekata.
    const rightX = chartX + chartSize + 4;
    const rightW = (W - PAGE_M) - rightX;
    const title1 = chart.input.name || 'Natalna karta';
    doc.setFont('PlayfairDisplay', 'normal'); doc.setTextColor(42, 35, 72);
    let tSize = 13;
    doc.setFontSize(tSize);
    while (tSize > 8 && doc.getTextWidth(title1) > rightW) { tSize -= 0.5; doc.setFontSize(tSize); }
    doc.text(title1, rightX, 11);
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(7.6); doc.setTextColor(90, 80, 130);
    const bdLines = doc.splitTextToSize(birthDataLine(chart), rightW);
    doc.text(bdLines, rightX, 15.5);

    // Legenda aspekata — debljina linije i dasharray skalirani identično kao na
    // karti (chartScale) → potpuno konzistentno s linijama na natalnoj karti.
    const chartScale = chartSize / 1120;
    const hexToRgb = h => { const m = h.replace('#', ''); return [parseInt(m.substr(0, 2), 16), parseInt(m.substr(2, 2), 16), parseInt(m.substr(4, 2), 16)]; };
    let lyy = 15.5 + bdLines.length * 3.3 + 8;
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(11); doc.setTextColor(42, 35, 72);
    doc.text('Aspekti', rightX, lyy);
    lyy += 7.5;
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(8.4);
    const legItems = [
      ['conjunction', 'Konjunkcija 0°'],
      ['sextile',     'Sekstil 60°'],
      ['square',      'Kvadrat 90°'],
      ['trine',       'Trigon 120°'],
      ['opposition',  'Opozicija 180°']
    ];
    for (const [id, label] of legItems) {
      const rgb = hexToRgb(aspectColor(id, PALETTES.ink));
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(Math.max(0.12, aspectLineWidth(id) * chartScale));
      const dash = aspectDashPattern(id);
      if (dash) doc.setLineDashPattern(dash.split(',').map(v => Number(v) * chartScale), 0);
      else doc.setLineDashPattern([], 0);
      doc.line(rightX, lyy, rightX + 16, lyy);
      doc.setLineDashPattern([], 0);
      doc.setTextColor(60, 50, 100);
      doc.text(label, rightX, lyy + 4.2);
      lyy += 9.4;
    }

    // napomena za karte bez vremena rođenja
    let ly = chartY + chartSize + 1;
    if (chart.noTime) {
      doc.setFont('Quicksand', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 100, 150);
      doc.text('Vrijeme rođenja nepoznato — pozicije za podne, bez kuća, podznaka (ASC) i MC-a. Pozicija Mjeseca je približna (±7°).', PAGE_M, ly + 4);
      ly += 5;
    }

    // — Aspektna tablica + dominante ispod karte (puna širina).
    //   Sve tri stavke (karta, aspektna tablica, dominante) stanu na 1. stranicu.
    const a2 = buildAstroSeekSVG(chart);
    const gridTop = ly + 2;
    const availH = (H - 11) - gridTop;   // ostavlja prostor do podnožja
    const gsc = Math.min(CONTENT_W / a2.viewW, availH / a2.viewH);
    await renderSvgOnDoc(a2.svg, (W - a2.viewW * gsc) / 2, gridTop, a2.viewW * gsc, a2.viewH * gsc);

    pageFooter(1, TOTAL_PAGES);

    // ===== STRANICA 2: pozicije + kuće + aspekti — sve u tablicama =====
    doc.addPage();
    pageHeader('Pozicije, kuće i aspekti', chart.input.name || '');

    const shortName2 = { node: 'Sj. čvor', snode: 'J. čvor' };
    const nm = id => shortName2[id] || nameOf[id];
    const colGap = 6;
    const halfW  = (CONTENT_W - colGap) / 2;   // širina jedne (lijeve/desne) tablice

    // Crta okvir tablice (header bg + sve linije ćelija). Vraća colX[] (lijevi
    // rubovi stupaca + desni rub zadnjeg) i donji y.
    function tableFrame(x, y0, colWs, nRows, headH, rowH) {
      const totalW = colWs.reduce((a, b) => a + b, 0);
      const tableH = headH + nRows * rowH;
      doc.setFillColor(234, 230, 244);
      doc.rect(x, y0, totalW, headH, 'F');
      doc.setDrawColor(120, 108, 160); doc.setLineWidth(0.3);
      doc.line(x, y0, x + totalW, y0);
      for (let r = 0; r <= nRows; r++) { const yy = y0 + headH + r * rowH; doc.line(x, yy, x + totalW, yy); }
      doc.line(x, y0 + headH, x + totalW, y0 + headH);
      const colX = []; let cxp = x;
      for (const w of colWs) { colX.push(cxp); doc.line(cxp, y0, cxp, y0 + tableH); cxp += w; }
      doc.line(cxp, y0, cxp, y0 + tableH); colX.push(cxp);
      return { colX, totalW, bottom: y0 + tableH };
    }
    function headLabels(x, y0, colWs, headH, labels) {
      doc.setFont('Quicksand', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 60, 110);
      let cxp = x;
      labels.forEach((lb, i) => { if (lb) doc.text(lb, cxp + 2, y0 + headH - 1.9); cxp += colWs[i]; });
    }
    function sectionTitle(t, y0) {
      doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(12); doc.setTextColor(42, 35, 72);
      doc.text(t, PAGE_M, y0);
    }

    // — Pozicije planeta (2 tablice jedna do druge) — Stupanj i Kuća u zasebnim
    //   ćelijama pa se R i broj kuće nikad ne preklapaju.
    let y = 33;
    sectionTitle('Pozicije planeta', y); y += 3;
    const posCols = [27, 30, 22, 12];          // Planet | Znak | Stupanj(+R) | Kuća  (=91)
    const posHeadH = 6, posRowH = 6.1;
    const posList = chart.planets.map(p => ({ id: p.id, name: shortName2[p.id] || p.name, lon: p.lon, house: p.house, retro: p.retro }));
    if (!chart.noTime) {
      posList.push({ id: 'asc', name: 'ASC', lon: chart.asc, house: 1 });
      posList.push({ id: 'mc',  name: 'MC',  lon: chart.mc,  house: 10 });
    }
    const posHalf = Math.ceil(posList.length / 2);
    for (let half = 0; half < 2; half++) {
      const items = posList.slice(half * posHalf, half * posHalf + posHalf);
      if (!items.length) break;
      const x0 = PAGE_M + half * (halfW + colGap);
      const fr = tableFrame(x0, y, posCols, items.length, posHeadH, posRowH);
      headLabels(x0, y, posCols, posHeadH, ['Planet', 'Znak', 'Stupanj', 'Kuća']);
      for (let r = 0; r < items.length; r++) {
        const p = items[r], ry = y + posHeadH + r * posRowH, midY = ry + posRowH / 2 + 1.2;
        if (GLYPHS[p.id]) await drawGlyphPdf(doc, p.id, fr.colX[0] + 1.6, midY, 3.9, INK_PLANET);
        doc.setFont('Quicksand', 'normal'); doc.setFontSize(8.6); doc.setTextColor(46, 39, 82);
        doc.text(p.name, fr.colX[0] + (GLYPHS[p.id] ? 6.2 : 2), midY);
        await drawGlyphPdf(doc, signKey(p.lon), fr.colX[1] + 1.6, midY, 3.9, elementColor(p.lon, PALETTES.ink));
        doc.text(signName(p.lon), fr.colX[1] + 6.2, midY);
        doc.setTextColor(70, 60, 110);
        doc.text(fmtDegMin(p.lon) + (p.retro ? ' R' : ''), fr.colX[2] + 2, midY);
        if (p.house) { doc.setTextColor(110, 100, 150); doc.text(String(p.house), fr.colX[4] - 2, midY, { align: 'right' }); }
      }
    }
    y += posHeadH + posHalf * posRowH + 8;

    // — Kuće (Placidus) — 2 tablice po 6
    if (!chart.noTime) {
      sectionTitle('Kuće (Placidus)', y); y += 3;
      const hCols = [14, 47, 30];               // Kuća | Znak | Stupanj  (=91)
      const hHeadH = 6, hRowH = 6.1;
      for (let half = 0; half < 2; half++) {
        const x0 = PAGE_M + half * (halfW + colGap);
        const fr = tableFrame(x0, y, hCols, 6, hHeadH, hRowH);
        headLabels(x0, y, hCols, hHeadH, ['Kuća', 'Znak', 'Stupanj']);
        for (let k = 0; k < 6; k++) {
          const i = half * 6 + k + 1, ry = y + hHeadH + k * hRowH, midY = ry + hRowH / 2 + 1.2;
          doc.setFont('Quicksand', 'normal'); doc.setFontSize(8.6); doc.setTextColor(46, 39, 82);
          doc.text(i + '.', fr.colX[0] + 2, midY);
          await drawGlyphPdf(doc, signKey(chart.cusps[i]), fr.colX[1] + 1.6, midY, 3.9, elementColor(chart.cusps[i], PALETTES.ink));
          doc.text(signName(chart.cusps[i]), fr.colX[1] + 6.2, midY);
          doc.setTextColor(70, 60, 110);
          doc.text(fmtDegMin(chart.cusps[i]), fr.colX[2] + 2, midY);
        }
      }
      y += hHeadH + 6 * hRowH + 8;
    }

    // — Aspekti (2 tablice) — opis aspekta u jednoj ćeliji, orb u drugoj
    sectionTitle('Aspekti', y); y += 3;
    const aCols = [73, 18], aHeadH = 6, aRowH = 5.7;   // Aspekt | Orb  (=91)
    const aHalf = Math.ceil(chart.aspects.length / 2);
    for (let half = 0; half < 2; half++) {
      const items = chart.aspects.slice(half * aHalf, half * aHalf + aHalf);
      if (!items.length) break;
      const x0 = PAGE_M + half * (halfW + colGap);
      const fr = tableFrame(x0, y, aCols, items.length, aHeadH, aRowH);
      headLabels(x0, y, aCols, aHeadH, ['Aspekt', 'Orb']);
      for (let r = 0; r < items.length; r++) {
        const a = items[r], ry = y + aHeadH + r * aRowH, midY = ry + aRowH / 2 + 1.1;
        let cx = fr.colX[0] + 1.6;
        doc.setFont('Quicksand', 'normal'); doc.setFontSize(8.2);
        if (GLYPHS[a.a]) { await drawGlyphPdf(doc, a.a, cx, midY, 3.5, INK_PLANET); cx += 4.1; }
        doc.setTextColor(46, 39, 82); doc.text(nm(a.a), cx, midY); cx += doc.getTextWidth(nm(a.a)) + 2.2;
        await drawGlyphPdf(doc, a.aspect, cx, midY, 3.5, aspectColor(a.aspect, PALETTES.ink)); cx += 4.1;
        doc.setTextColor(92, 74, 142); doc.text(a.aspectName, cx, midY); cx += doc.getTextWidth(a.aspectName) + 2.2;
        if (GLYPHS[a.b]) { await drawGlyphPdf(doc, a.b, cx, midY, 3.5, INK_PLANET); cx += 4.1; }
        doc.setTextColor(46, 39, 82); doc.text(nm(a.b), cx, midY);
        doc.setTextColor(110, 100, 150); doc.text(a.orb.toFixed(1) + '°', fr.colX[2] - 2, midY, { align: 'right' });
      }
    }

    pageFooter(2, TOTAL_PAGES);

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
