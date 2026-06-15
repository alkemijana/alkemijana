// Jezgra AI tumačenja — neovisna o Cloudflare routingu (route shim je
// functions/interpret-natal.js). Cache + rate-limit + poziv provajderu.
//
// Env varijable (mijenjaju AI servis BEZ diranja koda):
//   AI_PROVIDER   gemini (default) | cloudflare | openai | anthropic
//   AI_MODEL      ID modela (default po provajderu)
//   AI_API_KEY    ključ provajdera (Workers AI ga NE treba — koristi AI binding)
//   AI_BASE_URL   samo za "openai" adapter (Groq/OpenRouter/Mistral/DeepSeek)
//   AI_IP_DAILY_LIMIT   max tumačenja po IP-u dnevno (default 10; 0 = bez limita)
//   AI_DAILY_LIMIT      globalni dnevni strop (default 0 = isključeno)
//   ADMIN_PASS    Janina lozinka — ako klijent pošalje točan X-Admin-Pass, limiti se zaobilaze
//
// KV (binding NATAL_LOG, isti kao brojač karata) — ako ga nema, samo nema cachea/limita:
//   ai:<provider>:<model>:<hash>  -> spremljeno tumačenje (cache, 90 dana)
//   rlg:<YYYYMMDD>                -> globalni dnevni brojač
//   rl:<YYYYMMDD>:<ip>            -> dnevni brojač po IP-u

import { callProvider, DEFAULT_MODELS } from './providers.js';
import { systemPrompt, userPrompt } from './prompt.js';

const MAX_TOKENS = 900; // dovoljno za 10–20 rečenica

export async function handleInterpret({ request, env }) {
  const provider = (env.AI_PROVIDER || 'gemini').toLowerCase();
  const model = env.AI_MODEL || DEFAULT_MODELS[provider] || '';
  const KV = env.NATAL_LOG;

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const h = typeof body.h === 'string' ? body.h.toLowerCase() : '';
  const summary = typeof body.summary === 'string' ? body.summary.slice(0, 6000) : '';
  if (!/^[0-9a-f]{16,128}$/.test(h)) return json({ ok: false, error: 'bad hash' }, 400);
  if (summary.length < 20) return json({ ok: false, error: 'prazan opis karte' }, 400);

  // 1) Cache — ista karta (isti hash) uvijek vraća isti, već generirani tekst
  const cacheKey = 'ai:' + provider + ':' + model + ':' + h;
  if (KV) {
    try {
      const hit = await KV.get(cacheKey);
      if (hit) return json({ ok: true, text: hit, cached: true }, 200);
    } catch (e) { /* promašaj cachea nije fatalan */ }
  }

  // Admin (Jana ulogirana) → bez limita
  const isAdmin = checkAdmin(request, env);

  // 2) Rate-limit po IP-u (preskoči za admina)
  if (KV && !isAdmin) {
    const ymd = ymdStr();
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    const ipMax = intEnv(env.AI_IP_DAILY_LIMIT, 10);
    const globalMax = intEnv(env.AI_DAILY_LIMIT, 0);
    try {
      if (globalMax > 0) {
        const g = parseInt(await KV.get('rlg:' + ymd) || '0', 10);
        if (g >= globalMax) return json({ ok: false, error: 'limit', note: 'Dnevni broj AI tumačenja je dosegnut. Pokušaj ponovno sutra — karta i PDF i dalje rade normalno.' }, 429);
      }
      if (ipMax > 0) {
        const c = parseInt(await KV.get('rl:' + ymd + ':' + ip) || '0', 10);
        if (c >= ipMax) return json({ ok: false, error: 'limit', note: 'Dosegnut je dnevni broj tumačenja (' + ipMax + '). Pokušaj ponovno sutra — karta i PDF rade normalno.' }, 429);
      }
    } catch (e) { /* ako KV zakaže, propusti */ }
  }

  // 3) Poziv AI provajderu
  let text;
  try {
    text = await callProvider(provider, model, systemPrompt(), userPrompt(summary), env, MAX_TOKENS);
  } catch (e) {
    return json({ ok: false, error: 'ai', note: 'Tumačenje trenutno nije dostupno: ' + e.message }, 502);
  }
  if (!text || text.trim().length < 10) {
    return json({ ok: false, error: 'ai', note: 'AI nije vratio tumačenje. Pokušaj ponovno.' }, 502);
  }
  text = text.trim();

  // 4) Cache + brojači (admin se ne broji u IP-limit)
  if (KV) {
    const ymd = ymdStr();
    const tasks = [KV.put(cacheKey, text, { expirationTtl: 60 * 60 * 24 * 90 })];
    if (!isAdmin) {
      const ip = request.headers.get('cf-connecting-ip') || 'x';
      tasks.push(bump(KV, 'rlg:' + ymd), bump(KV, 'rl:' + ymd + ':' + ip));
    }
    try { await Promise.all(tasks); } catch (e) { /* ne ruši odgovor */ }
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

async function bump(KV, key) {
  const n = parseInt(await KV.get(key) || '0', 10) + 1;
  await KV.put(key, String(n), { expirationTtl: 60 * 60 * 48 }); // brojači se sami čiste za ~2 dana
}

function intEnv(v, def) { const n = parseInt(v, 10); return isFinite(n) ? n : def; }

function ymdStr() {
  const d = new Date();
  return d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
