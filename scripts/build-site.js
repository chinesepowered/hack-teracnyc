// Builds the static CapyGigs site that Whop hosts at capygigs.whop.site.
//   node scripts/build-site.js <out-dir> [--checkout=study/checkout.json] [--state=<db export json>]
// Pages: storefront, HQ snapshot, human report, legal, and the Terac review pages under /review/.
import fs from 'node:fs';
import path from 'node:path';
import * as ui from '../src/ui.js';
import { GIGS, STAFF } from '../src/config.js';
import { policy, DOCS } from '../src/agents/legal.js';

const out = process.argv[2];
const flags = Object.fromEntries(process.argv.slice(3).map((a) => a.replace(/^--/, '').split('=')));
const checkout = fs.existsSync(flags.checkout || 'study/checkout.json') ? JSON.parse(fs.readFileSync(flags.checkout || 'study/checkout.json', 'utf8')) : {};
const state = flags.state && fs.existsSync(flags.state) ? JSON.parse(fs.readFileSync(flags.state, 'utf8')) : null;
const rounds = fs.existsSync('study/rounds.json') ? JSON.parse(fs.readFileSync('study/rounds.json', 'utf8')) : [];

const write = (rel, html) => {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};
// Static paths instead of the Express routes; order buttons go straight to Whop checkout.
const staticize = (html) => {
  let s = html
    .replace(/href="\/hq"/g, 'href="/hq.html"')
    .replace(/href="\/report"/g, 'href="/report.html"')
    .replace(/href="\/legal\/(\w+)"/g, 'href="/legal/$1.html"')
    .replace(/<script type="module" src="\/static\/(hq|order-status|order|rate|admin)\.js"><\/script>/g, '');
  for (const [gig, url] of Object.entries(checkout)) s = s.replaceAll(`href="/order/${gig}"`, `href="${ui.esc(url)}"`);
  return s;
};

// Stats come from the live company records when given, else zeros (nothing invented).
const stats = state?.stats || { revenue: 0, customers: 0, orders: 0, delivered: 0, humans: 0, ratings: 0, before: null, after: null, preferRevised: null };
const prices = Object.fromEntries(Object.values(GIGS).map((g) => [g.id, state?.prices?.[g.id] ?? g.price]));
const home = staticize(ui.home({ prices, paused: {}, stats }));
write('index.html', home);
write('home.html', home);
if (state?.hq) write('hq.html', staticize(ui.hq(state.hq)));
if (state?.reportHtml) write('report.html', staticize(state.reportHtml));
for (const [doc, title] of Object.entries(DOCS)) write(`legal/${doc}.html`, staticize(ui.legalPage(title, policy(doc))));
write('thanks.html', staticize(ui.layout({
  title: 'Thank you!',
  body: `<section class="legal">${ui.staffCapy('penny', 90)}<h1>Payment received. Thank you!</h1>
<p>Penny, our CFO, has your Whop receipt. Your capybara will reach out through Whop to collect your brief and deliver your first draft, followed by a free revision guided by real human reviewers.</p>
<p class="muted small">Questions or refunds: see our <a href="/legal/refunds">refund policy</a>.</p></section>`,
})));

