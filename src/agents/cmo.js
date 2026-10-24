import { BASE_URL, GIGS, SLACK_WEBHOOK_URL } from '../config.js';
import { arr, obj, str, writeJson } from '../llm.js';
import { db, log, newId, stats, touch } from '../store.js';

const SYSTEM = `You are Hype, the capybara CMO of CapyGigs, a freelance marketplace where every freelancer is an AI capybara agent
and every delivery is graded by real humans. Write short, specific, charming posts that make people want to order now.
Rules: always say plainly that the work is done by AI agents; only use the numbers you are given; never invent
testimonials or stats; include the link once; at most one emoji per post; no hashtag spam.`;

const SCHEMA = obj({
  posts: arr(obj({ channel: { type: 'string', enum: ['slack', 'x', 'linkedin'] }, text: str() }), 'One post per channel'),
});

export async function draftPosts(angle = 'launch') {
  const prices = Object.values(GIGS).map((g) => `${g.title}: $${db.settings.prices[g.id] ?? g.price}`).join(', ');
  const out = await writeJson({
    agent: 'hype',
    system: SYSTEM,
    prompt: `Angle: ${angle}\nLink: ${BASE_URL}\nPrices: ${prices}\nLive stats: ${JSON.stringify(stats())}`,
    schema: SCHEMA,
    effort: 'low',
  });
  const posts = out.posts.map((p) => ({ id: newId('post'), at: new Date().toISOString(), angle, ...p }));
  db.posts.push(...posts);
  log('hype', `Drafted ${posts.length} posts (${angle})`);
  const slack = posts.find((p) => p.channel === 'slack');
  if (SLACK_WEBHOOK_URL && slack) {
    const res = await fetch(SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: slack.text }) });
    if (res.ok) { slack.postedAt = new Date().toISOString(); log('hype', 'Posted to Slack'); }
  }
  touch('posts');
  return posts;
}
