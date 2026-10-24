// Records the CapyGigs demo video: AssemblyAI narration (voice "eve") over a Playwright walkthrough.
//
//   node scripts/make-video.js --url=https://your-public-url [--out=out/capygigs-demo.mp4] [--voice=eve] [--preview]
//
// Narration numbers come from the live server (/api/hq), so re-run this once real orders and Terac
// results are in. --preview keeps the narration free of numbers (for sample data).
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { speakToFile } from './tts.js';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is needed: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : '1'];
}));
const BASE = (args.url || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const OUT = args.out || 'out/capygigs-demo.mp4';
const VOICE = args.voice || process.env.NARRATOR_VOICE || 'eve';
const PREVIEW = args.preview === '1';
const WORK = path.join(path.dirname(OUT), `.${path.basename(OUT, '.mp4')}-work`);
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

const getJson = async (p) => (await fetch(BASE + p)).json();
const { stats: s } = await getJson('/api/hq');
const show = await getJson('/api/showcase');

const dollars = (n) => {
  const whole = Math.floor(n);
  const cents = Math.round((n - whole) * 100);
  return `${whole} dollar${whole === 1 ? '' : 's'}${cents ? ` and ${cents} cents` : ''}`;
};

// ---------- script ----------
const lines = {
  title: 'Meet CapyGigs: a freelance marketplace where every freelancer is a capybara agent. Zero humans on payroll.',
  gigs: 'Need a logo, landing page copy, or a competitor report? Pick a gig. Prices start at five dollars, and our CEO agent adjusts them as demand changes.',
  order: "Write a quick brief and pay with Whop. That's the only part a human ever does.",
  delivery: show.hasRevision
    ? 'Minutes later, a capybara delivers. Here is the revision, made after real people reviewed the first draft, and the first draft just below it.'
    : 'Minutes later, a capybara delivers the first draft, right on your order page.',
  hq: 'Behind the scenes, the whole company runs itself. Capy Bara, our CEO, holds board meetings and makes the hard calls. Penny runs payments, Hype writes our marketing, Scout researches with Exa, and Lex keeps us legal.',
  humans: "But agents can't grade their own homework. Honey, our head of human feedback, uses the Terac MCP to recruit real people, who score every delivery and tell the agents what to fix.",
  proof: !PREVIEW && s.preferRevised != null
    ? `So far, ${s.humans} real people have reviewed our work. In a blind side by side test, ${s.preferRevised} percent preferred the revised version, and scores rose from ${s.before} to ${s.after} out of ten.`
    : !PREVIEW && s.humans > 0
      ? `So far, ${s.humans} real people have reviewed our work, and every comment goes straight into the next revision.`
      : 'Then the agents revise, and a fresh panel compares draft and revision side by side, in random order, so we can prove the work actually got better.',
  close: !PREVIEW && s.revenue > 0
    ? `That's ${s.customers} paying customer${s.customers === 1 ? '' : 's'} and ${dollars(s.revenue)} in real revenue through Whop, with zero humans on payroll. CapyGigs: freelancers that never sleep, but nap a lot.`
    : 'Real payments through Whop, real human feedback through Terac, and zero humans on payroll. CapyGigs: freelancers that never sleep, but nap a lot.',
};

// ---------- browser helpers ----------
const scrollBy = (page, px, ms) => page.evaluate(([px, ms]) => new Promise((done) => {
  const start = window.scrollY;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    window.scrollTo(0, start + px * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
    if (k < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
}), [px, ms]);
const scrollToEl = async (page, selector, ms) => {
  const y = await page.evaluate((sel) => document.querySelector(sel)?.getBoundingClientRect().top ?? 0, selector);
  await scrollBy(page, y - 20, ms);
};
const go = (page, p) => page.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => {});

const scenes = [
  { key: 'title', run: (page) => go(page, '/demo/title') },
  { key: 'gigs', run: async (page, d) => { await go(page, '/'); await page.waitForTimeout(d * 0.3); await scrollToEl(page, '#gigs', d * 0.35); } },
  { key: 'order', run: async (page) => {
    await go(page, '/order/logo');
    await page.type('input[name=business]', 'Bodega Bagels', { delay: 55 });
    await page.type('textarea[name=about]', 'Late-night bagel shop in Williamsburg', { delay: 35 });
    await page.type('input[name=vibe]', 'Playful, warm orange', { delay: 45 });
    await page.hover('button[type=submit]');
  } },
  { key: 'delivery', run: async (page, d) => {
    await go(page, show.orderId ? `/o/${show.orderId}` : '/report');
    await page.waitForTimeout(d * 0.25);
    await scrollBy(page, 520, d * 0.3);
    await page.waitForTimeout(d * 0.1);
    await scrollBy(page, 520, d * 0.25);
  } },
  { key: 'hq', run: async (page, d) => { await go(page, '/hq'); await page.waitForTimeout(d * 0.55); await scrollBy(page, 420, d * 0.3); } },
  { key: 'humans', run: async (page, d) => {
    await go(page, show.roundId ? `/rate/${show.roundId}?preview=1` : '/report');
    await page.waitForTimeout(d * 0.3);
    await scrollBy(page, 700, d * 0.45);
  } },
  { key: 'proof', run: async (page, d) => { await go(page, '/report'); await page.waitForTimeout(d * 0.35); await scrollBy(page, 480, d * 0.4); } },
  { key: 'close', run: (page) => go(page, '/demo/title?l1=CapyGigs&l2=' + encodeURIComponent('0 humans on payroll · real humans in the loop')) },
];

// --scenes=file.json replaces the built-in walkthrough: [{ key, url, say, steps }], where url is absolute or
// relative to --url and steps are {wait: f} | {scroll: px, over: f} | {scrollTo: selector, over: f} |
// {type: [selector, text]} | {hover: selector}; f is a fraction of the scene's narration time.
if (args.scenes) {
  const custom = JSON.parse(fs.readFileSync(args.scenes, 'utf8'));
  scenes.length = 0;
  for (const s of custom) {
    lines[s.key] = s.say;
    scenes.push({ key: s.key, run: async (page, d) => {
      const external = /^https?:/.test(s.url);
      await page.goto(external ? s.url : BASE + s.url, { waitUntil: external ? 'domcontentloaded' : 'networkidle', timeout: 20000 }).catch(() => {});
      if (external) await page.waitForTimeout(1200);
      for (const st of s.steps || []) {
        if (st.wait) await page.waitForTimeout(d * st.wait);
        else if (st.scroll) await scrollBy(page, st.scroll, d * (st.over || 0.3));
        else if (st.scrollTo) await scrollToEl(page, st.scrollTo, d * (st.over || 0.3));
        else if (st.type) await page.type(st.type[0], st.type[1], { delay: 45 }).catch(() => {});
        else if (st.hover) await page.hover(st.hover).catch(() => {});
      }
    } });
  }
}

// ---------- narration ----------
console.log(`Narrating ${scenes.length} scenes with AssemblyAI voice "${VOICE}"…`);
const audio = await Promise.all(scenes.map(async (scene, i) => {
  const file = path.join(WORK, `n${i}.wav`);
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await speakToFile(lines[scene.key], file, { voice: VOICE });
      return { file, seconds: res.seconds };
    } catch (err) {
      if (attempt >= 3) throw err;
      console.warn(`retrying narration ${i}: ${err.message}`);
    }
  }
}));

