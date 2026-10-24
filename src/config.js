import 'dotenv/config';

export const PORT = Number(process.env.PORT || 3000);
export const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
export const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
export const DEMO_MODE = process.env.DEMO_MODE === '1';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@capygigs.app';
export const DATA_FILE = process.env.DATA_FILE || 'data/db.json';

// Admin endpoints are a safety valve; the agents trigger the same actions on their own.
// Without ADMIN_TOKEN, the server generates one and keeps it in the data file.
export const ADMIN_TOKEN_ENV = process.env.ADMIN_TOKEN;

export const WHOP = {
  apiKey: process.env.WHOP_API_KEY,
  companyId: process.env.WHOP_COMPANY_ID,
  productId: process.env.WHOP_PRODUCT_ID,
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
  sandbox: process.env.WHOP_SANDBOX === '1',
  planVisibility: process.env.WHOP_PLAN_VISIBILITY,
};

export const TERAC = {
  apiKey: process.env.TERAC_API_KEY,
  url: process.env.TERAC_MCP_URL || 'https://terac.com/api/mcp',
  participantsPerRound: Number(process.env.TERAC_PARTICIPANTS || 15),
  maxBudgetUsd: Number(process.env.TERAC_MAX_BUDGET_USD || 150),
};

export const EXA_API_KEY = process.env.EXA_API_KEY;
export const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export const CEO_INTERVAL_MIN = Number(process.env.CEO_INTERVAL_MIN || 20);
export const TERAC_POLL_MIN = Number(process.env.TERAC_POLL_MIN || 3);

export const llmReady = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
export const whopReady = () => Boolean(WHOP.apiKey && WHOP.companyId);
export const teracReady = () => Boolean(TERAC.apiKey);

// The gig catalog. Prices are defaults; the CEO agent can move them within PRICE_BOUNDS.
export const GIGS = {
  logo: {
    id: 'logo',
    title: 'Logo pack',
    price: 5,
    worker: 'pixel',
    eta: '~2 min',
    blurb: 'Three vector logo concepts for your brand, delivered as crisp SVGs.',
    fields: [
      { name: 'business', label: 'Business or project name', placeholder: 'Bodega Bagels', required: true },
      { name: 'about', label: 'What do you do?', placeholder: 'Late-night bagel shop in Williamsburg', required: true, textarea: true },
      { name: 'vibe', label: 'Vibe, colors, anything to avoid', placeholder: 'Playful, warm orange, no gradients' },
    ],
  },
  copy: {
    id: 'copy',
    title: 'Landing page copy',
    price: 5,
    worker: 'quill',
    eta: '~2 min',
    blurb: 'Headline, subhead, benefits, call to action and FAQ, written to convert.',
    fields: [
      { name: 'business', label: 'Product name', placeholder: 'NapTime', required: true },
      { name: 'about', label: 'What does it do, and for whom?', placeholder: 'An app that schedules power naps for busy founders', required: true, textarea: true },
      { name: 'tone', label: 'Tone', placeholder: 'Confident, friendly, a little funny' },
    ],
  },
  report: {
    id: 'report',
    title: 'Competitor report',
    price: 9,
    worker: 'scout',
    eta: '~4 min',
    blurb: 'Your top competitors researched live on the web: positioning, pricing, gaps to exploit.',
    fields: [
      { name: 'business', label: 'Your company or product', placeholder: 'CapyGigs', required: true },
      { name: 'about', label: 'What you sell and to whom', placeholder: 'AI freelancers for small businesses', required: true, textarea: true },
      { name: 'competitors', label: 'Competitors you already know (optional)', placeholder: 'Fiverr, Upwork' },
    ],
  },
};
export const PRICE_BOUNDS = { min: 3, max: 25 };

// The staff. Every one of them is an agent.
export const STAFF = {
  bara: { name: 'Capy Bara', role: 'CEO', does: 'Runs board meetings, sets prices, decides when to ask humans', color: '#b57d4e', accessory: 'tie' },
  pixel: { name: 'Pixel', role: 'Designer', does: 'Draws logo packs as SVG', color: '#a8714a', accessory: 'beret' },
  quill: { name: 'Quill', role: 'Copywriter', does: 'Writes landing-page copy', color: '#bf8a5a', accessory: 'pencil' },
  scout: { name: 'Scout', role: 'Researcher', does: 'Researches competitors with Exa', color: '#9c6a41', accessory: 'glasses' },
  honey: { name: 'Honey', role: 'Head of Human Feedback', does: 'Recruits real people through the Terac MCP', color: '#c4925f', accessory: 'headset' },
  hype: { name: 'Hype', role: 'CMO', does: 'Writes launch posts and promos', color: '#b07a4f', accessory: 'megaphone' },
  penny: { name: 'Penny', role: 'CFO', does: 'Takes payments through Whop, tracks revenue', color: '#a36f45', accessory: 'visor' },
  lex: { name: 'Lex', role: 'General Counsel', does: 'Drafts terms, privacy and refund policies', color: '#94653f', accessory: 'bowtie' },
};
