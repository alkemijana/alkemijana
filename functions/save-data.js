export async function onRequestPost({ request, env }) {
  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  const REPO_OWNER   = 'alkemijana';
  const REPO_NAME    = 'alkemijana';
  const FILE_PATH    = 'js/data.js';
  const BRANCH       = 'master';

  if (!GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  if (body.pass !== 'morasmora2026') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const content = body.content;
  if (!content) {
    return new Response(JSON.stringify({ error: 'No content' }), { status: 400 });
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
