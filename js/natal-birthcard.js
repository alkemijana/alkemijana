/* ============================================================
   Tarot karta rođenja - samostalan modul (window.BirthCard)
   Iz datuma rođenja natalne karte izračuna kartu (ili par/trojku
   karata) velike arkane po numerološkoj metodi Mary K. Greer.
   Prikaz: kartica iznad PDF gumbi na stranici natalne karte
   (#natal-birthcard) + mali blok u desnom stupcu 1. stranice
   radnog PDF-a (drawPdf, zove ga renderWorkingContent u natal-pdf.js).
   Sinastrija: obje osobe + karta odnosa (#synastry-birthcard, drawPdfSynastry).
   Slike i nazivi: RWS špil iz virtualnog tarota (tarot/tarot-data.js,
   TAROT_CARD_TEXTS u data.js) - numeracija RWS: 8 = Snaga, 11 = Pravda.
   ============================================================ */
(function () {
  'use strict';

  const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

  function digits(n) { return String(n).split('').map(Number); }
  function digitSum(n) { return digits(n).reduce((s, x) => s + x, 0); }

  /* Metoda (Mary K. Greer):
     1. dan + mjesec + godina (kao cijeli brojevi)
     2. znamenke zbroja se zbrajaju dok broj ne bude ≤ 22 → karta osobnosti
        (22 = Luda, karta 0)
     3. dvoznamenkast broj se svede još jednom (19 → 10 → 1) → karta duše;
        jednoznamenkast broj = osobnost i duša su ista karta.
     Vraća { total, steps:[{expr,val}], cards:[{num, role}], pnum }. */
  function compute(d, mo, y) {
    const total = d + mo + y;
    const steps = [{ expr: d + ' + ' + mo + ' + ' + y, val: total }];
    return reduce(total, steps, (i, len) => len === 1 ? 'osobnost i duša'
      : i === 0 ? 'osobnost' : i === len - 1 ? 'duša' : 'spona');
  }

  /* Karta odnosa (sinastrija): zbroj brojeva obiju karata osobnosti (Luda = 22),
     pa isto svođenje kao za kartu rođenja. NIJE dio Greerine metode. */
  function computeRelation(rA, rB) {
    const total = rA.pnum + rB.pnum;
    const steps = [{ expr: rA.pnum + ' + ' + rB.pnum, val: total }];
    return reduce(total, steps, i => i === 0 ? 'odnos' : '');
  }

  /* Zbraja znamenke dok broj nije ≤ 22 (prva karta), pa dvoznamenkast svodi
     dalje (druga/treća karta). pnum = broj prve karte (22 ostaje 22). */
  function reduce(total, steps, roleOf) {
    let n = total;
    while (n > 22) {
      const s = digitSum(n);
      steps.push({ expr: digits(n).join(' + '), val: s });
      n = s;
    }
    const nums = [n];
    let m = n;
    while (m > 9) {
      const s = digitSum(m);
      steps.push({ expr: digits(m).join(' + '), val: s });
      m = s;
      nums.push(m);
    }
    const cards = nums.map((num, i) => ({ num: num === 22 ? 0 : num, role: roleOf(i, nums.length) }));
    return { total, steps, cards, pnum: nums[0] };
  }

  function chartResult(chart) { const i = chart.input; return compute(i.d, i.mo, i.y); }

  function cardInfo(num) {
    const def = TAROT_MAJOR_DEFS[num];
    const id = def[0];
    const txt = (typeof TAROT_CARD_TEXTS !== 'undefined' && TAROT_CARD_TEXTS.rws && TAROT_CARD_TEXTS.rws[id]) || {};
    return { id, name: txt.name || def[1], roman: ROMAN[num], img: tarotCardImage('rws', id) };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- Stranica ---------- */
  const NOTE_HTML = '<p class="nt-bc-note">Izračun po numerološkoj metodi Mary K. Greer.</p>';
  const NOTE_SYN_HTML = '<p class="nt-bc-note">Karte rođenja po numerološkoj metodi Mary K. Greer; ' +
    'karta odnosa je zbroj brojeva obiju karata osobnosti, sveden na isti način.</p>';

  function birthText(r) {
    const names = r.cards.map(c => esc(cardInfo(c.num).name));
    if (names.length === 1) return 'Osobnost i duša su ista karta: <b>' + names[0] + '</b>.';
    if (names.length === 2) return 'Karta osobnosti je <b>' + names[0] + '</b>, a karta duše <b>' + names[1] + '</b>.';
    return 'Karta osobnosti je <b>' + names[0] + '</b>, karta duše <b>' + names[2] +
      '</b>, a <b>' + names[1] + '</b> ih povezuje.';
  }

  function relationText(r) {
    const names = r.cards.map(c => '<b>' + esc(cardInfo(c.num).name) + '</b>');
    return 'Karta odnosa je ' + names[0] +
      (names.length > 1 ? ' (svodi se na ' + names.slice(1).join(' i ') + ')' : '') + '.';
  }

  /* Jedan blok: slike karata lijevo, izračun i rečenica desno.
     label = natpis iznad (ime osobe / "Karta odnosa"), note = fusnota u stupcu teksta. */
  function blockHtml(r, label, calcLbl, resultHtml, note) {
    const cardsHtml = r.cards.map(c => {
      const ci = cardInfo(c.num);
      return '<figure class="nt-bc-card">' +
        '<img src="' + esc(ci.img) + '" alt="' + esc(ci.name) + '" loading="lazy" decoding="async">' +
        '<figcaption><span class="nt-bc-num">' + ci.roman + '</span> ' + esc(ci.name) +
        (c.role ? '<span class="nt-bc-role">' + c.role + '</span>' : '') + '</figcaption></figure>';
    }).join('');
    const calcHtml = r.steps.map(s => '<div>' + s.expr + ' = <b>' + s.val + '</b></div>').join('');

    return (label ? '<div class="nt-bc-person">' + esc(label) + '</div>' : '') +
      '<div class="nt-bc-body">' +
        '<div class="nt-bc-cards nt-bc-n' + r.cards.length + '">' + cardsHtml + '</div>' +
        '<div class="nt-bc-text">' +
          '<div class="nt-bc-calc"><span class="nt-bc-calc-lbl">' + esc(calcLbl) + '</span>' + calcHtml + '</div>' +
          '<p>' + resultHtml + '</p>' +
          (note ? NOTE_HTML : '') +
        '</div>' +
      '</div>';
  }

  function personHtml(chart, label, note) {
    const i = chart.input, r = chartResult(chart);
    return blockHtml(r, label, 'Izračun za ' + i.d + '. ' + i.mo + '. ' + i.y + '.', birthText(r), note);
  }

  function ready(box, charts) {
    if (!box) return false;
    if (typeof TAROT_MAJOR_DEFS === 'undefined' || charts.some(c => !c || !c.input)) { box.style.display = 'none'; return false; }
    return true;
  }

  // Natalna karta: #natal-birthcard
  function render(chart) {
    const box = document.getElementById('natal-birthcard');
    if (!ready(box, [chart])) return;
    box.innerHTML = '<h4>Tarot karta rođenja</h4>' + personHtml(chart, '', true);
    box.style.display = '';
  }

  // Sinastrija: #synastry-birthcard - obje osobe + karta odnosa jedna ispod druge, fusnota na dnu
  function renderSynastry(chartA, chartB) {
    const box = document.getElementById('synastry-birthcard');
    if (!ready(box, [chartA, chartB])) return;
    const rel = computeRelation(chartResult(chartA), chartResult(chartB));
    box.innerHTML = '<h4>Tarot karte rođenja</h4>' +
      personHtml(chartA, chartA.input.name || 'Prva osoba', false) +
      '<div class="nt-bc-sep"></div>' +
      personHtml(chartB, chartB.input.name || 'Druga osoba', false) +
      '<div class="nt-bc-sep"></div>' +
      blockHtml(rel, 'Karta odnosa', 'Zbroj karata osobnosti', relationText(rel), false) +
      NOTE_SYN_HTML;
    box.style.display = '';
  }

  /* ---------- Radni PDF ---------- */
  async function imgDataUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('slika ' + res.status);
    const blob = await res.blob();
    return await new Promise((ok, fail) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result);
      fr.onerror = fail;
      fr.readAsDataURL(blob);
    });
  }

  /* Natalni radni PDF: okomiti blok u stupcu (x, y, širina w), ne ispod yMax. Vraća donji y. */
  async function drawPdf(doc, chart, x, y, w, yMax) {
    if (typeof TAROT_MAJOR_DEFS === 'undefined' || !chart || !chart.input) return y;
    const r = chartResult(chart);

    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(11); doc.setTextColor(42, 35, 72);
    doc.text('Karta rođenja', x, y);
    y += 5;

    doc.setFont('Quicksand', 'normal'); doc.setFontSize(7.4); doc.setTextColor(60, 50, 100);
    for (const s of r.steps) {
      const lines = doc.splitTextToSize(s.expr + ' = ' + s.val, w);
      doc.text(lines, x, y);
      y += lines.length * 3.2;
    }
    y += 1.6;

    // slike u redu; visina u omjeru karte (0.583)
    const n = r.cards.length, gap = 2;
    let cw = Math.min(18, (w - gap * (n - 1)) / n);
    const room = yMax - y - 4 - n * 7.5;   // ostatak nakon naziva ispod slika
    if (cw / 0.583 > room) cw = Math.max(8, room * 0.583);
    const ch = cw / 0.583;
    for (let k = 0; k < n; k++) {
      const ci = cardInfo(r.cards[k].num);
      const cx = x + k * (cw + gap);
      try {
        const data = await imgDataUrl(ci.img);
        doc.addImage(data, 'JPEG', cx, y, cw, ch);
      } catch (e) { /* bez slike - ostaje samo okvir */ }
      doc.setDrawColor(154, 143, 192); doc.setLineWidth(0.2);
      doc.rect(cx, y, cw, ch);
    }
    y += ch + 4;

    // nazivi ispod: "VI Ljubavnici" + uloga
    for (const c of r.cards) {
      const ci = cardInfo(c.num);
      doc.setFont('Quicksand', 'normal'); doc.setFontSize(7.8); doc.setTextColor(42, 35, 72);
      const lines = doc.splitTextToSize(ci.roman + ' ' + ci.name, w);
      doc.text(lines, x, y);
      y += lines.length * 3.3;
      doc.setFontSize(6.6); doc.setTextColor(110, 100, 150);
      doc.text(c.role, x, y);
      y += 3.9;
    }
    return y;
  }

  /* Vodoravni blok (sinastrija): slike lijevo, izračun i nazivi desno od njih.
     r = rezultat compute/computeRelation. Vraća donji y. */
  async function drawPdfSide(doc, r, x, y, w, yMax, title) {
    doc.setFont('PlayfairDisplay', 'normal'); doc.setTextColor(42, 35, 72);
    let fs = 10.5; doc.setFontSize(fs);
    while (fs > 7 && doc.getTextWidth(title) > w) { fs -= 0.5; doc.setFontSize(fs); }
    doc.text(title, x, y);
    y += 4;

    const n = r.cards.length, gap = 2;
    const ch0 = Math.min(30, yMax - y);
    const cw = Math.min(ch0 * 0.583, (w * 0.42 - gap * (n - 1)) / n);
    const ch = cw / 0.583;
    for (let k = 0; k < n; k++) {
      const ci = cardInfo(r.cards[k].num);
      const cx = x + k * (cw + gap);
      try { doc.addImage(await imgDataUrl(ci.img), 'JPEG', cx, y, cw, ch); } catch (e) { /* samo okvir */ }
      doc.setDrawColor(154, 143, 192); doc.setLineWidth(0.2);
      doc.rect(cx, y, cw, ch);
    }

    const tx = x + n * cw + (n - 1) * gap + 3, tw = x + w - tx;
    let ty = y + 3;
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(7.2); doc.setTextColor(60, 50, 100);
    for (const s of r.steps) {
      const lines = doc.splitTextToSize(s.expr + ' = ' + s.val, tw);
      doc.text(lines, tx, ty);
      ty += lines.length * 3.1;
    }
    ty += 2;
    for (const c of r.cards) {
      const ci = cardInfo(c.num);
      doc.setFontSize(7.6); doc.setTextColor(42, 35, 72);
      const lines = doc.splitTextToSize(ci.roman + ' ' + ci.name, tw);
      doc.text(lines, tx, ty);
      ty += lines.length * 3.3;
      if (c.role) {
        doc.setFontSize(6.6); doc.setTextColor(110, 100, 150);
        doc.text(c.role, tx, ty);
        ty += 3.9;
      } else ty += 0.8;
    }
    return Math.max(y + ch, ty);
  }

  /* Radni PDF sinastrije: tri stupca - karta rođenja A, karta rođenja B, karta odnosa. */
  async function drawPdfSynastry(doc, chartA, chartB, nameA, nameB, x, y, w, yMax) {
    if (typeof TAROT_MAJOR_DEFS === 'undefined' || !chartA || !chartB) return y;
    const rA = chartResult(chartA), rB = chartResult(chartB);
    const gap = 6, colW = (w - 2 * gap) / 3;
    await drawPdfSide(doc, rA, x, y, colW, yMax, 'Karta rođenja · ' + nameA);
    await drawPdfSide(doc, rB, x + colW + gap, y, colW, yMax, 'Karta rođenja · ' + nameB);
    await drawPdfSide(doc, computeRelation(rA, rB), x + 2 * (colW + gap), y, colW, yMax, 'Karta odnosa');
  }

  window.BirthCard = { compute, computeRelation, render, renderSynastry, drawPdf, drawPdfSynastry };
})();
