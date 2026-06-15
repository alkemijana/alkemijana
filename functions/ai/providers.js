// AI provajderi — adapteri s istim sučeljem: (model, sys, user, env, maxTokens) -> tekst.
// Dodavanje novog provajdera = nova funkcija + unos u callProvider/DEFAULT_MODELS.

export const DEFAULT_MODELS = {
  gemini:     'gemini-2.5-flash',
  cloudflare: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  openai:     'gpt-4o-mini',
  anthropic:  'claude-haiku-4-5-20251001'
};

export async function callProvider(provider, model, sys, user, env, maxTokens) {
  switch (provider) {
    case 'gemini':     return callGemini(model, sys, user, env, maxTokens);
    case 'cloudflare': return callCloudflare(model, sys, user, env, maxTokens);
    case 'openai':     return callOpenAICompatible(model, sys, user, env, maxTokens);
    case 'anthropic':  return callAnthropic(model, sys, user, env, maxTokens);
    default: throw new Error('nepoznat AI_PROVIDER: ' + provider);
  }
}

// Google Gemini (besplatni tier preko AI Studio ključa)
async function callGemini(model, sys, user, env, maxTokens) {
  const key = env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY nije postavljen');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: maxTokens }
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + r.status));
  return (data.candidates && data.candidates[0] && data.candidates[0].content &&
          data.candidates[0].content.parts && data.candidates[0].content.parts.map(p => p.text).join('')) || '';
}

// Cloudflare Workers AI (binding env.AI — bez ključa, besplatna dnevna kvota)
async function callCloudflare(model, sys, user, env, maxTokens) {
  if (!env.AI) throw new Error('AI binding (Workers AI) nije konfiguriran');
  const res = await env.AI.run(model, {
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    max_tokens: maxTokens
  });
  return (res && (res.response || res.result)) || '';
}

// OpenAI-kompatibilni /chat/completions — pokriva OpenAI, Groq, OpenRouter, Mistral, DeepSeek...
// (samo promijeni AI_BASE_URL + AI_MODEL + AI_API_KEY)
async function callOpenAICompatible(model, sys, user, env, maxTokens) {
  const key = env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY nije postavljen');
  const base = (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const r = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.85, max_tokens: maxTokens
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + r.status));
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

// Anthropic (plaćeni — najveća kvaliteta; jednostavna nadogradnja)
async function callAnthropic(model, sys, user, env, maxTokens) {
  const key = env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY nije postavljen');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: sys, messages: [{ role: 'user', content: user }] })
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + r.status));
  return (data.content && data.content.map(c => c.text || '').join('')) || '';
}
