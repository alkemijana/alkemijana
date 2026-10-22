/* ============================================================================
   UMJETNIČKI POSTER NATALNE KARTE ZA TISAK - Janin alat (samo admin, samostalan modul)
   ----------------------------------------------------------------------------
   Kvadratni poster (30/40/50 cm) za tisak u tiskari: kotač u boji na crnoj
   podlozi + SREBRNA FOLIJA na odabranim dijelovima + samo ime. Bez ostalih
   podataka (vlasnik: tko zna čitati kartu, pročitat će je).
   Tehnika (v. CLAUDE.md): bijeli papir → tisak (crna podloga + boje) →
   soft-touch plastifikacija → digitalna srebrna folija.
   PDF ima 3 stranice istih mjera (rez + napust 3 mm):
     1. PREGLED  - tisak + folija prikazana kao srebro (da Jana vidi što naručuje)
     2. TISAK    - samo ono što se tiska (crna podloga, boje); ispod folije je crno
     3. FOLIJA   - ploča za foliju: 100 % crno = srebro, bijelo = ništa
   Svaki element kotača nosi sloj ('ink' ili 'foil'), a isti crtač ga za
   svaku stranicu nacrta u boji tog prikaza ili izostavi.
   Folija ne voli tanke linije: sve što je u foliji je najmanje foilMin mm.
   Ovisi o globalnim helperima iz natal-data.js / natal-pdf.js (glyphGroup,
   svgCenteredText, ensurePdfLibs, registerFonts, addPosterPage, pdfFileName).
   ========================================================================== */
