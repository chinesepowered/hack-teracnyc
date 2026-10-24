// Polls a Terac opportunity and exits when submissions awaiting review exceed a threshold
// (or the time budget runs out), so the agent wakes up to review them.
//   node scripts/terac-watch.js <opportunityId> <awaitingThreshold> [maxMinutes]
import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [opp, threshold = '0', maxMin = '30'] = process.argv.slice(2);
const until = Date.now() + Number(maxMin) * 60000;
const connect = async () => {
  const client = new Client({ name: 'capygigs-watch', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('https://terac.com/api/mcp'), { requestInit: { headers: { 'x-api-key': process.env.TERAC_API_KEY } } }));
  return client;
};
let client = await connect();
while (Date.now() < until) {
  try {
    const r = await client.callTool({ name: 'terac_get_opportunity', arguments: { opportunityId: opp } }, undefined, { timeout: 120000 });
    const text = (r.content || []).map((c) => c.text || '').join('');
    const s = JSON.parse(text).submission_stats || {};
    const line = `${new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} total=${s.total} in_progress=${s.in_progress} awaiting_review=${s.awaiting_review} approved=${s.approved}`;
    console.log(line);
    if ((s.awaiting_review || 0) > Number(threshold)) { console.log('READY'); process.exit(0); }
  } catch (err) {
    console.log(`poll error: ${err.message}`);
    try { client = await connect(); } catch {}
  }
  await new Promise((r) => setTimeout(r, 60000));
}
console.log('TIMEOUT');
