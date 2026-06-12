// Čitanje/brisanje evidencije natalnih karata — SAMO admin (X-Admin-Pass header).
// GET  -> lista zapisa.  POST {action:'delete', key} | {action:'clear'} -> brisanje.

export async function onRequestGet({ request, env }) {
  const unauth = checkAuth(request, env);
  if (unauth) return unauth;

  const KV = env.NATAL_LOG;
  if (!KV) return json({ ok: true, entries: [], note: 'KV (NATAL_LOG) nije konfiguriran — vidi CLAUDE.md za postavljanje.' }, 200);

  try {
    const entries = [];
    let cursor;
    do {
      const list = await KV.list({ prefix: 'e:', cursor });
      for (const k of list.keys) {
        const v = await KV.get(k.name);
        if (!v) continue;
        try { const o = JSON.parse(v); o._key = k.name; entries.push(o); } catch {}
      }
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);

    entries.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)); // najnoviji prvi
    return json({ ok: true, entries }, 200);
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

  try {
    if (body.action === 'delete' && body.key) {
      await KV.delete(String(body.key));
      return json({ ok: true }, 200);
    }
    if (body.action === 'clear') {
      let cursor;
      do {
        const list = await KV.list({ prefix: 'e:', cursor });
        for (const k of list.keys) await KV.delete(k.name);
        cursor = list.list_complete ? null : list.cursor;
      } while (cursor);
      return json({ ok: true }, 200);
    }
    return json({ ok: false, error: 'Nepoznata akcija' }, 400);
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
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