(function () {
  'use strict';

  const BLEED = 3;          // napust u mm sa svake strane
  const SLUG = 15;          // bijeli rub izvan napusta za oznake reza i poravnanja (tisak + folija)
  const REG = '#010203';    // „registracijska" boja: u CMYK-u C100 M100 Y100 K100 - vidi se na svim pločama
  let foilMin = 0.5;        // najtanja linija u foliji (mm), zadano 0,5 (vlasnik) - bira se u kartici (#natal-art-foil)
  const INK_MIN = 0.2;      // najtanja tiskana linija (mm)
  const SIZES = { 30: 300, 40: 400, 50: 500 };

  // Boje tiska na crnoj podlozi - prigušene, bez neona; NIKAD zlatna
  const INK = {
    bg: '#0a0910', band: '#15131f',
    fire: '#c98a8f', earth: '#8fb59a', air: '#b6a6dc', water: '#8fa9d6',
    harm: '#8fb59a', soft: '#8fa9d6', tense: '#c98a8f',
    house: '#5d5675', houseNum: '#7d7699', axisText: '#b6a6dc', retro: '#b6a6dc'
  };
  const FOIL_PREVIEW = '#d9dbe3';   // kako folija izgleda u pregledu

  // Sve točke kao na kotaču stranice (vlasnik: J. čvor, Fortuna i Vertex ne smiju faliti).
  // Aspekti ionako idu samo između točaka koje ih imaju (computeAspects).
  const BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
    'uranus', 'neptune', 'pluto', 'node', 'snode', 'lilith', 'chiron', 'fortune', 'vertex'];
  const ELEMENT_OF_SIGN = ['fire', 'earth', 'air', 'water'];

  let chart = null;
  let nameStyle = 'center';   // 'center' | 'small' | 'arc'

  window.ArtPoster = {
    setChart(c) { chart = c; updateVisibility(); },
    buildSVG: async (c, S, mode, style) => {   // za pregled/otklanjanje grešaka
      await ensureNameFont();
      const old = nameStyle; if (style) nameStyle = style;
      try { return buildArtSVG(c, S, mode); } finally { nameStyle = old; }
    },
    download: () => downloadArtPoster()
  };

  function isAdmin() { return !!sessionStorage.getItem('aj_pass'); }

  function updateVisibility() {
    const card = document.getElementById('natal-art-card');
    if (card) card.style.display = (chart && isAdmin()) ? '' : 'none';
  }

  /* Razmakni glifove planeta da se ne preklapaju (kružno, iterativno).
     Vraća mapu id → prikazana longituda. */
  function spreadLongitudes(items, minSep) {
    const arr = items.map(p => ({ id: p.id, lon: p.lon, d: p.lon })).sort((a, b) => a.lon - b.lon);
    const n = arr.length;
    for (let it = 0; it < 200; it++) {
      let moved = false;
      for (let i = 0; i < n; i++) {
        const a = arr[i], b = arr[(i + 1) % n];
        let gap = b.d - a.d;
        if (i === n - 1) gap += 360;
        if (gap < minSep) {
          const push = (minSep - gap) / 2 + 0.01;
          a.d -= push; b.d += push; moved = true;
        }
      }
      if (!moved) break;
    }
    const out = {};
    for (const p of arr) out[p.id] = p.d;
    return out;
  }

  /* Ime na posteru: Veliko Početno Slovo svake riječi, ostalo malo (vlasnik) -
     bez obzira kako je upisano („ivana HORVAT-šimić" → „Ivana Horvat-Šimić"). */
  function titleCase(s) {
    return String(s || '').trim().normalize('NFC').toLocaleLowerCase('hr')
      .replace(/(^|[\s\-'’])(\p{L})/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase('hr'));
  }

  /* SVG cijelog postera za jedan prikaz: 'preview' | 'print' | 'foil'. */
  function buildArtSVG(c, S, mode) {
    // tisak i folija imaju bijeli rub s oznakama (SLUG), pregled je samo poster
    const slug = mode === 'preview' ? 0 : SLUG, OFF = slug + BLEED;
    const W = S + 2 * OFF, cx = W / 2;
    // kotač što veći (vlasnik): oznake osi sežu do R0 × 1,09 → ~4,5 % od gornjeg ruba
    const R0 = S * 0.37, cy = OFF + S * 0.448;
    const R1 = R0 * 0.86;            // unutarnji rub zodijaka
    const RP = R0 * 0.735;           // prsten planeta
    const R2 = R0 * 0.62;            // vanjski rub prstena kuća
    const R3 = R0 * 0.55;            // krug aspekata
    const asc = c.noTime ? 0 : c.asc;
    const D2R = Math.PI / 180;
    const pt = (lon, r) => {
      const a = (180 + (lon - asc)) * D2R;
      return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    };
    const f = n => n.toFixed(3);

    // boja za sloj u ovom prikazu (null = ne crtaj)
    const col = (layer, inkColor) => {
      if (mode === 'foil') return layer === 'foil' ? '#000000' : null;
      if (mode === 'print') return layer === 'foil' ? null : inkColor;
      return layer === 'foil' ? FOIL_PREVIEW : inkColor;
    };
    const fw = Math.max(foilMin, R0 * 0.0022);   // debljina linija u foliji
    const iw = Math.max(INK_MIN, R0 * 0.0016);    // debljina tiskanih linija

    let s = '<svg viewBox="0 0 ' + W + ' ' + W + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect width="' + W + '" height="' + W + '" fill="#ffffff"/>';
    if (mode !== 'foil') s += '<rect x="' + slug + '" y="' + slug + '" width="' + (S + 2 * BLEED) + '" height="' + (S + 2 * BLEED) + '" fill="' + INK.bg + '"/>';

    const circle = (r, layer, color, w) => {
      const k = col(layer, color);
      return k ? '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="none" stroke="' + k + '" stroke-width="' + f(w) + '"/>' : '';
    };
    const radial = (lon, ra, rb, layer, color, w) => {
      const k = col(layer, color);
      if (!k) return '';
      const [x1, y1] = pt(lon, ra), [x2, y2] = pt(lon, rb);
      return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + k + '" stroke-width="' + f(w) + '" stroke-linecap="butt"/>';
    };
    const glyph = (key, lon, r, size, layer, color) => {
      const k = col(layer, color);
      if (!k) return '';
      const [x, y] = pt(lon, r);
      return glyphGroup(key, x, y, size, k);
    };
    const text = (str, lon, r, size, layer, color) => {   // obris (labelFont), ne tekst
      const k = col(layer, color);
      if (!k) return '';
      const [x, y] = pt(lon, r);
      const w = labelFont.getAdvanceWidth(str, size);
      return '<path d="' + labelFont.getPath(str, x - w / 2, y + size * 0.35, size).toPathData(3) + '" fill="' + k + '"/>';
    };

    /* ── zodijak: tiskani pojas, obrubi, granice znakova i ljestvica stupnjeva u foliji ── */
    const kb = col('ink', INK.band);
    if (kb) s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f((R0 + R1) / 2) + '" fill="none" stroke="' + kb + '" stroke-width="' + f(R0 - R1) + '"/>';
    s += circle(R0, 'foil', null, fw * 1.4);
    s += circle(R1, 'foil', null, fw);
    for (let i = 0; i < 12; i++) s += radial(i * 30, R1, R0, 'foil', null, fw);
    for (let d = 0; d < 360; d++) {
      if (d % 30 === 0) continue;
      const len = d % 10 === 0 ? 0.034 : d % 5 === 0 ? 0.023 : 0.013;
      s += radial(d, R1, R1 + R0 * len, 'foil', null, fw);
    }
    // znakovi u bojama elemenata
    for (let i = 0; i < 12; i++) {
      s += glyph(SIGN_KEYS[i], i * 30 + 15, R0 * 0.947, R0 * 0.062, 'ink', INK[ELEMENT_OF_SIGN[i % 4]]);
    }

    /* ── kuće (tiskano, prigušeno) ── */
    if (!c.noTime) {
      s += circle(R2, 'ink', INK.house, iw);
      for (let i = 1; i <= 12; i++) {
        const isAxis = i === 1 || i === 4 || i === 7 || i === 10;
        if (!isAxis) s += radial(c.cusps[i], R3, R1, 'ink', INK.house, iw);
        const a = c.cusps[i], b = c.cusps[i === 12 ? 1 : i + 1];
        const mid = a + norm360(b - a) / 2;
        s += text(String(i), mid, (R2 + R3) / 2, R0 * 0.03, 'ink', INK.houseNum);
      }
    }

    /* ── aspekti (tiskano, u bojama po vrsti) ── */
    const lonOf = {};
    for (const p of c.planets) lonOf[p.id] = p.lon;
    for (const a of (c.aspects || [])) {
      if (a.aspect === 'conjunction') continue;
      if (BODIES.indexOf(a.a) < 0 || BODIES.indexOf(a.b) < 0) continue;
      const color = a.aspect === 'trine' ? INK.harm : a.aspect === 'sextile' ? INK.soft : INK.tense;
      const k = col('ink', color);
      if (!k) continue;
      const [x1, y1] = pt(lonOf[a.a], R3), [x2, y2] = pt(lonOf[a.b], R3);
      s += '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + k + '" stroke-width="' + f(iw * 1.6) + '" stroke-linecap="butt"/>';
    }
    s += circle(R3, 'foil', null, fw);

    const bodies = c.planets.filter(p => BODIES.indexOf(p.id) >= 0 && GLYPHS[p.id]);
    const gSize = R0 * 0.07;
    const disp = spreadLongitudes(bodies, (gSize * 1.35 / RP) / D2R);

    /* ── osi ASC/DSC, MC/IC u foliji, oznake tiskane izvan kotača ──
       Os se PREKIDA preko pojasa znakova (R1–R0) da ne presijeca znakove
       (vlasnik). Kroz glifove planeta NE prekidati (vlasnik). */
    if (!c.noTime) {
      const axes = [[c.asc, 'ASC'], [c.asc + 180, 'DSC'], [c.mc, 'MC'], [c.mc + 180, 'IC']];
      for (const [lon, lbl] of axes) {
        s += radial(lon, R3, R1, 'foil', null, fw * 1.3);
        s += radial(lon, R0, R0 * 1.035, 'foil', null, fw * 1.3);
        s += text(lbl, lon, R0 * 1.075, R0 * 0.03, 'ink', INK.axisText);
      }
    }

    /* ── planeti: glif u foliji, crtica na pravom stupnju ── */
    for (const p of bodies) {
      const d = disp[p.id];
      // crtica na pravom stupnju + (ako je glif razmaknut) kosa poveznica do glifa -
      // JEDNA izlomljena linija iste debljine, da na pregibu nema „kvrge" (vlasnik)
      const kp = col('foil', null);
      if (kp) {
        const [x0, y0] = pt(p.lon, R1), [x1, y1] = pt(p.lon, R1 - R0 * 0.03);
        let pts = f(x0) + ',' + f(y0) + ' ' + f(x1) + ',' + f(y1);
        if (Math.abs(norm360(d - p.lon + 180) - 180) > 0.6) {
          const [x2, y2] = pt(d, RP + gSize * 0.7);
          pts += ' ' + f(x2) + ',' + f(y2);
        }
        s += '<polyline points="' + pts + '" fill="none" stroke="' + kp + '" stroke-width="' + f(fw) +
          '" stroke-linecap="butt" stroke-linejoin="round"/>';
      }
      // crni krug ispod glifa da tiskane linije kuća ne prolaze kroz njega
      const bgk = mode === 'foil' ? null : INK.bg;
      if (bgk) {
        const [x, y] = pt(d, RP);
        s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(gSize * 0.72) + '" fill="' + bgk + '"/>';
      }
      s += glyph(p.id, d, RP, gSize, 'foil', null);
      if (p.retro) s += text('R', d, RP - gSize * 1.05, R0 * 0.026, 'ink', INK.retro);
    }

    /* ── ime u foliji: Dancing Script Regular (vlasnik: zaobljeni krajevi kao glifovi), kao OBRIS ── */
    const name = titleCase(c.input.name);
    const kn = col('foil', null);
    if (name && kn && nameFont) {
      // najtanji potezi Dancing Scripta su ~0,027 em (izmjereno: 40 × 40 → ~0,56 mm);
      // ako je to tanje od foilMin, obris se podeblja obrubom do foilMin
      const attrFor = fs => {
        const ns = Math.max(0, foilMin - fs * 0.027);
        return '" fill="' + kn + '"' + (ns > 0 ? ' stroke="' + kn + '" stroke-width="' + f(ns) + '" stroke-linejoin="round"' : '') + '/>';
      };
      let nameAttr = attrFor(R0 * 0.085);
      if (nameStyle === 'arc') {
        // po luku ispod kotača, slova okrenuta prema središtu
        const fs = R0 * 0.085, Rn = R0 * 1.2;
        const total = nameFont.getAdvanceWidth(name, fs);
        let acc = -total / 2;
        for (const ch of Array.from(name)) {
          const adv = nameFont.getAdvanceWidth(ch, fs);
          const phi = (acc + adv / 2) / Rn;              // kut od dna kotača
          const gx = cx + Rn * Math.sin(phi), gy = cy + Rn * Math.cos(phi);
          if (ch !== ' ') {
            const d = nameFont.getPath(ch, -adv / 2, 0, fs).toPathData(3);
            s += '<path transform="translate(' + f(gx) + ',' + f(gy) + ') rotate(' + f(-phi / D2R) + ')" d="' + d + nameAttr;
          }
          acc += adv;
        }
      } else {
        let fs = S * (nameStyle === 'small' ? 0.034 : 0.058);
        const w0 = nameFont.getAdvanceWidth(name, fs);
        if (w0 > S * 0.8) fs *= S * 0.8 / w0;
        nameAttr = attrFor(fs);
        const w = nameFont.getAdvanceWidth(name, fs);
        const y = OFF + S * (nameStyle === 'small' ? 0.915 : 0.928);
        const d = nameFont.getPath(name, cx - w / 2, y, fs).toPathData(3);
        s += '<path d="' + d + nameAttr;
      }
    }

    if (slug) s += printMarks(W, S, OFF, slug, mode, c);
    return s + '</svg>';
  }

  /* Oznake za tiskaru u bijelom rubu (izvan napusta, odrežu se):
     - oznake reza na sva 4 kuta (gdje je format `S × S`),
     - križići za poravnanje (krug + križ) na sredini svake stranice,
     - natpis koja je ovo datoteka.
     U tisku su u „registracijskoj" boji (sve 4 boje 100 %), u foliji crne.
     Na ISTOM su mjestu u obje datoteke - po njima se folija poravna s tiskom. */
  function printMarks(W, S, OFF, slug, mode, c) {
    const k = mode === 'foil' ? '#000000' : REG, w = 0.25, f = n => n.toFixed(3);
    const ln = (x1, y1, x2, y2) => '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) +
      '" stroke="' + k + '" stroke-width="' + w + '" stroke-linecap="butt"/>';
    let s = '';
    const a = OFF - BLEED - 2, b = a - 8;              // oznaka počinje 2 mm izvan napusta, duga 8 mm
    for (const tx of [OFF, OFF + S]) for (const ty of [OFF, OFF + S]) {
      const sx = tx === OFF ? -1 : 1, sy = ty === OFF ? -1 : 1;
      const ax = tx + sx * (OFF - a), bx = tx + sx * (OFF - b);
      const ay = ty + sy * (OFF - a), by = ty + sy * (OFF - b);
      s += ln(ax, ty, bx, ty) + ln(tx, ay, tx, by);
    }
    const target = (x, y) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="2.6" fill="none" stroke="' + k + '" stroke-width="' + w + '"/>' +
      ln(x - 4.5, y, x + 4.5, y) + ln(x, y - 4.5, x, y + 4.5);
    const m = slug / 2;
    s += target(W / 2, m) + target(W / 2, W - m) + target(m, W / 2) + target(W - m, W / 2);
    const name = (c.input.name || '').trim();
    const label = (mode === 'foil' ? 'FOLIJA (srebro) · 100 % K = folija' : 'TISAK · CMYK') +
      ' · ' + (S / 10) + ' × ' + (S / 10) + ' cm · napust 3 mm' + (name ? ' · ' + name : '');
    if (labelFont) s += '<path d="' + labelFont.getPath(label, OFF, W - m + 1.2, 3.2).toPathData(3) + '" fill="' + k + '"/>';
    return s;
  }

  /* Ime i sve oznake se crtaju kao OBRISI (opentype.js), ne kao tekst: PDF
     tako nema nijednog fonta i tiskara ga otvara točno kako izgleda kod nas
     (nema zamjene fonta, nema „nedostaje font").
     Fontovi i biblioteka se skidaju SAMO za ovaj poster. */
  const NAME_FONT_FILE = 'assets/fonts/DancingScript-Regular.ttf';
  const LABEL_FONT_FILE = 'assets/fonts/Quicksand-Medium.ttf';
  let nameFont = null, labelFont = null;
  async function ensureNameFont() {
    if (nameFont && labelFont) return;
    await loadScript('js/lib/opentype.min.js');
    const [a, b] = await Promise.all([NAME_FONT_FILE, LABEL_FONT_FILE].map(u => fetch(u).then(r => r.arrayBuffer())));
    nameFont = window.opentype.parse(a);
    labelFont = window.opentype.parse(b);
  }

  /* ── boje za tiskaru: CMYK ──
     svg2pdf boje šalje kao RGB (0-255) pa ih ovdje prevedemo u CMYK prije nego
     dođu u PDF. Tako tiskara NE pretvara boje sama (njihovo RGB→CMYK zna crnu
     pretvoriti u sivu ili smeđu). Podloga = bogata crna C60 M40 Y40 K100
     (gusta, ujednačena; ukupno 240 % - ispod uobičajene granice od 300 %).
     Ploča za foliju: sve što nije bijelo = čista crna K100. */
  const RICH_BLACK = [0.6, 0.4, 0.4, 1];
  function rgbToCmyk(r, g, b, mode) {
    const white = r > 250 && g > 250 && b > 250;
    if (mode === 'foil') return white ? [0, 0, 0, 0] : [0, 0, 0, 1];
    if (r === 1 && g === 2 && b === 3) return [1, 1, 1, 1];   // REG - oznake reza i poravnanja
    if (r + g + b <= 40) return RICH_BLACK;      // podloga (#0a0910) i zadana crna
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k >= 1) return [0, 0, 0, 1];
    const q = v => +((1 - v - k) / (1 - k)).toFixed(3);
    return [q(r), q(g), q(b), +k.toFixed(3)];
  }
  function useCmyk(doc, mode) {
    const parse = a => {
      if (a.length >= 3 && a.slice(0, 3).every(v => typeof v === 'number')) return a.slice(0, 3);
      if (typeof a[0] === 'string' && /^#?[0-9a-f]{6}$/i.test(a[0])) {
        const h = a[0].replace('#', '');
        return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
      }
      return null;
    };
    for (const fn of ['setFillColor', 'setDrawColor', 'setTextColor']) {
      const orig = doc[fn].bind(doc);
      doc[fn] = (...a) => {
        if (a.length === 4) return orig(...a);   // već CMYK
        const rgb = parse(a);
        return rgb ? orig(...rgbToCmyk(rgb[0], rgb[1], rgb[2], mode)) : orig(...a);
      };
    }
  }

  /* Jedna datoteka = jedna stranica postera. Nova stranica bi u jsPDF-u
     naslijedila stanje linije s prethodne (okrugli krajevi od glifova, a
     svg2pdf za „butt" ništa ne zapiše) - zato su tisak i folija ZASEBNI
     PDF-ovi, što tiskare ionako traže. */
  async function makeDoc(W, svg, mode) {
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, W], compress: true });
    // tisak i folija nemaju teksta (sve je obris) pa ni ugrađenih fontova;
    // pregled ih treba za stranicu s uputama
    if (mode === 'preview') registerFonts(doc);
    else useCmyk(doc, mode);
    doc.setLineCap('butt'); doc.setLineJoin('miter');
    await addPosterPage(doc, svg, W, W, true);
    return doc;
  }

  /* Druga stranica pregleda: upute koje Jana preda tiskari uz datoteke. */
  function addPrinterNotes(doc, cm, fileBase) {
    doc.addPage('a4', 'portrait');
    const L = 20, maxW = 170;
    let y = 26;
    const line = (txt, size, gap) => {
      doc.setFontSize(size);
      for (const ln of doc.splitTextToSize(txt, maxW)) { doc.text(ln, L, y); y += size * 0.45; }
      y += gap || 2;
    };
    const full = String((cm * 10 + 2 * (BLEED + SLUG)) / 10).replace('.', ',');
    doc.setFont('Quicksand', 'normal');
    doc.setTextColor(30, 30, 30);
    line('Upute za tiskaru', 18, 4);
    line('Kvadratni poster ' + cm + ' × ' + cm + ' cm (format nakon reza). Naklada: 1 primjerak - svaka karta je unikat.', 11, 4);
    line('Datoteke', 13, 1);
    line('1. ' + fileBase + '-TISAK.pdf - tisak u boji, CMYK. Podloga je bogata crna C60 M40 Y40 K100 - molimo ne pretvarati boje.', 11);
    line('2. ' + fileBase + '-FOLIJA.pdf - maska za SREBRNU foliju: 100 % K = folija, bijelo = bez folije. Iste mjere i isto ishodište kao tisak (poravnanje 1 : 1).', 11);
    line('3. ' + fileBase + '-PREGLED.pdf - samo pregled kako treba izgledati (folija prikazana sivo-srebrno). Ne tiskati.', 11, 4);
    line('Mjere', 13, 1);
    line('Tisak i folija su stranice ' + full + ' × ' + full + ' cm: format ' + cm + ' × ' + cm + ' cm + napust 3 mm + bijeli rub ' + (SLUG / 10).toString().replace('.', ',') + ' cm s oznakama. Rezati po oznakama reza na ' + cm + ' × ' + cm + ' cm.', 11, 4);
    line('Poravnanje', 13, 1);
    line('Oznake reza (4 kuta) i križići za poravnanje (sredina svake stranice) su na ISTOM mjestu u obje datoteke. U tisku su u registracijskoj boji (C100 M100 Y100 K100), u foliji crne. Molimo foliju poravnati s tiskom po tim oznakama.', 11, 4);
    line('Redoslijed', 13, 1);
    // Quicksand nema strelicu „→" pa redoslijed ide riječima
    line('1. tisak, 2. soft-touch (baršunasta mat) plastifikacija, 3. digitalna srebrna folija.', 11, 4);
    line('Napomene', 13, 1);
    line('Najtanja linija u foliji: ' + String(foilMin).replace('.', ',') + ' mm. Razmak između crtica stupnjeva je oko 1,9 mm.', 11);
    line('Svi tekstovi su pretvoreni u krivulje - u datotekama nema fontova.', 11);
    line('Budući da je primjerak jedan, molimo prije folije provjeriti poravnanje (npr. foliju na otpadnom arku ili usporedbom oznaka na zaslonu), da se unikat ne pokvari.', 11);
  }

  async function downloadArtPoster() {
    if (!chart) return;
    const sel = document.getElementById('natal-art-size');
    const cm = +(sel ? sel.value : '40');
    const S = SIZES[cm] || 400, W = S + 2 * BLEED, WM = W + 2 * SLUG;
    const fsel = document.getElementById('natal-art-foil');
    foilMin = fsel ? parseFloat(fsel.value) || 0.5 : 0.5;
    const btn = document.getElementById('natal-art-btn');
    await withBtnSpinner(btn, async () => {
      await ensurePdfLibs();
      await ensureNameFont();
      const base = pdfFileName('poster-' + cm + 'x' + cm + 'cm').replace(/\.pdf$/, '');
      const files = [
        ['TISAK', await makeDoc(WM, buildArtSVG(chart, S, 'print'), 'print')],
        ['FOLIJA', await makeDoc(WM, buildArtSVG(chart, S, 'foil'), 'foil')]
      ];
      const prev = await makeDoc(W, buildArtSVG(chart, S, 'preview'), 'preview');
      addPrinterNotes(prev, cm, base);
      files.push(['PREGLED', prev]);
      for (const [tag, doc] of files) {
        doc.save(base + '-' + tag + '.pdf');
        await new Promise(r => setTimeout(r, 400));   // preglednik inače zna progutati drugo preuzimanje
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('natal-art-btn');
    if (btn) btn.addEventListener('click', downloadArtPoster);
  });
})();
