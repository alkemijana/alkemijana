/* ============================================================
   Tarot karta rođenja - samostalan modul (window.BirthCard)
   Iz datuma rođenja natalne karte izračuna kartu (ili par/trojku
   karata) velike arkane po numerološkoj metodi Mary K. Greer.
   Prikaz: kartica ispod PDF gumbi na stranici natalne karte
   (#natal-birthcard) + mali blok u desnom stupcu 1. stranice
   radnog PDF-a (drawPdf, zove ga renderWorkingContent u natal-pdf.js).
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
     Vraća { total, steps:[{expr,val}], cards:[{num, role}] }. */
  function compute(d, mo, y) {
    const total = d + mo + y;
    const steps = [{ expr: d + ' + ' + mo + ' + ' + y, val: total }];
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
    const cards = nums.map((num, i) => ({
      num: num === 22 ? 0 : num,
      role: nums.length === 1 ? 'osobnost i duša'
        : i === 0 ? 'osobnost'
        : i === nums.length - 1 ? 'duša'
        : 'spona'
    }));
    return { total, steps, cards };
  }

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
  function render(chart) {
    const box = document.getElementById('natal-birthcard');
    if (!box) return;
    if (typeof TAROT_MAJOR_DEFS === 'undefined' || !chart || !chart.input) { box.style.display = 'none'; return; }
    const i = chart.input;
    const r = compute(i.d, i.mo, i.y);

    const cardsHtml = r.cards.map(c => {
      const ci = cardInfo(c.num);
      return '<figure class="nt-bc-card">' +
        '<img src="' + esc(ci.img) + '" alt="' + esc(ci.name) + '" loading="lazy" decoding="async">' +
        '<figcaption><span class="nt-bc-num">' + ci.roman + '</span> ' + esc(ci.name) +
        '<span class="nt-bc-role">' + c.role + '</span></figcaption></figure>';
    }).join('');

    const calcHtml = r.steps.map(s => '<div>' + s.expr + ' = <b>' + s.val + '</b></div>').join('');
    const names = r.cards.map(c => cardInfo(c.num).name);
    let result;
    if (r.cards.length === 1) result = 'Osobnost i duša su ista karta: <b>' + esc(names[0]) + '</b>.';
    else if (r.cards.length === 2) result = 'Karta osobnosti je <b>' + esc(names[0]) + '</b>, a karta duše <b>' + esc(names[1]) + '</b>.';
    else result = 'Karta osobnosti je <b>' + esc(names[0]) + '</b>, karta duše <b>' + esc(names[2]) +
      '</b>, a <b>' + esc(names[1]) + '</b> ih povezuje.';

    box.innerHTML =
      '<h4>Tarot karta rođenja</h4>' +
      '<div class="nt-bc-body">' +
        '<div class="nt-bc-cards nt-bc-n' + r.cards.length + '">' + cardsHtml + '</div>' +
        '<div class="nt-bc-text">' +
          '<p>Uz natalnu kartu, datum rođenja daje i kartu (ili par karata) velike arkane - ' +
          'arhetip koji te prati kroz cijeli život. Računa se numerološki, po metodi Mary K. Greer:</p>' +
          '<ol class="nt-bc-steps">' +
            '<li>Zbroje se dan, mjesec i godina rođenja kao cijeli brojevi.</li>' +
            '<li>Znamenke zbroja se zbrajaju dok broj ne bude 22 ili manji - to je <b>karta osobnosti</b> (22 je Luda).</li>' +
            '<li>Ako je broj dvoznamenkast, njegove se znamenke zbroje još jednom - to je <b>karta duše</b>. ' +
            'Jednoznamenkast broj znači da su osobnost i duša ista karta.</li>' +
          '</ol>' +
          '<div class="nt-bc-calc"><span class="nt-bc-calc-lbl">Izračun za ' + i.d + '. ' + i.mo + '. ' + i.y + '.</span>' + calcHtml + '</div>' +
          '<p class="nt-bc-result">' + result + '</p>' +
        '</div>' +
      '</div>';
    box.style.display = '';
  }

  /* ---------- Radni PDF ----------
     Crta blok u stupcu (x, y, širina w), ne ispod yMax. Vraća donji y. */
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

  async function drawPdf(doc, chart, x, y, w, yMax) {
    if (typeof TAROT_MAJOR_DEFS === 'undefined' || !chart || !chart.input) return y;
    const i = chart.input;
    const r = compute(i.d, i.mo, i.y);

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

  window.BirthCard = { compute, render, drawPdf };
})();
