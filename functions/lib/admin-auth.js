// ============================================================
// Zajednička provjera admin lozinke + zaštita od pogađanja (brute-force).
// NIJE ruta - nema onRequest* exporta, pa je Cloudflare Pages ne servira
// (isti obrazac kao functions/ai/providers.js i prompt.js). Samo za import.
//
// ZAŠTO POSTOJI: lozinka je jedina brana prema admin panelu, punim podacima u KV-u
// i GitHub commitima. Konstantno-vremenska usporedba + kratka pauza usporavaju
// pogađanje, ali ga ne zaustavljaju - napadač može slati tisuće zahtjeva. Ovdje se
// broje NEUSPJELI pokušaji po IP-u i nakon MAX_FAILS se pristup zaključa na LOCK_MIN
// minuta. Uspješna prijava odmah briše brojač.
//
// PRIVATNOST (bitno za pravila privatnosti): IP adresa se NE sprema. Ključ je
// SHA-256 od IP-a posoljenog serverskom tajnom (ADMIN_PASS) - jednosmjerno i
// beskorisno bez tajne. Zapis sam istekne (expirationTtl), ne čisti se ručno.
//
// Bez KV bindinga (NATAL_LOG) lockout tiho ne radi, ali usporedba lozinke i pauza
// rade normalno - funkcija se nikad ne smije srušiti zbog nedostupnog KV-a.
// ============================================================

const MAX_FAILS = 8;   // koliko promašaja prije zaključavanja
const LOCK_MIN  = 15;  // koliko minuta traje zaključavanje (i prozor brojanja)
const FAIL_WAIT = 250; // ms umjetne pauze na svaki promašaj

/* Vrati null ako je lozinka ispravna, inače gotov Response (403/429/500).
   `provided` predaje pozivatelj jer neke rute lozinku čitaju iz tijela zahtjeva,
   a tijelo se može pročitati samo jednom. */
export async function guardAdmin(request, env, provided) {
  const ADMIN_PASS = env.ADMIN_PASS;
  if (!ADMIN_PASS) return json({ error: 'ADMIN_PASS not configured' }, 500);

  const KV  = env.NATAL_LOG;
  const key = await rateKey(request, ADMIN_PASS);

  // 1) Je li ovaj IP već zaključan?
  if (KV && key) {
    const rec = await safeGet(KV, key);
    if (rec && rec.until > Date.now()) {
      const min = Math.max(1, Math.ceil((rec.until - Date.now()) / 60000));
      return json(
        { error: `Previše neuspjelih pokušaja. Pokušaj ponovo za ${min} min.`, locked: true, retryInMin: min },
        429,
        { 'Retry-After': String(min * 60) }
      );
    }
  }

  // 2) Provjera lozinke (konstantno vrijeme - duljina/sadržaj se ne odaju kroz trajanje)
  if (safeEqual(provided || '', ADMIN_PASS)) {
    if (KV && key) { try { await KV.delete(key); } catch (e) { /* nije fatalno */ } }
    return null;
  }

  // 3) Promašaj - zabilježi i uspori
  if (KV && key) {
    try {
      const rec = (await safeGet(KV, key)) || { n: 0, until: 0 };
      rec.n += 1;
      // Zaključaj tek kad se prijeđe prag; do tada samo brojimo (prozor = LOCK_MIN).
      rec.until = rec.n >= MAX_FAILS ? Date.now() + LOCK_MIN * 60000 : 0;
      await KV.put(key, JSON.stringify(rec), { expirationTtl: LOCK_MIN * 60 });
    } catch (e) { /* KV problem ne smije propustiti pogrešnu lozinku */ }
  }
  await new Promise(r => setTimeout(r, FAIL_WAIT));
  return json({ error: 'Unauthorized' }, 403);
}

/* Lozinka iz headera - za rute koje je ne šalju u tijelu. */
export function passFromHeader(request) {
  return request.headers.get('x-admin-pass') || '';
}

function rateKey(request, secret) {
  return hashedIpKey(request, secret, 'rl:');
}

/* Ključ brojača po posjetitelju: SHA-256(IP + tajna), skraćen na 32 hex znaka.
   IP se NIGDJE ne zapisuje - hash je jednosmjeran i bez serverske tajne beskoristan.
   Koristi ga i /log-natal za dnevni limit. Vrati null ako nema Cloudflarea ispred
   (lokalni razvoj) - tada limit jednostavno ne radi. */
export async function hashedIpKey(request, secret, prefix) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (!ip) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|' + (secret || 'aj')));
  return prefix + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function safeGet(KV, key) {
  try { return await KV.get(key, 'json'); } catch (e) { return null; }
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(extraHeaders || {}) }
  });
}
