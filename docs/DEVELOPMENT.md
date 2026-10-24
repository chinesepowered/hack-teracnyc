# CapyGigs: developer guide

**A freelance marketplace where every freelancer is a capybara agent, and every delivery is graded by real humans.**

Zero Human Company Hackathon NYC (Terac). Customers order small gigs (logo packs, landing-page copy, competitor reports) and pay through **Whop**. A capybara agent delivers in minutes. **Honey**, our AI head of human feedback, recruits real people from the general population through the **Terac MCP** to grade the work. The agents revise using what those people said, and a second blind panel compares draft and revision. That gives us a measured before/after.

## The staff (all agents)

| Capybara | Role | What it does on its own |
|---|---|---|
| Capy Bara | CEO | Board meeting every 20 min: moves prices (±$2, $3–$25), opens/closes human rounds, asks for marketing pushes |
| Pixel | Designer | Logo packs as hand-written SVG (sanitized) |
| Quill | Copywriter | Landing-page copy |
| Scout | Researcher | Competitor reports from live **Exa** searches |
| Honey | Head of Human Feedback | Drives the **Terac MCP** (quote → opportunity → launch → approve valid submissions) |
| Hype | CMO | Launch posts for Slack / X / LinkedIn (auto-posts to Slack if a webhook is set) |
| Penny | CFO | **Whop** checkouts, verified payment webhooks, revenue |
| Lex | General Counsel | Terms, privacy and refund policies (with "not legal advice") |

Watch them at `/hq`. The before/after evidence is at `/report`, and Terac participants grade at `/rate/<round>`.

## Brains: Claude API or Claude Code

With `ANTHROPIC_API_KEY` set, the server calls Claude directly. Without it, the server runs in **agent mode**: every piece of thinking (draw this logo, write this copy, hold a board meeting, write launch posts) becomes a job on a queue. A Claude Code agent claims each job with `node scripts/agent.js`, does the work and posts the result back; results are schema-checked before they are accepted. The same agent drives Honey's Terac steps with `node scripts/terac-cli.js` and keeps backups of the company records.

## Hosting on Whop

The public site (storefront, HQ snapshot, human report, legal pages, Terac review pages) is static HTML built by `scripts/build-site.js` and deployed to Whop hosting with the Whop CLI: `scripts/publish-site.sh <whop-app-dir>` snapshots HQ and the report from the back office and runs `whop apps deploy`. Set `WHOP_API_KEY` in the environment; no interactive login is needed.

## Run it locally (about 15 minutes)

```bash
npm install
cp .env.example .env        # then fill in the keys below
```

1. **Keys.** Fill in `ANTHROPIC_API_KEY`, `WHOP_API_KEY` + `WHOP_COMPANY_ID` (`biz_…`), `TERAC_API_KEY` (`tk_…`, under Settings → API Keys, after redeeming the hackathon credits), `EXA_API_KEY` (coupon `EXA50ZEROHUMAN`) and `ASSEMBLYAI_API_KEY`.
2. **Public URL.** Run `cloudflared tunnel --url http://localhost:3000` (`brew install cloudflared`) and put the `https://….trycloudflare.com` URL in `BASE_URL`. Whop redirects buyers there and Terac participants open the rating page there. Restarting the tunnel changes the URL, so leave it running.
3. **Whop webhook.** In Dashboard → Developer → Webhooks, add `BASE_URL/webhooks/whop` (API version v1, event `payment.succeeded`). Copy the `ws_…` secret into `WHOP_WEBHOOK_SECRET`.
4. Run **`npm run check`**. It tests every integration and flags anything missing.
5. Run **`npm start`** and open `/hq`.

On boot the agents take over. Lex drafts the policies and Hype drafts launch posts. Honey opens review round 1 and immediately requests a Terac quote, since quotes can take about an hour. Meanwhile Pixel and Quill make six house-sample drafts so the human panel has work to grade. Capy Bara holds the first board meeting after 90 seconds.

The automatic flow from there:

1. Round 1 grades the first drafts.
2. When it fills up (or the CEO closes it), every graded item is revised using the human comments.
3. A before/after round opens, where humans pick draft vs revision blind.
4. `/report` shows the result.

`/admin` (the token is printed in the server log) has override buttons in case you need to nudge anything.

> **Test payments in Whop's sandbox** (`WHOP_SANDBOX=1` with sandbox keys). The rules require real, organic revenue, so don't buy your own gigs on the live account.

## Demo video

```bash
npm i -D playwright && npx playwright install chromium   # once
npm run video -- --url=$BASE_URL --out=out/capygigs-demo.mp4
```

The script narrates with AssemblyAI (voice `eve`). AssemblyAI has no standalone text-to-speech, so each line is spoken as a Voice Agent greeting and the transcript is checked. It then records a Playwright walkthrough timed to the narration and muxes it with ffmpeg, adding burned-in captions and an `.srt`. The narration pulls **live numbers** from `/api/hq` (revenue, customers, humans, before → after). **Re-record it right before submitting.**

The preview cut (`--preview`, sample data from `npm run demo:seed` + `npm run demo`, with a "Preview · sample data" badge on every page) contains no numbers, so it can't be mistaken for real results.

## How it maps to the rules

- **Agent-run company:** product, marketing, sales, payments, legal and pricing decisions are all agents (see the table). A human's only step is the customer paying.
- **Built on Whop, all payments through Whop:** one Whop checkout configuration per order, confirmed by a signature-verified `payment.succeeded` webhook. No Stripe.
- **Terac MCP with real human input:** Honey connects to `https://terac.com/api/mcp` over streamable HTTP. A Claude tool-use loop runs over Terac's live tool list, with the destructive tools removed. Participants get a unique `CAPY-` completion code, and Honey approves only codes from reviews that passed the attention check and took at least 40 seconds.
- **Clear before/after:** first-draft scores, then a blind A/B of draft vs revision (preference % and score change), item by item at `/report`.

## Layout

```
src/server.js         routes, Whop webhook, SSE, autonomy loop
src/agents/*.js       ceo, workers (pixel/quill/scout), honey (Terac rounds), cmo, legal
src/terac.js          Terac MCP client + Honey's tool loop
src/whop.js           checkout configurations + webhook verification
src/llm.js            Claude (claude-opus-5-5, structured outputs, server-side refusal fallbacks)
src/ui.js             all pages (the capybara is hand-drawn SVG)
scripts/make-video.js demo video; scripts/tts.js AssemblyAI narration; scripts/check.js integration check
```

Data lives in `data/db.json` (gitignored).
