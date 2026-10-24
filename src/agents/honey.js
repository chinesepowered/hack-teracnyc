import { BASE_URL, TERAC, teracReady } from '../config.js';
import { db, findOrder, findRound, log, newId, touch } from '../store.js';
import { runHoney } from '../terac.js';
import { agentMode } from '../llm.js';
import { revise } from './workers.js';

export const ITEMS_PER_ROUND = 6;
export const MIN_SECONDS = 40; // faster than this is not a real review

export const roundUrl = (round) => `${BASE_URL}/rate/${round.id}`;
export const openRound = (kind) => db.rounds.find((r) => r.kind === kind && r.status !== 'closed');
export const ratingsFor = (round) => db.ratings.filter((r) => r.roundId === round.id && r.complete);
export const validRatings = (round) => ratingsFor(round).filter((r) => r.attention && r.seconds >= MIN_SECONDS);

export function ensureRound(kind) {
  let round = openRound(kind);
  if (!round) {
    round = {
      id: newId('rnd'), kind, status: 'draft', items: [], target: TERAC.participantsPerRound,
      createdAt: new Date().toISOString(), terac: {}, results: null,
    };
    db.rounds.push(round);
    log('honey', kind === 'review'
      ? `Opened human review round ${round.id}: real people will grade our first drafts`
      : `Opened before/after round ${round.id}: real people will compare drafts with revisions`);
  }
  attachItems(round);
  return round;
}

// Rounds collect items until they go live on Terac; then the set is frozen.
export function attachItems(round) {
  if (round.status === 'live' || round.status === 'closed') return;
  const taken = new Set(db.rounds.filter((r) => r.kind === round.kind).flatMap((r) => r.items.map((i) => i.orderId)));
  const candidates = db.orders
    .filter((o) => (round.kind === 'review' ? o.deliverables.length === 1 : o.deliverables.length >= 2))
    .filter((o) => !taken.has(o.id))
    .sort((a, b) => Number(a.sample) - Number(b.sample)); // real customer orders first
  for (const o of candidates) {
    if (round.items.length >= ITEMS_PER_ROUND) break;
    round.items.push({ orderId: o.id });
  }
  touch('round', { id: round.id });
}

const TASK = {
  review: 'Visit a web page and grade 6 short pieces of creative work (logos and website text) made for small businesses: a 1-10 score, would-you-pay yes/no, and one sentence of feedback each. About 5 minutes.',
  compare: 'Visit a web page and compare two versions of 6 short pieces of creative work (logos and website text): pick the better one, score both 1-10, and say why in one sentence. About 5 minutes.',
};

const publicState = (round) => {
  const { log: _ignored, ...rest } = round.terac || {};
  return rest;
};

// Honey drives recruitment on Terac: feasibility quote, then opportunity, then launch.
export async function recruit(round, { allowLaunch = true } = {}) {
  const task = `Round ${round.id} (${round.kind}).
Study URL participants must open: ${roundUrl(round)}
Task for participants: ${TASK[round.kind]}
At the end they get a unique completion code that starts with CAPY- and must paste it back into Terac.
Participants wanted: ${round.target}. Total budget for this round: $${TERAC.maxBudgetUsd}.
Project name to use (create it if missing): "CapyGigs human review".
What we already know about this round on Terac: ${JSON.stringify(publicState(round))}

Do the next step only:
1. No feasibility request yet: request one for the general population with the task above, then stop.
2. Feasibility pending: check it once and stop.
3. Feasibility priced and within budget: ${allowLaunch
    ? 'create the opportunity (title, clear instructions containing the study URL and the completion-code step) and launch it.'
    : 'do NOT launch yet (the work to compare is not ready); just report the price.'}
4. Already launched: report its status and how many submissions exist.`;
  const result = await runHoney(task);
  round.terac = {
    ...round.terac,
    ...(result.feasibilityId ? { feasibilityId: result.feasibilityId } : {}),
    ...(result.opportunityId ? { opportunityId: result.opportunityId } : {}),
    ...(result.costPerParticipant ? { costPerParticipant: result.costPerParticipant } : {}),
    status: result.status,
    notes: result.notes,
    checkedAt: new Date().toISOString(),
  };
  if (round.status === 'draft') round.status = 'recruiting';
  if (round.terac.opportunityId && /launch|live|active|open|recruit/i.test(String(result.status))) {
    if (round.status !== 'live') log('honey', `Round ${round.id} is live on Terac. Real humans incoming!`);
    round.status = 'live';
  }
  log('honey', `Terac update for ${round.id}: ${result.status}${result.notes ? ` · ${String(result.notes).slice(0, 160)}` : ''}`);
  touch('round', { id: round.id });
  return result;
}

