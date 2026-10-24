import crypto from 'node:crypto';
import express from 'express';
import {
  ADMIN_TOKEN_ENV, BASE_URL, CEO_INTERVAL_MIN, DEMO_MODE, GIGS, PORT, STAFF, TERAC_POLL_MIN,
  llmReady, teracReady, whopReady,
} from './config.js';
import { bus, db, findOrder, findRound, log, newId, resetDb, save, stats, touch } from './store.js';
import { agentMode, completeJob, failJob, orphanStaleJobs, pendingJobs } from './llm.js';
import { createCheckout, getPayment, verifyWebhook } from './whop.js';
import { boardMeeting, priceOf } from './agents/ceo.js';
import { draftPosts } from './agents/cmo.js';
import { DOCS, draftPolicies, policy } from './agents/legal.js';
import { closeRound, ensureRound, tick, validRatings } from './agents/honey.js';
import { createSamples, fulfill } from './agents/workers.js';
import * as ui from './ui.js';

const ADMIN_TOKEN = ADMIN_TOKEN_ENV || (db.settings.adminToken ??= crypto.randomBytes(12).toString('hex'));
const SIGNING_SECRET = (db.settings.signingSecret ??= crypto.randomBytes(16).toString('hex'));
save();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// ---------- Whop webhook (raw body, verified) ----------
app.post('/webhooks/whop', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  let verified;
  try {
    verified = verifyWebhook(req.body.toString('utf8'), req.headers);
  } catch (err) {
    log('penny', `Rejected a webhook: ${err.message}`, { level: 'error' });
    return res.status(401).send('invalid');
  }
  const { id, event } = verified;
  if (db.webhookIds.includes(id)) return res.send('duplicate');
  db.webhookIds.push(id);
  if (db.webhookIds.length > 1000) db.webhookIds.splice(0, 500);
  save();
  res.send('ok');
  if (['payment.succeeded', 'payment_succeeded'].includes(event.type)) {
    await onPayment(event.data).catch((err) => log('penny', `Payment handling failed: ${err.message}`, { level: 'error' }));
  }
});

const matchOrder = (p) =>
  (p?.metadata?.order_id && findOrder(p.metadata.order_id)) ||
  db.orders.find((o) => o.whop?.checkoutId && o.whop.checkoutId === p?.checkout_configuration_id) ||
  db.orders.find((o) => o.whop?.planId && o.whop.planId === p?.plan?.id);

async function onPayment(payment) {
  let order = matchOrder(payment);
  if (!order && payment?.id) order = matchOrder(await getPayment(payment.id));
  if (!order) return log('penny', `Whop payment ${payment?.id} arrived but matches no order`, { level: 'error' });
  if (order.paidAt) return;
  const amount = Number(payment.usd_total ?? payment.total ?? payment.subtotal ?? order.price);
  Object.assign(order, {
    paidAt: new Date().toISOString(), amountPaid: amount, currency: payment.currency || 'usd', status: 'paid',
    email: order.email || payment.user?.email || null,
  });
  order.whop.paymentId = payment.id;
  order.timeline.push({ at: order.paidAt, text: `Payment of $${amount.toFixed(2)} confirmed by Whop.` });
  log('penny', `💸 $${amount.toFixed(2)} received through Whop for a ${GIGS[order.gig].title}`, { orderId: order.id, kind: 'revenue' });
  touch('order', { id: order.id });
  fulfill(order.id);
}

const smallJson = express.json({ limit: '200kb' });
app.use((req, res, next) => (req.path === '/api/agent/import' ? next() : smallJson(req, res, next)));
app.use('/static', express.static('public', { maxAge: '10m' }));

const html = (res, body) => res.type('html').send(body);
const prices = () => Object.fromEntries(Object.keys(GIGS).map((g) => [g, priceOf(g)]));
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

// ---------- storefront ----------
app.get('/', (req, res) => {
  db.metrics.visits++;
  save();
  html(res, ui.home({ prices: prices(), paused: db.settings.paused, stats: stats() }));
});

app.get('/order/:gig', (req, res) => {
  const gig = GIGS[req.params.gig];
  if (!gig) return res.redirect('/#gigs');
  html(res, ui.orderForm({ gig, price: priceOf(gig.id) }));
});

