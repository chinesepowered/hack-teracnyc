// Seeds sample data for the preview video into its own file (default data/demo.json).
// Run the server with DEMO_MODE=1 DATA_FILE=data/demo.json to view it; every page shows a "Preview · sample data" badge.
import fs from 'node:fs';
import path from 'node:path';

const FILE = process.env.DATA_FILE || 'data/demo.json';
if (!/demo/.test(path.basename(FILE))) throw new Error('Refusing to seed sample data into a non-demo data file');
process.env.DATA_FILE = FILE;
const { sanitizeSvg } = await import('../src/agents/workers.js');

const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const around = (mu) => Math.max(1, Math.min(10, Math.round(mu + (rand() - 0.5) * 3)));
const hex = (n) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');
const id = (p) => `${p}_${hex(10)}`;
const F = 'font-family="Helvetica, Arial, sans-serif"';
const svg = (inner) => sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${inner}</svg>`);

const bodegaV1 = { concepts: [
  { name: 'Night shift ring', idea: 'A glowing bagel ring on a midnight background for a shop that never sleeps.', svg: svg(`<rect width="512" height="512" fill="#1e2a44"/><circle cx="256" cy="220" r="110" fill="none" stroke="#f59e0b" stroke-width="56"/><g fill="#fff7ec"><circle cx="210" cy="140" r="5"/><circle cx="300" cy="150" r="5"/><circle cx="330" cy="230" r="5"/><circle cx="180" cy="250" r="5"/><circle cx="250" cy="320" r="5"/></g><text x="256" y="420" text-anchor="middle" ${F} font-size="40" font-weight="400" fill="#fff7ec" letter-spacing="4">BODEGA BAGELS</text>`) },
  { name: 'Corner sign', idea: 'The classic bodega awning sign, simplified.', svg: svg(`<rect width="512" height="512" fill="#fff7ec"/><rect x="56" y="156" width="400" height="200" rx="28" fill="#e8590c"/><text x="256" y="262" text-anchor="middle" ${F} font-size="78" font-weight="800" fill="#fff">Bodega</text><text x="256" y="318" text-anchor="middle" ${F} font-size="34" font-weight="700" fill="#ffe8cc" letter-spacing="10">BAGELS</text>`) },
  { name: 'Moon bagel', idea: 'A bagel that doubles as a crescent moon.', svg: svg(`<rect width="512" height="512" fill="#2b2140"/><circle cx="256" cy="230" r="120" fill="#f2b24c"/><circle cx="300" cy="200" r="110" fill="#2b2140"/><g fill="#fde68a"><circle cx="370" cy="120" r="6"/><circle cx="410" cy="190" r="4"/><circle cx="120" cy="140" r="5"/></g><text x="256" y="430" text-anchor="middle" ${F} font-size="36" font-weight="400" fill="#fde68a">bodega bagels</text>`) },
] };
const bodegaV2 = { changes: 'Reviewers loved the late-night idea but said the lettering was hard to read and the ring looked like a donut. The revision gives the bagel a visible hole and sesame seeds, uses much bolder lettering, and adds an "Open late" tag so the concept reads instantly.', concepts: [
  { name: 'Night shift ring', idea: 'Unmistakably a bagel, unmistakably open late.', svg: svg(`<rect width="512" height="512" fill="#1e2a44"/><circle cx="256" cy="200" r="112" fill="#f59e0b"/><circle cx="256" cy="200" r="42" fill="#1e2a44"/><path d="M180 140q20-14 40-4M290 122q18-6 30 8M330 210q12 10 8 26M170 230q-6 14 4 28M250 290q16 8 32 0" stroke="#fff3d6" stroke-width="9" stroke-linecap="round" fill="none"/><rect x="156" y="334" width="200" height="40" rx="20" fill="#3bb4a8"/><text x="256" y="362" text-anchor="middle" ${F} font-size="22" font-weight="800" fill="#fff" letter-spacing="5">OPEN LATE</text><text x="256" y="446" text-anchor="middle" ${F} font-size="50" font-weight="800" fill="#fff7ec">BODEGA BAGELS</text>`) },
  { name: 'Corner sign', idea: 'Awning stripes plus a bagel, so it feels like your corner shop.', svg: svg(`<rect width="512" height="512" fill="#fff7ec"/><rect x="56" y="100" width="400" height="44" fill="#e8590c"/><path d="M56 144h400l-20 30H76z" fill="#c2410c"/><g fill="#fff"><rect x="96" y="100" width="40" height="44"/><rect x="176" y="100" width="40" height="44"/><rect x="256" y="100" width="40" height="44"/><rect x="336" y="100" width="40" height="44"/></g><circle cx="256" cy="262" r="62" fill="#f59e0b"/><circle cx="256" cy="262" r="22" fill="#fff7ec"/><text x="256" y="398" text-anchor="middle" ${F} font-size="74" font-weight="800" fill="#3b2a1e">Bodega</text><text x="256" y="446" text-anchor="middle" ${F} font-size="32" font-weight="700" fill="#e8590c" letter-spacing="10">BAGELS</text>`) },
  { name: 'Moon bagel', idea: 'The crescent now has a bagel hole and sesame seeds.', svg: svg(`<rect width="512" height="512" fill="#2b2140"/><circle cx="256" cy="214" r="124" fill="#f2b24c"/><circle cx="256" cy="214" r="40" fill="#2b2140"/><circle cx="330" cy="160" r="96" fill="#2b2140"/><g fill="#fff3d6"><ellipse cx="180" cy="200" rx="7" ry="4"/><ellipse cx="205" cy="292" rx="7" ry="4"/><ellipse cx="160" cy="250" rx="7" ry="4"/></g><g fill="#fde68a"><circle cx="390" cy="100" r="7"/><circle cx="430" cy="170" r="5"/></g><text x="256" y="420" text-anchor="middle" ${F} font-size="58" font-weight="800" fill="#fde68a">bodega</text><text x="256" y="462" text-anchor="middle" ${F} font-size="28" font-weight="700" fill="#f2b24c" letter-spacing="10">BAGELS · LATE</text>`) },
] };
const tidewaterV1 = { concepts: [
  { name: 'Sunrise wave', idea: 'Sun over a gentle wave, like an early class on the boardwalk.', svg: svg(`<rect width="512" height="512" fill="#eef7fb"/><circle cx="256" cy="200" r="80" fill="#f6c76a"/><path d="M96 270q40-30 80 0t80 0 80 0 80 0v40H96z" fill="#2f7fa8"/><text x="256" y="410" text-anchor="middle" ${F} font-size="44" font-weight="700" fill="#1e4e6b" letter-spacing="3">TIDEWATER YOGA</text>`) },
  { name: 'Quiet wordmark', idea: 'A light wordmark with a wave underline.', svg: svg(`<rect width="512" height="512" fill="#fff"/><text x="256" y="250" text-anchor="middle" ${F} font-size="64" font-weight="300" fill="#2f7fa8">tidewater</text><path d="M150 285q26-18 52 0t52 0 52 0 52 0" stroke="#7cc4e4" stroke-width="8" fill="none" stroke-linecap="round"/><text x="256" y="345" text-anchor="middle" ${F} font-size="26" fill="#1e4e6b" letter-spacing="14">YOGA</text>`) },
  { name: 'Tide emblem', idea: 'A round emblem that works on mats and tote bags.', svg: svg(`<rect width="512" height="512" fill="#1e4e6b"/><circle cx="256" cy="230" r="140" fill="none" stroke="#bfe3f2" stroke-width="10"/><path d="M146 250q36-26 72 0t72 0 72 0" stroke="#bfe3f2" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="256" cy="185" r="34" fill="#f6c76a"/><text x="256" y="440" text-anchor="middle" ${F} font-size="38" font-weight="700" fill="#fff" letter-spacing="4">TIDEWATER</text>`) },
] };
const napV1 = {
  headline: 'Power naps, scheduled for you',
  subheadline: 'NapTime finds 20-minute gaps in your calendar and protects them, so you can recharge between meetings.',
  benefits: [
    { title: 'Finds the gaps', body: 'Connects to your calendar and spots the best moments to rest.' },
    { title: 'Guards your nap', body: 'Blocks the slot and silences notifications for 20 minutes.' },
    { title: 'Wakes you gently', body: 'A soft alarm brings you back before deep sleep.' },
  ],
  cta: 'Try NapTime free',
  social_proof: '[Add a quote from an early user here]',
  faq: [
    { q: 'Will it move my meetings?', a: 'No. NapTime only uses free slots and never touches existing events.' },
    { q: 'Which calendars work?', a: 'Google Calendar and Outlook.' },
    { q: "What if I can't fall asleep?", a: 'That is fine. Quiet rest still helps you reset.' },
  ],
};
const napV2 = {
  changes: "Reviewers said the first headline was generic and didn't say who it was for, and asked for more personality. The revision names founders, leads with the calendar insight, adds a little humor, and turns the button into an action.",
  headline: 'Your calendar has room for a nap. NapTime finds it.',
  subheadline: 'Built for founders in back-to-back meetings: NapTime spots the 20-minute gaps, guards them, and wakes you before your next call.',
  benefits: [
    { title: 'Zero planning', body: 'It reads your calendar and books the nap for you. You just close your eyes.' },
    { title: 'Do not disturb, enforced', body: 'Slack, email and phone stay quiet until your nap is over.' },
    { title: 'Back before standup', body: 'A gentle alarm at 20 minutes, before the grogginess kicks in.' },
  ],
  cta: 'Book my first nap',
  social_proof: '[Quote from an early founder, e.g. how many naps they took in week one]',
  faq: [
    { q: 'Will it move my meetings?', a: 'Never. It only claims free time, and you can veto any nap.' },
    { q: 'Which calendars work?', a: 'Google Calendar and Outlook, connected in about a minute.' },
    { q: "What if I can't fall asleep?", a: 'Twenty quiet minutes with your eyes closed still beats a fourth coffee.' },
  ],
};
const stoopV1 = {
  headline: "One neighbor's stoop is another's living room",
  subheadline: 'StoopSwap lets Brooklyn neighbors post furniture they are leaving on the stoop, so it finds a new home instead of the curb.',
  benefits: [
    { title: 'Snap and post', body: 'Photo, cross streets, done. Takes ten seconds.' },
    { title: 'Nearby first', body: 'See what is out on stoops within a few blocks of you.' },
    { title: 'Gone in an hour', body: 'Neighbors claim it before the rain does.' },
  ],
  cta: 'See stoops near me',
  social_proof: '[Number of items swapped in your neighborhood]',
  faq: [
    { q: 'Is it free?', a: 'Yes, always free for neighbors.' },
    { q: 'Do I have to meet anyone?', a: 'No. Leave it on the stoop and mark it claimed.' },
    { q: 'Which neighborhoods?', a: 'All of Brooklyn to start.' },
  ],
};

const now = new Date().toISOString();
const order = (o) => ({ reviews: {}, whop: {}, timeline: [], email: null, sample: false, ...o });
const o1 = order({ id: id('ord'), gig: 'logo', brief: { business: 'Bodega Bagels', about: 'Late-night bagel shop in Williamsburg, Brooklyn', vibe: 'Playful, warm orange, a little retro' }, price: 5, amountPaid: 5, status: 'revised', createdAt: minsAgo(170), paidAt: minsAgo(169), deliverables: [{ version: 1, at: minsAgo(167), by: 'pixel', content: bodegaV1 }, { version: 2, at: minsAgo(80), by: 'pixel', content: bodegaV2 }] });
const o2 = order({ id: id('ord'), gig: 'copy', brief: { business: 'NapTime', about: 'An app that schedules 20-minute power naps around your calendar, for busy founders', tone: 'Confident, friendly, a little funny' }, price: 5, amountPaid: 5, status: 'revised', createdAt: minsAgo(160), paidAt: minsAgo(159), deliverables: [{ version: 1, at: minsAgo(157), by: 'quill', content: napV1 }, { version: 2, at: minsAgo(78), by: 'quill', content: napV2 }] });
const o3 = order({ id: id('ord'), gig: 'logo', sample: true, brief: { business: 'Tidewater Yoga', about: 'Small yoga studio on the Rockaway beach boardwalk', vibe: 'Calm, ocean blues, minimal' }, price: 0, status: 'delivered', createdAt: minsAgo(60), paidAt: minsAgo(60), deliverables: [{ version: 1, at: minsAgo(58), by: 'pixel', content: tidewaterV1 }] });
const o4 = order({ id: id('ord'), gig: 'copy', brief: { business: 'StoopSwap', about: 'A neighborhood app for giving away furniture left on Brooklyn stoops', tone: 'Warm, community-minded' }, price: 5, amountPaid: 5, status: 'delivered', createdAt: minsAgo(40), paidAt: minsAgo(39), deliverables: [{ version: 1, at: minsAgo(37), by: 'quill', content: stoopV1 }] });
for (const o of [o1, o2, o3, o4]) o.timeline = [{ at: o.createdAt, text: o.sample ? 'House sample brief.' : 'Order created. Waiting for payment.' }, ...(o.sample ? [] : [{ at: o.paidAt, text: `Payment of $${o.price}.00 confirmed by Whop.` }]), { at: o.deliverables[0].at, text: 'First draft delivered.' }, ...(o.deliverables[1] ? [{ at: o.deliverables[1].at, text: 'Revised using feedback from real people.' }] : [])];

const comments = {
  [o1.id]: ['The text is too thin to read from far away', 'Love the late-night vibe but the ring looks like a donut', 'Show the bagel hole so it is obviously a bagel', 'Great colors, the font feels generic', 'The second one looks like a real shop sign', 'Make the name bigger'],
  [o2.id]: ['Headline is generic, it does not say who it is for', 'Clear but a bit bland', 'Make it funnier, it is a nap app!', 'The button could be more exciting', 'I would mention founders or busy people up top'],
};
const compareComments = ['B is so much easier to read', 'The open late tag makes it click', 'This one actually tells me who it is for', 'Funnier and clearer', 'Bolder and more confident', 'Feels like a real brand now'];

const r1 = { id: id('rnd'), kind: 'review', status: 'closed', items: [{ orderId: o1.id }, { orderId: o2.id }], target: 14, createdAt: minsAgo(166), closedAt: minsAgo(85), terac: { status: 'completed', feasibilityId: 'feas_sample', opportunityId: 'opp_sample_1', costPerParticipant: 2.5 } };
const r2 = { id: id('rnd'), kind: 'compare', status: 'closed', items: [{ orderId: o1.id }, { orderId: o2.id }], target: 12, createdAt: minsAgo(84), closedAt: minsAgo(20), terac: { status: 'completed', opportunityId: 'opp_sample_2', costPerParticipant: 2.5 } };
const r3 = { id: id('rnd'), kind: 'review', status: 'live', items: [{ orderId: o3.id }, { orderId: o4.id }], target: 15, createdAt: minsAgo(36), terac: { status: 'live', opportunityId: 'opp_sample_3', costPerParticipant: 2.5 } };

const ratings = [];
const rating = (round, answers, at) => ratings.push({ id: id('rat'), roundId: round.id, sessionId: hex(16), code: `CAPY-${hex(6).toUpperCase()}`, complete: true, attention: true, seconds: 120 + Math.floor(rand() * 200), approved: true, answers, meta: '{}', createdAt: at });
for (let i = 0; i < 14; i++) rating(r1, [o1, o2].map((o, k) => ({ orderId: o.id, score: around(k ? 5.5 : 6.1), wouldPay: rand() < 0.45, comment: pick(comments[o.id]) })), minsAgo(150 - i * 4));
for (let i = 0; i < 12; i++) rating(r2, [o1, o2].map((o) => ({ orderId: o.id, prefer: rand() < 0.84 ? 2 : 1, scoreV1: around(5.8), scoreV2: around(7.9), comment: pick(compareComments) })), minsAgo(75 - i * 4));
for (let i = 0; i < 4; i++) rating(r3, [o3, o4].map((o) => ({ orderId: o.id, score: around(6.5), wouldPay: rand() < 0.5, comment: 'Nice and calm, maybe a bit plain' })), minsAgo(25 - i * 5));

const { summarize } = await import('../src/agents/honey.js');
const { db, resetDb } = await import('../src/store.js');
resetDb({ orders: [o1, o2, o3, o4], rounds: [r1, r2, r3], ratings });
r1.results = summarize(r1);
r2.results = summarize(r2);
for (const item of r1.results.items) db.orders.find((o) => o.id === item.orderId).reviews[1] = item;
for (const item of r2.results.items) db.orders.find((o) => o.id === item.orderId).reviews[2] = item;

const ev = (m, agent, text, extra = {}) => ({ id: id('ev'), at: minsAgo(m), agent, text, ...extra });
db.events = [
  ev(178, 'bara', 'CapyGigs HQ is open. Staff on duty: Capy Bara, Pixel, Quill, Scout, Honey, Hype, Penny, Lex'),
  ev(177, 'lex', 'Drafted our Terms of Service'), ev(176, 'lex', 'Drafted our Privacy Policy'), ev(176, 'lex', 'Drafted our Refund Policy'),
  ev(175, 'hype', 'Drafted 3 posts (launch day)'),
  ev(174, 'honey', 'Opened human review round so real people can grade our first drafts'),
  ev(173, 'honey', 'Terac MCP → terac_get_context'), ev(173, 'honey', 'Terac MCP → terac_request_feasibility'),
  ev(170, 'penny', 'Opened a $5 Whop checkout for a Logo pack'),
  ev(169, 'penny', '💸 $5.00 received through Whop for a Logo pack', { kind: 'revenue' }),
  ev(168, 'pixel', 'Started on Logo pack for "Bodega Bagels"'), ev(167, 'pixel', 'Delivered Logo pack for "Bodega Bagels"'),
  ev(159, 'penny', '💸 $5.00 received through Whop for a Landing page copy', { kind: 'revenue' }),
  ev(157, 'quill', 'Delivered Landing page copy for "NapTime"'),
  ev(150, 'honey', 'Terac MCP → terac_launch_draft_opportunity'), ev(149, 'honey', 'Round is live on Terac. Real humans incoming!'),
  ev(140, 'honey', 'A real human just graded 2 pieces of work', { kind: 'rating' }),
  ev(120, 'bara', 'Board meeting: Logos are our best seller and the human panel keeps asking for bolder type. Holding logos at $5 to build volume while Honey finishes the review round.', { kind: 'memo' }),
  ev(86, 'honey', 'Closed review round with 14 valid human reviews'),
  ev(85, 'honey', 'Terac MCP → terac_approve_submission'),
  ev(82, 'pixel', 'Revising "Bodega Bagels" using 14 human reviews (avg 6.1/10)'), ev(80, 'pixel', 'Shipped human-guided revision for "Bodega Bagels"'),
  ev(79, 'quill', 'Revising "NapTime" using 14 human reviews (avg 5.6/10)'), ev(78, 'quill', 'Shipped human-guided revision for "NapTime"'),
  ev(77, 'bara', 'Revisions are in. Queued a before/after round so humans can judge whether we actually improved'),
  ev(60, 'scout', 'Exa search: "neighborhood furniture swap app competitors"'),
  ev(39, 'penny', '💸 $5.00 received through Whop for a Landing page copy', { kind: 'revenue' }),
  ev(37, 'quill', 'Delivered Landing page copy for "StoopSwap"'),
  ev(36, 'honey', 'Opened human review round for the newest drafts'),
  ev(21, 'honey', 'Closed before/after round with 12 valid human reviews'),
  ev(20, 'bara', `Before/after verdict: ${r2.results.preferV2Pct}% of humans preferred the revisions (${r2.results.avgV1} → ${r2.results.avgV2} out of 10)`),
  ev(12, 'bara', 'Board meeting: Human-guided revisions are clearly winning. Raising the competitor report to $11 and asking Hype to lead with the before/after result.', { kind: 'memo' }),
  ev(11, 'penny', 'Price change approved by the CEO: Competitor report now $11 (premium research, strong human scores)'),
  ev(10, 'hype', 'Drafted 3 posts (before/after proof)'),
  ev(4, 'honey', 'A real human just graded 2 pieces of work', { kind: 'rating' }),
];
db.decisions = [
  { at: minsAgo(120), trigger: 'scheduled', memo: 'Logos are our best seller and the human panel keeps asking for bolder type. Holding logos at $5 to build volume while Honey finishes the review round.', decisions: [], applied: [] },
  { at: minsAgo(12), trigger: 'scheduled', memo: 'Human-guided revisions are clearly winning. Raising the competitor report to $11 and asking Hype to lead with the before/after result.', decisions: [], applied: ['Competitor report: $9 → $11', 'marketing: before/after proof'] },
];
db.settings.prices = { report: 11 };
db.posts = [
  { id: id('post'), at: minsAgo(10), angle: 'before/after proof', channel: 'slack', text: 'Our capybara freelancers asked real humans to grade their work, then revised it. Most reviewers preferred the revisions in a blind test. Logos and landing-page copy from $5, all made by AI agents: ' + 'https://capygigs.app' },
  { id: id('post'), at: minsAgo(10), angle: 'before/after proof', channel: 'x', text: 'We run a company with zero human employees. The capybaras do the work, real humans grade it, the capybaras get better. Logos from $5 🍊' },
  { id: id('post'), at: minsAgo(10), angle: 'before/after proof', channel: 'linkedin', text: 'What happens when AI agents get feedback from real people? Our capybara freelancers revised their first drafts based on human reviews, and a fresh panel preferred the new versions in a blind test.' },
];
db.teracCalls = ['terac_get_context', 'terac_list_projects', 'terac_create_project', 'terac_request_feasibility', 'terac_get_feasibility_request', 'terac_create_opportunity', 'terac_launch_draft_opportunity', 'terac_get_submissions', 'terac_approve_submission', 'terac_get_context', 'terac_create_opportunity', 'terac_launch_draft_opportunity', 'terac_get_submissions', 'terac_approve_submission'].map((tool, i) => ({ at: minsAgo(170 - i * 10), tool, args: {}, isError: false, preview: '' }));
db.metrics = { visits: 214, orderStarts: 9, checkouts: 7 };
db.settings.adminToken = 'demo-admin';
db.settings.signingSecret = hex(32);
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(db, null, 1));
console.log(`Seeded preview data into ${FILE}: orders=${db.orders.length} ratings=${ratings.length} before=${r2.results.avgV1} after=${r2.results.avgV2} prefer=${r2.results.preferV2Pct}%`);
process.exit(0);
