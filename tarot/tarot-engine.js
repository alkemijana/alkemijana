/* ============================================================
   Virtualni tarot — stanje i logika (bez DOM-a)
   Čuva stanje špilova (pun/preostali dio), stol, otpad i postavke;
   tarot-render.js/tarot.js se pretplaćuju na promjene preko onChange.
   ============================================================ */

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createTarotEngine() {
  const allCardIds = TAROT_CARD_DEFS.map(c => c.id);

  const state = {
    decks: {},          // deckId -> { enabled, full:[ids], remaining:[ids] }
    spreadId: TAROT_SPREADS[0].id,
    table: [],           // po jedna stavka po poziciji spreada: null ili {deckId,cardId,orientation,drawSeq}
    discard: [],          // { deckId, cardId, orientation }
    allowReversed: false,
    showMeanings: true,
    drawSeq: 0
  };

  TAROT_DECKS.forEach((d, i) => {
    state.decks[d.id] = {
      enabled: i < 2, // prva dva špila (RWS, Marseille) uključena po defaultu
      full: shuffleArray(allCardIds),
      remaining: []
    };
    state.decks[d.id].remaining = state.decks[d.id].full.slice();
  });

  function currentSpread() {
    return TAROT_SPREADS.find(s => s.id === state.spreadId) || TAROT_SPREADS[0];
  }

  function resetTableForSpread() {
    state.table = currentSpread().positions.map(() => null);
  }
  resetTableForSpread();

  const listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function emit(evt) { listeners.forEach(fn => fn(evt)); }

  function enabledDeckIds() {
    return TAROT_DECKS.filter(d => state.decks[d.id].enabled).map(d => d.id);
  }

  function setDeckEnabled(deckId, enabled) {
    if (!state.decks[deckId]) return;
    state.decks[deckId].enabled = enabled;
    emit({ type: 'decks' });
  }

  function shuffleFull(deckId) {
    const d = state.decks[deckId];
    if (!d) return;
    d.full = shuffleArray(allCardIds);
    d.remaining = d.full.slice();
    emit({ type: 'deck-shuffle', deckId, mode: 'full' });
  }

  function shuffleRemaining(deckId) {
    const d = state.decks[deckId];
    if (!d || d.remaining.length < 2) { emit({ type: 'deck-shuffle', deckId, mode: 'remaining' }); return; }
    d.remaining = shuffleArray(d.remaining);
    emit({ type: 'deck-shuffle', deckId, mode: 'remaining' });
  }

  function cutDeck(deckId) {
    const d = state.decks[deckId];
    if (!d || d.remaining.length < 2) { emit({ type: 'deck-cut', deckId }); return; }
    const cut = 1 + Math.floor(Math.random() * (d.remaining.length - 1));
    d.remaining = d.remaining.slice(cut).concat(d.remaining.slice(0, cut));
    emit({ type: 'deck-cut', deckId });
  }

  function nextEmptySlot() {
    return state.table.findIndex(s => s === null);
  }

  function isSpreadFull() {
    return nextEmptySlot() === -1;
  }

  function drawFromDeck(deckId) {
    const d = state.decks[deckId];
    if (!d || !d.enabled) return null;
    const slot = nextEmptySlot();
    if (slot === -1) return null;
    if (d.remaining.length === 0) return null;
    const cardId = d.remaining.shift();
    const orientation = state.allowReversed && Math.random() < 0.5 ? 'reversed' : 'upright';
    const entry = { deckId, cardId, orientation, drawSeq: state.drawSeq++ };
    state.table[slot] = entry;
    emit({ type: 'draw', slot, entry, deckId });
    return { slot, entry };
  }

  function discardSlot(slot) {
    const entry = state.table[slot];
    if (!entry) return;
    state.discard.push(entry);
    state.table[slot] = null;
    emit({ type: 'discard', slot, entry });
  }

  function discardAllTable() {
    state.table.forEach((entry, slot) => {
      if (entry) { state.discard.push(entry); state.table[slot] = null; }
    });
    emit({ type: 'discard-all' });
  }

  function newSpreadReading() {
    discardAllTable();
    emit({ type: 'new-reading' });
  }

  function setSpread(spreadId) {
    if (state.spreadId === spreadId) return;
    state.spreadId = spreadId;
    resetTableForSpread();
    emit({ type: 'spread', spreadId });
  }

  function setAllowReversed(val) {
    state.allowReversed = !!val;
    emit({ type: 'allow-reversed' });
  }

  function setShowMeanings(val) {
    state.showMeanings = !!val;
    emit({ type: 'show-meanings' });
  }

  function clearDiscard() {
    state.discard = [];
    emit({ type: 'discard-clear' });
  }

  return {
    state,
    onChange,
    currentSpread,
    enabledDeckIds,
    setDeckEnabled,
    shuffleFull,
    shuffleRemaining,
    cutDeck,
    drawFromDeck,
    discardSlot,
    discardAllTable,
    newSpreadReading,
    setSpread,
    setAllowReversed,
    setShowMeanings,
    clearDiscard,
    isSpreadFull
  };
}

window.createTarotEngine = createTarotEngine;
