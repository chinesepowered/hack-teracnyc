import { EXA_API_KEY } from './config.js';

// Live web research for Scout's competitor reports.
export async function exaSearch(query, { numResults = 5 } = {}) {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': EXA_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      numResults,
      type: 'auto',
      contents: { text: { maxCharacters: 1800 } },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Exa search ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return (json.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    published: r.publishedDate,
    text: (r.text || '').replace(/\s+/g, ' ').slice(0, 1800),
  }));
}
