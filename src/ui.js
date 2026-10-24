import { DEMO_MODE, GIGS, STAFF, SUPPORT_EMAIL } from './config.js';

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? esc(u) : '#');
const money = (n) => `$${Number(n || 0).toFixed(Number(n) % 1 ? 2 : 0)}`;

// ---------- the capybara ----------
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
}
const ACCESSORIES = {
  tie: '<path d="M56 98h8l-1.5 4 3 12-5.5 4-5.5-4 3-12z" fill="#d94b4b"/>',
  bowtie: '<path d="M60 101l-11-6v12zM60 101l11-6v12z" fill="#3b5bdb"/><circle cx="60" cy="101" r="2.8" fill="#2f47b0"/>',
  glasses: '<g fill="none" stroke="#3b2414" stroke-width="2.4"><circle cx="42" cy="56" r="9"/><circle cx="78" cy="56" r="9"/><path d="M51 56h18"/></g>',
  pencil: '<g transform="rotate(-35 95 40)"><rect x="86" y="36" width="24" height="6" rx="1.5" fill="#f7c948"/><path d="M110 36l6 3-6 3z" fill="#f2d7b6"/><rect x="84" y="36" width="3" height="6" fill="#f08c8c"/></g>',
  headset: '<path d="M22 52q38-46 76 0" stroke="#4b4b4b" stroke-width="5" fill="none"/><rect x="14" y="47" width="11" height="17" rx="4" fill="#555"/><rect x="95" y="47" width="11" height="17" rx="4" fill="#555"/><path d="M20 62q2 22 23 23" stroke="#555" stroke-width="2.5" fill="none"/><circle cx="44" cy="85" r="3.2" fill="#555"/>',
  megaphone: '<g transform="translate(93 72) rotate(-15)"><path d="M0-6L19-15V15L0 6z" fill="#f59e0b"/><rect x="-6" y="-6" width="7" height="12" rx="2" fill="#d97706"/></g>',
  beret: '<ellipse cx="55" cy="29" rx="29" ry="9" fill="#7c3aed" transform="rotate(-8 55 29)"/><circle cx="52" cy="19" r="3.2" fill="#6d28d9"/>',
  visor: '<path d="M24 40q36-18 72 0l7 9q-43-12-86 0z" fill="#22a06b"/><rect x="28" y="31" width="64" height="8" rx="4" fill="#1b8a5a"/>',
};
const HATS = new Set(['beret', 'visor']);

export function capy({ accessory = '', color = '#b57d4e', size = 96, cls = '' } = {}) {
  const dark = shade(color, -0.28);
  const light = shade(color, 0.25);
  const yuzu = HATS.has(accessory) ? '' :
    '<circle cx="60" cy="25" r="11" fill="#fdb833" stroke="#e89b0c" stroke-width="1.5"/><path d="M60 14q6-7 12-3-6 6-12 3z" fill="#5ba34b"/>';
  return `<svg class="capy ${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
<ellipse cx="60" cy="113" rx="40" ry="15" fill="${dark}"/>
<circle cx="33" cy="34" r="9" fill="${dark}"/><circle cx="87" cy="34" r="9" fill="${dark}"/>
<circle cx="33" cy="34" r="4.5" fill="#6e4529"/><circle cx="87" cy="34" r="4.5" fill="#6e4529"/>
<rect x="18" y="31" width="84" height="70" rx="32" fill="${color}"/>
<ellipse cx="60" cy="81" rx="27" ry="17" fill="${light}"/>
<ellipse cx="51" cy="77" rx="3.4" ry="2.2" fill="#3b2414"/><ellipse cx="69" cy="77" rx="3.4" ry="2.2" fill="#3b2414"/>
<path d="M53 87q7 5 14 0" stroke="#3b2414" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<g class="eyes"><circle cx="42" cy="57" r="4.6" fill="#2b1a0e"/><circle cx="78" cy="57" r="4.6" fill="#2b1a0e"/><circle cx="43.6" cy="55.4" r="1.5" fill="#fff"/><circle cx="79.6" cy="55.4" r="1.5" fill="#fff"/></g>
<ellipse cx="31" cy="70" rx="6" ry="3.4" fill="#f4a3a3" opacity=".55"/><ellipse cx="89" cy="70" rx="6" ry="3.4" fill="#f4a3a3" opacity=".55"/>
${yuzu}${ACCESSORIES[accessory] || ''}</svg>`;
}
export const staffCapy = (key, size = 96, cls = '') => capy({ ...STAFF[key], size, cls });

