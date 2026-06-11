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
  try {
    const canvas = fitFontSize._c || (fitFontSize._c = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    ctx.font = (weight ? weight + ' ' : '') + maxSize + 'px ' + family;
    const measured = ctx.measureText(text).width;
    if (!measured || measured <= maxWidth) return maxSize;
    return Math.max(minSize, maxSize * (maxWidth / measured) * 0.98);
  } catch (e) { return maxSize; }
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
  const trio = 'Sunce ' + signName(sun.lon) + '  ·  Mjesec ' + signName(moon.lon) + '  ·  Podznak ' + signName(chart.asc);

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
  s += '<text x="' + cx + '" y="' + (h * 0.105) + '" fill="#e4e0f4" font-family="DancingScript" font-weight="bold" font-size="' + f1 +
       '" text-anchor="middle">' + escHtml(name) + '</text>';
  // linija s zvjezdicom
  const ly = h * 0.125, lw = w * 0.3;
  s += '<line x1="' + (cx - lw) + '" y1="' + ly + '" x2="' + (cx - w * 0.022) + '" y2="' + ly + '" stroke="rgba(168,144,208,0.55)" stroke-width="' + (w * 0.0011) + '"/>';
  s += '<line x1="' + (cx + w * 0.022) + '" y1="' + ly + '" x2="' + (cx + lw) + '" y2="' + ly + '" stroke="rgba(168,144,208,0.55)" stroke-width="' + (w * 0.0011) + '"/>';
  s += '<path transform="translate(' + cx + ',' + ly + ') scale(' + (w * 0.0042) + ')" d="M0,-3 C0.4,-1 1,-0.4 3,0 C1,0.4 0.4,1 0,3 C-0.4,1 -1,0.4 -3,0 C-1,-0.4 -0.4,-1 0,-3 Z" fill="#b8a2dd"/>';
  // podaci rođenja
  const fData = fitFontSize(dataLine, 'Playfair Display', null, w * 0.0235, maxTextW);
  s += '<text x="' + cx + '" y="' + (h * 0.152) + '" fill="#c4c0d8" font-family="PlayfairDisplay" font-size="' + fData +
       '" text-anchor="middle">' + escHtml(dataLine) + '</text>';
  const fTrio = fitFontSize(trio, 'Quicksand', null, w * 0.0185, maxTextW);
  s += '<text x="' + cx + '" y="' + (h * 0.175) + '" fill="#9d95c0" font-family="Quicksand" font-size="' + fTrio +
       '" text-anchor="middle">' + escHtml(trio) + '</text>';

  // kotač (unutarnje koordinate -30..1030 → 1060 jedinica)
  s += '<g transform="translate(' + chartX + ',' + chartY + ') scale(' + (chartSize / 1060) + ') translate(30,30)">' + inner + '</g>';

  // podnožje
  s += '<text x="' + cx + '" y="' + (h * 0.925) + '" fill="#d8d2ee" font-family="Tangerine" font-weight="bold" font-size="' + (w * 0.052) +
       '" text-anchor="middle">Alkemijana</text>';
  s += '<text x="' + cx + '" y="' + (h * 0.945) + '" fill="#8a82ac" font-family="Quicksand" font-size="' + (w * 0.016) +
       '" text-anchor="middle">alkemijana.com · Placidus · tropski zodijak</text>';
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
async function downloadWorking() {
  const btn = document.getElementById('natal-working-btn');
  await withBtnSpinner(btn, async () => {
    await ensurePdfLibs();
    const chart = currentChart;
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    registerFonts(doc);
    const W = 210, H = 297;

    // — Stranica 1: zaglavlje + kotač —
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(20); doc.setTextColor(42, 35, 72);
    doc.text(chart.input.name || 'Natalna karta', W / 2, 18, { align: 'center' });
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(10.5); doc.setTextColor(90, 80, 130);
    doc.text(birthDataLine(chart), W / 2, 25.5, { align: 'center' });
    doc.setDrawColor(154, 143, 192); doc.setLineWidth(0.25);
    doc.line(25, 29.5, W - 25, 29.5);

    const chartSize = 175;
    const el = svgToElement(buildChartSVG(chart, PALETTES.ink, { showAspects: true }));
    document.body.appendChild(el); el.style.position = 'absolute'; el.style.left = '-99999px';
    try {
      await doc.svg(el, { x: (W - chartSize) / 2, y: 33, width: chartSize, height: chartSize });
    } finally { el.remove(); }

    // legenda aspekata ispod karte
    let ly = 33 + chartSize + 8;
    doc.setFontSize(8.5);
    const leg = [
      ['Konjunkcija 0°', [122, 116, 148]], ['Sekstil 60°', [63, 122, 84]], ['Kvadrat 90°', [160, 84, 104]],
      ['Trigon 120°', [63, 122, 84]], ['Opozicija 180°', [160, 84, 104]]
    ];
    let lx = 22;
    for (const [t, c] of leg) {
      doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(0.8);
      doc.line(lx, ly - 1.2, lx + 5, ly - 1.2);
      doc.setTextColor(74, 63, 110);
      doc.text(t, lx + 6.5, ly);
      lx += doc.getTextWidth(t) + 13.5;
    }
    doc.setFontSize(8); doc.setTextColor(138, 130, 172);
    doc.text('Alkemijana · alkemijana.com · Placidus · tropski zodijak', W / 2, H - 10, { align: 'center' });

    // — Stranica 2: tablice —
    doc.addPage();
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(14); doc.setTextColor(42, 35, 72);
    doc.text('Pozicije planeta', 20, 20);

    doc.setFont('Quicksand', 'normal'); doc.setFontSize(9.5);
    let y = 28;
    const nameOf = {};
    for (const p of chart.planets) nameOf[p.id] = p.name;
    nameOf.asc = 'ASC'; nameOf.mc = 'MC';

    const INK_PLANET = '#2a2348', INK_SIGN = '#5a4090';

    for (const p of chart.planets) {
      doc.setTextColor(46, 39, 82);
      await drawGlyphPdf(doc, p.id, 20, y, 4, INK_PLANET);
      doc.text(p.name, 26, y);
      await drawGlyphPdf(doc, signKey(p.lon), 62, y, 4, INK_SIGN);
      doc.text(signName(p.lon), 68, y);
      doc.text(fmtDegMin(p.lon) + (p.retro ? '  R' : ''), 95, y);
      doc.text(p.house + '. kuća', 125, y);
      y += 6.2;
    }
    doc.setTextColor(90, 64, 144);
    await drawGlyphPdf(doc, signKey(chart.asc), 62, y, 4, INK_SIGN);
    doc.text('ASC (podznak)', 20, y); doc.text(signName(chart.asc), 68, y); doc.text(fmtDegMin(chart.asc), 95, y); y += 6.2;
    await drawGlyphPdf(doc, signKey(chart.mc), 62, y, 4, INK_SIGN);
    doc.text('MC (sredina neba)', 20, y); doc.text(signName(chart.mc), 68, y); doc.text(fmtDegMin(chart.mc), 95, y);

    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(14); doc.setTextColor(42, 35, 72);
    doc.text('Kuće (Placidus)', 20, y + 14);
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(9.5);
    let hy = y + 22;
    for (let i = 1; i <= 12; i++) {
      const col = i <= 6 ? 0 : 1;
      const yy = hy + ((i - 1) % 6) * 6.2;
      doc.setTextColor(46, 39, 82);
      doc.text(i + '.', 20 + col * 90, yy);
      await drawGlyphPdf(doc, signKey(chart.cusps[i]), 28 + col * 90, yy, 4, INK_SIGN);
      doc.text(signName(chart.cusps[i]), 34 + col * 90, yy);
      doc.text(fmtDegMin(chart.cusps[i]), 64 + col * 90, yy);
    }

    let ay = hy + 6 * 6.2 + 14;
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(14); doc.setTextColor(42, 35, 72);
    doc.text('Aspekti', 20, ay);
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(9);
    ay += 8;
    const half = Math.ceil(chart.aspects.length / 2);
    for (let i = 0; i < chart.aspects.length; i++) {
      const a = chart.aspects[i];
      const col = i < half ? 0 : 1;
      const yy = ay + (i % half) * 5.6;
      if (yy > H - 15) continue;
      const baseX = 20 + col * 95;
      let cx = baseX;
      if (GLYPHS[a.a]) { await drawGlyphPdf(doc, a.a, cx, yy, 3.6, INK_PLANET); cx += 4.2; }
      doc.setTextColor(46, 39, 82);
      doc.text(nameOf[a.a], cx, yy);
      cx += doc.getTextWidth(nameOf[a.a]) + 2;
      if (GLYPHS[a.b]) { await drawGlyphPdf(doc, a.b, cx, yy, 3.6, INK_PLANET); cx += 4.2; }
      doc.text(nameOf[a.b], cx, yy);

      const ax2 = baseX + 58;
      await drawGlyphPdf(doc, a.aspect, ax2, yy, 3.6, aspectColor(a.aspect, PALETTES.ink));
      doc.setTextColor(110, 100, 150);
      doc.text(a.aspectName + ' (' + a.orb.toFixed(1) + '°)', ax2 + 4.2, yy);
    }
    doc.setFontSize(8); doc.setTextColor(138, 130, 172);
    doc.text('Alkemijana · alkemijana.com', W / 2, H - 10, { align: 'center' });

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
