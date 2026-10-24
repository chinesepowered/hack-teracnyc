import { GIGS, PRICE_BOUNDS, llmReady, teracReady, whopReady } from '../config.js';
import { obj, str, arr, writeJson } from '../llm.js';
import { db, findRound, log, stats, touch } from '../store.js';
import { closeRound, ensureRound, validRatings } from './honey.js';
import { draftPosts } from './cmo.js';
import { createSamples } from './workers.js';

export const priceOf = (gigId) => db.settings.prices[gigId] ?? GIGS[gigId].price;

const DECISION_TYPES = ['set_price', 'start_review_round', 'start_compare_round', 'close_round', 'marketing_push', 'create_samples', 'none'];

const SCHEMA = obj({
  memo: str('Two to four sentences to the team, in a warm, unbothered capybara voice'),
  decisions: arr(obj({
    type: { type: 'string', enum: DECISION_TYPES },
    gig: str('Gig id for set_price, else empty'),
    price: { type: 'number', description: 'New price in USD for set_price, else 0' },
    round_id: str('Round id for close_round, else empty'),
    angle: str('Marketing angle for marketing_push, else empty'),
    reason: str(),
  })),
});

const SYSTEM = `You are Capy Bara, CEO of CapyGigs: a freelance marketplace where every freelancer is an AI capybara agent.
There are zero human employees. You make the hard calls. Today is hackathon day: submissions lock at 6:45pm New York time.
Goals, in order: earn real revenue through Whop from real customers; deliver work customers love; prove with real human
feedback (recruited through Terac) that our revisions are measurably better than our first drafts.
Levers: change a gig's price (at most $2 per meeting, between $${PRICE_BOUNDS.min} and $${PRICE_BOUNDS.max}), start or close human
review rounds, ask Hype (CMO) for a marketing push, or queue house sample briefs so the human panel has work to grade.
Review rounds need several delivered first drafts. Close a round early only if time is running out and it has some valid reviews.
Leave the before/after round for after revisions exist. Prefer few, well-reasoned decisions; "none" is a fine answer.`;

export async function boardMeeting(trigger = 'scheduled') {
  if (!llmReady()) return null;
  const s = stats();
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const snapshot = {
    trigger, now,
    payments: whopReady() ? 'live' : 'not configured',
    humanPanel: teracReady() ? 'Terac connected' : 'Terac not configured',
    stats: s,
    gigs: Object.values(GIGS).map((g) => {
      const orders = db.orders.filter((o) => o.gig === g.id && o.paidAt && !o.sample);
      return { id: g.id, title: g.title, price: priceOf(g.id), paidOrders: orders.length, revenue: orders.reduce((a, o) => a + (o.amountPaid ?? o.price), 0) };
    }),
    funnel: db.metrics,
    rounds: db.rounds.map((r) => ({ id: r.id, kind: r.kind, status: r.status, items: r.items.length, validReviews: validRatings(r).length, target: r.target, terac: r.terac?.status })),
    samples: db.orders.filter((o) => o.sample).length,
    lastDecisions: db.decisions.slice(-3).map((d) => d.memo),
  };
  const out = await writeJson({ system: SYSTEM, prompt: `Board meeting snapshot:\n${JSON.stringify(snapshot, null, 1)}`, schema: SCHEMA, effort: 'high' });

  const applied = [];
  for (const d of out.decisions) {
    try {
      if (d.type === 'set_price' && GIGS[d.gig]) {
        const current = priceOf(d.gig);
        const next = Math.round(Math.min(PRICE_BOUNDS.max, Math.max(PRICE_BOUNDS.min, Math.min(current + 2, Math.max(current - 2, d.price)))));
        if (next !== current) {
          db.settings.prices[d.gig] = next;
          applied.push(`${GIGS[d.gig].title}: $${current} → $${next}`);
          log('penny', `Price change approved by the CEO: ${GIGS[d.gig].title} now $${next} (${d.reason})`);
        }
      } else if (d.type === 'start_review_round') {
        const round = ensureRound('review');
        if (round.items.length < 3) createSamples(3).catch((e) => log('bara', `Sample briefs failed: ${e.message}`));
        applied.push(`review round ${round.id}`);
      } else if (d.type === 'start_compare_round') {
        applied.push(`before/after round ${ensureRound('compare').id}`);
      } else if (d.type === 'close_round' && findRound(d.round_id)) {
        closeRound(d.round_id, `CEO decision: ${d.reason}`).catch((e) => log('honey', `Close failed: ${e.message}`));
        applied.push(`close ${d.round_id}`);
      } else if (d.type === 'marketing_push') {
        draftPosts(d.angle || 'push').catch((e) => log('hype', `Post drafting failed: ${e.message}`));
        applied.push(`marketing: ${d.angle}`);
      } else if (d.type === 'create_samples') {
        createSamples(3).catch((e) => log('bara', `Sample briefs failed: ${e.message}`));
        applied.push('sample briefs');
      }
    } catch (err) {
      log('bara', `Could not apply ${d.type}: ${err.message}`, { level: 'error' });
    }
  }
  const record = { at: new Date().toISOString(), trigger, memo: out.memo, decisions: out.decisions, applied };
  db.decisions.push(record);
  log('bara', `Board meeting: ${out.memo}`, { kind: 'memo' });
  touch('decision');
  return record;
}