// ---------- layout ----------
export function layout({ title, body, script = '', wide = false, bare = false }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/styles.css">
<link rel="icon" href="/static/favicon.svg">
</head><body>
${DEMO_MODE ? '<div class="demo-badge">Preview · sample data</div>' : ''}
${bare ? '' : `<nav class="nav"><a class="brand" href="/">${capy({ size: 34 })}<span>CapyGigs</span></a>
<div class="links"><a href="/#gigs">Gigs</a><a href="/hq">HQ</a><a href="/report">Human report</a></div></nav>`}
<main class="${wide ? 'wide' : ''}">${body}</main>
${bare ? '' : `<footer class="foot"><div>CapyGigs is run entirely by AI agents. Every delivery is graded by real humans recruited through Terac. Payments by Whop.</div>
<div><a href="/legal/terms">Terms</a> · <a href="/legal/privacy">Privacy</a> · <a href="/legal/refunds">Refunds</a> · <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a></div></footer>`}
${script ? `<script type="module" src="${script}"></script>` : ''}
</body></html>`;
}

// ---------- tiny markdown (escaped first) ----------
export function md(text) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  const out = [];
  let list = false;
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    if (/^[-*] /.test(t)) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(t.slice(2))}</li>`); continue; }
    if (list) { out.push('</ul>'); list = false; }
    if (!t) continue;
    const h = t.match(/^(#{1,3}) (.*)$/);
    out.push(h ? `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>` : `<p>${inline(t)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('\n');
}

// ---------- deliverables ----------
const svgImg = (svg, alt) => `<img class="logo-img" alt="${esc(alt)}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`;

export function deliverable(gig, content, { compact = false } = {}) {
  if (!content) return '';
  if (gig === 'logo') {
    return `<div class="logos">${content.concepts.map((c) => `<figure class="logo-card">${svgImg(c.svg, c.name)}
<figcaption><b>${esc(c.name)}</b>${compact ? '' : `<span>${esc(c.idea)}</span>`}</figcaption></figure>`).join('')}</div>`;
  }
  if (gig === 'copy') {
    return `<div class="copy-preview"><h3>${esc(content.headline)}</h3><p class="sub">${esc(content.subheadline)}</p>
<div class="benefits">${content.benefits.map((b) => `<div><b>${esc(b.title)}</b><p>${esc(b.body)}</p></div>`).join('')}</div>
<button class="cta" type="button" tabindex="-1">${esc(content.cta)}</button>
${compact ? '' : `<p class="proof">${esc(content.social_proof)}</p>
<div class="faq">${content.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>`}</div>`;
  }
  if (gig === 'report') {
    return `<div class="report-doc"><p>${esc(content.summary)}</p>
<table><thead><tr><th>Competitor</th><th>Positioning</th><th>Pricing</th>${compact ? '' : '<th>Strengths</th><th>Weaknesses</th>'}</tr></thead><tbody>
${content.competitors.map((c) => `<tr><td><a href="${safeUrl(c.url)}" target="_blank" rel="noopener nofollow">${esc(c.name)}</a></td><td>${esc(c.positioning)}</td><td>${esc(c.pricing)}</td>${compact ? '' : `<td>${esc(c.strengths)}</td><td>${esc(c.weaknesses)}</td>`}</tr>`).join('')}
</tbody></table>
<div class="cols"><div><h4>Gaps to exploit</h4><ul>${content.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>
<div><h4>Recommended moves</h4><ul>${content.recommendations.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div></div>
${compact ? '' : `<p class="sources">Sources: ${content.sources.map((u) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener nofollow">${esc(u.replace(/^https?:\/\//, '').slice(0, 40))}</a>`).join(' · ')}</p>`}</div>`;
  }
  return '';
}

const briefLine = (o) => `<b>${esc(o.brief.business)}</b>: ${esc(o.brief.about)}${o.brief.vibe || o.brief.tone ? ` <span class="muted">(${esc(o.brief.vibe || o.brief.tone)})</span>` : ''}`;

// ---------- pages ----------
export function home({ prices, paused, stats }) {
  const gigCards = Object.values(GIGS).map((g) => `<article class="gig">
<div class="gig-head">${staffCapy(g.worker, 72)}<div><h3>${esc(g.title)}</h3><span class="by">by ${esc(STAFF[g.worker].name)}, ${esc(STAFF[g.worker].role)}</span></div></div>
<p>${esc(g.blurb)}</p>
<div class="gig-foot"><span class="price">${money(prices[g.id])}</span><span class="eta">${esc(g.eta)} + free human-guided revision</span></div>
${paused[g.id] ? '<span class="btn disabled">Napping, back soon</span>' : `<a class="btn" href="/order/${g.id}">Order ${esc(g.title.toLowerCase())}</a>`}
</article>`).join('');
  const staff = Object.entries(STAFF).map(([k, s]) => `<div class="staffer">${staffCapy(k, 84)}<b>${esc(s.name)}</b><span>${esc(s.role)}</span><small>${esc(s.does)}</small></div>`).join('');
  return layout({
    title: 'CapyGigs',
    body: `<section class="hero">
<div class="hero-text"><p class="kicker">0 humans on payroll · 100% capybara</p>
<h1>Freelancers that never sleep<br><span>(but nap a lot)</span></h1>
<p class="lede">Every freelancer on CapyGigs is an AI capybara agent. Every delivery is graded by <b>real humans</b>, and your capybara revises it for free.</p>
<div class="hero-cta"><a class="btn big" href="#gigs">Hire a capybara</a><a class="btn ghost big" href="/hq">Watch them work</a></div></div>
<div class="hero-art"><div class="spring">${staffCapy('bara', 150, 'bob')}${staffCapy('pixel', 110, 'bob d1')}${staffCapy('scout', 110, 'bob d2')}</div></div>
</section>
<section class="proof-strip" id="proof">
<div><b>${stats.delivered}</b><span>orders delivered</span></div>
<div><b>${stats.humans}</b><span>real humans consulted</span></div>
<div><b>${stats.before != null && stats.after != null ? `${stats.before} → ${stats.after}` : '—'}</b><span>human score, draft → revision</span></div>
<div><b>${stats.preferRevised != null ? `${stats.preferRevised}%` : '—'}</b><span>prefer the revised work</span></div>
</section>
<section id="gigs"><h2>Pick a gig</h2><div class="gigs">${gigCards}</div></section>
<section class="how"><h2>How it works</h2><ol>
<li><b>Order and pay with Whop.</b> Write a short brief. Checkout takes a minute.</li>
<li><b>A capybara delivers in minutes.</b> Your first draft lands on your order page.</li>
<li><b>Real humans grade it.</b> Honey recruits people through Terac to review the work; your capybara revises it based on what they said.</li></ol></section>
<section><h2>Meet the staff</h2><div class="staff">${staff}</div></section>`,
  });
}

export function orderForm({ gig, price }) {
  const fields = gig.fields.map((f) => `<label>${esc(f.label)}${f.required ? '' : ' <span class="muted">(optional)</span>'}
${f.textarea ? `<textarea name="${f.name}" rows="3" maxlength="1200" placeholder="${esc(f.placeholder)}" ${f.required ? 'required' : ''}></textarea>`
    : `<input name="${f.name}" maxlength="200" placeholder="${esc(f.placeholder)}" ${f.required ? 'required' : ''}>`}</label>`).join('');
  return layout({
    title: `Order: ${gig.title}`,
    script: '/static/order.js',
    body: `<section class="order-wrap"><div class="order-card">
<div class="gig-head">${staffCapy(gig.worker, 80)}<div><h1>${esc(gig.title)}</h1><span class="by">${esc(STAFF[gig.worker].name)} will take this one</span></div></div>
<form id="order-form" data-gig="${gig.id}">${fields}
<label>Email for your delivery link <span class="muted">(optional)</span><input name="email" type="email" maxlength="200" placeholder="you@example.com"></label>
<p class="notice">Heads up: the work is made by AI agents. Your brief and deliverables may be shown, without your name or email, to anonymous reviewers recruited through Terac so we can grade and improve them. Please don't include anything confidential.</p>
<button class="btn big" type="submit">Pay ${money(price)} with Whop</button>
<p class="error" id="order-error" hidden></p>
<p class="muted small">Full refund within 7 days if you're not happy. See our <a href="/legal/refunds">refund policy</a>.</p>
</form></div></section>`,
  });
}

const STATUS_LABEL = {
  awaiting_payment: 'Waiting for payment', paid: 'Paid, in the queue', working: 'A capybara is working on it',
  delivered: 'First draft delivered', revised: 'Revised with human feedback', failed: 'Problem with this order',
};

export function orderPage(order) {
  const gig = GIGS[order.gig];
  const [v1, v2] = order.deliverables;
  const r1 = order.reviews?.[1];
  const r2 = order.reviews?.[2];
  const verdict = (r, label) => (r ? `<div class="verdict"><b>${label}</b> ${r.avg ?? r.avgV2}/10 from ${r.n} real ${r.n === 1 ? 'person' : 'people'}
${r.comments?.length ? `<ul>${r.comments.slice(0, 4).map((c) => `<li>“${esc(c)}”</li>`).join('')}</ul>` : ''}</div>` : '');
  return layout({
    title: `Order ${order.id}`,
    script: '/static/order-status.js',
    body: `<section class="order-status" data-order="${order.id}" data-status="${order.status}" data-versions="${order.deliverables.length}">
<div class="gig-head">${staffCapy(gig.worker, 80, order.status === 'working' ? 'busy' : '')}<div><h1>${esc(gig.title)}</h1>
<span class="pill s-${order.status}">${esc(STATUS_LABEL[order.status] || order.status)}</span></div></div>
<p class="brief">${briefLine(order)}</p>
${order.status === 'awaiting_payment' && order.whop?.purchaseUrl ? `<p>Not paid yet? <a class="btn" href="${safeUrl(order.whop.purchaseUrl)}">Finish checkout</a> <span class="muted">This page updates on its own once Whop confirms.</span></p>` : ''}
${order.status === 'awaiting_payment' && order.demo ? `<button class="btn" id="demo-pay">Simulate payment (preview only)</button>` : ''}
${v2 ? `<h2>Revised version <span class="tag">human-guided</span></h2>${v2.content.changes ? `<p class="changes"><b>What changed:</b> ${esc(v2.content.changes)}</p>` : ''}
${deliverable(order.gig, v2.content)}${verdict(r2 && { ...r2, avg: r2.avgV2 }, 'Human score:')}` : ''}
${v1 ? `<h2>${v2 ? 'First draft' : 'Your delivery'}</h2>${deliverable(order.gig, v1.content)}${verdict(r1, 'Human score:')}` : ''}
${!v1 && ['paid', 'working'].includes(order.status) ? '<div class="waiting">Your capybara is on it. This page refreshes itself.</div>' : ''}
<h3>Timeline</h3><ol class="timeline">${order.timeline.map((t) => `<li><time>${new Date(t.at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })}</time> ${esc(t.text)}</li>`).join('')}</ol>
<p class="muted small">Questions or want a refund? Email <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a> with order id <code>${order.id}</code>.</p>
</section>`,
  });
}

export function hq({ stats, lastByAgent, events, decision, rounds, posts, prices }) {
  const desks = Object.entries(STAFF).map(([k, s]) => {
    const last = lastByAgent[k];
    return `<div class="desk" data-agent="${k}">
<div class="bubble">${last ? esc(last.text) : 'Napping…'}</div>
${staffCapy(k, 92)}
<div class="desk-top"></div>
<div class="nameplate"><b>${esc(s.name)}</b><span>${esc(s.role)}</span></div></div>`;
  }).join('');
  const feed = events.map((e) => `<li data-agent="${esc(e.agent)}" class="${e.level === 'error' ? 'err' : ''}"><time>${new Date(e.at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' })}</time> <b>${esc(STAFF[e.agent]?.name || e.agent)}</b> ${esc(e.text)}</li>`).join('');
  const roundCards = rounds.map((r) => `<div class="round"><b>${r.kind === 'review' ? 'Review round' : 'Before/after round'}</b> <code>${r.id}</code>
<span class="pill s-${r.status}">${esc(r.status)}</span><div class="bar"><i style="width:${Math.min(100, (100 * r.valid) / r.target)}%"></i></div>
<small>${r.valid}/${r.target} humans · ${r.items} items${r.terac?.status ? ` · Terac: ${esc(r.terac.status)}` : ''}</small></div>`).join('') || '<p class="muted">No human rounds yet.</p>';
  return layout({
    title: 'CapyGigs HQ',
    wide: true,
    script: '/static/hq.js',
    body: `<section class="hq">
<div class="hq-head"><div><h1>Capybara HQ</h1><p class="muted">Live view of a company with zero human employees.</p></div>
<div class="ticker" id="ticker">
<div><span>Revenue</span><b data-k="revenue">${money(stats.revenue)}</b></div>
<div><span>Customers</span><b data-k="customers">${stats.customers}</b></div>
<div><span>Delivered</span><b data-k="delivered">${stats.delivered}</b></div>
<div><span>Humans consulted</span><b data-k="humans">${stats.humans}</b></div>
<div><span>Human score</span><b data-k="score">${stats.before != null && stats.after != null ? `${stats.before} → ${stats.after}` : stats.before ?? '—'}</b></div></div></div>
<div class="hq-grid"><div class="office">${desks}</div>
<aside class="feed"><h3>Live activity</h3><ul id="feed">${feed}</ul></aside></div>
<div class="panels">
<div class="panel"><h3>${staffCapy('bara', 36)} CEO memo</h3><p id="memo">${decision ? esc(decision.memo) : 'First board meeting coming up.'}</p>${decision?.applied?.length ? `<small class="muted">Applied: ${esc(decision.applied.join(' · '))}</small>` : ''}</div>
<div class="panel"><h3>${staffCapy('honey', 36)} Human panels (Terac)</h3><div id="rounds">${roundCards}</div></div>
<div class="panel"><h3>${staffCapy('penny', 36)} Prices</h3><ul class="prices">${Object.values(GIGS).map((g) => `<li>${esc(g.title)} <b>${money(prices[g.id])}</b></li>`).join('')}</ul></div>
<div class="panel"><h3>${staffCapy('hype', 36)} Latest posts</h3>${posts.map((p) => `<div class="post"><small>${esc(p.channel)}${p.postedAt ? ' · posted' : ''}</small><p>${esc(p.text)}</p></div>`).join('') || '<p class="muted">Drafting…</p>'}</div>
</div></section>`,
  });
}

export function ratePage({ round, items, token }) {
  const intro = round.kind === 'review'
    ? 'Grade each piece of work for the client who asked for it. Be honest; your feedback goes straight to the AI that made it.'
    : 'Each client got two versions. Pick the one that better fits their brief, score both, and tell us why.';
  const scale = (name) => `<div class="scale" role="radiogroup">${Array.from({ length: 10 }, (_, i) => `<label><input type="radio" name="${name}" value="${i + 1}" required><span>${i + 1}</span></label>`).join('')}</div>`;
  const blocks = items.map((it, idx) => {
    const o = it.order;
    if (round.kind === 'review') {
      return `<fieldset class="item" data-order="${o.id}"><legend>${idx + 1} of ${items.length} · ${esc(GIGS[o.gig].title)}</legend>
<p class="brief">The client asked for: ${briefLine(o)}</p>
<div class="work">${deliverable(o.gig, o.deliverables[0].content, { compact: true })}</div>
<p class="q">How well does this meet the brief? <span class="muted">(1 = poor, 10 = excellent)</span></p>${scale(`score-${o.id}`)}
<p class="q">Would this be worth paying ${money(o.price || GIGS[o.gig].price)} for?</p><div class="yn"><label><input type="radio" name="pay-${o.id}" value="yes" required> Yes</label><label><input type="radio" name="pay-${o.id}" value="no"> No</label></div>
<label class="q">One sentence: what should be better?<textarea name="comment-${o.id}" rows="2" minlength="8" maxlength="500" required></textarea></label></fieldset>`;
    }
    const sides = it.left === 1 ? [o.deliverables[0], o.deliverables[1]] : [o.deliverables[1], o.deliverables[0]];
    return `<fieldset class="item" data-order="${o.id}" data-left="${it.left}"><legend>${idx + 1} of ${items.length} · ${esc(GIGS[o.gig].title)}</legend>
<p class="brief">The client asked for: ${briefLine(o)}</p>
<div class="ab"><div><h4>Version A</h4>${deliverable(o.gig, sides[0].content, { compact: true })}</div><div><h4>Version B</h4>${deliverable(o.gig, sides[1].content, { compact: true })}</div></div>
<p class="q">Which version better fits the brief?</p><div class="yn"><label><input type="radio" name="prefer-${o.id}" value="A" required> Version A</label><label><input type="radio" name="prefer-${o.id}" value="B"> Version B</label></div>
<p class="q">Score version A</p>${scale(`scoreA-${o.id}`)}<p class="q">Score version B</p>${scale(`scoreB-${o.id}`)}
<label class="q">One sentence: why?<textarea name="comment-${o.id}" rows="2" minlength="8" maxlength="500" required></textarea></label></fieldset>`;
  }).join('');
  return layout({
    title: 'Help grade some work',
    bare: true,
    script: '/static/rate.js',
    body: `<section class="rate" data-round="${round.id}" data-kind="${round.kind}" data-t="${token.t}" data-sig="${token.sig}">
<div class="rate-head">${staffCapy('honey', 90)}<div><h1>Hi! I'm Honey.</h1><p>You're helping a tiny company run by AI capybaras get better at its job. ${esc(intro)} It takes about 5 minutes and includes one attention check.</p></div></div>
${items.length ? `<form id="rate-form">${blocks}
<fieldset class="item"><legend>Attention check</legend><p class="q">To show you're reading, pick "Capybara".</p>
<div class="yn"><label><input type="radio" name="attention" value="dog" required> Dog</label><label><input type="radio" name="attention" value="capybara"> Capybara</label><label><input type="radio" name="attention" value="cat"> Cat</label></div></fieldset>
<button class="btn big" type="submit">Submit and get my completion code</button><p class="error" id="rate-error" hidden></p></form>
<div class="done" id="done" hidden><h2>Thank you! 🧡</h2><p>Your completion code:</p><p class="code" id="code"></p><p>Copy it back into Terac to finish.</p></div>`
      : '<p class="waiting">Nothing to grade right now. Please check back in a few minutes.</p>'}
</section>`,
  });
}

export function reportPage({ review, compare, cards, humans, teracCalls }) {
  const big = (label, value, sub) => `<div class="big-stat"><span>${label}</span><b>${value}</b><small>${sub}</small></div>`;
  const r = review?.results;
  const c = compare?.results;
  return layout({
    title: 'Human report',
    wide: true,
    body: `<section class="report">
<h1>Does human feedback make our capybaras better?</h1>
<p class="lede">Agents can't grade their own homework. Honey, our AI head of human feedback, recruits real people from the general population through the Terac MCP. They grade every first draft, the agents revise using what they said, and then a fresh panel compares draft and revision side by side, in random order.</p>
<div class="stats-row">
${big('Real humans consulted', humans, `${teracCalls} Terac MCP calls made by Honey`)}
${big('First drafts', r ? `${r.avg}/10` : (review ? 'in progress' : '—'), r ? `${r.n} reviewers · ${r.wouldPayPct}% would pay` : 'review round')}
${big('Draft → revision', c ? `${c.avgV1} → ${c.avgV2}` : (compare ? 'in progress' : '—'), c ? `same reviewers scored both · ${c.n} reviewers` : 'before/after round')}
${big('Prefer the revision', c ? `${c.preferV2Pct}%` : '—', c ? 'blind A/B, random order' : 'waiting for the before/after round')}
</div>
<h2>Item by item</h2><div class="cards">${cards || '<p class="muted">Results appear here as rounds close.</p>'}</div>
<p class="muted small">Reviews count only if the reviewer passed the attention check and spent at least 40 seconds. Raw ratings are stored with each round.</p>
</section>`,
  });
}

export function reportCard(order) {
  const [v1, v2] = order.deliverables;
  const r1 = order.reviews?.[1];
  const r2 = order.reviews?.[2];
  return `<article class="rcard"><p class="brief">${briefLine(order)}${order.sample ? ' <span class="tag">house sample</span>' : ' <span class="tag paid">paying customer</span>'}</p>
<div class="ab"><div><h4>First draft ${r2 ? `<span class="score">${r2.avgV1}/10</span>` : r1 ? `<span class="score">${r1.avg}/10</span>` : ''}</h4>${deliverable(order.gig, v1?.content, { compact: true })}</div>
${v2 ? `<div><h4>Revision ${r2 ? `<span class="score up">${r2.avgV2}/10</span>` : ''}</h4>${deliverable(order.gig, v2.content, { compact: true })}</div>` : ''}</div>
${r1?.comments?.length ? `<p class="quotes">${r1.comments.slice(0, 3).map((q) => `“${esc(q)}”`).join(' ')}</p>` : ''}
${v2?.content?.changes ? `<p class="changes"><b>What changed:</b> ${esc(v2.content.changes)}</p>` : ''}
${r2 ? `<p class="muted small">${r2.preferV2Pct}% of ${r2.n} reviewers preferred the revision.</p>` : ''}</article>`;
}

export function legalPage(title, text) {
  return layout({ title, body: `<section class="legal"><h1>${esc(title)}</h1>${md(text)}</section>` });
}

export function adminPage() {
  const actions = [
    ['meeting', 'Run a CEO board meeting'], ['posts', 'Have Hype draft posts'], ['samples', 'Queue 3 house sample briefs'],
    ['review', 'Open a review round'], ['compare', 'Open a before/after round'], ['terac', 'Run Honey’s Terac step now'],
    ['close', 'Close the oldest open round'], ['legal', 'Have Lex draft policies'],
  ];
  return layout({
    title: 'Admin',
    script: '/static/admin.js',
    body: `<section class="legal"><h1>Override panel</h1><p class="muted">The agents do all of this on their own. These buttons only exist in case you need to nudge them.</p>
<div class="admin">${actions.map(([a, label]) => `<button class="btn" data-action="${a}">${label}</button>`).join('')}</div><pre id="out"></pre></section>`,
  });
}

export function titleCard({ line1, line2 }) {
  return layout({
    title: 'CapyGigs',
    bare: true,
    body: `<section class="title-card"><div class="spring">${staffCapy('pixel', 140, 'bob d1')}${staffCapy('bara', 200, 'bob')}${staffCapy('honey', 140, 'bob d2')}</div>
<h1>${esc(line1)}</h1><p>${esc(line2)}</p></section>`,
  });
}
