// Spremanje podataka iz admina: javni js/data.js -> GitHub commit, puni (skriveni)
// podaci -> privatni KV. Autentikacija i zaštita od pogađanja: lib/admin-auth.js.
import { guardAdmin } from './lib/admin-auth.js';

export async function onRequestPost({ request, env }) {
  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  const ADMIN_PASS   = env.ADMIN_PASS;
  const REPO_OWNER   = 'alkemijana';
  const REPO_NAME    = 'alkemijana';
  const FILE_PATH    = 'js/data.js';
  const BRANCH       = 'master';

  if (!GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), { status: 500 });
  }
  if (!ADMIN_PASS) {
    return new Response(JSON.stringify({ error: 'ADMIN_PASS not configured' }), { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const provided = request.headers.get('x-admin-pass') || body.pass || '';
  const denied = await guardAdmin(request, env, provided);
  if (denied) return denied;

  const content = body.content;
  if (!content) {
    return new Response(JSON.stringify({ error: 'No content' }), { status: 400 });
  }

  // ── PRIVATNA POHRANA ──
  // Puni podaci (uključujući isključeno/arhivirano) idu u KV, NIKAD u javni repo.
  // Javni js/data.js (body.content) sadrži samo vidljivo. Admin puni skup vraća
  // preko /admin-data (uz lozinku). Bez ovoga bi skriveni sadržaj curio u javni
  // data.js i Google/AI bi ga čitali.
  const KV = env.NATAL_LOG;
  if (body.full) {
    if (!KV) {
      // Bez KV-a ne smijemo commitati okljaštreni javni file jer bi se skriveni
      // sadržaj nepovratno izgubio - prekini prije GitHub commita.
      if (body.hasHidden) {
        return new Response(JSON.stringify({ error: 'KV (NATAL_LOG) nije konfiguriran - skriveni/arhivirani sadržaj se ne može privatno pohraniti. Postavi KV binding (vidi CLAUDE.md) pa pokušaj ponovo.' }), { status: 500 });
      }
    } else {
      try {
        await KV.put('admin:full', JSON.stringify(body.full));
      } catch (e) {
        return new Response(JSON.stringify({ error: 'KV write failed: ' + e.message }), { status: 500 });
      }
    }
  }

  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Alkemijana-Admin'
  };

  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`,
      { headers }
    );
    const getData = await getRes.json();
    const sha = getData.sha;

    const updateRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Admin: ažuriranje podataka',
          content: btoa(unescape(encodeURIComponent(content))),
          sha,
          branch: BRANCH
        })
      }
    );

    if (updateRes.ok) {
      return new Response(JSON.stringify({ success: true, message: 'Spremljeno! Stranica se ažurira za ~30 sekundi.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const err = await updateRes.json();
      return new Response(JSON.stringify({ error: 'GitHub API error', details: err.message }), { status: 500 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
