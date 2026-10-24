// Writes study/video-scenes.json for make-video.js from the current real state (back office + study files).
// Narration only states numbers that exist in the records.
import fs from 'node:fs';

const BO = process.env.AGENT_URL || 'http://localhost:3500';
const SITE = 'https://capygigs.whop.site';
const { stats } = await (await fetch(`${BO}/api/hq`)).json();
const rounds = JSON.parse(fs.readFileSync('study/rounds.json', 'utf8'));
const checkout = JSON.parse(fs.readFileSync('study/checkout.json', 'utf8'));
const live = JSON.parse(fs.readFileSync('data/live.json', 'utf8'));
const r1 = live.rounds.find((r) => r.id === 'rnd_r1')?.results;
const r2 = live.rounds.find((r) => r.id === 'rnd_r2')?.results;
const hasR2Page = rounds.some((r) => r.slug === 'r2');
const words = (n) => String(n).replace(/\.0$/, '');

let proof;
if (r2) {
  proof = `Then a fresh panel compared draft and revision blind: ${r2.preferV2Pct} percent preferred the revision, and scores went from ${words(r2.avgV1)} to ${words(r2.avgV2)} out of ten.`;
} else if (r1) {
  proof = `In round one, ${r1.n} real people graded our first drafts, averaging ${words(r1.avg)} out of ten, and told us exactly what to fix. The capybaras revised every draft from that feedback${hasR2Page ? ', and a blind before and after round is running on Terac now' : ''}.`;
} else {
  proof = 'Round one is live on Terac right now: real people are grading the first drafts, and the capybaras will revise every one of them from what they say.';
}
const money = stats.revenue > 0
  ? `${stats.customers} paying customer${stats.customers === 1 ? '' : 's'} so far, all through Whop. `
  : '';

const scenes = [
  { key: 'title', url: '/demo/title', say: 'Meet CapyGigs: a freelance marketplace where every freelancer is a capybara agent. Zero humans on payroll.', steps: [] },
  { key: 'store', url: `${SITE}/home.html`, say: 'Our storefront is hosted on Whop, and the capybaras deployed it themselves. Pick a gig: a logo pack, landing page copy, or a competitor report, from five dollars.', steps: [{ wait: 0.3 }, { scrollTo: '#gigs', over: 0.35 }] },
  { key: 'checkout', url: checkout.logo, say: "Checkout is a real Whop payment page. Paying is the only step a human ever takes.", steps: [] },
  { key: 'hq', url: '/hq', say: 'Behind the scenes, the company runs itself. Capy Bara, our CEO, makes the budget calls. Pixel draws logos, Quill writes copy, Penny runs payments on Whop, Hype writes our launch posts, and Lex keeps us legal.', steps: [{ wait: 0.5 }, { scroll: 420, over: 0.3 }] },
  { key: 'humans', url: `${SITE}/review/${hasR2Page && r1 ? 'r2' : 'r1'}.html`, say: "But agents can't grade their own homework. Honey, our head of human feedback, uses the Terac MCP to recruit real people, who grade the capybaras' work on this page and tell them what to fix.", steps: [{ wait: 0.25 }, { scroll: 800, over: 0.5 }] },
  { key: 'proof', url: '/report', say: proof, steps: [{ wait: 0.3 }, { scroll: 500, over: 0.45 }] },
  { key: 'close', url: `/demo/title?l1=CapyGigs&l2=${encodeURIComponent('Whop storefront · Terac humans · 0 humans on payroll')}`, say: `${money}Real storefront and checkout on Whop, real humans through Terac, and zero humans on payroll. CapyGigs: freelancers that never sleep, but nap a lot.`, steps: [] },
];
fs.writeFileSync('study/video-scenes.json', JSON.stringify(scenes, null, 1));
console.log(scenes.map((s) => `${s.key}: ${s.say}`).join('\n'));
