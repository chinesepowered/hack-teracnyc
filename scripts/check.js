// npm run check: verifies every integration with the keys in .env, without spending real money.
import 'dotenv/config';
import { BASE_URL, EXA_API_KEY, WHOP, llmReady, teracReady, whopReady } from '../src/config.js';

const results = [];
async function check(name, ready, fn) {
  if (!ready) return results.push([name, 'SKIP', 'key not set']);
  try {
    results.push([name, 'OK', await fn()]);
  } catch (err) {
    results.push([name, 'FAIL', String(err.message || err).slice(0, 300)]);
  }
}

await check('Claude (agents)', llmReady(), async () => {
  const { writeJson, obj, str } = await import('../src/llm.js');
  const out = await writeJson({ prompt: 'Write a five-word tagline for a capybara-run freelance marketplace.', schema: obj({ tagline: str() }), effort: 'low', maxTokens: 2000 });
  return `tagline: ${out.tagline}`;
});

await check('Whop (payments)', whopReady(), async () => {
  const base = WHOP.sandbox ? 'https://sandbox-api.whop.com/api/v1' : 'https://api.whop.com/api/v1';
  const res = await fetch(`${base}/accounts/me`, { headers: { Authorization: `Bearer ${WHOP.apiKey}` } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 200)}`);
  if (!WHOP.webhookSecret) return 'API key works, but WHOP_WEBHOOK_SECRET is missing: payments will not be confirmed!';
  return `API key works (${WHOP.sandbox ? 'sandbox' : 'live'}), webhook secret set`;
});

await check('Terac MCP (human panel)', teracReady(), async () => {
  const { teracTools, callTerac } = await import('../src/terac.js');
  const tools = await teracTools();
  const ctx = await callTerac('terac_get_context', {});
  return `${tools.length} tools; context: ${ctx.text.replace(/\s+/g, ' ').slice(0, 200)}`;
});

await check('Exa (research)', Boolean(EXA_API_KEY), async () => {
  const { exaSearch } = await import('../src/exa.js');
  const r = await exaSearch('capybara facts', { numResults: 1 });
  return `found: ${r[0]?.title}`;
});

await check('AssemblyAI (narration)', Boolean(process.env.ASSEMBLYAI_API_KEY), async () => {
  const { speak } = await import('./tts.js');
  const r = await speak('Capybara check.');
  return `${r.seconds.toFixed(1)}s of audio`;
});

const isLocal = /localhost|127\.0\.0\.1/.test(BASE_URL);
results.push(['Public URL', isLocal ? 'WARN' : 'OK', isLocal ? `BASE_URL is ${BASE_URL}; Whop webhooks and Terac participants need a public https URL` : BASE_URL]);

for (const [name, status, detail] of results) console.log(`${status.padEnd(5)} ${name.padEnd(26)} ${detail}`);
process.exit(results.some((r) => r[1] === 'FAIL') ? 1 : 0);
