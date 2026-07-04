/* ============================================================
   Virtualni tarot - stanje i logika (bez DOM-a)

   INVARIJANTA (nikad dvije identične karte): za svaki špil vrijedi da je
   svaka od 78 karata točno na JEDNOM mjestu - u špilu (`remaining`), na stolu
   (`table`) ili u otpadu (`discard`). Svaka operacija održava tu invarijantu:
     draw:            remaining → table
     discard:         table → discard
     returnDiscard:   discard → remaining (klik na otpad)
     shuffleFull:     table + discard + remaining → remaining (promiješaj SVE)
     shuffleRemaining/cut: permutacija unutar remaining
   Tako je nemoguće izvući duplikat.
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
    decks: {},          // deckId -> { enabled, remaining:[ids] }
    spreadId: TAROT_SPREADS[1] ? TAROT_SPREADS[1].id : TAROT_SPREADS[0].id, // default: prvi pravi spread
    table: [],           // fiksni spread: 1 stavka po poziciji (null ili entry); free: rastući niz entry-ja
    discard: [],          // { deckId, cardId, orientation, drawSeq }
    allowReversed: false,
    showMeanings: true,
    drawSeq: 0
  };

  TAROT_DECKS.forEach((d) => {
    if (d.comingSoon) return; // nema karata za izvlačenje (placeholder špil)
    state.decks[d.id] = {
      enabled: true, // stvarni špilovi uključeni po defaultu
      remaining: shuffleArray(allCardIds)
    };
  });

  function currentSpread() {
    return TAROT_SPREADS.find(s => s.id === state.spreadId) || TAROT_SPREADS[0];
  }
  function isFree() { return !!currentSpread().free; }

  function resetTableForSpread() {
    const sp = currentSpread();
    state.table = sp.free ? [] : sp.positions.map(() => null);
  }
  resetTableForSpread();

  const listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function emit(evt) { listeners.forEach(fn => fn(evt)); }

  function enabledDeckIds() {
    return TAROT_DECKS.filter(d => state.decks[d.id] && state.decks[d.id].enabled).map(d => d.id);
  }

  function setDeckEnabled(deckId, enabled) {
    if (!state.decks[deckId]) return;
    state.decks[deckId].enabled = enabled;
    emit({ type: 'decks' });
  }

  /* Vrati sve karte danog špila sa stola i iz otpada natrag u `remaining`,
     pa promiješaj svih 78. Stol/otpad ostaju bez karata TOG špila. */
  function shuffleFull(deckId) {
    const d = state.decks[deckId];
    if (!d) return;
    // makni karte ovog špila sa stola
    if (isFree()) {
      state.table = state.table.filter(e => !(e && e.deckId === deckId));
    } else {
      state.table = state.table.map(e => (e && e.deckId === deckId) ? null : e);
    }
    // makni karte ovog špila iz otpada
    state.discard = state.discard.filter(e => e.deckId !== deckId);
    d.remaining = shuffleArray(allCardIds);
    emit({ type: 'reclaim', deckId, mode: 'full' });
  }

  /* Posloži preostale karte špila po kanonskom redu (velika arkana 0-21, pa
     štapovi, pehari, mačevi, pentakli - As, 2-10, Paž, Vitez, Kraljica, Kralj).
     Koristi ga "Izvuci sve" da karte izlaze točno tim redoslijedom. */
  function sortRemaining(deckId) {
    const d = state.decks[deckId];
    if (!d) return;
    const order = {};
    allCardIds.forEach((id, i) => { order[id] = i; });
    d.remaining = d.remaining.slice().sort((a, b) => order[a] - order[b]);
    emit({ type: 'deck-shuffle', deckId, mode: 'sorted' });
  }

  function shuffleRemaining(deckId) {
    const d = state.decks[deckId];
    if (!d) { return; }
    if (d.remaining.length >= 2) d.remaining = shuffleArray(d.remaining);
    emit({ type: 'deck-shuffle', deckId, mode: 'remaining' });
  }

  function nextEmptySlot() {
    return state.table.findIndex(s => s === null);
  }

  function isSpreadFull() {
    if (isFree()) return false; // slobodno slaganje nema kraj
    return nextEmptySlot() === -1;
  }

  function drawFromDeck(deckId) {
    const d = state.decks[deckId];
    if (!d || !d.enabled) return null;
    if (d.remaining.length === 0) return null;

    const orientation = state.allowReversed && Math.random() < 0.5 ? 'reversed' : 'upright';
    const cardId = d.remaining.shift();
    const entry = { deckId, cardId, orientation, drawSeq: state.drawSeq++ };

    let slot;
    if (isFree()) {
      state.table.push(entry);
      slot = state.table.length - 1;
    } else {
      slot = nextEmptySlot();
      if (slot === -1) { d.remaining.unshift(cardId); return null; }
      state.table[slot] = entry;
    }
    emit({ type: 'draw', slot, entry, deckId });
    return { slot, entry };
  }

  function discardSlot(slot) {
    const entry = state.table[slot];
    if (!entry) return;
    state.discard.push(entry);
    if (isFree()) {
      state.table.splice(slot, 1);
    } else {
      state.table[slot] = null;
    }
    emit({ type: 'discard', slot, entry });
  }

  function discardAllTable() {
    state.table.forEach((entry) => { if (entry) state.discard.push(entry); });
    resetTableForSpread();
    emit({ type: 'discard-all' });
  }

  /* Klik na otpad: vrati sve karte iz otpada natrag u pripadajuće špilove i
     promiješaj te špilove. */
  function returnDiscardToDecks() {
    if (!state.discard.length) return;
    const touched = new Set();
    state.discard.forEach(e => {
      const d = state.decks[e.deckId];
      if (d) { d.remaining.push(e.cardId); touched.add(e.deckId); }
    });
    touched.forEach(id => { state.decks[id].remaining = shuffleArray(state.decks[id].remaining); });
    state.discard = [];
    emit({ type: 'discard-return' });
  }

  /* Novi spread: sve karte sa stola natrag u pripadajuće špilove (promiješane),
     otpad ostaje kakav jest. */
  function newSpreadReading() {
    const touched = new Set();
    state.table.forEach(e => {
      if (e) { const d = state.decks[e.deckId]; if (d) { d.remaining.push(e.cardId); touched.add(e.deckId); } }
    });
    touched.forEach(id => { state.decks[id].remaining = shuffleArray(state.decks[id].remaining); });
    resetTableForSpread();
    emit({ type: 'new-reading' });
  }

  function setSpread(spreadId) {
    if (state.spreadId === spreadId) return;
    // vrati trenutne karte sa stola natrag u špil prije promjene rasporeda
    state.table.forEach(e => {
      if (e) { const d = state.decks[e.deckId]; if (d) d.remaining.push(e.cardId); }
    });
    TAROT_DECKS.forEach(dk => { if (state.decks[dk.id]) state.decks[dk.id].remaining = shuffleArray(state.decks[dk.id].remaining); });
    state.spreadId = spreadId;
    resetTableForSpread();
    emit({ type: 'spread', spreadId });
  }

  function setAllowReversed(val) { state.allowReversed = !!val; emit({ type: 'allow-reversed' }); }
  function setShowMeanings(val) { state.showMeanings = !!val; emit({ type: 'show-meanings' }); }

  return {
    state,
    onChange,
    currentSpread,
    isFree,
    enabledDeckIds,
    setDeckEnabled,
    shuffleFull,
    shuffleRemaining,
    sortRemaining,
    drawFromDeck,
    discardSlot,
    discardAllTable,
    returnDiscardToDecks,
    newSpreadReading,
    setSpread,
    setAllowReversed,
    setShowMeanings,
    isSpreadFull
  };
}

window.createTarotEngine = createTarotEngine;
