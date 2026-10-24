import { EXA_API_KEY, GIGS, STAFF } from '../config.js';
import { exaSearch } from '../exa.js';
import { agentMode, arr, createMessage, obj, str, textOf, writeJson } from '../llm.js';
import { db, findOrder, log, newId, touch } from '../store.js';

// ---------- output schemas ----------
const LOGO_SCHEMA = obj({
  concepts: arr(
    obj({
      name: str('Short concept name'),
      idea: str('One sentence on the idea behind it'),
      svg: str('A complete standalone <svg> element, viewBox="0 0 512 512"'),
    }),
    'Exactly three distinct logo concepts',
  ),
});
const COPY_SCHEMA = obj({
  headline: str(),
  subheadline: str(),
  benefits: arr(obj({ title: str(), body: str() }), 'Exactly three benefits'),
  cta: str('Button label'),
  social_proof: str('One line of social proof the client can truthfully use, or a placeholder in [brackets]'),
  faq: arr(obj({ q: str(), a: str() }), 'Exactly three FAQ entries'),
});
const REPORT_SCHEMA = obj({
  summary: str('Three or four sentence executive summary'),
  competitors: arr(
    obj({ name: str(), url: str(), positioning: str(), pricing: str('Pricing if found, else "Not public"'), strengths: str(), weaknesses: str() }),
    'Three to five competitors',
  ),
  gaps: arr(str(), 'Market gaps the client can exploit'),
  recommendations: arr(str(), 'Concrete next moves for the client'),
  sources: arr(str('URL'), 'URLs actually used'),
});
const SCHEMAS = { logo: LOGO_SCHEMA, copy: COPY_SCHEMA, report: REPORT_SCHEMA };

const withChanges = (schema) => ({
  ...schema,
  properties: { ...schema.properties, changes: str('What you changed in response to the human feedback, in two or three sentences') },
  required: [...schema.required, 'changes'],
});

