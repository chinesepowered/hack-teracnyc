// Builds the back-office records (data/live.json) from the real study files in study/:
// items and drafts, Terac rounds, parsed human ratings, revisions and the agents' action log.
import fs from 'node:fs';

const read = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const rounds = read('study/rounds.json', []);
const ratings = read('study/ratings.json', []);
const revisions = read('study/revisions.json', {});
const posts = read('study/posts.json', []);
const events = fs.existsSync('study/events.jsonl')
  ? fs.readFileSync('study/events.jsonl', 'utf8').split('\n').filter(Boolean).map((l, i) => ({ id: `ev_${i}`, ...JSON.parse(l) }))
  : [];

const items = new Map();
for (const r of rounds) for (const it of r.items) items.set(it.id, it);
const orders = [...items.values()].map((it) => ({
  id: `ord_${it.id}`, gig: it.gig, brief: it.brief, sample: true, price: 0, email: null,
  status: revisions[it.id] ? 'revised' : 'delivered', createdAt: events[0]?.at, paidAt: events[0]?.at,
  deliverables: [{ version: 1, by: it.gig === 'logo' ? 'pixel' : 'quill', content: it.v1 },
    ...(revisions[it.id] ? [{ version: 2, by: it.gig === 'logo' ? 'pixel' : 'quill', content: revisions[it.id] }] : [])],
  reviews: {}, whop: {}, timeline: [],
}));

const dbRounds = rounds.map((r) => ({
  id: `rnd_${r.slug}`, kind: r.kind, status: r.closedAt ? 'closed' : 'live', target: r.terac?.participants || 8,
  items: r.items.map((it) => ({ orderId: `ord_${it.id}` })), createdAt: r.terac?.launchedAt, closedAt: r.closedAt,
  terac: { status: r.terac?.status, opportunityId: r.terac?.opportunityId, costPerParticipant: r.terac?.costPerParticipant }, results: null,
}));
const dbRatings = ratings.map((x) => ({
  id: `rat_${x.code}`, roundId: `rnd_${x.round}`, sessionId: x.submissionId || x.code, code: x.code, complete: true,
  attention: x.attention === 'capybara', seconds: x.seconds ?? 300, approved: Boolean(x.approved),
  answers: x.answers.map((a) => ({ ...a, orderId: `ord_${a.item}` })), createdAt: x.at,
}));

// Round results, same rules as the live server: attention check passed and at least 40 seconds spent.
const mean = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const pct = (xs) => (xs.length ? Math.round((100 * xs.filter(Boolean).length) / xs.length) : null);
for (const r of dbRounds) {
  const valid = dbRatings.filter((x) => x.roundId === r.id && x.attention && x.seconds >= 40);
  if (!valid.length) continue;
  const per = {};
  for (const x of valid) for (const a of x.answers) (per[a.orderId] ??= []).push(a);
  const all = Object.values(per).flat();
  if (r.kind === 'review') {
    r.results = { n: valid.length, avg: mean(all.map((a) => a.score)), wouldPayPct: pct(all.map((a) => a.wouldPay)),
      items: Object.entries(per).map(([orderId, l]) => ({ orderId, n: l.length, avg: mean(l.map((a) => a.score)), wouldPayPct: pct(l.map((a) => a.wouldPay)), comments: [...new Set(l.map((a) => a.comment).filter(Boolean))] })) };
  } else {
    r.results = { n: valid.length, avgV1: mean(all.map((a) => a.scoreV1)), avgV2: mean(all.map((a) => a.scoreV2)), preferV2Pct: pct(all.map((a) => a.prefer === 2)),
      items: Object.entries(per).map(([orderId, l]) => ({ orderId, n: l.length, avgV1: mean(l.map((a) => a.scoreV1)), avgV2: mean(l.map((a) => a.scoreV2)), preferV2Pct: pct(l.map((a) => a.prefer === 2)), comments: [...new Set(l.map((a) => a.comment).filter(Boolean))] })) };
  }
  for (const item of r.results.items) {
    const o = orders.find((x) => x.id === item.orderId);
    if (o) o.reviews[r.kind === 'review' ? 1 : 2] = item;
  }
}

const teracCalls = events.filter((e) => e.teracTool).map((e) => ({ at: e.at, tool: e.teracTool }));
const db = {
  orders, rounds: dbRounds, ratings: dbRatings, events, decisions: events.filter((e) => e.kind === 'memo').map((e) => ({ at: e.at, memo: e.text.replace(/^Board meeting: /, ''), decisions: [], applied: [] })),
  posts, legal: {}, webhookIds: [], teracCalls, jobs: [],
  settings: { prices: {}, paused: {}, adminToken: process.env.ADMIN_TOKEN || undefined },
  metrics: { visits: 0, orderStarts: 0, checkouts: 3 },
};
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/live.json', JSON.stringify(db, null, 1));
console.log(`data/live.json: ${orders.length} items, ${dbRounds.length} rounds, ${dbRatings.length} human ratings, ${events.length} events`);
