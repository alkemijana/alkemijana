exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER   = 'alkemijana';
  const REPO_NAME    = 'alkemijana';
  const FILE_PATH    = 'js/data.js';
  const BRANCH       = 'master';

  if (!GITHUB_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not configured' }) };
  }

  // Provjera admin lozinke
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (body.pass !== 'alkemijana2026') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const content  = body.content;
  if (!content) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No content' }) };
  }

  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Alkemijana-Admin'
  };

  try {
    // 1. Dohvati trenutni SHA fajla
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`,
      { headers }
    );
    const getData = await getRes.json();
    const sha     = getData.sha;

    // 2. Ažuriraj fajl
    const updateRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Admin: ažuriranje podataka',
          content: Buffer.from(content).toString('base64'),
          sha,
          branch: BRANCH
        })
      }
    );

    if (updateRes.ok) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Spremljeno! Stranica se ažurira za ~30 sekundi.' })
      };
    } else {
      const err = await updateRes.json();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GitHub API error', details: err.message })
      };
    }
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
