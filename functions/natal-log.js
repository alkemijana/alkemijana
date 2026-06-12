// Statistika izrađenih karata — SAMO admin (X-Admin-Pass). Čita samo nazive ključeva
// (datum je u nazivu), pa ne troši po-ključ dohvate. POST {action:'reset'} briše brojač.

export async function onRequestGet({ request, env }) {
  const unauth = checkAuth(request, env);
  if (unauth) return unauth;

  const KV = env.NATAL_LOG;
  if (!KV) return json({ ok: true, total: 0, last30: 0, last7: 0, note: 'KV (NATAL_LOG) nije konfiguriran — vidi CLAUDE.md za postavljanje.' }, 200);

  try {
    const now = Date.now();
    const d30 = ymdNum(now - 30 * 864e5);
    const d7  = ymdNum(now - 7 * 864e5);
    let total = 0, last30 = 0, last7 = 0, cursor;
    do {
      const list = await KV.list({ prefix: 'c:', cursor });
      for (const k of list.keys) {
        const dd = parseInt(k.name.split(':')[1], 10); // c:YYYYMMDD:hash
        if (!isFinite(dd)) continue;
        total++;
        if (dd >= d30) last30++;
        if (dd >= d7) last7++;
      }
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);

    return json({ ok: true, total, last30, last7 }, 200);
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const unauth = checkAuth(request, env);
  if (unauth) return unauth;

  const KV = env.NATAL_LOG;
  if (!KV) return json({ ok: false, error: 'KV nije konfiguriran' }, 200);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  if (body.action !== 'reset') return json({ ok: false, error: 'Nepoznata akcija' }, 400);

  try {
    for (const prefix of ['c:', 's:']) {
      let cursor;
      do {
        const list = await KV.list({ prefix, cursor });
        for (const k of list.keys) await KV.delete(k.name);
        cursor = list.list_complete ? null : list.cursor;
      } while (cursor);
    }
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

function ymdNum(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function checkAuth(request, env) {
  const ADMIN_PASS = env.ADMIN_PASS;
  if (!ADMIN_PASS) return json({ ok: false, error: 'ADMIN_PASS not configured' }, 500);
  const provided = request.headers.get('x-admin-pass') || '';
  if (!safeEqual(provided, ADMIN_PASS)) return json({ ok: false, error: 'Unauthorized' }, 403);
  return null;
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
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
