/* ============================================================
   Virtualni tarot — DOM izgradnja, prikaz i animacije
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

/* ---- Mini SVG pregled rasporeda spreada (za izbornik + hover) ---- */
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
   Glavni renderer — jedna instanca po stranici
   ============================================================ */
function createTarotUI(engine, root) {

  let isMobile = window.matchMedia('(max-width: 760px)').matches;

  root.innerHTML = `
    <div class="vtar-root">
      <h1 class="section-title" id="t-tarotPageTitle">Virtualni tarot</h1>
      <p class="section-subtitle" id="t-tarotPageSub">Razmisli o pitanju, izaberi raspored i izvuci karte.</p>

      <div class="vtar-spread-picker" id="vtar-spread-picker" role="listbox" aria-label="Odabir rasporeda"></div>

      <div class="vtar-stage" id="vtar-stage">
        <div class="vtar-toolbar">
          <div class="vtar-toolbar-info">
            <span class="vtar-toolbar-name" id="vtar-toolbar-name"></span>
            <span class="vtar-toolbar-desc" id="vtar-spread-desc"></span>
          </div>
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

        <div class="vtar-layout">
          <div class="vtar-rail vtar-rail-left" id="vtar-rail-decks"></div>
          <div class="vtar-table" id="vtar-table">
            <div class="vtar-slots" id="vtar-slots"></div>
          </div>
          <div class="vtar-rail vtar-rail-right">
            <div class="vtar-discard-zone vtar-discard-empty" id="vtar-discard-zone" title="Otpad — klikni da vratiš odložene karte u špil">
              <div class="vtar-discard-stack" id="vtar-discard-stack"></div>
              <div class="vtar-discard-label">Otpad <span id="vtar-discard-count">0</span></div>
            </div>
          </div>
        </div>

        <p class="vtar-hint" id="vtar-hint">Klikni na špil da izvučeš sljedeću kartu.</p>
        <div class="vtar-legend" id="vtar-legend"></div>
      </div>
    </div>
  `;

  const els = {
    subtitle: root.querySelector('#t-tarotPageSub'),
    spreadPicker: root.querySelector('#vtar-spread-picker'),
    toolbarName: root.querySelector('#vtar-toolbar-name'),
    spreadDesc: root.querySelector('#vtar-spread-desc'),
    stage: root.querySelector('#vtar-stage'),
    railDecks: root.querySelector('#vtar-rail-decks'),
    slots: root.querySelector('#vtar-slots'),
    table: root.querySelector('#vtar-table'),
    legend: root.querySelector('#vtar-legend'),
    discardStack: root.querySelector('#vtar-discard-stack'),
    discardCount: root.querySelector('#vtar-discard-count'),
    discardZone: root.querySelector('#vtar-discard-zone'),
    toggleReversed: root.querySelector('#vtar-toggle-reversed'),
    toggleMeanings: root.querySelector('#vtar-toggle-meanings'),
    btnNewReading: root.querySelector('#vtar-btn-new-reading'),
    btnFs: root.querySelector('#vtar-btn-fs'),
    hint: root.querySelector('#vtar-hint')
  };

  els.toggleReversed.addEventListener('change', () => engine.setAllowReversed(els.toggleReversed.checked));
  els.toggleMeanings.addEventListener('change', () => engine.setShowMeanings(els.toggleMeanings.checked));
  els.btnNewReading.addEventListener('click', () => engine.newSpreadReading());
  els.discardZone.addEventListener('click', () => engine.returnDiscardToDecks());
  els.btnFs.addEventListener('click', toggleFullscreen);

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

  /* ---- Spread picker ---- */
  function renderSpreadPicker() {
    els.spreadPicker.innerHTML = '';
    TAROT_SPREADS.forEach(sp => {
      const btn = trEl('button', 'vtar-spread-chip' + (sp.id === engine.state.spreadId ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', sp.id === engine.state.spreadId ? 'true' : 'false');
      btn.innerHTML = trSpreadPreviewSvg(sp, 30) + `<span>${sp.name}</span>`;
      const preview = trEl('div', 'vtar-spread-hover-preview', `
        <div class="vtar-spread-hover-svg">${trSpreadPreviewSvg(sp, 116)}</div>
        <div class="vtar-spread-hover-text"><strong>${sp.name}</strong><p>${sp.short}</p></div>
      `);
      btn.appendChild(preview);
      btn.addEventListener('click', () => engine.setSpread(sp.id));
      els.spreadPicker.appendChild(btn);
    });
    const sp = engine.currentSpread();
    els.toolbarName.textContent = sp.name;
    els.spreadDesc.textContent = sp.short;
  }

  /* ---- Deck rail ---- */
  function renderDeckRail() {
    els.railDecks.innerHTML = '';
    TAROT_DECKS.forEach(deck => {
      const dState = engine.state.decks[deck.id];
      const wrap = trEl('div', 'vtar-deck-block' + (dState.enabled ? '' : ' vtar-deck-disabled'));

      const head = trEl('div', 'vtar-deck-head');
      head.innerHTML = `
        <label class="vtar-switch vtar-switch-sm">
          <input type="checkbox" ${dState.enabled ? 'checked' : ''} data-deck="${deck.id}" class="vtar-deck-enable">
          <span class="vtar-switch-track"><span class="vtar-switch-thumb"></span></span>
        </label>
        <span class="vtar-deck-name">${deck.shortName}</span>`;
      wrap.appendChild(head);

      const stackWrap = trEl('div', 'vtar-deck-stack-wrap');
      const stack = trEl('div', `vtar-deck-stack ${deck.backClass}`);
      stack.setAttribute('data-deck', deck.id);
      stack.title = `${deck.name} — klikni za izvlačenje karte`;
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
        <button type="button" class="vtar-mini-btn" data-act="shuffle-full" data-deck="${deck.id}" title="Vrati sve karte (i sa stola i iz otpada) u špil i promiješaj">⟲ Promiješaj sve</button>
        <button type="button" class="vtar-mini-btn" data-act="shuffle-remaining" data-deck="${deck.id}" title="Promiješaj samo preostale karte u špilu">⟲ Preostale</button>
        <button type="button" class="vtar-mini-btn" data-act="cut" data-deck="${deck.id}" title="Presijeci špil">✂ Presijeci</button>`;
      wrap.appendChild(actions);

      els.railDecks.appendChild(wrap);
    });

    els.railDecks.querySelectorAll('.vtar-deck-enable').forEach(cb => {
      cb.addEventListener('change', () => engine.setDeckEnabled(cb.dataset.deck, cb.checked));
    });
    els.railDecks.querySelectorAll('.vtar-mini-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const deckId = btn.dataset.deck;
        if (btn.dataset.act === 'shuffle-full') engine.shuffleFull(deckId);
        if (btn.dataset.act === 'shuffle-remaining') engine.shuffleRemaining(deckId);
        if (btn.dataset.act === 'cut') engine.cutDeck(deckId);
        pulseStack(deckId);
      });
    });
  }

  function pulseStack(deckId) {
    const stack = els.railDecks.querySelector(`.vtar-deck-stack[data-deck="${deckId}"]`);
    if (!stack) return;
    stack.classList.remove('vtar-pulse'); void stack.offsetWidth; stack.classList.add('vtar-pulse');
  }
  function updateDeckCounts() {
    TAROT_DECKS.forEach(deck => {
      const stack = els.railDecks.querySelector(`.vtar-deck-stack[data-deck="${deck.id}"]`);
      if (!stack) return;
      const n = engine.state.decks[deck.id].remaining.length;
      const c = stack.querySelector('.vtar-deck-count');
      if (c) c.textContent = n;
      stack.classList.toggle('vtar-deck-empty', n === 0);
    });
  }

  /* ---- Karta (unutrašnji HTML) ---- */
  function cardInnerHtml() {
    return `
      <div class="vtar-card-flip">
        <div class="vtar-card-face vtar-card-back"></div>
        <div class="vtar-card-face vtar-card-front"><div class="vtar-card-front-img"></div></div>
      </div>
      <button type="button" class="vtar-card-discard-btn" title="Odloži u otpad" aria-label="Odloži kartu u otpad">✕</button>`;
  }

  function buildCardEl(entry, slotIdx) {
    const cardEl = trEl('div', 'vtar-card ' + trDeckDef(entry.deckId).backClass);
    cardEl.innerHTML = cardInnerHtml();
    cardEl.querySelector('.vtar-card-front-img').style.backgroundImage =
      `url("${tarotCardImage(entry.deckId, entry.cardId)}")`;
    const def = trCardDef(entry.cardId);
    cardEl.title = def ? def.name + (entry.orientation === 'reversed' ? ' (obrnuto)' : '') : '';
    cardEl.querySelector('.vtar-card-discard-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      engine.discardSlot(slotIdx);
    });
    return cardEl;
  }

  /* ---- Slotovi ---- */
  function renderSlots() {
    isMobile = window.matchMedia('(max-width: 760px)').matches;
    const spread = engine.currentSpread();
    els.slots.innerHTML = '';
    els.table.classList.toggle('vtar-mobile', isMobile);
    els.slots.classList.toggle('vtar-free', !!spread.free);
    els.slots.classList.toggle('vtar-labelside-right', spread.labelSide === 'right' && !isMobile);

    if (spread.free) { renderFreeSlots(); }
    else if (isMobile) { renderMobileSlots(spread); }
    else { renderDesktopSlots(spread); }

    renderLegend(spread);
    updateHint();
  }

  /* Fiksni spread, desktop — grid fit izračun (karte i oznake uvijek unutar stola) */
  function renderDesktopSlots(spread) {
    const L = computeLayout(spread);
    els.slots.style.setProperty('--vtar-cw', L.cw + 'px');
    const showCap = engine.state.showMeanings;

    spread.positions.forEach((pos, idx) => {
      const slot = trEl('div', 'vtar-slot');
      slot.dataset.slot = idx;
      const cx = L.pad + (pos.gx + 0.5) * L.cellW;
      const cy = L.pad + (pos.gy + 0.5) * L.cellH;
      slot.style.left = cx + 'px';
      slot.style.top = cy + 'px';

      const box = trEl('div', 'vtar-cardbox');
      box.innerHTML = `<span class="vtar-slot-num">${idx + 1}</span>`;
      if (pos.rot) box.dataset.rot = pos.rot;
      slot.appendChild(box);

      if (showCap) {
        const cap = trEl('div', 'vtar-caption');
        cap.innerHTML = `<span class="vtar-cap-label">${pos.label}</span>`;
        slot.appendChild(cap);
      }
      els.slots.appendChild(slot);

      const entry = engine.state.table[idx];
      if (entry) placeCardInSlot(idx, entry, false);
    });
  }

  /* Fiksni spread, mobitel — jednostavan vertikalan popis */
  function renderMobileSlots(spread) {
    els.slots.style.removeProperty('--vtar-cw');
    const showCap = engine.state.showMeanings;
    spread.positions.forEach((pos, idx) => {
      const slot = trEl('div', 'vtar-slot');
      slot.dataset.slot = idx;
      const box = trEl('div', 'vtar-cardbox');
      box.innerHTML = `<span class="vtar-slot-num">${idx + 1}</span>`;
      slot.appendChild(box);
      if (showCap) {
        const cap = trEl('div', 'vtar-caption');
        cap.innerHTML = `<span class="vtar-cap-label">${pos.label}</span><span class="vtar-cap-meaning">${pos.meaning}</span>`;
        slot.appendChild(cap);
      }
      els.slots.appendChild(slot);
      const entry = engine.state.table[idx];
      if (entry) placeCardInSlot(idx, entry, false);
    });
  }

  /* Slobodno slaganje — karte teku u redovima, bez zadanih pozicija */
  function renderFreeSlots() {
    els.slots.style.removeProperty('--vtar-cw');
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

  function computeLayout(spread) {
    const rect = els.slots.getBoundingClientRect();
    const W = rect.width, H = rect.height || 480;
    const pad = Math.max(14, Math.min(W, H) * 0.04);
    const cols = spread.cols, rows = spread.rows;
    const cellW = (W - 2 * pad) / cols;
    const cellH = (H - 2 * pad) / rows;
    const sideLabel = spread.labelSide === 'right';
    const capH = (engine.state.showMeanings && !sideLabel) ? Math.min(30, cellH * 0.2) : 0;
    const gapV = 5;

    let ch = cellH - capH - gapV;
    let cw = ch * VTAR_RATIO;
    const maxCw = cellW * (sideLabel ? 0.7 : 0.9);
    if (cw > maxCw) { cw = maxCw; ch = cw / VTAR_RATIO; }
    const capMax = 148;
    if (cw > capMax) { cw = capMax; ch = cw / VTAR_RATIO; }
    cw = Math.max(40, Math.round(cw));
    return { W, H, pad, cols, rows, cellW, cellH, cw, ch, capH };
  }

  function updateHint() {
    if (engine.isFree()) {
      els.hint.textContent = 'Klikni na špil — karte se slažu redom, koliko god želiš.';
    } else if (engine.isSpreadFull()) {
      els.hint.textContent = 'Raspored je pun. Klikni „✦ Novi spread" za novo čitanje.';
    } else {
      els.hint.textContent = 'Klikni na špil da izvučeš sljedeću kartu.';
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
        <span class="vtar-legend-text"><strong>${pos.label}</strong> — ${pos.meaning}</span>`;
      els.legend.appendChild(item);
    });
  }

  /* ---- Postavi kartu u slot ---- */
  function placeCardInSlot(slotIdx, entry, animate, originEl) {
    const slotEl = els.slots.querySelector(`.vtar-slot[data-slot="${slotIdx}"]`);
    if (!slotEl) return;
    const box = slotEl.querySelector('.vtar-cardbox');
    box.classList.add('vtar-filled');
    if (entry.orientation === 'reversed') slotEl.classList.add('vtar-has-reversed');

    // ukloni staru kartu ako postoji
    const old = box.querySelector('.vtar-card'); if (old) old.remove();
    const cardEl = buildCardEl(entry, slotIdx);
    if (box.dataset.rot) cardEl.style.setProperty('--vtar-rot', box.dataset.rot + 'deg');
    box.appendChild(cardEl);

    // oznaka "obrnuto" IZVAN karte (u caption/ispod), ne prekriva sliku
    if (entry.orientation === 'reversed') {
      let cap = slotEl.querySelector('.vtar-caption');
      if (!cap) { cap = trEl('div', 'vtar-caption vtar-caption-revonly'); slotEl.appendChild(cap); }
      if (!cap.querySelector('.vtar-rev')) {
        const rev = trEl('span', 'vtar-rev', '⟲ obrnuto');
        cap.insertBefore(rev, cap.firstChild);
      }
    }

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
    if (!dState.enabled) return;
    if (engine.isSpreadFull()) { flashHint('Raspored je pun — klikni „Novi spread".'); return; }
    if (dState.remaining.length === 0) { flashHint('Špil je prazan — „Promiješaj sve".'); return; }
    const result = engine.drawFromDeck(deckId);
    if (!result) return;
    if (engine.isFree()) {
      // dodaj novi slot ispred duha pa animiraj
      renderSlots();
      placeCardInSlot(result.slot, result.entry, true, stackEl);
    } else {
      placeCardInSlot(result.slot, result.entry, true, stackEl);
    }
    updateDeckCounts();
    updateHint();
  }

  function flashHint(msg) {
    els.hint.textContent = msg;
    els.hint.classList.remove('vtar-hint-flash'); void els.hint.offsetWidth; els.hint.classList.add('vtar-hint-flash');
  }

  /* ---- Puni re-render ---- */
  function renderAll() {
    renderSpreadPicker();
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
      case 'decks': renderDeckRail(); updateDeckCounts(); break;
      case 'deck-shuffle': case 'deck-cut': updateDeckCounts(); break;
      case 'reclaim': renderSlots(); renderDiscard(); updateDeckCounts(); break;
      case 'discard': renderSlots(); renderDiscard(); updateDeckCounts(); break;
      case 'discard-all': case 'new-reading': renderSlots(); renderDiscard(); updateDeckCounts(); break;
      case 'discard-return': renderDiscard(); updateDeckCounts(); break;
      case 'show-meanings': renderSlots(); break;
      default: break;
    }
  });

  /* Relayout na promjenu veličine (debounce) — pozicije su px-bazirane na desktopu */
  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { renderSlots(); }, 140);
  });

  renderAll();
  return { renderAll, renderSlots };
}

window.createTarotUI = createTarotUI;
