// Anonimno broji JEDINSTVENE izrade natalne karte. NE sprema nikakve osobne podatke —
// prima samo hash unosa (h), računat na klijentu. KV binding: NATAL_LOG.
// Ključevi:  s:<hash>            -> dedup (broji se samo prvi put)
//            c:<YYYYMMDD>:<hash> -> brojač s datumom (stats čitaju samo nazive ključeva)
export async function onRequestPost({ request, env }) {
  const KV = env.NATAL_LOG;

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  // Ako KV nije konfiguriran, tiho ne radi ništa (ne ruši izradu karte).
  if (!KV) return json({ ok: false, error: 'KV (NATAL_LOG) nije konfiguriran' }, 200);

  const h = typeof body.h === 'string' ? body.h.toLowerCase() : '';
  if (!/^[0-9a-f]{16,128}$/.test(h)) return json({ ok: false, error: 'bad hash' }, 400);

  try {
    const seen = await KV.get('s:' + h);
    if (seen === null) {
      const d = new Date();
      const ymd = d.getUTCFullYear().toString() +
        String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0');
      await KV.put('s:' + h, '1');
      await KV.put('c:' + ymd + ':' + h, '');
    }
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
