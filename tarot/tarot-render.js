/* ============================================================
   Virtualni tarot — DOM izgradnja, prikaz i animacije
   Sav render ide u kontejner #tarot-app; ništa se ne dira izvan njega.
   ============================================================ */

function trEl(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}

function trCardDef(cardId) {
  return TAROT_CARD_DEFS.find(c => c.id === cardId);
}

function trDeckDef(deckId) {
  return TAROT_DECKS.find(d => d.id === deckId);
}

/* ---- Mini SVG pregled rasporeda spreada (za hover-preview i grid ikonu) ---- */
function trSpreadPreviewSvg(spread, size) {
  size = size || 46;
  const dots = spread.positions.map(p => {
    const rot = p.rot ? ` transform="rotate(${p.rot} ${p.x} ${p.y})"` : '';
    return `<rect x="${p.x - 5}" y="${p.y - 7}" width="10" height="14" rx="2" fill="var(--lavender)" opacity="0.85"${rot}/>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${dots}</svg>`;
}

/* ============================================================
   Glavni renderer — jedna instanca po stranici
   ============================================================ */
function createTarotUI(engine, root) {

  let isMobile = window.matchMedia('(max-width: 760px)').matches;
  window.addEventListener('resize', () => {
    const now = window.matchMedia('(max-width: 760px)').matches;
    if (now !== isMobile) { isMobile = now; renderAll(); }
  });

  root.innerHTML = `
    <div class="vtar-root">
      <h1 class="section-title" id="t-tarotPageTitle">Virtualni tarot</h1>
      <p class="section-subtitle" id="t-tarotPageSub">Razmisli o pitanju, izaberi raspored i izvuci karte — bez tumačenja, čisto za tvoju vlastitu intuiciju.</p>

      <div class="vtar-toprow">
        <div class="vtar-spread-picker" id="vtar-spread-picker" role="listbox" aria-label="Odabir spreada"></div>
        <div class="vtar-global-toggles">
          <label class="vtar-switch">
            <input type="checkbox" id="vtar-toggle-reversed">
            <span class="vtar-switch-track"><span class="vtar-switch-thumb"></span></span>
            <span class="vtar-switch-label">Uspravne i obrnute</span>
          </label>
          <label class="vtar-switch">
            <input type="checkbox" id="vtar-toggle-meanings" checked>
            <span class="vtar-switch-track"><span class="vtar-switch-thumb"></span></span>
            <span class="vtar-switch-label">Značenja pozicija</span>
          </label>
          <button type="button" class="vtar-btn vtar-btn-reset" id="vtar-btn-new-reading">✦ Novi spread</button>
        </div>
      </div>

      <p class="vtar-spread-desc" id="vtar-spread-desc"></p>

      <div class="vtar-layout">
        <div class="vtar-rail vtar-rail-left" id="vtar-rail-decks"></div>
        <div class="vtar-table" id="vtar-table">
          <div class="vtar-slots" id="vtar-slots"></div>
        </div>
        <div class="vtar-rail vtar-rail-right">
          <div class="vtar-discard-zone" id="vtar-discard-zone" title="Otpad — klikni izvučenu kartu da je odložiš ovdje">
            <div class="vtar-discard-stack" id="vtar-discard-stack"></div>
            <div class="vtar-discard-label">Otpad <span id="vtar-discard-count">0</span></div>
          </div>
        </div>
      </div>

      <p class="vtar-hint" id="vtar-hint">Klikni na špil da izvučeš sljedeću kartu.</p>
    </div>
  `;

  const els = {
    spreadPicker: root.querySelector('#vtar-spread-picker'),
    spreadDesc: root.querySelector('#vtar-spread-desc'),
    railDecks: root.querySelector('#vtar-rail-decks'),
    slots: root.querySelector('#vtar-slots'),
    table: root.querySelector('#vtar-table'),
    discardStack: root.querySelector('#vtar-discard-stack'),
    discardCount: root.querySelector('#vtar-discard-count'),
    discardZone: root.querySelector('#vtar-discard-zone'),
    toggleReversed: root.querySelector('#vtar-toggle-reversed'),
    toggleMeanings: root.querySelector('#vtar-toggle-meanings'),
    btnNewReading: root.querySelector('#vtar-btn-new-reading'),
    hint: root.querySelector('#vtar-hint')
  };

  els.toggleReversed.addEventListener('change', () => engine.setAllowReversed(els.toggleReversed.checked));
  els.toggleMeanings.addEventListener('change', () => engine.setShowMeanings(els.toggleMeanings.checked));
  els.btnNewReading.addEventListener('click', () => engine.newSpreadReading());
  els.discardZone.addEventListener('click', () => {
    if (engine.state.discard.length) {
      engine.clearDiscard();
      renderDiscard();
    }
  });

  /* ---- Spread picker ---- */
  function renderSpreadPicker() {
    els.spreadPicker.innerHTML = '';
    TAROT_SPREADS.forEach(sp => {
      const btn = trEl('button', 'vtar-spread-chip' + (sp.id === engine.state.spreadId ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', sp.id === engine.state.spreadId ? 'true' : 'false');
      btn.innerHTML = trSpreadPreviewSvg(sp, 34) + `<span>${sp.name}</span>`;
      const preview = trEl('div', 'vtar-spread-hover-preview', `
        <div class="vtar-spread-hover-svg">${trSpreadPreviewSvg(sp, 120)}</div>
        <div class="vtar-spread-hover-text"><strong>${sp.name}</strong><p>${sp.short}</p></div>
      `);
      btn.appendChild(preview);
      btn.addEventListener('click', () => engine.setSpread(sp.id));
      els.spreadPicker.appendChild(btn);
    });
    els.spreadDesc.textContent = engine.currentSpread().short;
  }

  /* ---- Deck rail (kontrole po špilu + stack za izvlačenje) ---- */
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
        <span class="vtar-deck-name">${deck.shortName}</span>
      `;
      wrap.appendChild(head);

      const stackWrap = trEl('div', 'vtar-deck-stack-wrap');
      const stack = trEl('div', `vtar-deck-stack ${deck.backClass}`);
      stack.setAttribute('data-deck', deck.id);
      stack.title = `${deck.name} — klikni za izvlačenje karte`;
      stack.innerHTML = `
        <div class="vtar-deck-card vtar-deck-card-3"></div>
        <div class="vtar-deck-card vtar-deck-card-2"></div>
        <div class="vtar-deck-card vtar-deck-card-1"></div>
        <div class="vtar-deck-count">${dState.remaining.length}</div>
      `;
      stack.addEventListener('click', () => handleDrawClick(deck.id, stack));
      stackWrap.appendChild(stack);
      wrap.appendChild(stackWrap);

      const actions = trEl('div', 'vtar-deck-actions');
      actions.innerHTML = `
        <button type="button" class="vtar-mini-btn" data-act="shuffle-full" data-deck="${deck.id}" title="Promiješaj cijeli špil (svih 78 karata)">⟲ Sve</button>
        <button type="button" class="vtar-mini-btn" data-act="shuffle-remaining" data-deck="${deck.id}" title="Promiješaj preostale karte u špilu">⟲ Preostale</button>
        <button type="button" class="vtar-mini-btn" data-act="cut" data-deck="${deck.id}" title="Presijeci špil">✂ Presijeci</button>
      `;
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
    stack.classList.remove('vtar-pulse');
    void stack.offsetWidth;
    stack.classList.add('vtar-pulse');
  }

  function updateDeckCounts() {
    TAROT_DECKS.forEach(deck => {
      const el = els.railDecks.querySelector(`.vtar-deck-stack[data-deck="${deck.id}"] .vtar-deck-count`);
      if (el) el.textContent = engine.state.decks[deck.id].remaining.length;
      const stack = els.railDecks.querySelector(`.vtar-deck-stack[data-deck="${deck.id}"]`);
      if (stack) stack.classList.toggle('vtar-deck-empty', engine.state.decks[deck.id].remaining.length === 0);
    });
  }

  /* ---- Slotovi (pozicije spreada) ---- */
  function slotCardHtml() {
    return `
      <div class="vtar-card-flip">
        <div class="vtar-card-face vtar-card-back"></div>
        <div class="vtar-card-face vtar-card-front">
          <div class="vtar-card-front-img"></div>
          <div class="vtar-reversed-tag">obrnuto</div>
        </div>
      </div>
      <button type="button" class="vtar-card-discard-btn" title="Odloži u otpad" aria-label="Odloži kartu u otpad">✕</button>
    `;
  }

  function renderSlots() {
    els.slots.innerHTML = '';
    const spread = engine.currentSpread();
    spread.positions.forEach((pos, idx) => {
      const slot = trEl('div', 'vtar-slot');
      if (!isMobile) {
        slot.style.left = pos.x + '%';
        slot.style.top = pos.y + '%';
      }
      slot.dataset.slot = idx;
      slot.dataset.order = idx + 1;

      const marker = trEl('div', 'vtar-slot-marker', `<span>${idx + 1}</span>`);
      if (pos.rot && !isMobile) marker.style.transform = `rotate(${pos.rot}deg)`;
      slot.appendChild(marker);

      if (spread.positions.length > 1 || pos.label !== 'Karta') {
        const label = trEl('div', 'vtar-slot-label', pos.label);
        slot.appendChild(label);
      }
      if (engine.state.showMeanings) {
        const meaning = trEl('div', 'vtar-slot-meaning', pos.meaning);
        slot.appendChild(meaning);
      }

      const cardHolder = trEl('div', 'vtar-slot-card-holder');
      if (pos.rot && !isMobile) cardHolder.style.transform = `rotate(${pos.rot}deg)`;
      slot.appendChild(cardHolder);

      els.slots.appendChild(slot);

      const entry = engine.state.table[idx];
      if (entry) placeCardInSlot(idx, entry, false);
    });
    els.table.classList.toggle('vtar-mobile', isMobile);
    updateHint();
  }

  function updateHint() {
    if (engine.isSpreadFull()) {
      els.hint.textContent = 'Raspored je pun. Klikni "✦ Novi spread" za novo čitanje.';
    } else {
      els.hint.textContent = 'Klikni na špil da izvučeš sljedeću kartu.';
    }
  }

  /* ---- Postavi kartu u slot (bez animacije — npr. pri re-renderu) ---- */
  function placeCardInSlot(slotIdx, entry, animate, originEl) {
    const slotEl = els.slots.querySelector(`.vtar-slot[data-slot="${slotIdx}"]`);
    if (!slotEl) return;
    const holder = slotEl.querySelector('.vtar-slot-card-holder');
    holder.innerHTML = '';
    const cardEl = trEl('div', 'vtar-card vtar-card-drawn ' + trDeckDef(entry.deckId).backClass + (entry.orientation === 'reversed' ? ' vtar-reversed' : ''));
    cardEl.innerHTML = slotCardHtml();
    cardEl.dataset.slot = slotIdx;
    const frontImg = cardEl.querySelector('.vtar-card-front-img');
    frontImg.style.backgroundImage = `url("${tarotCardImage(entry.deckId, entry.cardId)}")`;
    const def = trCardDef(entry.cardId);
    cardEl.title = def ? def.name + (entry.orientation === 'reversed' ? ' (obrnuto)' : '') : '';
    cardEl.querySelector('.vtar-card-discard-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      engine.discardSlot(slotIdx);
    });
    holder.appendChild(cardEl);

    if (animate && originEl) {
      flyAndFlip(cardEl, originEl);
    } else {
      cardEl.querySelector('.vtar-card-flip').classList.add('vtar-revealed');
    }
  }

  /* FLIP tehnika: karta se odmah pojavi na konačnoj poziciji, pa se translacijom
     "vrati" na poziciju špila i animira natrag — glatko na svakom layoutu
     (radi i za mobilni stack layout jer koristi stvarne izmjerene pozicije). */
  function flyAndFlip(cardEl, originEl) {
    const target = cardEl.getBoundingClientRect();
    const origin = originEl.getBoundingClientRect();
    const dx = origin.left + origin.width / 2 - (target.left + target.width / 2);
    const dy = origin.top + origin.height / 2 - (target.top + target.height / 2);
    const scale = Math.max(0.35, Math.min(1, origin.width / target.width));

    cardEl.style.transition = 'none';
    cardEl.style.transform = `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${(Math.random() * 10 - 5).toFixed(1)}deg)`;
    cardEl.style.zIndex = 500;
    void cardEl.offsetWidth;
    cardEl.style.transition = 'transform 0.55s cubic-bezier(.2,.75,.3,1.05)';
    cardEl.style.transform = 'translate(0,0) scale(1) rotate(0deg)';

    let flipped = false;
    const doFlip = () => {
      if (flipped) return;
      flipped = true;
      cardEl.style.zIndex = '';
      cardEl.querySelector('.vtar-card-flip').classList.add('vtar-revealed');
    };
    cardEl.addEventListener('transitionend', function te(e) {
      if (e.propertyName !== 'transform') return;
      cardEl.removeEventListener('transitionend', te);
      setTimeout(doFlip, 90);
    });
    setTimeout(doFlip, 900); // sigurnosna mreža ako transitionend ne okine
  }

  /* ---- Otpad ---- */
  function renderDiscard() {
    els.discardCount.textContent = engine.state.discard.length;
    els.discardStack.innerHTML = '';
    const last = engine.state.discard.slice(-3);
    last.forEach((entry, i) => {
      const c = trEl('div', 'vtar-discard-card ' + trDeckDef(entry.deckId).backClass);
      c.style.setProperty('--i', i);
      els.discardStack.appendChild(c);
    });
    els.discardZone.classList.toggle('vtar-discard-empty', engine.state.discard.length === 0);
  }

  /* ---- Izvlačenje klikom na špil ---- */
  function handleDrawClick(deckId, stackEl) {
    const dState = engine.state.decks[deckId];
    if (!dState.enabled) return;
    if (engine.isSpreadFull()) { flashHint('Raspored je pun — resetiraj za novo čitanje.'); return; }
    if (dState.remaining.length === 0) { flashHint('Špil je prazan — promiješaj cijeli špil.'); return; }
    const result = engine.drawFromDeck(deckId);
    if (!result) return;
    placeCardInSlot(result.slot, result.entry, true, stackEl);
    updateDeckCounts();
    updateHint();
  }

  function flashHint(msg) {
    els.hint.textContent = msg;
    els.hint.classList.remove('vtar-hint-flash');
    void els.hint.offsetWidth;
    els.hint.classList.add('vtar-hint-flash');
  }

  /* ---- Puni re-render (npr. promjena spreada, resize desktop/mobile) ---- */
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
    if (evt.type === 'spread') { renderAll(); return; }
    if (evt.type === 'decks') { renderDeckRail(); updateDeckCounts(); return; }
    if (evt.type === 'deck-shuffle' || evt.type === 'deck-cut') { updateDeckCounts(); return; }
    if (evt.type === 'discard') { renderSlots(); renderDiscard(); updateDeckCounts(); return; }
    if (evt.type === 'discard-all' || evt.type === 'new-reading') { renderSlots(); renderDiscard(); updateDeckCounts(); return; }
    if (evt.type === 'discard-clear') { renderDiscard(); return; }
    if (evt.type === 'show-meanings') { renderSlots(); return; }
  });

  renderAll();

  return { renderAll };
}

window.createTarotUI = createTarotUI;