// ---------- SVG safety ----------
export function sanitizeSvg(svg) {
  let s = String(svg || '');
  const start = s.indexOf('<svg');
  const end = s.lastIndexOf('</svg>');
  if (start < 0 || end < 0) throw new Error('logo concept was not an SVG');
  s = s.slice(start, end + 6)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*("|')(?!#)[^"']*\1/gi, '')
    .replace(/javascript:/gi, '');
  if (!/\sxmlns=/.test(s.slice(0, 200))) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return s;
}

// ---------- workers ----------
const briefText = (brief) =>
  Object.entries(brief)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

const SYSTEMS = {
  logo: `You are Pixel, the capybara designer at CapyGigs. You design simple, memorable, professional logos as hand-written SVG.
Each SVG: viewBox="0 0 512 512", flat colors, no external images, fonts or scripts, under 5000 characters.
If you include the brand name as <text>, use font-family="Helvetica, Arial, sans-serif" and keep it legible.
Make the three concepts genuinely different (e.g. wordmark, symbol plus wordmark, emblem).`,
  copy: `You are Quill, the capybara copywriter at CapyGigs. You write clear, specific, conversion-focused landing-page copy.
No clichés like "revolutionize" or "unlock". Never invent statistics, customers or testimonials; use [placeholders] instead.`,
  report: `You are Scout, the capybara researcher at CapyGigs. You write sharp competitor reports for small businesses.
Use only facts supported by the research notes you are given, cite source URLs, and say "Not public" when unknown.`,
};

async function research(brief) {
  const queries = [
    `${brief.about} competitors`,
    `${brief.business} alternatives`,
    brief.competitors ? `${brief.competitors} pricing` : `${brief.about} pricing plans`,
  ];
  if (EXA_API_KEY) {
    const seen = new Set();
    const results = [];
    for (const q of queries) {
      log('scout', `Exa search: "${q}"`);
      for (const r of await exaSearch(q)) {
        if (!seen.has(r.url)) { seen.add(r.url); results.push(r); }
      }
    }
    return results.slice(0, 12).map((r) => `SOURCE ${r.url}\nTITLE ${r.title}\n${r.text}`).join('\n\n');
  }
  // No Exa key: fall back to Claude's own web search tool.
  log('scout', 'No Exa key, researching with web search instead');
  let messages = [{ role: 'user', content: `Research the competitive landscape for this business and write detailed notes with source URLs.\n\n${briefText(brief)}` }];
  for (let i = 0; i < 4; i++) {
    const message = await createMessage({
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
      output_config: { effort: 'medium' },
      messages,
    });
    if (message.stop_reason !== 'pause_turn') return textOf(message);
    messages = [...messages, { role: 'assistant', content: message.content }];
  }
  return '';
}

export async function produce(gig, brief, feedback = null, previous = null) {
  const schema = feedback ? withChanges(SCHEMAS[gig]) : SCHEMAS[gig];
  let context = '';
  if (gig === 'report') {
    context = agentMode() && !EXA_API_KEY
      ? '\n\nResearch: search the live web for real competitors and their current pricing before writing. List only URLs you actually used in sources.'
      : `\n\nResearch notes:\n${await research(brief)}`;
  }
  const revision = feedback
    ? `\n\nThis is a REVISION. Your previous draft:\n${JSON.stringify(previous).slice(0, 12000)}\n\n` +
      `${feedback.n} real people rated it ${feedback.avg}/10 on average. What they said:\n` +
      feedback.comments.map((c) => `- ${c}`).join('\n') +
      `\n\nKeep what worked, fix what they flagged, and make it clearly better.`
    : '';
  const result = await writeJson({
    agent: GIGS[gig].worker,
    system: SYSTEMS[gig],
    prompt: `Client brief:\n${briefText(brief)}${context}${revision}`,
    schema,
    effort: gig === 'report' ? 'high' : 'medium',
    maxTokens: 24000,
  });
  if (gig === 'logo') {
    result.concepts = result.concepts.slice(0, 3).map((c) => ({ ...c, svg: sanitizeSvg(c.svg) }));
  }
  return result;
}

function setStatus(order, status, note) {
  order.status = status;
  order.timeline.push({ at: new Date().toISOString(), text: note });
  touch('order', { id: order.id });
}

const running = new Set();

export async function fulfill(orderId) {
  const order = findOrder(orderId);
  if (!order || running.has(orderId) || order.deliverables.length) return;
  running.add(orderId);
  const gig = GIGS[order.gig];
  const worker = gig.worker;
  setStatus(order, 'working', `${STAFF[worker].name} picked up the order.`);
  log(worker, `Started on ${gig.title} for "${order.brief.business}"`, { orderId });
  try {
    let content;
    for (let attempt = 1; ; attempt++) {
      try { content = await produce(order.gig, order.brief); break; } catch (err) {
        if (attempt >= 2) throw err;
        log(worker, `Draft failed (${err.message}), trying again`);
      }
    }
    order.deliverables.push({ version: 1, at: new Date().toISOString(), by: worker, content });
    setStatus(order, 'delivered', 'First draft delivered. Real people will grade it next, then it gets a free revision.');
    log(worker, `Delivered ${gig.title} for "${order.brief.business}"`, { orderId });
  } catch (err) {
    setStatus(order, 'failed', 'Something went wrong. A refund will be issued if we cannot deliver.');
    log(worker, `Could not deliver order ${orderId}: ${err.message}`, { orderId, level: 'error' });
  } finally {
    running.delete(orderId);
  }
}

export async function revise(orderId, feedback) {
  const order = findOrder(orderId);
  if (!order || order.deliverables.length !== 1) return;
  const worker = GIGS[order.gig].worker;
  log(worker, `Revising "${order.brief.business}" using ${feedback.n} human reviews (avg ${feedback.avg}/10)`, { orderId });
  try {
    const content = await produce(order.gig, order.brief, feedback, order.deliverables[0].content);
    order.deliverables.push({ version: 2, at: new Date().toISOString(), by: worker, content, feedback });
    setStatus(order, 'revised', `Revised using feedback from ${feedback.n} real people.`);
    log(worker, `Shipped human-guided revision for "${order.brief.business}"`, { orderId });
  } catch (err) {
    log(worker, `Revision failed for ${orderId}: ${err.message}`, { orderId, level: 'error' });
  }
}

// House samples: briefs the agents work on so rating rounds have enough items early on.
const SAMPLE_BRIEFS = [
  { gig: 'logo', brief: { business: 'Bodega Bagels', about: 'Late-night bagel shop in Williamsburg, Brooklyn', vibe: 'Playful, warm orange, a little retro' } },
  { gig: 'logo', brief: { business: 'Tidewater Yoga', about: 'Small yoga studio on the Rockaway beach boardwalk', vibe: 'Calm, ocean blues, minimal' } },
  { gig: 'logo', brief: { business: 'Fixit Fern', about: 'Mobile bike repair that comes to your door in Queens', vibe: 'Bold, green, friendly' } },
  { gig: 'copy', brief: { business: 'NapTime', about: 'An app that schedules 20-minute power naps around your calendar, for busy founders', tone: 'Confident, friendly, a little funny' } },
  { gig: 'copy', brief: { business: 'StoopSwap', about: 'A neighborhood app for giving away furniture left on Brooklyn stoops', tone: 'Warm, community-minded' } },
  { gig: 'copy', brief: { business: 'LedgerLeaf', about: 'Bookkeeping for independent plant shops, done by an accountant who loves plants', tone: 'Trustworthy, calm' } },
];

export async function createSamples(count = 6) {
  const existing = db.orders.filter((o) => o.sample).length;
  const todo = SAMPLE_BRIEFS.slice(existing, existing + count);
  const created = todo.map(({ gig, brief }) => {
    const order = {
      id: newId('ord'), gig, brief, email: null, price: 0, sample: true,
      status: 'paid', createdAt: new Date().toISOString(), paidAt: new Date().toISOString(),
      deliverables: [], reviews: {}, timeline: [{ at: new Date().toISOString(), text: 'House sample brief for human review rounds.' }],
    };
    db.orders.push(order);
    return order;
  });
  touch('order');
  if (created.length) log('bara', `Queued ${created.length} house sample briefs so the human panel has enough work to grade`);
  await Promise.all(created.map((o) => fulfill(o.id)));
  return created;
}
