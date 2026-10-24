// Collects Terac submissions awaiting review: downloads each uploaded answers file, parses it into
// study/ratings.json, and approves the ones that parse and pass the attention check.
//   node scripts/terac-collect.js <opportunityId> <roundSlug> [--no-approve]
// Screenshots (images) are saved for a manual read and listed at the end.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [opp, round, flag] = process.argv.slice(2);
const approve = flag !== '--no-approve';
const client = new Client({ name: 'capygigs-honey', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('https://terac.com/api/mcp'), { requestInit: { headers: { 'x-api-key': process.env.TERAC_API_KEY } } }));
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 240000 });
  const text = (r.content || []).map((c) => c.text || '').join('');
  if (r.isError) throw new Error(`${name}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return text; }
};
const narrate = (text, tool) => fetch(`${(process.env.AGENT_URL || 'http://localhost:3500').replace(/\/$/, '')}/api/agent/log`, {
  method: 'POST', headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ agent: 'honey', text, teracTool: tool }),
}).catch(() => {});
const logEvent = (text, extra = {}) => fs.appendFileSync('study/events.jsonl', `${JSON.stringify({ at: new Date().toISOString(), agent: 'honey', text, ...extra })}\n`);

const ratingsFile = 'study/ratings.json';
const ratings = fs.existsSync(ratingsFile) ? JSON.parse(fs.readFileSync(ratingsFile, 'utf8')) : [];
const seen = new Set(ratings.map((r) => r.submissionId));

function parse(text) {
  const head = text.match(/code (CAPY-[A-Z0-9]+)/);
  const secs = text.match(/Seconds spent: (\d+)/);
  const att = text.match(/Attention check: (\w+)/);
  const answers = [];
  const re = /^\d+\. .*?\[(\w+)\](?: A=v(\d) B=v\d)?: (.*)\n\s+"(.*)"$/gm;
  for (const m of text.matchAll(re)) {
    const [, item, left, rest, comment] = m;
    if (left) {
      const pm = rest.match(/prefers (A|B) · A (\d+)\/10 · B (\d+)\/10/);
      if (!pm) continue;
      const l = Number(left);
      const [sa, sb] = [Number(pm[2]), Number(pm[3])];
      answers.push({ item, prefer: pm[1] === 'A' ? l : 3 - l, scoreV1: l === 1 ? sa : sb, scoreV2: l === 1 ? sb : sa, comment });
    } else {
      const sm = rest.match(/score (\d+)\/10 · would pay: (yes|no)/);
      if (!sm) continue;
      answers.push({ item, score: Number(sm[1]), wouldPay: sm[2] === 'yes', comment });
    }
  }
  return { code: head?.[1], seconds: secs ? Number(secs[1]) : null, attention: att?.[1], answers };
}

const urlsIn = (obj, acc = []) => {
  if (typeof obj === 'string') { if (/^https?:\/\//.test(obj) && !/terac\.com\/[^/]+\/[^/]+\/opportunities/.test(obj)) acc.push(obj); }
  else if (Array.isArray(obj)) obj.forEach((x) => urlsIn(x, acc));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((x) => urlsIn(x, acc));
  return acc;
};

const list = await call('terac_get_submissions', { opportunityId: opp, status: 'awaiting_review', limit: 100 });
await narrate('Terac MCP → terac_get_submissions', 'terac_get_submissions');
const manual = [];
const dir = path.join('study/uploads', round);
fs.mkdirSync(dir, { recursive: true });
for (const sub of list.data || []) {
  if (seen.has(sub.id)) continue;
  const detail = await call('terac_get_submission', { submissionId: sub.id });
  fs.writeFileSync(path.join(dir, `${sub.id}.json`), JSON.stringify(detail, null, 1));
  const files = urlsIn(detail);
  let parsed = null;
  for (const [i, url] of files.entries()) {
    const res = await fetch(url);
    if (!res.ok) continue;
    const type = res.headers.get('content-type') || '';
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = type.includes('image/') ? `.${type.split('/')[1].split(';')[0]}` : type.includes('pdf') ? '.pdf' : '.txt';
    const file = path.join(dir, `${sub.id}-${i}${ext}`);
    fs.writeFileSync(file, buf);
    if (ext === '.txt') { const p = parse(buf.toString('utf8')); if (p.answers.length) parsed = p; }
    else manual.push(file);
  }
  if (!parsed) { console.log(`${sub.id}: no parseable answers file (files: ${files.length}); needs a manual read`); continue; }
  const record = { submissionId: sub.id, round, at: sub.updated_at || new Date().toISOString(), ...parsed, approved: false };
  if (approve && parsed.attention === 'capybara' && parsed.answers.length) {
    await call('terac_approve_submission', { submissionId: sub.id });
    record.approved = true;
    await narrate('Terac MCP → terac_approve_submission (reviewer paid)', 'terac_approve_submission');
    logEvent(`Approved a human reviewer on Terac (${parsed.answers.length} grades, attention check passed)`, { teracTool: 'terac_approve_submission' });
  }
  ratings.push(record);
  seen.add(sub.id);
  console.log(`${sub.id}: ${parsed.answers.length} answers, attention=${parsed.attention}, approved=${record.approved}`);
}
fs.writeFileSync(ratingsFile, JSON.stringify(ratings, null, 1));
if (manual.length) console.log(`Screenshots to read manually:\n${manual.join('\n')}`);
console.log(`ratings on file: ${ratings.length}`);
await client.close();
