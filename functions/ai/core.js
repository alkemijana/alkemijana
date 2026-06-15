// Jezgra AI uvida — neovisna o Cloudflare routingu (route shim je
// functions/interpret-natal.js). SAMO ADMIN (Jana): radni alat za pripremu čitanja.
// Bez ikakvih limita; cache po hashu karte (ista karta → isti uvidi).
//
// Env varijable (mijenjaju AI servis BEZ diranja koda):
//   AI_PROVIDER   gemini | cloudflare | openai | anthropic
//   AI_MODEL      ID modela (default po provajderu)
//   AI_API_KEY    ključ provajdera (Workers AI ga NE treba — koristi AI binding)
//   AI_BASE_URL   samo za "openai" adapter (Groq/OpenRouter/Mistral/DeepSeek)
//   ADMIN_PASS    Janina lozinka — pristup samo uz točan X-Admin-Pass header
//
// KV (binding NATAL_LOG, isti kao brojač karata) — ako ga nema, samo nema cachea:
//   aiv2:<provider>:<model>:<hash>  -> spremljeni uvidi (cache, 90 dana)

import { callProvider, DEFAULT_MODELS } from './providers.js';
import { systemPrompt, userPrompt } from './prompt.js';

const MAX_TOKENS = 2500; // temeljita strukturirana analiza (bez ograničenja sadržaja)

export async function handleInterpret({ request, env }) {
  const provider = (env.AI_PROVIDER || 'gemini').toLowerCase();
  const model = env.AI_MODEL || DEFAULT_MODELS[provider] || '';
  const KV = env.NATAL_LOG;

  // SAMO ADMIN — ovo je Janin radni alat, nije za posjetitelje
  if (!checkAdmin(request, env)) {
    return json({ ok: false, error: 'auth', note: 'AI uvidi su dostupni samo prijavljenom adminu.' }, 403);
  }

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const h = typeof body.h === 'string' ? body.h.toLowerCase() : '';
  const summary = typeof body.summary === 'string' ? body.summary.slice(0, 6000) : '';
  const fresh = body.fresh === true; // zaobiđi cache (regeneriraj)
  if (!/^[0-9a-f]{16,128}$/.test(h)) return json({ ok: false, error: 'bad hash' }, 400);
  if (summary.length < 20) return json({ ok: false, error: 'prazan opis karte' }, 400);

  // Cache — ista karta vraća iste, već generirane uvide (osim ako se traži fresh)
  const cacheKey = 'aiv2:' + provider + ':' + model + ':' + h;
  if (KV && !fresh) {
    try {
      const hit = await KV.get(cacheKey);
      if (hit) return json({ ok: true, text: hit, cached: true }, 200);
    } catch (e) { /* promašaj cachea nije fatalan */ }
  }

  // Poziv AI provajderu
  let text;
  try {
    text = await callProvider(provider, model, systemPrompt(), userPrompt(summary), env, MAX_TOKENS);
  } catch (e) {
    return json({ ok: false, error: 'ai', note: 'AI uvidi trenutno nisu dostupni: ' + e.message }, 502);
  }
  if (!text || text.trim().length < 10) {
    return json({ ok: false, error: 'ai', note: 'AI nije vratio uvide. Pokušaj ponovno.' }, 502);
  }
  text = text.trim();

  if (KV) {
    try { await KV.put(cacheKey, text, { expirationTtl: 60 * 60 * 24 * 90 }); } catch (e) { /* ne ruši odgovor */ }
  }

  return json({ ok: true, text }, 200);
}

/* ============ HELPERI ============ */

function checkAdmin(request, env) {
  const pass = request.headers.get('x-admin-pass') || '';
  return !!env.ADMIN_PASS && safeEqual(pass, env.ADMIN_PASS);
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
