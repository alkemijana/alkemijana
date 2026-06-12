// Zapisuje svaki izračun natalne karte u Cloudflare KV (binding: NATAL_LOG).
// Bez autentikacije — poziva ga posjetitelj pri izradi karte. Čitanje je zaštićeno (natal-log.js).
export async function onRequestPost({ request, env }) {
  const KV = env.NATAL_LOG;

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  // Ako KV nije konfiguriran, tiho ne radi ništa (ne ruši izradu karte kod posjetitelja).
  if (!KV) return json({ ok: false, error: 'KV (NATAL_LOG) nije konfiguriran' }, 200);

  const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const num  = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

  const entry = {
    ts: new Date().toISOString(),
    name: clip(body.name, 80),
    date: clip(body.date, 20),
    time: clip(body.time, 10),
    noTime: !!body.noTime,
    place: clip(body.place, 160),
    lat: num(body.lat),
    lon: num(body.lon),
    tz: clip(body.tz, 60),
    nodeType: clip(body.nodeType, 10),
    sun: clip(body.sun, 24),
    moon: clip(body.moon, 24),
    asc: clip(body.asc, 24)
  };

  const key = 'e:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
  try {
    await KV.put(key, JSON.stringify(entry));
  } catch (e) {
    return json({ ok: false, error: e.message }, 200);
  }
  return json({ ok: true }, 200);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