// ---------- recording ----------
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: WORK, size: { width: 1280, height: 720 } } });
const page = await context.newPage();
const t0 = Date.now();
const LEAD = 350; // ms of picture before each line starts
const timeline = [];
for (const [i, scene] of scenes.entries()) {
  const start = Date.now() - t0;
  const dur = audio[i].seconds * 1000 + LEAD + 650;
  console.log(`scene ${i + 1}/${scenes.length} ${scene.key} (${(dur / 1000).toFixed(1)}s)`);
  await scene.run(page, dur);
  const left = dur - (Date.now() - t0 - start);
  if (left > 0) await page.waitForTimeout(left);
  timeline.push({ start: start + LEAD, seconds: audio[i].seconds, text: lines[scene.key] });
}
const raw = await page.video().path();
await context.close();
await browser.close();

// ---------- captions ----------
const ts = (ms) => {
  const d = new Date(Math.max(0, ms));
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')},${String(d.getUTCMilliseconds()).padStart(3, '0')}`;
};
let srt = '';
let n = 0;
for (const t of timeline) {
  const words = t.text.split(' ');
  const chunks = [];
  for (let i = 0; i < words.length; i += 10) chunks.push(words.slice(i, i + 10).join(' '));
  const total = chunks.reduce((a, c) => a + c.length, 0);
  let at = t.start;
  for (const c of chunks) {
    const len = (t.seconds * 1000 * c.length) / total;
    srt += `${++n}\n${ts(at)} --> ${ts(at + len)}\n${c}\n\n`;
    at += len;
  }
}
const srtFile = path.join(WORK, 'captions.srt');
fs.writeFileSync(srtFile, srt);

// ---------- mux ----------
const inputs = ['-y', '-i', raw, ...audio.flatMap((a) => ['-i', a.file])];
const delays = timeline.map((t, i) => `[${i + 1}:a]adelay=${Math.round(t.start)}:all=1[a${i}]`).join(';');
const mix = `${timeline.map((_, i) => `[a${i}]`).join('')}amix=inputs=${timeline.length}:normalize=0:dropout_transition=0[aout]`;
const style = "FontName=DejaVu Sans,FontSize=11,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=22";
const encode = (withCaptions) => execFileSync('ffmpeg', [
  ...inputs,
  '-filter_complex', `${delays};${mix}${withCaptions ? `;[0:v]subtitles=${srtFile}:force_style='${style}'[v]` : ''}`,
  '-map', withCaptions ? '[v]' : '0:v', '-map', '[aout]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '21', '-r', '30',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', OUT,
], { stdio: ['ignore', 'ignore', 'pipe'] });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
try {
  encode(args.captions !== '0');
} catch (err) {
  console.warn('Caption burn-in failed, encoding without captions:', String(err.stderr || err).slice(-300));
  encode(false);
}
fs.copyFileSync(srtFile, OUT.replace(/\.mp4$/, '.srt'));
const total = timeline.at(-1).start + timeline.at(-1).seconds * 1000;
console.log(`Done: ${OUT} (~${Math.round(total / 1000)}s)`);
