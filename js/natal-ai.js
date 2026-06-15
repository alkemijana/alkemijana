/* ============================================================================
   AI UVIDI ZA ČITANJE NATALNE KARTE — Janin radni alat (klijent, samostalan modul)
   ----------------------------------------------------------------------------
   - Prikazuje se SAMO kad je Jana ulogirana (sessionStorage aj_pass).
   - Umjesto teksta na ekranu → generira PDF s uvidima (dva gumba):
       1) zaseban PDF s uvidima           → downloadInsights(text)
       2) radni PDF (karta+tablice)+uvidi  → downloadWorkingWithInsights(text)  (oba u natal-pdf.js)
   - Uvide dohvaća s /interpret-natal (šalje X-Admin-Pass; server je admin-only, bez limita).
   - Serijalizira kartu BEZ imena i ikakvih osobnih podataka; PDF (Janin dokument) smije
     sadržavati ime/podatke rođenja koje je upisala.
   Ovisi o globalnim helperima iz natal-data.js / natal-calc.js / natal-pdf.js.
   ========================================================================== */
(function () {
  'use strict';

  let chart = null;
  let insightsText = null;   // zadnji dohvaćeni uvidi
  let insightsHash = null;   // za koju kartu (hash) vrijede

  // natal.js pri izradi karte poziva window.AInatal.setChart(chart)
  window.AInatal = {
    setChart(c) { chart = c; insightsText = null; insightsHash = null; resetStatus(); updateVisibility(); }
  };

  function isAdmin() { return !!sessionStorage.getItem('aj_pass'); }

  function updateVisibility() {
    const card = document.getElementById('natal-ai-card');
    if (card) card.style.display = (chart && isAdmin()) ? '' : 'none';
  }

  function status(msg, kind) {
    const el = document.getElementById('natal-ai-status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'nt-ai-status' + (kind ? ' nt-ai-' + kind : '');
    el.style.display = msg ? 'block' : 'none';
  }
  function resetStatus() { status('', null); }

  /* Opis karte za AI — BEZ imena i bez ikakvih osobnih podataka. */
  function serializeChartForAI(c) {
    const L = [];
    L.push(c.noTime
      ? 'Karta je izrađena BEZ vremena rođenja — nema kuća, Ascendenta ni MC-a; Mjesec je približan.'
      : 'Karta uključuje vrijeme rođenja (kuće po Placidusu, Ascendent i MC).');

    L.push('\nPOZICIJE PLANETA (planet — znak, stupanj' + (c.noTime ? '' : ', kuća') + '):');
    for (const p of c.planets) {
      let line = '- ' + p.name + ': ' + signName(p.lon) + ' ' + fmtDegMin(p.lon);
      if (!c.noTime && p.house) line += ', ' + p.house + '. kuća';
      if (p.retro) line += ' (retrogradno)';
      L.push(line);
    }

    if (!c.noTime) {
      L.push('\nOSI:');
      L.push('- Ascendent (ASC): ' + signName(c.asc) + ' ' + fmtDegMin(c.asc));
      L.push('- Medium Coeli (MC): ' + signName(c.mc) + ' ' + fmtDegMin(c.mc));
    }

    const nameOf = {};
    for (const p of c.planets) nameOf[p.id] = p.name;
    nameOf.asc = 'Ascendent'; nameOf.mc = 'MC';
    if (c.aspects && c.aspects.length) {
      L.push('\nASPEKTI:');
      for (const a of c.aspects) {
        L.push('- ' + (nameOf[a.a] || a.a) + ' ' + a.aspectName + ' ' + (nameOf[a.b] || a.b) +
          ' (orb ' + a.orb.toFixed(1) + '°)');
      }
    }

    try {
      const dom = computeDominants(c);
      const els = ['Vatra', 'Zemlja', 'Zrak', 'Voda'];
      const quals = ['Kardinalno', 'Fiksno', 'Promjenjivo'];
      L.push('\nDOMINANTE:');
      L.push('- Elementi: ' + els.map((e, i) => e + ' ' + dom.elements[i] + '%').join(', '));
      L.push('- Kvalitete: ' + quals.map((q, i) => q + ' ' + dom.qualities[i] + '%').join(', '));
      if (dom.aspectCounts && dom.aspectCounts.length) {
        L.push('- Najaspektiraniji: ' + dom.aspectCounts.slice(0, 4).map(x => x.name + ' (' + x.count + ')').join(', '));
      }
      const sh = detectShape(c);
      if (sh) L.push('- Oblik karte: ' + sh.name);
    } catch (e) { /* dominante nisu nužne */ }

    return L.join('\n');
  }

  /* Hash unosa (BEZ imena) — isti kao brojač karata; omogućuje cache na serveru. */
  async function chartHash(c) {
    const i = c.input;
    const norm = [
      i.y, i.mo, i.d,
      c.noTime ? 'NT' : (i.h + ':' + i.mi),
      (typeof i.lat === 'number' ? i.lat.toFixed(4) : ''),
      (typeof i.lon === 'number' ? i.lon.toFixed(4) : ''),
      i.nodeType || ''
    ].join('|');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* Dohvati uvide (iz memorije ako su za istu kartu, inače sa servera). */
  async function ensureInsights(fresh) {
    const h = await chartHash(chart);
    if (!fresh && insightsText && insightsHash === h) return insightsText;

    const headers = { 'Content-Type': 'application/json' };
    const pass = sessionStorage.getItem('aj_pass');
    if (pass) headers['X-Admin-Pass'] = pass;

    const r = await fetch('/interpret-natal', {
      method: 'POST', headers,
      body: JSON.stringify({ h, summary: serializeChartForAI(chart), fresh: !!fresh })
    });
    const data = await r.json().catch(() => ({}));
    if (!(data && data.ok && data.text)) {
      throw new Error((data && data.note) || 'AI uvidi trenutno nisu dostupni. Pokušaj ponovno kasnije.');
    }
    insightsText = data.text; insightsHash = h;
    return insightsText;
  }

  async function generate(which, btn) {
    if (!chart) return;
    const fresh = !!(document.getElementById('natal-ai-fresh') && document.getElementById('natal-ai-fresh').checked);
    const btns = [document.getElementById('natal-ai-pdf-btn'), document.getElementById('natal-ai-working-btn')];
    const orig = btn.textContent;
    btns.forEach(b => b && (b.disabled = true));
    status('Generiram uvide… (može potrajati nekoliko sekundi)', 'loading');
    try {
      btn.textContent = 'Generiram…';
      const text = await ensureInsights(fresh);
      btn.textContent = 'Pripremam PDF…';
      if (which === 'working') await downloadWorkingWithInsights(text);
      else await downloadInsights(text);
      status('PDF je spreman — provjeri preuzimanja.', 'ok');
    } catch (e) {
      status(e.message || 'Greška pri izradi PDF-a.', 'error');
    } finally {
      btns.forEach(b => b && (b.disabled = false));
      btn.textContent = orig;
    }
  }

  window.addEventListener('load', () => {
    const pdfBtn = document.getElementById('natal-ai-pdf-btn');
    const workBtn = document.getElementById('natal-ai-working-btn');
    if (pdfBtn) pdfBtn.addEventListener('click', () => generate('standalone', pdfBtn));
    if (workBtn) workBtn.addEventListener('click', () => generate('working', workBtn));
    updateVisibility();
  });
})();
