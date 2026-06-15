// Cloudflare Pages route /interpret-natal — TANKI ULAZ.
// Cijela AI logika (provajderi, cache, rate-limit, prompt) je u mapi functions/ai/.
// Ovaj shim mora ostati u functions/ jer Cloudflare Pages tu rutira; sve ostalo je
// izdvojeno u functions/ai/ (te se datoteke ne serviraju javno niti su zasebne rute).
import { handleInterpret } from './ai/core.js';

export function onRequestPost(ctx) {
  return handleInterpret(ctx);
}
