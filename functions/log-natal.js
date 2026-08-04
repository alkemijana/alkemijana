// Anonimno broji JEDINSTVENE izrade natalne karte. NE sprema nikakve osobne podatke -
// prima samo hash unosa (h), računat na klijentu. KV binding: NATAL_LOG.
// Ključevi:  s:<hash>            -> dedup (broji se samo prvi put)
//            c:<YYYYMMDD>:<hash> -> brojač s datumom (stats čitaju samo nazive ključeva)
//            d:<YYYYMMDD>:<iphash> -> dnevni limit po posjetitelju (v. niže)
//
// OVA RUTA JE JAVNA (bez lozinke) jer je zove svaki posjetitelj koji izradi kartu.
// Zato ima dnevni limit: bez njega bi bilo tko skriptom mogao slati izmišljene hasheve,
// napuhati statistiku i potrošiti dnevnu kvotu KV upisa (besplatni plan: 1000/dan),
// nakon čega bi brojač prestao raditi za sve. Limit troši upis samo kad hash zaista
// jest nov, pa normalnog posjetitelja ne dira.
import { hashedIpKey } from './lib/admin-auth.js';

const MAX_PER_DAY = 40; // koliko NOVIH karata dnevno po posjetitelju ulazi u brojač

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
      const ymd = todayYmd();

      // Dnevni limit po posjetitelju. Prekoračenje se ne prijavljuje kao greška -
      // izrada karte na stranici mora raditi normalno, samo se ne broji.
      const ipKey = await hashedIpKey(request, env.ADMIN_PASS, 'd:' + ymd + ':');
      if (ipKey) {
        const n = parseInt(await KV.get(ipKey), 10) || 0;
        if (n >= MAX_PER_DAY) return json({ ok: true, counted: false }, 200);
        // 36h TTL: ključ nadživi svoj dan pa se limit ne resetira u ponoć na pola sesije
        await KV.put(ipKey, String(n + 1), { expirationTtl: 60 * 60 * 36 });
      }

      await KV.put('s:' + h, '1');
      await KV.put('c:' + ymd + ':' + h, '');
    }
  } catch (e) {
    return json({ ok: false, error: e.message }, 200);
  }
  return json({ ok: true }, 200);
}

function todayYmd() {
  const d = new Date();
  return d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