app.post('/api/orders', async (req, res) => {
  const gig = GIGS[req.body.gig];
  if (!gig || db.settings.paused[gig.id]) return res.status(400).json({ error: 'That gig is not available right now.' });
  const brief = {};
  for (const f of gig.fields) {
    brief[f.name] = clip(req.body[f.name], f.textarea ? 1200 : 200);
    if (f.required && !brief[f.name]) return res.status(400).json({ error: `Please fill in: ${f.label}` });
  }
  const email = clip(req.body.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'That email looks off.' });
  const now = new Date().toISOString();
  const order = {
    id: newId('ord'), gig: gig.id, brief, email: email || null, price: priceOf(gig.id), status: 'awaiting_payment',
    createdAt: now, deliverables: [], reviews: {}, whop: {}, timeline: [{ at: now, text: 'Order created. Waiting for payment.' }],
  };
  db.orders.push(order);
  db.metrics.orderStarts++;
  if (DEMO_MODE) {
    order.demo = true;
    touch('order', { id: order.id });
    return res.json({ url: `/o/${order.id}` });
  }
  if (!whopReady()) return res.status(503).json({ error: 'Payments are not switched on yet. Please try again in a few minutes.' });
  try {
    order.whop = await createCheckout({ order, gig });
    db.metrics.checkouts++;
    log('penny', `Opened a $${order.price} Whop checkout for a ${gig.title}`, { orderId: order.id });
    touch('order', { id: order.id });
    res.json({ url: order.whop.purchaseUrl });
  } catch (err) {
    log('penny', `Could not open a Whop checkout: ${err.message}`, { level: 'error' });
    res.status(502).json({ error: 'Could not start checkout. Please try again.' });
  }
});

app.get('/o/:id', (req, res) => {
  const order = findOrder(req.params.id);
  if (!order || order.sample) return res.status(404).send('Order not found');
  html(res, ui.orderPage(order));
});

app.get('/api/orders/:id', (req, res) => {
  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  res.json({ status: order.status, versions: order.deliverables.length, reviewed: Object.keys(order.reviews || {}).length });
});

// Preview mode only: there is no real payment, so the button stands in for Whop.
app.post('/api/demo/pay/:id', async (req, res) => {
  const order = findOrder(req.params.id);
  if (!DEMO_MODE || !order?.demo) return res.status(404).end();
  await onPayment({ id: `demo_${order.id}`, metadata: { order_id: order.id }, total: order.price, currency: 'usd' });
  res.json({ ok: true });
});

// ---------- HQ ----------
function hqState() {
  const lastByAgent = {};
  for (const e of db.events) lastByAgent[e.agent] = e;
  return {
    stats: stats(),
    lastByAgent,
    events: db.events.slice(-60).reverse(),
    decision: db.decisions.at(-1),
    rounds: db.rounds.map((r) => ({ id: r.id, kind: r.kind, status: r.status, items: r.items.length, valid: validRatings(r).length, target: r.target, terac: r.terac })),
    posts: db.posts.slice(-3).reverse(),
    prices: prices(),
  };
}
app.get('/hq', (req, res) => html(res, ui.hq(hqState())));
app.get('/api/hq', (req, res) => {
  const s = hqState();
  res.json({ stats: s.stats, decision: s.decision, rounds: s.rounds, posts: s.posts, prices: s.prices });
});

app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  send('stats', stats());
  const onEvent = (e) => send('event', e);
  let pending = null;
  const onChange = (c) => {
    if (pending) return;
    pending = setTimeout(() => { pending = null; send('stats', stats()); send('change', c); }, 300);
  };
  bus.on('event', onEvent);
  bus.on('change', onChange);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => { bus.off('event', onEvent); bus.off('change', onChange); clearInterval(ping); clearTimeout(pending); });
});

// ---------- human rating rounds (participants arrive from Terac) ----------
const signRound = (roundId, t) => crypto.createHmac('sha256', SIGNING_SECRET).update(`${roundId}.${t}`).digest('hex').slice(0, 32);