export async function approveSubmissions(round) {
  const pending = ratingsFor(round).filter((r) => !r.approved);
  if (!pending.length || !round.terac.opportunityId) return;
  const valid = new Set(validRatings(round).map((r) => r.code));
  const codes = pending.filter((r) => valid.has(r.code)).map((r) => r.code);
  if (!codes.length) return;
  const result = await runHoney(`Opportunity ${round.terac.opportunityId} (round ${round.id}).
Fetch its submissions and approve each one whose completion code is in this list of valid codes:
${codes.join(', ')}
Approve nothing else. Include "approvedCodes" (array of the codes you approved) in RESULT.`);
  const approved = new Set(result.approvedCodes || []);
  for (const r of pending) if (approved.has(r.code)) r.approved = true;
  if (approved.size) log('honey', `Approved ${approved.size} human reviewers on Terac for round ${round.id}`);
  touch('round', { id: round.id });
}

const mean = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const pct = (xs) => (xs.length ? Math.round((100 * xs.filter(Boolean).length) / xs.length) : null);

export function summarize(round) {
  const ratings = validRatings(round);
  const per = {};
  for (const r of ratings) for (const a of r.answers) (per[a.orderId] ??= []).push(a);
  if (round.kind === 'review') {
    const items = Object.entries(per).map(([orderId, list]) => ({
      orderId, n: list.length, avg: mean(list.map((a) => a.score)), wouldPayPct: pct(list.map((a) => a.wouldPay)),
      comments: [...new Set(list.map((a) => a.comment).filter(Boolean))],
    }));
    const all = Object.values(per).flat();
    return { n: ratings.length, avg: mean(all.map((a) => a.score)), wouldPayPct: pct(all.map((a) => a.wouldPay)), items };
  }
  const items = Object.entries(per).map(([orderId, list]) => ({
    orderId, n: list.length, avgV1: mean(list.map((a) => a.scoreV1)), avgV2: mean(list.map((a) => a.scoreV2)),
    preferV2Pct: pct(list.map((a) => a.prefer === 2)), comments: [...new Set(list.map((a) => a.comment).filter(Boolean))],
  }));
  const all = Object.values(per).flat();
  return {
    n: ratings.length, avgV1: mean(all.map((a) => a.scoreV1)), avgV2: mean(all.map((a) => a.scoreV2)),
    preferV2Pct: pct(all.map((a) => a.prefer === 2)), items,
  };
}

const closing = new Set();

export async function closeRound(roundId, why = 'target reached') {
  const round = findRound(roundId);
  if (!round || round.status === 'closed' || closing.has(roundId)) return;
  closing.add(roundId);
  try {
    round.results = summarize(round);
    round.status = 'closed';
    round.closedAt = new Date().toISOString();
    log('honey', `Closed round ${round.id} (${why}) with ${round.results.n} valid human reviews`);
    touch('round', { id: round.id });
    if (round.kind === 'review') {
      for (const item of round.results.items) {
        const order = findOrder(item.orderId);
        if (order) order.reviews[1] = item;
      }
      // Revise everything that got feedback, three at a time, then queue the before/after test.
      const queue = round.results.items.filter((i) => i.n > 0);
      for (let i = 0; i < queue.length; i += 3) {
        await Promise.all(queue.slice(i, i + 3).map((item) => revise(item.orderId, item)));
      }
      const compare = ensureRound('compare');
      log('bara', `Revisions are in. Queued before/after round ${compare.id} so humans can judge whether we actually improved`);
    } else {
      for (const item of round.results.items) {
        const order = findOrder(item.orderId);
        if (order) order.reviews[2] = item;
      }
      const r = round.results;
      log('bara', `Before/after verdict: ${r.preferV2Pct}% of humans preferred the revisions (${r.avgV1} → ${r.avgV2} out of 10)`);
    }
  } finally {
    closing.delete(roundId);
  }
}

// Called on a timer: keep every open round moving without anyone pressing buttons.
let ticking = false;
export async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    for (const round of db.rounds.filter((r) => r.status !== 'closed')) {
      attachItems(round);
      const done = validRatings(round).length;
      if (done >= round.target) { await closeRound(round.id); continue; }
      if (agentMode() || !teracReady()) continue; // Terac steps come from the agent via /api/agent/*
      const readyToLaunch = round.kind === 'review' ? round.items.length >= 3 : round.items.length >= 3;
      if (round.status === 'draft' || round.status === 'recruiting') {
        await recruit(round, { allowLaunch: readyToLaunch });
      } else if (round.status === 'live') {
        await approveSubmissions(round);
      }
    }
  } catch (err) {
    log('honey', `Terac step failed: ${err.message}`, { level: 'error' });
  } finally {
    ticking = false;
  }
}
