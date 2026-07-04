/* ============================================================
   Virtualni tarot - DOM izgradnja, prikaz i animacije
   Sav render ide u kontejner #tarot-app; ništa se ne dira izvan njega.
   ============================================================ */

const VTAR_RATIO = 0.583; // širina/visina standardne tarot karte

function trEl(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}
function trCardDef(cardId) { return TAROT_CARD_DEFS.find(c => c.id === cardId); }
function trDeckDef(deckId) { return TAROT_DECKS.find(d => d.id === deckId); }

/* ---- Mini SVG pregled rasporeda spreada (za izbornik) ---- */
function trSpreadPreviewSvg(spread, size) {
  size = size || 46;
  let rects;
  if (spread.free) {
    rects = [30, 45, 60, 75].map((x, i) =>
      `<rect x="${x - 5}" y="43" width="10" height="14" rx="2" fill="var(--lavender)" opacity="${0.4 + 0.16 * i}"/>`).join('');
  } else {
    const cols = spread.cols, rows = spread.rows;
    rects = spread.positions.map(p => {
      const x = (p.gx + 0.5) / cols * 100, y = (p.gy + 0.5) / rows * 100;
      const rot = p.rot ? ` transform="rotate(${p.rot} ${x} ${y})"` : '';
      return `<rect x="${(x - 5).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="10" height="14" rx="2" fill="var(--lavender)" opacity="0.9"${rot}/>`;
    }).join('');
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${rects}</svg>`;
}

/* ============================================================
   Glavni renderer - jedna instanca po stranici
   ============================================================ */
function createTarotUI(engine, root) {

  let isMobile = window.matchMedia('(max-width: 760px)').matches;

  root.innerHTML = `
    <div class="vtar-root">
      <h1 class="section-title" id="t-tarotPageTitle">Virtualni tarot</h1>
      <p class="section-subtitle" id="t-tarotPageSub">Razmisli o pitanju, izaberi raspored i izvuci karte.</p>

      <div class="vtar-stage" id="vtar-stage">
        <div class="vtar-toolbar">
          <button type="button" class="vtar-spread-toggle" id="vtar-spread-toggle" aria-expanded="false" aria-controls="vtar-spread-panel">
            <span class="vtar-spread-toggle-icon" id="vtar-spread-toggle-icon"></span>
            <span class="vtar-spread-toggle-text">
              <span class="vtar-toolbar-name" id="vtar-toolbar-name"></span>
              <span class="vtar-toolbar-desc" id="vtar-spread-desc"></span>
            </span>
            <span class="vtar-spread-toggle-caret">▾</span>
          </button>
          <div class="vtar-toolbar-controls">
            <label class="vtar-switch">
              <input type="checkbox" id="vtar-toggle-reversed">
              <span class="vtar-switch-track"><span class="vtar-switch-thumb"></span></span>
              <span class="vtar-switch-label">Obrnute</span>
            </label>
            <label class="vtar-switch">
              <input type="checkbox" id="vtar-toggle-meanings" checked>
              <span class="vtar-switch-track"><span class="vtar-switch-thumb"></span></span>
              <span class="vtar-switch-label">Značenja</span>
            </label>
            <button type="button" class="vtar-btn" id="vtar-btn-new-reading">✦ Novi spread</button>
            <button type="button" class="vtar-btn vtar-btn-fs" id="vtar-btn-fs" title="Cijeli zaslon" aria-label="Cijeli zaslon">⛶ Cijeli zaslon</button>
          </div>
        </div>

        <div class="vtar-spread-panel" id="vtar-spread-panel" role="listbox" aria-label="Odabir rasporeda"></div>

        <div class="vtar-deck-switches" id="vtar-deck-switches"></div>

        <div class="vtar-layout">
          <div class="vtar-rail vtar-rail-left" id="vtar-rail-decks"></div>
          <div class="vtar-table" id="vtar-table">
            <div class="vtar-slots" id="vtar-slots"></div>
            <div class="vtar-focus" id="vtar-focus" aria-hidden="true">
              <div class="vtar-focus-inner">
                <div class="vtar-focus-visual">
                  <div class="vtar-focus-card" id="vtar-focus-card"></div>
                  <div class="vtar-focus-name" id="vtar-focus-name"></div>
                </div>
                <div class="vtar-focus-meaning" id="vtar-focus-meaning"></div>
              </div>
            </div>
          </div>
          <div class="vtar-rail vtar-rail-right">
            <div class="vtar-discard-zone vtar-discard-empty" id="vtar-discard-zone" title="Iskorištene karte - klikni da ih vratiš u špil">
              <div class="vtar-discard-stack" id="vtar-discard-stack"></div>
              <div class="vtar-discard-label">Iskorištene karte <span id="vtar-discard-count">0</span></div>
            </div>
          </div>
        </div>

        <p class="vtar-hint" id="vtar-hint">Klikni na špil da izvučeš sljedeću kartu.</p>
        <div class="vtar-legend" id="vtar-legend"></div>

        <div class="vtar-mobile-drawbar" id="vtar-mobile-drawbar"></div>
      </div>
    </div>
  `;

  const els = {
    spreadToggle: root.querySelector('#vtar-spread-toggle'),
    spreadToggleIcon: root.querySelector('#vtar-spread-toggle-icon'),
    spreadPanel: root.querySelector('#vtar-spread-panel'),
    toolbarName: root.querySelector('#vtar-toolbar-name'),
    spreadDesc: root.querySelector('#vtar-spread-desc'),
    stage: root.querySelector('#vtar-stage'),
    deckSwitches: root.querySelector('#vtar-deck-switches'),
    railDecks: root.querySelector('#vtar-rail-decks'),
    slots: root.querySelector('#vtar-slots'),
    table: root.querySelector('#vtar-table'),
    focus: root.querySelector('#vtar-focus'),
    focusCard: root.querySelector('#vtar-focus-card'),
    focusName: root.querySelector('#vtar-focus-name'),
    focusMeaning: root.querySelector('#vtar-focus-meaning'),
    legend: root.querySelector('#vtar-legend'),
    discardStack: root.querySelector('#vtar-discard-stack'),
    discardCount: root.querySelector('#vtar-discard-count'),
    discardZone: root.querySelector('#vtar-discard-zone'),
    toggleReversed: root.querySelector('#vtar-toggle-reversed'),
    toggleMeanings: root.querySelector('#vtar-toggle-meanings'),
    btnNewReading: root.querySelector('#vtar-btn-new-reading'),
    btnFs: root.querySelector('#vtar-btn-fs'),
    hint: root.querySelector('#vtar-hint'),
    mobileBar: root.querySelector('#vtar-mobile-drawbar')
  };

  els.toggleReversed.addEventListener('change', () => engine.setAllowReversed(els.toggleReversed.checked));
  els.toggleMeanings.addEventListener('change', () => engine.setShowMeanings(els.toggleMeanings.checked));
  els.btnNewReading.addEventListener('click', () => engine.newSpreadReading());
  els.discardZone.addEventListener('click', () => engine.returnDiscardToDecks());
  els.btnFs.addEventListener('click', toggleFullscreen);
  els.focus.addEventListener('click', closeFocus);

  /* ---- Fullscreen ---- */
  function toggleFullscreen() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const req = els.stage.requestFullscreen || els.stage.webkitRequestFullscreen;
      if (req) req.call(els.stage);
    }
  }
  function onFsChange() {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    els.stage.classList.toggle('vtar-fs', on);
    els.btnFs.innerHTML = on ? '⛶ Zatvori' : '⛶ Cijeli zaslon';
    requestAnimationFrame(() => { renderSlots(); });
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  /* ---- Spread izbornik - panel koji se PROŠIRI u toku (ne padajući, ne preklapa) ---- */
  function closeSpreadPanel() {
    els.spreadPanel.classList.remove('vtar-open');
    els.spreadToggle.setAttribute('aria-expanded', 'false');
  }
  function toggleSpreadPanel() {
    const open = els.spreadPanel.classList.toggle('vtar-open');
    els.spreadToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  els.spreadToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleSpreadPanel(); });
  document.addEventListener('click', (e) => {
    if (!els.spreadPanel.contains(e.target) && e.target !== els.spreadToggle && !els.spreadToggle.contains(e.target)) {
      closeSpreadPanel();
    }
  });

  function renderSpreadPanel() {
    els.spreadPanel.innerHTML = '';
    TAROT_SPREADS.forEach(sp => {
      const btn = trEl('button', 'vtar-spread-chip' + (sp.id === engine.state.spreadId ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', sp.id === engine.state.spreadId ? 'true' : 'false');
      btn.innerHTML = `<span class="vtar-spread-chip-icon">${trSpreadPreviewSvg(sp, 42)}</span>
        <span class="vtar-spread-chip-text"><strong>${sp.name}</strong><small>${sp.short}</small></span>`;
      btn.addEventListener('click', () => { engine.setSpread(sp.id); closeSpreadPanel(); });
      els.spreadPanel.appendChild(btn);
    });
    const sp = engine.currentSpread();
    els.spreadToggleIcon.innerHTML = trSpreadPreviewSvg(sp, 26);
    els.toolbarName.textContent = sp.name;
    els.spreadDesc.textContent = sp.short;
  }

  /* ---- Deck switch panel (uključi/isključi špil, prikazuje uz stol) ---- */
  function renderDeckSwitches() {
    els.deckSwitches.innerHTML = '<span class="vtar-deck-switches-label">Špilovi</span>';
    TAROT_DECKS.forEach(deck => {
      const item = trEl('label', 'vtar-deck-switch-item' + (deck.comingSoon ? ' vtar-deck-switch-soon' : ''));
      const checked = !deck.comingSoon && engine.state.decks[deck.id].enabled;
      item.innerHTML = `
        <span class="vtar-deck-switch-thumb ${deck.backClass}"></span>
        <span class="vtar-deck-switch-name">${deck.shortName}${deck.comingSoon ? ' <em>uskoro</em>' : ''}</span>
        <span class="vtar-switch vtar-switch-sm">
          <input type="checkbox" ${checked ? 'checked' : ''} ${deck.comingSoon ? 'disabled' : ''} data-deck="${deck.id}">
          <span class="vtar-switch-track"><span class="vtar-switch-thumb"></span></span>
        </span>`;
      if (!deck.comingSoon) {
        item.querySelector('input').addEventListener('change', (e) => engine.setDeckEnabled(deck.id, e.target.checked));
      }
      els.deckSwitches.appendChild(item);
    });
  }

  /* ---- Deck rail (samo uključeni, stvarni špilovi) ---- */
  function renderDeckRail() {
    els.railDecks.innerHTML = '';
    const activeDecks = TAROT_DECKS.filter(d => !d.comingSoon && engine.state.decks[d.id].enabled);

    if (!activeDecks.length) {
      els.railDecks.appendChild(trEl('p', 'vtar-rail-empty', 'Uključi barem jedan špil gore da počneš.'));
    }

    activeDecks.forEach(deck => {
      const dState = engine.state.decks[deck.id];
      const wrap = trEl('div', 'vtar-deck-block');

      const head = trEl('div', 'vtar-deck-head', `<span class="vtar-deck-name">${deck.shortName}</span>`);
      wrap.appendChild(head);

      const stackWrap = trEl('div', 'vtar-deck-stack-wrap');
      const stack = trEl('div', `vtar-deck-stack ${deck.backClass}`);
      stack.setAttribute('data-deck', deck.id);
      stack.title = `${deck.name} - klikni za izvlačenje karte`;
      stack.innerHTML = `
        <div class="vtar-deck-card vtar-deck-card-3"></div>
        <div class="vtar-deck-card vtar-deck-card-2"></div>
        <div class="vtar-deck-card vtar-deck-card-1"></div>
        <div class="vtar-deck-count">${dState.remaining.length}</div>`;
      stack.addEventListener('click', () => handleDrawClick(deck.id, stack));
      stackWrap.appendChild(stack);
      wrap.appendChild(stackWrap);

      const actions = trEl('div', 'vtar-deck-actions');
      actions.innerHTML = `
        <button type="button" class="vtar-mini-btn" data-act="shuffle-full" data-deck="${deck.id}" title="Vrati sve karte (i sa stola i iz iskorištenih) u špil i promiješaj">⟲ Promiješaj sve</button>
        <button type="button" class="vtar-mini-btn" data-act="shuffle-remaining" data-deck="${deck.id}" title="Promiješaj samo preostale karte u špilu">⟲ Promiješaj preostale</button>
        ${engine.isFree() ? `<button type="button" class="vtar-mini-btn vtar-mini-btn-accent" data-act="draw-all" data-deck="${deck.id}" title="Izvuci sve preostale karte iz ovog špila na stol, po redu">▤ Izvuci sve</button>` : ''}`;
      wrap.appendChild(actions);

      els.railDecks.appendChild(wrap);
    });

    els.railDecks.querySelectorAll('.vtar-mini-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const deckId = btn.dataset.deck;
        if (btn.dataset.act === 'shuffle-full') { engine.shuffleFull(deckId); pulseStack(deckId); }
        if (btn.dataset.act === 'shuffle-remaining') { engine.shuffleRemaining(deckId); pulseStack(deckId); }
        if (btn.dataset.act === 'draw-all') {
          const stack = els.railDecks.querySelector(`.vtar-deck-stack[data-deck="${deckId}"]`);
          handleDrawAllClick(deckId, stack);
        }
      });
    });

    renderMobileDrawbar(activeDecks);
  }

  /* Mobilna fiksna traka na dnu: po uključenom špilu gumb za izvlačenje +
     mali ⟲ (promiješaj sve), pa gumb iskorištenih karata (vraća ih u špil)
     i ✦ novi spread - na mobitelu zamjenjuje bočne trake (skrivene CSS-om). */
  function renderMobileDrawbar(activeDecks) {
    els.mobileBar.innerHTML = '';
    activeDecks.forEach(deck => {
      const dState = engine.state.decks[deck.id];
      const group = trEl('div', 'vtar-drawbar-group');
      const btn = trEl('button', `vtar-drawbar-btn ${deck.backClass}`);
      btn.type = 'button';
      btn.dataset.deck = deck.id;
      btn.innerHTML = `<span class="vtar-drawbar-swatch"></span><span class="vtar-drawbar-name">${deck.shortName}</span><span class="vtar-drawbar-count">${dState.remaining.length}</span>`;
      btn.addEventListener('click', () => handleDrawClick(deck.id, btn));
      const sh = trEl('button', 'vtar-drawbar-shuffle');
      sh.type = 'button';
      sh.title = 'Vrati sve karte u špil i promiješaj';
      sh.setAttribute('aria-label', `Promiješaj špil ${deck.shortName}`);
      sh.textContent = '⟲';
      sh.addEventListener('click', () => engine.shuffleFull(deck.id));
      group.appendChild(btn);
      group.appendChild(sh);
      els.mobileBar.appendChild(group);
    });
    if (activeDecks.length) {
      const used = trEl('button', 'vtar-drawbar-used');
      used.type = 'button';
      used.title = 'Iskorištene karte - klikni da ih vratiš u špil';
      used.setAttribute('aria-label', 'Iskorištene karte - vrati ih u špil');
      used.innerHTML = `<span class="vtar-drawbar-icon">▤</span><span class="vtar-drawbar-count" id="vtar-drawbar-used-count">${engine.state.discard.length}</span>`;
      used.addEventListener('click', () => engine.returnDiscardToDecks());
      els.mobileBar.appendChild(used);
      const nw = trEl('button', 'vtar-drawbar-new');
      nw.type = 'button';
      nw.title = 'Novi spread';
      nw.setAttribute('aria-label', 'Novi spread');
      nw.textContent = '✦';
      nw.addEventListener('click', () => engine.newSpreadReading());
      els.mobileBar.appendChild(nw);
    }
  }

  function pulseStack(deckId) {
    const stack = els.railDecks.querySelector(`.vtar-deck-stack[data-deck="${deckId}"]`);
    if (!stack) return;
    stack.classList.remove('vtar-pulse'); void stack.offsetWidth; stack.classList.add('vtar-pulse');
  }
  function updateDeckCounts() {
    TAROT_DECKS.forEach(deck => {
      if (deck.comingSoon) return;
      const n = engine.state.decks[deck.id].remaining.length;
      const stack = els.railDecks.querySelector(`.vtar-deck-stack[data-deck="${deck.id}"]`);
      if (stack) {
        const c = stack.querySelector('.vtar-deck-count');
        if (c) c.textContent = n;
        stack.classList.toggle('vtar-deck-empty', n === 0);
      }
      const barBtn = els.mobileBar.querySelector(`.vtar-drawbar-btn[data-deck="${deck.id}"] .vtar-drawbar-count`);
      if (barBtn) barBtn.textContent = n;
    });
  }

  /* ---- Karta (unutrašnji HTML) ---- */
  function cardInnerHtml() {
    return `
      <div class="vtar-card-flip">
        <div class="vtar-card-face vtar-card-back"></div>
        <div class="vtar-card-face vtar-card-front"><div class="vtar-card-front-img"></div></div>
      </div>
      <button type="button" class="vtar-card-discard-btn" title="Odloži u iskorištene karte" aria-label="Odloži kartu u iskorištene">✕</button>`;
  }

  function buildCardEl(entry, slotIdx) {
    const cardEl = trEl('div', 'vtar-card ' + trDeckDef(entry.deckId).backClass);
    cardEl.innerHTML = cardInnerHtml();
    cardEl.querySelector('.vtar-card-front-img').style.backgroundImage =
      `url("${tarotCardImage(entry.deckId, entry.cardId)}")`;
    const def = trCardDef(entry.cardId);
    cardEl.title = def ? def.name + (entry.orientation === 'reversed' ? ' (obrnuto)' : '') : '';
    if (entry.orientation === 'reversed') cardEl.classList.add('vtar-reversed');
    cardEl.querySelector('.vtar-card-discard-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      engine.discardSlot(slotIdx);
    });
    // Klik na kartu → uveličaj i centriraj preko cijelog stola
    cardEl.addEventListener('click', (e) => {
      if (e.target.closest('.vtar-card-discard-btn')) return;
      openFocus(entry);
    });
    return cardEl;
  }

  /* Badge s brojem redoslijeda - pokraj karte (gornji lijevi kut) */
  function orderBadge(n) { return trEl('span', 'vtar-badge vtar-badge-order', n); }
  /* Glif za obrnutu kartu - crven, pokraj karte (donji lijevi kut) */
  function reversedBadge() {
    const b = trEl('span', 'vtar-badge vtar-badge-rev', '⟲');
    b.title = 'Obrnuto';
    return b;
  }

  /* ---- Fokus (klik na kartu → centrirano uvećanje preko stola) ----
     Uvijek se prikazuju OBA značenja (uspravno i obrnuto); ono koje odgovara
     orijentaciji izvučene karte je uokvireno (vtar-focus-m-active). Uz to se
     prikazuje i DA/NE/MOŽDA odgovor karte (text.yesno) ako je upisan u adminu. */
  function openFocus(entry) {
    const def = trCardDef(entry.cardId);
    const reversed = entry.orientation === 'reversed';
    const text = (typeof TAROT_CARD_TEXTS !== 'undefined' && TAROT_CARD_TEXTS[entry.deckId] && TAROT_CARD_TEXTS[entry.deckId][entry.cardId]) || null;
    const name = (text && text.name) || (def ? def.name : '');
    const upright = (text && text.upright) || '';
    const revText = (text && text.reversed) || '';
    const yesno = (text && text.yesno) || '';

    els.focusCard.style.backgroundImage = `url("${tarotCardImage(entry.deckId, entry.cardId)}")`;
    els.focusCard.classList.toggle('vtar-focus-reversed', reversed);
    els.focusName.textContent = name + (reversed ? ' · obrnuto' : '');

    let html = '';
    if (yesno) {
      const cls = yesno === 'DA' ? 'vtar-yn-da' : (yesno === 'NE' ? 'vtar-yn-ne' : 'vtar-yn-mozda');
      html += `<div class="vtar-focus-yesno"><span class="vtar-focus-yesno-label">Odgovor karte</span><span class="vtar-yn-chip ${cls}">${yesno}</span></div>`;
    }
    if (upright) {
      html += `<div class="vtar-focus-m${!reversed ? ' vtar-focus-m-active' : ''}">
        <span class="vtar-focus-meaning-label">Uspravno${!reversed ? ' · izvučeno' : ''}</span><p>${upright}</p></div>`;
    }
    if (revText) {
      html += `<div class="vtar-focus-m${reversed ? ' vtar-focus-m-active' : ''}">
        <span class="vtar-focus-meaning-label">Obrnuto${reversed ? ' · izvučeno' : ''}</span><p>${revText}</p></div>`;
    }
    els.focusMeaning.innerHTML = html;
    els.focus.classList.toggle('vtar-focus-no-meaning', !html);
    els.focus.classList.add('vtar-focus-visible');
    els.focus.setAttribute('aria-hidden', 'false');
  }
  function closeFocus() {
    els.focus.classList.remove('vtar-focus-visible');
    els.focus.setAttribute('aria-hidden', 'true');
  }

  /* ---- Slotovi ---- */
  function renderSlots() {
    isMobile = window.matchMedia('(max-width: 760px)').matches;
    closeFocus();
    const spread = engine.currentSpread();
    els.slots.innerHTML = '';
    els.table.classList.toggle('vtar-mobile', isMobile);
    els.table.classList.toggle('vtar-table-scroll', !!spread.free);
    els.slots.classList.toggle('vtar-free', !!spread.free);
    els.slots.classList.toggle('vtar-show-cap', engine.state.showMeanings && !spread.free);

    if (spread.free) { renderFreeSlots(); }
    else { renderFixedSlots(spread); }

    renderLegend(spread);
    updateHint();
  }

  /* Oznaka ispod karte: SAMO kratki naziv pozicije (jedan red) - puni opis
     značenja pozicije je u legendi ispod stola. Tako oznake nikad ne mogu
     prerasti rezervirani prostor i preklopiti se s kartama u redu ispod,
     a karte dobivaju maksimalnu veličinu. */
  function captionEl(pos) {
    const cap = trEl('div', 'vtar-caption');
    cap.innerHTML = `<span class="vtar-cap-label">${pos.label}</span>`;
    cap.title = `${pos.label} - ${pos.meaning}`;
    return cap;
  }

  /* Fiksni spread (desktop I mobitel) - bounding-box fit izračun; na mobitelu
     se čuva PRAVA geometrija spreada (iste pozicije kao na desktopu), samo se
     visina stola izvodi iz širine ekrana (v. computeLayout). */
  function renderFixedSlots(spread) {
    const showCap = engine.state.showMeanings;
    const L = computeLayout(spread, showCap);
    els.slots.style.setProperty('--vtar-cw', L.cw + 'px');
    els.slots.style.setProperty('--vtar-cellw', Math.round(L.cellW) + 'px');

    spread.positions.forEach((pos, idx) => {
      const slot = trEl('div', 'vtar-slot');
      slot.dataset.slot = idx;
      const cx = L.pad + (pos.gx - L.minGx + 0.5) * L.cellW;
      const cy = L.pad + (pos.gy - L.minGy + 0.5) * L.cellH;
      slot.style.left = cx + 'px';
      slot.style.top = cy + 'px';

      const box = trEl('div', 'vtar-cardbox');
      box.innerHTML = `<span class="vtar-slot-num">${idx + 1}</span>`;
      if (pos.rot) { box.style.transform = `rotate(${pos.rot}deg)`; box.style.setProperty('--vtar-box-rot', pos.rot + 'deg'); }
      slot.appendChild(box);
      // preskoči oznaku ispod karte koja križa (isto središte kao karta 1) - ostaje u legendi
      if (L.showCap && !pos.rot) slot.appendChild(captionEl(pos));
      els.slots.appendChild(slot);

      const entry = engine.state.table[idx];
      if (entry) placeCardInSlot(idx, entry, false);
    });
  }

  /* Slobodno slaganje - karte teku u redovima, bez zadanih pozicija, stol scrolla */
  function renderFreeSlots() {
    els.slots.style.removeProperty('--vtar-cw');
    els.slots.style.removeProperty('--vtar-cellw');
    els.slots.style.height = '';
    engine.state.table.forEach((entry, idx) => {
      const slot = trEl('div', 'vtar-slot vtar-slot-flow');
      slot.dataset.slot = idx;
      const box = trEl('div', 'vtar-cardbox');
      box.innerHTML = `<span class="vtar-slot-num">${idx + 1}</span>`;
      slot.appendChild(box);
      els.slots.appendChild(slot);
      placeCardInSlot(idx, entry, false);
    });
    // duh-placeholder za sljedeću kartu
    const ghost = trEl('div', 'vtar-slot vtar-slot-flow vtar-slot-ghost');
    ghost.innerHTML = `<div class="vtar-cardbox"><span class="vtar-slot-num">+</span></div>`;
    els.slots.appendChild(ghost);
  }

  /* Bounding-box layout: karte se skaliraju na stvarni "otisak" pozicija
     spreada (ne na deklarirani cols/rows), pa su uvijek maksimalno velike
     bez preklapanja i uvijek unutar stola. Kad su značenja uključena,
     rezervira se prostor za oznaku ispod karte.
     - DESKTOP: visina stola je zadana (CSS min-height), karte se uklapaju u nju.
     - MOBITEL: obrnuto - iz širine ekrana se izračuna veličina karata, a VISINA
       stola se postavi inline (els.slots.style.height) da geometrija spreada
       ostane identična desktopu; stranica normalno scrolla. Oznake ispod karata
       prikazuju se samo ako je ćelija dovoljno široka (inače ostaju u legendi). */
  function computeLayout(spread, showCap) {
    const rect = els.slots.getBoundingClientRect();
    const W = rect.width;
    const gxs = spread.positions.map(p => p.gx), gys = spread.positions.map(p => p.gy);
    const minGx = Math.min(...gxs), maxGx = Math.max(...gxs);
    const minGy = Math.min(...gys), maxGy = Math.max(...gys);
    const effCols = (maxGx - minGx) + 1;
    const effRows = (maxGy - minGy) + 1;
    const gapV = 4;

    if (isMobile) {
      const pad = 10;
      const cellW = (W - 2 * pad) / effCols;
      let cw = Math.min(cellW * 0.94, 118);
      cw = Math.max(44, Math.round(cw));
      const ch = cw / VTAR_RATIO;
      const capOn = showCap && cellW >= 88; // premala ćelija = oznaka nečitljiva
      const capH = capOn ? 18 : 0;
      const cellH = ch + capH + gapV + 10;
      const H = Math.round(effRows * cellH + 2 * pad);
      els.slots.style.height = H + 'px';
      return { W, H, pad, minGx, minGy, effCols, effRows, cellW, cellH, cw, showCap: capOn };
    }

    els.slots.style.height = '';
    const H = rect.height || 480;
    const pad = Math.max(16, Math.min(W, H) * 0.045);
    const cellW = (W - 2 * pad) / effCols;
    const cellH = (H - 2 * pad) / effRows;

    const capH = showCap ? 20 : 0; // jedan red naziva pozicije ispod karte
    let ch = cellH - capH - gapV;
    let cw = ch * VTAR_RATIO;
    const maxCw = cellW * 0.92;
    if (cw > maxCw) { cw = maxCw; ch = cw / VTAR_RATIO; }
    const capMax = 300;
    if (cw > capMax) { cw = capMax; ch = cw / VTAR_RATIO; }
    cw = Math.max(44, Math.round(cw));
    return { W, H, pad, minGx, minGy, effCols, effRows, cellW, cellH, cw, showCap };
  }

  function updateHint() {
    if (engine.isFree()) {
      els.hint.textContent = 'Klikni na špil - karte se slažu redom, koliko god želiš. Klik na kartu ju poveća.';
    } else if (engine.isSpreadFull()) {
      els.hint.textContent = 'Raspored je pun. Klik na kartu ju poveća; „✦ Novi spread" za novo čitanje.';
    } else {
      els.hint.textContent = 'Klikni na špil da izvučeš kartu. Klik na izvučenu kartu ju poveća.';
    }
  }

  /* ---- Legenda (značenja pozicija) ---- */
  function renderLegend(spread) {
    els.legend.innerHTML = '';
    if (spread.free || !engine.state.showMeanings) { els.legend.style.display = 'none'; return; }
    els.legend.style.display = '';
    spread.positions.forEach((pos, idx) => {
      const item = trEl('div', 'vtar-legend-item');
      item.innerHTML = `<span class="vtar-legend-num">${idx + 1}</span>
        <span class="vtar-legend-text"><strong>${pos.label}</strong> - ${pos.meaning}</span>`;
      els.legend.appendChild(item);
    });
  }

  /* ---- Postavi kartu u slot ---- */
  function placeCardInSlot(slotIdx, entry, animate, originEl) {
    const slotEl = els.slots.querySelector(`.vtar-slot[data-slot="${slotIdx}"]`);
    if (!slotEl) return;
    const box = slotEl.querySelector('.vtar-cardbox');
    box.classList.add('vtar-filled');

    // ukloni staru kartu/oznake ako postoje
    box.querySelectorAll('.vtar-card, .vtar-badge').forEach(e => e.remove());

    const cardEl = buildCardEl(entry, slotIdx);
    box.appendChild(cardEl);
    // broj redoslijeda se prikazuje TEK kad je karta postavljena
    box.appendChild(orderBadge(slotIdx + 1));
    if (entry.orientation === 'reversed') box.appendChild(reversedBadge());

    if (animate && originEl) flyAndFlip(cardEl, originEl);
    else cardEl.querySelector('.vtar-card-flip').classList.add('vtar-revealed');
  }

  /* Karta poleti sa špila do slota (WAAPI, blaga krivulja), pa se okrene licem gore */
  function flyAndFlip(cardEl, originEl) {
    const t = cardEl.getBoundingClientRect();
    const o = originEl.getBoundingClientRect();
    const dx = (o.left + o.width / 2) - (t.left + t.width / 2);
    const dy = (o.top + o.height / 2) - (t.top + t.height / 2);
    const s = Math.max(0.32, Math.min(1, o.width / t.width));
    const rot = (Math.random() * 12 - 6);
    const flip = cardEl.querySelector('.vtar-card-flip');
    cardEl.style.zIndex = '600';

    let done = false;
    const reveal = () => { if (done) return; done = true; cardEl.style.zIndex = ''; flip.classList.add('vtar-revealed'); };

    if (cardEl.animate) {
      const anim = cardEl.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${s.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`, offset: 0 },
        { transform: `translate(${(dx * 0.32).toFixed(1)}px, ${(dy * 0.32 - 20).toFixed(1)}px) scale(${((s + 1) / 2).toFixed(3)}) rotate(${(rot * 0.4).toFixed(1)}deg)`, offset: 0.55 },
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', offset: 1 }
      ], { duration: 560, easing: 'cubic-bezier(.22,.68,.28,1.02)', fill: 'none' });
      anim.onfinish = reveal;
      setTimeout(reveal, 900);
    } else {
      reveal();
    }
  }

  /* ---- Otpad ---- */
  function renderDiscard() {
    const n = engine.state.discard.length;
    els.discardCount.textContent = n;
    const barUsed = els.mobileBar.querySelector('#vtar-drawbar-used-count');
    if (barUsed) barUsed.textContent = n;
    els.discardStack.innerHTML = '';
    engine.state.discard.slice(-3).forEach((entry, i) => {
      const c = trEl('div', 'vtar-discard-card ' + trDeckDef(entry.deckId).backClass);
      c.style.setProperty('--i', i);
      els.discardStack.appendChild(c);
    });
    els.discardZone.classList.toggle('vtar-discard-empty', n === 0);
  }

  /* ---- Izvlačenje ---- */
  function handleDrawClick(deckId, stackEl) {
    const dState = engine.state.decks[deckId];
    if (!dState || !dState.enabled) return;
    if (engine.isSpreadFull()) { flashHint('Raspored je pun - klikni „Novi spread".'); return; }
    if (dState.remaining.length === 0) { flashHint('Špil je prazan - „Promiješaj sve".'); return; }
    const result = engine.drawFromDeck(deckId);
    if (!result) return;
    if (engine.isFree()) {
      // dodaj novi slot ispred duha pa animiraj
      renderSlots();
      placeCardInSlot(result.slot, result.entry, true, stackEl);
      scrollTableToBottom();
    } else {
      placeCardInSlot(result.slot, result.entry, true, stackEl);
    }
    updateDeckCounts();
    updateHint();
  }

  /* Slobodno slaganje: "Izvuci sve" - izlista sve preostale karte iz špila na
     stol, po redu, s malim razmakom između svake (kaskadna animacija), i stol
     automatski scrolla prema dolje da se uvijek vidi gdje se karte slažu. */
  function handleDrawAllClick(deckId, stackEl) {
    const dState = engine.state.decks[deckId];
    if (!dState || !dState.enabled || !engine.isFree()) return;
    // karte izlaze kanonskim redom: velika arkana 0-21, pa štapovi, pehari,
    // mačevi, pentakli (As, 2-10, Paž, Vitez, Kraljica, Kralj)
    engine.sortRemaining(deckId);
    const step = () => {
      if (dState.remaining.length === 0) return;
      const result = engine.drawFromDeck(deckId);
      if (!result) return;
      renderSlots();
      placeCardInSlot(result.slot, result.entry, true, stackEl);
      updateDeckCounts();
      updateHint();
      scrollTableToBottom();
      setTimeout(step, 90);
    };
    step();
  }

  function scrollTableToBottom() {
    requestAnimationFrame(() => {
      els.table.scrollTo({ top: els.table.scrollHeight, behavior: 'smooth' });
    });
  }

  function flashHint(msg) {
    els.hint.textContent = msg;
    els.hint.classList.remove('vtar-hint-flash'); void els.hint.offsetWidth; els.hint.classList.add('vtar-hint-flash');
  }

  /* ---- Puni re-render ---- */
  function renderAll() {
    renderSpreadPanel();
    renderDeckSwitches();
    renderDeckRail();
    renderSlots();
    renderDiscard();
    updateDeckCounts();
    els.toggleReversed.checked = engine.state.allowReversed;
    els.toggleMeanings.checked = engine.state.showMeanings;
  }

  engine.onChange((evt) => {
    switch (evt.type) {
      case 'spread': renderAll(); break;
      case 'decks': renderDeckSwitches(); renderDeckRail(); updateDeckCounts(); break;
      case 'deck-shuffle': updateDeckCounts(); break;
      case 'reclaim': renderSlots(); renderDiscard(); updateDeckCounts(); break;
      case 'discard': renderSlots(); renderDiscard(); updateDeckCounts(); break;
      case 'discard-all': case 'new-reading': renderSlots(); renderDiscard(); updateDeckCounts(); break;
      case 'discard-return': renderDiscard(); updateDeckCounts(); break;
      case 'show-meanings': renderSlots(); break;
      default: break;
    }
  });

  /* Relayout na promjenu veličine stola - ResizeObserver hvata i promjenu
     zooma stranice i ulaz/izlaz iz fullscreena, ne samo promjenu prozora. */
  let rt = null;
  const scheduleRelayout = () => { clearTimeout(rt); rt = setTimeout(() => { renderSlots(); }, 120); };
  if (window.ResizeObserver) {
    new ResizeObserver(scheduleRelayout).observe(els.table);
  } else {
    window.addEventListener('resize', scheduleRelayout);
  }

  renderAll();
  return { renderAll, renderSlots };
}

window.createTarotUI = createTarotUI;
