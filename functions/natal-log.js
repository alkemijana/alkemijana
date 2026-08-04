// Statistika izrađenih karata - SAMO admin (X-Admin-Pass). Čita samo nazive ključeva
// (datum je u nazivu), pa ne troši po-ključ dohvate. POST {action:'reset'} briše brojač.
// Autentikacija i zaštita od pogađanja lozinke: lib/admin-auth.js.

import { guardAdmin, passFromHeader, json } from './lib/admin-auth.js';

export async function onRequestGet({ request, env }) {
  const denied = await guardAdmin(request, env, passFromHeader(request));
  if (denied) return denied;

  const KV = env.NATAL_LOG;
  if (!KV) return json({ ok: true, total: 0, last30: 0, last7: 0, note: 'KV (NATAL_LOG) nije konfiguriran - vidi CLAUDE.md za postavljanje.' }, 200);

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
  const denied = await guardAdmin(request, env, passFromHeader(request));
  if (denied) return denied;

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