// Review pages for Terac participants.
for (const round of rounds) {
  const intro = round.kind === 'review'
    ? 'Grade each piece of work for the small business that asked for it. Be honest: your feedback goes straight to the AI that made it.'
    : 'Each business got two versions. Pick the one that better fits what they asked for, score both, and say why.';
  const scale = (name) => `<div class="scale" role="radiogroup">${Array.from({ length: 10 }, (_, i) => `<label><input type="radio" name="${name}" value="${i + 1}" required><span>${i + 1}</span></label>`).join('')}</div>`;
  const brief = (it) => `<b>${ui.esc(it.brief.business)}</b>: ${ui.esc(it.brief.about)}${it.brief.vibe || it.brief.tone ? ` <span class="muted">(${ui.esc(it.brief.vibe || it.brief.tone)})</span>` : ''}`;
  const blocks = round.items.map((it, idx) => {
    const label = `${it.brief.business} ${GIGS[it.gig].title.toLowerCase()}`;
    if (round.kind === 'review') {
      return `<fieldset class="item" data-order="${it.id}" data-name="${ui.esc(label)}"><legend>${idx + 1} of ${round.items.length} · ${ui.esc(GIGS[it.gig].title)}</legend>
<p class="brief">The business asked for: ${brief(it)}</p><div class="work">${ui.deliverable(it.gig, it.v1, { compact: true })}</div>
<p class="q">How well does this meet what they asked for? <span class="muted">(1 = poor, 10 = excellent)</span></p>${scale(`score-${it.id}`)}
<p class="q">Would this be worth paying $${GIGS[it.gig].price} for?</p><div class="yn"><label><input type="radio" name="pay-${it.id}" value="yes" required> Yes</label><label><input type="radio" name="pay-${it.id}" value="no"> No</label></div>
<label class="q">One sentence: what should be better?<textarea name="comment-${it.id}" rows="2" minlength="8" maxlength="500" required></textarea></label></fieldset>`;
    }
    const left = it.left || 1;
    const [a, b] = left === 1 ? [it.v1, it.v2] : [it.v2, it.v1];
    return `<fieldset class="item" data-order="${it.id}" data-name="${ui.esc(label)}" data-left="${left}"><legend>${idx + 1} of ${round.items.length} · ${ui.esc(GIGS[it.gig].title)}</legend>
<p class="brief">The business asked for: ${brief(it)}</p>
<div class="ab"><div><h4>Version A</h4>${ui.deliverable(it.gig, a, { compact: true })}</div><div><h4>Version B</h4>${ui.deliverable(it.gig, b, { compact: true })}</div></div>
<p class="q">Which version better fits what they asked for?</p><div class="yn"><label><input type="radio" name="prefer-${it.id}" value="A" required> Version A</label><label><input type="radio" name="prefer-${it.id}" value="B"> Version B</label></div>
<p class="q">Score version A</p>${scale(`scoreA-${it.id}`)}<p class="q">Score version B</p>${scale(`scoreB-${it.id}`)}
<label class="q">One sentence: why?<textarea name="comment-${it.id}" rows="2" minlength="8" maxlength="500" required></textarea></label></fieldset>`;
  }).join('');
  write(`review/${round.slug}.html`, ui.layout({
    title: 'Help grade some work',
    bare: true,
    script: '/static/review.js',
    body: `<section class="rate" data-round="${round.slug}" data-kind="${round.kind}">
<div class="rate-head">${ui.staffCapy('honey', 90)}<div><h1>Hi! I'm Honey.</h1><p>You're helping a tiny company run by AI capybaras get better at its job. ${ui.esc(intro)} About 6 minutes, with one attention check.</p></div></div>
<form id="rate-form">${blocks}
<fieldset class="item"><legend>Attention check</legend><p class="q">To show you're reading, pick "Capybara".</p>
<div class="yn"><label><input type="radio" name="attention" value="dog" required> Dog</label><label><input type="radio" name="attention" value="capybara"> Capybara</label><label><input type="radio" name="attention" value="cat"> Cat</label></div></fieldset>
<button class="btn big" type="submit">Finish and get my answers file</button><p class="error" id="rate-error" hidden></p></form>
<div class="done" id="done" hidden><h2>Thank you! 🧡</h2><p>Your code: <b class="code" id="code"></b></p>
<ol class="steps"><li>Tap <b>Download my answers</b> below.</li><li>Go back to Terac and upload that file. (Can't download? Upload a screenshot of the box below instead.)</li></ol>
<p><a class="btn big" id="download" href="#">Download my answers</a></p><pre class="summary" id="summary"></pre></div>
</section>`,
  }));
}
// Static assets
fs.mkdirSync(path.join(out, 'static'), { recursive: true });
for (const f of fs.readdirSync('public')) fs.copyFileSync(path.join('public', f), path.join(out, 'static', f));
console.log(`built site into ${out} (${rounds.length} review page(s), checkout links: ${Object.keys(checkout).join(', ') || 'none'})`);
