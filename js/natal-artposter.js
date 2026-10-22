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
  let foilMin = 0.3;        // najtanja linija u foliji (mm) - bira se u kartici (#natal-art-foil) po uputi tiskare
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

  /* SVG cijelog postera za jedan prikaz: 'preview' | 'print' | 'foil'. */
  function buildArtSVG(c, S, mode) {
    const W = S + 2 * BLEED, cx = W / 2;
    // kotač što veći (vlasnik): oznake osi sežu do R0 × 1,09 → ~4,5 % od gornjeg ruba
    const R0 = S * 0.37, cy = BLEED + S * 0.448;
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
    s += '<rect width="' + W + '" height="' + W + '" fill="' + (mode === 'foil' ? '#ffffff' : INK.bg) + '"/>';

    const circle = (r, layer, color, w) => {
      const k = col(layer, color);
      return k ? '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="none" stroke="' + k + '" stroke-width="' + f(w) + '"/>' : '';
    };
    const radial = (lon, ra, rb, layer, color, w) => {
      const k = col(layer, color);
      if (!k) return '';
      const [x1, y1] = pt(lon, ra), [x2, y2] = pt(lon, rb);
      return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + k + '" stroke-width="' + f(w) + '" stroke-linecap="round"/>';
    };
    const glyph = (key, lon, r, size, layer, color) => {
      const k = col(layer, color);
      if (!k) return '';
      const [x, y] = pt(lon, r);
      return glyphGroup(key, x, y, size, k);
    };
    const text = (str, lon, r, size, layer, color, family) => {
      const k = col(layer, color);
      if (!k) return '';
      const [x, y] = pt(lon, r);
      return svgCenteredText(str, x, f(y + size * 0.35), size, k, family || 'Quicksand', family || 'Quicksand', null);
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
      s += '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + k + '" stroke-width="' + f(iw * 1.6) + '" stroke-linecap="round"/>';
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
      s += radial(p.lon, R1, R1 - R0 * 0.03, 'foil', null, fw * 1.2);
      if (Math.abs(norm360(d - p.lon + 180) - 180) > 0.6) {
        const k = col('foil', null);
        if (k) {
          const [x1, y1] = pt(p.lon, R1 - R0 * 0.03), [x2, y2] = pt(d, RP + gSize * 0.7);
          s += '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + k + '" stroke-width="' + f(fw) + '" stroke-linecap="round"/>';
        }
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

    /* ── ime u foliji: Cormorant Garamond kurziv (vlasnik: ne bold), kao OBRIS ── */
    const name = (c.input.name || '').trim().normalize('NFC');
    const kn = col('foil', null);
    if (name && kn && nameFont) {
      // najtanji potezi kurziva su ~0,4 mm (40 × 40); ako tiskara traži deblje, obris se podeblja obrubom
      const ns = Math.max(0, foilMin - 0.42);
      const nameAttr = '" fill="' + kn + '"' + (ns > 0 ? ' stroke="' + kn + '" stroke-width="' + f(ns) + '" stroke-linejoin="round"' : '') + '/>';
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
        let fs = S * (nameStyle === 'small' ? 0.034 : 0.052);
        const w0 = nameFont.getAdvanceWidth(name, fs);
        if (w0 > S * 0.8) fs *= S * 0.8 / w0;
        const w = nameFont.getAdvanceWidth(name, fs);
        const y = BLEED + S * (nameStyle === 'small' ? 0.915 : 0.928);
        const d = nameFont.getPath(name, cx - w / 2, y, fs).toPathData(3);
        s += '<path d="' + d + nameAttr;
      }
    }

    return s + '</svg>';
  }

  /* Ime se crta kao OBRIS (opentype.js), ne kao tekst s ugrađenim fontom:
     jsPDF krivo slaže složene glifove ovog fonta (š, č, ž = slovo + kvačica
     kao dvije komponente) pa je kvačica na „š" bila pomaknuta. Obris je
     ionako ono što tiskara želi za foliju - ne ovisi o fontu na njihovom
     računalu. Font i biblioteka se skidaju SAMO za ovaj poster. */
  const NAME_FONT_FILE = 'assets/fonts/CormorantGaramond-Italic.ttf';
  let nameFont = null;
  async function ensureNameFont() {
    if (nameFont) return;
    await loadScript('js/lib/opentype.min.js');
    const buf = await (await fetch(NAME_FONT_FILE)).arrayBuffer();
    nameFont = window.opentype.parse(buf);
  }

  async function downloadArtPoster() {
    if (!chart) return;
    const sel = document.getElementById('natal-art-size');
    const cm = sel ? sel.value : '40';
    const S = SIZES[cm] || 400, W = S + 2 * BLEED;
    const fsel = document.getElementById('natal-art-foil');
    foilMin = fsel ? parseFloat(fsel.value) || 0.3 : 0.3;
    const btn = document.getElementById('natal-art-btn');
    await withBtnSpinner(btn, async () => {
      await ensurePdfLibs();
      await ensureNameFont();
      const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, W] });
      registerFonts(doc);
      await addPosterPage(doc, buildArtSVG(chart, S, 'preview'), W, W, true);
      await addPosterPage(doc, buildArtSVG(chart, S, 'print'), W, W, false, [W, W], 'portrait');
      await addPosterPage(doc, buildArtSVG(chart, S, 'foil'), W, W, false, [W, W], 'portrait');
      doc.save(pdfFileName('poster-folija-' + cm + 'x' + cm + 'cm'));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('natal-art-btn');
    if (btn) btn.addEventListener('click', downloadArtPoster);
  });
})();