app.get('/rate/:id', (req, res) => {
  const round = findRound(req.params.id);
  if (!round) return res.status(404).send('This study has ended. Thank you!');
  // ?preview=1 shows a closed round's items read-only (used for the demo video); submissions stay closed.
  const items = round.status === 'closed' && req.query.preview !== '1' ? [] : round.items
    .map((i) => ({ order: findOrder(i.orderId), left: crypto.randomInt(1, 3) }))
    .filter((i) => i.order && i.order.deliverables.length >= (round.kind === 'review' ? 1 : 2))
    .sort(() => Math.random() - 0.5);
  const t = Date.now();
  html(res, ui.ratePage({ round, items, token: { t, sig: signRound(round.id, t) } }));
});

const score = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null; };

app.post('/api/rate/:id', (req, res) => {
  const round = findRound(req.params.id);
  if (!round || round.status === 'closed') return res.status(400).json({ error: 'This study has ended. Thank you!' });
  const { sessionId, t, sig, answers, attention, meta } = req.body || {};
  if (!sessionId || signRound(round.id, t) !== sig) return res.status(400).json({ error: 'Please reload the page and try again.' });
  const existing = db.ratings.find((r) => r.roundId === round.id && r.sessionId === sessionId && r.complete);
  if (existing) return res.json({ code: existing.code });
  const allowed = new Set(round.items.map((i) => i.orderId));
  if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: 'Please answer every question.' });
  const clean = [];
  for (const a of answers) {
    if (!allowed.has(a.orderId)) continue;
    const comment = clip(a.comment, 500);
    if (round.kind === 'review') {
      if (!score(a.score) || typeof a.wouldPay !== 'boolean') return res.status(400).json({ error: 'Please answer every question.' });
      clean.push({ orderId: a.orderId, score: score(a.score), wouldPay: a.wouldPay, comment });
    } else {
      const left = a.left === 2 ? 2 : 1;
      if (!score(a.scoreA) || !score(a.scoreB) || !['A', 'B'].includes(a.prefer)) return res.status(400).json({ error: 'Please answer every question.' });
      const prefer = a.prefer === 'A' ? left : 3 - left;
      const [scoreV1, scoreV2] = left === 1 ? [score(a.scoreA), score(a.scoreB)] : [score(a.scoreB), score(a.scoreA)];
      clean.push({ orderId: a.orderId, prefer, scoreV1, scoreV2, comment });
    }
  }
  const code = `CAPY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const rating = {
    id: newId('rat'), roundId: round.id, sessionId: clip(sessionId, 80), code, complete: true,
    attention: attention === 'capybara', seconds: Math.round((Date.now() - Number(t)) / 1000),
    answers: clean, meta: clip(JSON.stringify(meta || {}), 500), createdAt: new Date().toISOString(),
  };
  db.ratings.push(rating);
  log('honey', `A real human just ${round.kind === 'review' ? 'graded' : 'compared'} ${clean.length} pieces of work`, { kind: 'rating' });
  touch('rating', { roundId: round.id });
  res.json({ code });
  if (validRatings(round).length >= round.target) closeRound(round.id).catch((e) => log('honey', `Close failed: ${e.message}`));
});

// ---------- report, legal, admin ----------
app.get('/report', (req, res) => {
  const latest = (kind) => [...db.rounds].reverse().find((r) => r.kind === kind && r.results) || [...db.rounds].reverse().find((r) => r.kind === kind);
  const review = latest('review');
  const compare = latest('compare');
  const reviewed = db.orders.filter((o) => o.reviews?.[1] || o.deliverables.length > 1)
    .sort((a, b) => (b.reviews?.[2] ? 1 : 0) - (a.reviews?.[2] ? 1 : 0));
  html(res, ui.reportPage({
    review, compare, cards: reviewed.map(ui.reportCard).join(''), humans: stats().humans, teracCalls: (db.teracCalls || []).length,
  }));
});

app.get('/legal/:doc', (req, res) => {
  const title = DOCS[req.params.doc];
  if (!title) return res.status(404).send('Not found');
  html(res, ui.legalPage(title, policy(req.params.doc)));
});

app.get('/demo/title', (req, res) => html(res, ui.titleCard({ line1: clip(req.query.l1, 80) || 'CapyGigs', line2: clip(req.query.l2, 120) || 'Freelancers that never sleep (but nap a lot)' })));

app.get('/admin', (req, res) => html(res, ui.adminPage()));

function isAdmin(req) {
  const given = String(req.headers.authorization || '').replace(/^Bearer /, '');
  return given.length === ADMIN_TOKEN.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(ADMIN_TOKEN));
}
const adminOnly = (req, res, next) => (isAdmin(req) ? next() : res.status(401).json({ error: 'bad token' }));

app.post('/api/admin/:action', adminOnly, async (req, res) => {
  try {
    const action = req.params.action;
    const out =
      action === 'meeting' ? await boardMeeting('manual') :
      action === 'posts' ? await draftPosts('manual push') :
      action === 'samples' ? (await createSamples(3)).map((o) => o.id) :
      action === 'review' ? ensureRound('review').id :
      action === 'compare' ? ensureRound('compare').id :
      action === 'terac' ? (await tick(), db.rounds.map((r) => ({ id: r.id, status: r.status, terac: r.terac }))) :
      action === 'close' ? await closeRound(db.rounds.find((r) => r.status !== 'closed')?.id, 'manual close') :
      action === 'legal' ? (db.legal = {}, await draftPolicies(), Object.keys(db.legal)) :
      null;
    res.json({ ok: true, out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- agent API: the external Claude agent claims work and reports back ----------
const jobView = (j) => ({ id: j.id, kind: j.kind, agent: j.agent, createdAt: j.createdAt, system: j.system, prompt: j.prompt, schema: j.schema });

app.get('/api/agent/jobs', adminOnly, (req, res) => res.json(pendingJobs().map(jobView)));

// Long-poll: answers as soon as there is work (or after ?max seconds). Also keeps a sleepy host awake.
app.get('/api/agent/wait', adminOnly, (req, res) => {
  const max = Math.min(55, Number(req.query.max) || 25) * 1000;
  const reply = () => res.json({ pending: pendingJobs().length });
  if (pendingJobs().length) return reply();
  const timer = setTimeout(() => { bus.off('job', onJob); reply(); }, max);
  const onJob = () => { clearTimeout(timer); bus.off('job', onJob); setTimeout(reply, 200); };
  bus.on('job', onJob);
  req.on('close', () => { clearTimeout(timer); bus.off('job', onJob); });
});

app.post('/api/agent/jobs/:id/complete', adminOnly, (req, res) => {
  try {
    completeJob(req.params.id, req.body.result);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/agent/jobs/:id/fail', adminOnly, (req, res) => {
  try {
    failJob(req.params.id, req.body.error || 'failed');
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// The agent narrates what it does outside the server (e.g. Terac MCP calls) into the HQ feed.
app.post('/api/agent/log', adminOnly, (req, res) => {
  const agent = STAFF[req.body.agent] ? req.body.agent : 'bara';
  log(agent, clip(req.body.text, 400), req.body.kind ? { kind: clip(req.body.kind, 20) } : {});
  if (req.body.teracTool) {
    db.teracCalls ??= [];
    db.teracCalls.push({ at: new Date().toISOString(), tool: clip(req.body.teracTool, 80), isError: Boolean(req.body.isError) });
    save();
  }
  res.json({ ok: true });
});

// Honey's Terac state for a round, as reported by the agent.
app.post('/api/agent/rounds/:id', adminOnly, (req, res) => {
  const round = findRound(req.params.id);
  if (!round) return res.status(404).json({ error: 'no such round' });
  const { status, live, ...terac } = req.body || {};
  round.terac = { ...round.terac, ...terac, ...(status ? { status } : {}), checkedAt: new Date().toISOString() };
  if (round.status === 'draft') round.status = 'recruiting';
  if (live && round.status !== 'closed') round.status = 'live';
  touch('round', { id: round.id });
  res.json({ ok: true, round: { id: round.id, status: round.status, terac: round.terac, url: `${BASE_URL}/rate/${round.id}` } });
});

app.get('/api/agent/rounds', adminOnly, (req, res) => res.json(db.rounds.map((r) => ({
  id: r.id, kind: r.kind, status: r.status, target: r.target, items: r.items.length, url: `${BASE_URL}/rate/${r.id}`, terac: r.terac,
  validReviews: validRatings(r).length,
  codes: db.ratings.filter((x) => x.roundId === r.id && x.complete).map((x) => ({ code: x.code, valid: validRatings(r).includes(x), approved: Boolean(x.approved) })),
}))));

app.post('/api/agent/rounds/:id/approved', adminOnly, (req, res) => {
  const codes = new Set(req.body.codes || []);
  let n = 0;
  for (const r of db.ratings) if (r.roundId === req.params.id && codes.has(r.code) && !r.approved) { r.approved = true; n++; }
  if (n) log('honey', `Approved ${n} human reviewers on Terac`);
  touch('round', { id: req.params.id });
  res.json({ ok: true, approved: n });
});

app.post('/api/agent/rounds/:id/close', adminOnly, async (req, res) => {
  closeRound(req.params.id, clip(req.body.reason, 120) || 'closed by Honey').catch((e) => log('honey', `Close failed: ${e.message}`));
  res.json({ ok: true });
});

// Backups: the free host's disk is temporary, so the agent keeps copies.
app.get('/api/agent/export', adminOnly, (req, res) => res.json(db));
app.post('/api/agent/import', adminOnly, express.json({ limit: '20mb' }), (req, res) => {
  if (!req.body?.orders) return res.status(400).json({ error: 'not a CapyGigs export' });
  resetDb(req.body);
  orphanStaleJobs();
  log('bara', 'Restored company records from the latest backup');
  res.json({ ok: true, orders: db.orders.length });
});

// What the demo video should show: the best public order and a round with something to grade.
app.get('/api/showcase', (req, res) => {
  const order = db.orders
    .filter((o) => !o.sample && o.deliverables.length)
    .sort((a, b) => b.deliverables.length - a.deliverables.length || (b.paidAt || '').localeCompare(a.paidAt || ''))[0];
  const round = db.rounds.find((r) => r.status !== 'closed' && r.items.length) || [...db.rounds].reverse().find((r) => r.items.length);
  res.json({ orderId: order?.id ?? null, hasRevision: (order?.deliverables.length ?? 0) > 1, roundId: round?.id ?? null });
});

app.get('/healthz', (req, res) => res.json({ ok: true, brain: agentMode() ? 'agent queue' : 'claude api', whop: whopReady(), terac: teracReady(), pendingJobs: pendingJobs().length }));

// ---------- autonomy loop ----------
function startAgents() {
  const safe = (name, fn) => () => Promise.resolve().then(fn).catch((err) => log(name, `Error: ${err.message}`, { level: 'error' }));
  orphanStaleJobs();
  if (agentMode()) log('bara', 'Running on the agent queue: a Claude agent picks up every job through /api/agent');
  // Crash recovery: finish anything that was paid but not delivered.
  for (const o of db.orders) if (o.paidAt && !o.deliverables.length && o.status !== 'failed') fulfill(o.id);
  setTimeout(safe('lex', draftPolicies), 2000);
  if (!db.posts.length) setTimeout(safe('hype', () => draftPosts('launch day')), 4000);
  if (!db.rounds.length) {
    setTimeout(safe('honey', async () => {
      ensureRound('review');
      await tick(); // in API mode this requests the Terac quote right away; quotes can take a while
      await createSamples(6);
    }), 6000);
  }
  setTimeout(safe('bara', () => boardMeeting('opening meeting')), 90000);
  setInterval(safe('bara', () => boardMeeting('scheduled')), CEO_INTERVAL_MIN * 60000);
  setInterval(safe('honey', tick), TERAC_POLL_MIN * 60000);
}

app.listen(PORT, () => {
  console.log(`CapyGigs on ${BASE_URL}  (llm: ${llmReady()}, whop: ${whopReady()}, terac: ${teracReady()}, demo: ${DEMO_MODE})`);
  console.log(`Admin override panel: ${BASE_URL}/admin  token: ${ADMIN_TOKEN}`);
  log('bara', `CapyGigs HQ is open. Staff on duty: ${Object.values(STAFF).map((s) => s.name).join(', ')}`);
  if (process.env.NO_AGENTS !== '1') startAgents();
});
