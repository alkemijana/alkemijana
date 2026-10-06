/* ============================================================
   Alkemijana - TRAKE S ODABIROM U SREDINI (window.AJWheel)
   ------------------------------------------------------------
   Zajedničko za alat „Mjesec" (dani, sati) i Tranzite (dan/mjesec/godina).
   Traka je vodoravni popis elemenata (svaki s data-w = svoj indeks);
   ODABRAN JE ELEMENT U SREDINI. Mobitel: lista se prstom (CSS scroll-snap);
   računalo: strelice .ml-warrow (data-for = id trake, data-dir = ±1).
   Svaki novi element u sredini kratko „klikne" (haptic).

     AJWheel.attach(el, onIndex)  - jednom po traci; onIndex(idx) pri promjeni
     AJWheel.jump(el, idx)        - postavi bez klika i bez dojave (izgradnja, reset)
     AJWheel.pitch(el)            - razmak između elemenata (px)
     AJWheel.haptic()             - „cak"

   Centriranje radi CSS: prazni ::before/::after = pola trake − pola elementa,
   pa je odabrani indeks = round(scrollLeft / razmak).
   ============================================================ */
(function () {
  'use strict';

  /* „cak": Android - Vibration API; iPhone ga nema, pa se koristi skriveni
     <input type="checkbox" switch> (Safari na iOS-u 18+ pri prebacivanju da kratki
     haptički klik) - nije zajamčeno na svim iPhoneima. */
  let lastHap = 0, iosSwitch = null;
  function haptic() {
    const now = performance.now();
    if (now - lastHap < 35) return;
    lastHap = now;
    if (navigator.vibrate) { try { navigator.vibrate(6); } catch (e) {} return; }
    if (!iosSwitch) {
      const l = document.createElement('label'), i = document.createElement('input');
      l.setAttribute('aria-hidden', 'true');
      l.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
      i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
      i.addEventListener('focus', () => i.blur());
      l.appendChild(i); document.body.appendChild(l); iosSwitch = l;
    }
    iosSwitch.click();
  }

  function pitch(el) {
    const a = el.children[0], b = el.children[1];
    return a && b ? b.offsetLeft - a.offsetLeft : (a ? a.offsetWidth : 1) || 1;
  }
  function mark(el, idx) {
    const prev = el.querySelector('.ml-wsel'); if (prev) prev.classList.remove('ml-wsel');
    const cur = el.children[idx]; if (cur) cur.classList.add('ml-wsel');
  }
  function attach(el, onIndex) {
    el._onIndex = onIndex;                       // smije se zamijeniti (npr. nova jedinica)
    if (el._wheel) return;
    el._wheel = true;
    let raf = 0;
    el.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const idx = Math.max(0, Math.min(el.children.length - 1, Math.round(el.scrollLeft / pitch(el))));
        if (idx === el._idx) return;
        el._idx = idx;
        mark(el, idx);
        if (el._quiet) return;
        haptic();
        if (el._onIndex) el._onIndex(idx);
      });
    }, { passive: true });
    // dodir na element: dovede ga u sredinu (pa se odabere kao da je doklizao)
    el.addEventListener('click', e => {
      if (el._dragged) { el._dragged = false; e.preventDefault(); e.stopPropagation(); return; }
      const it = e.target.closest('[data-w]');
      if (it) el.scrollTo({ left: +it.dataset.w * pitch(el), behavior: 'smooth' });
    });
    attachMouseDrag(el);
  }

  /* POVLAČENJE MIŠEM (računalo, vlasnik): uhvati traku i vuci lijevo/desno - kao prstom.
     Dok se vuče, scroll-snap je isključen (inače bi traka „skakala" po elementima pod mišem);
     nakon puštanja se glatko poravna na najbliži element. Klik na element nakon povlačenja
     (> 5 px) se poništi, da se povlačenjem ne odabere slučajno element pod mišem.
     Dodir (prst/olovka) ide i dalje nativnim scrollom - ovo je samo za miš. */
  /* Pointer capture se uzima TEK kad povlačenje stvarno krene (> 5 px): s captureom od
     pritiska klik ide na cijelu traku umjesto na sličicu, pa klik na sličicu nije radio. */
  function attachMouseDrag(el) {
    let down = false, startX = 0, startLeft = 0, moved = 0;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; startX = e.clientX; startLeft = el.scrollLeft;
      el._dragged = false;
    });
    el.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved <= 5) return;
      if (!el._dragged) {
        el._dragged = true;
        el.style.scrollSnapType = 'none';
        el.classList.add('aj-dragging');
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
      el.scrollLeft = startLeft - dx;
    });
    const end = e => {
      if (!down) return;
      down = false;
      if (!el._dragged) return;                  // običan klik - odradi ga 'click' (sličica u sredinu)
      el.classList.remove('aj-dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
      const idx = Math.max(0, Math.min(el.children.length - 1, Math.round(el.scrollLeft / pitch(el))));
      el.scrollTo({ left: idx * pitch(el), behavior: 'smooth' });
      // snap natrag tek kad se glatko poravna (inače preuzme i „trzne")
      setTimeout(() => { el.style.scrollSnapType = ''; }, 350);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // slike/tekst unutar elemenata se ne smiju „vući" kao datoteka
    el.addEventListener('dragstart', e => e.preventDefault());
  }
  function jump(el, idx) {
    el._quiet = true;
    el.scrollLeft = idx * pitch(el);
    el._idx = idx;
    mark(el, idx);
    clearTimeout(el._qt);
    el._qt = setTimeout(() => { el._quiet = false; }, 120);
  }

  // strelice uz trake (računalo): jedan korak lijevo ili desno
  document.addEventListener('click', e => {
    const b = e.target.closest('.ml-warrow');
    if (!b) return;
    const el = document.getElementById(b.dataset.for);
    if (!el || !el.children.length) return;
    const idx = Math.max(0, Math.min(el.children.length - 1, (el._idx || 0) + (+b.dataset.dir)));
    el.scrollTo({ left: idx * pitch(el), behavior: 'smooth' });
  });

  window.AJWheel = { attach, jump, pitch, haptic };
})();
