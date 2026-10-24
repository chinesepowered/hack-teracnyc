# CapyGigs 🍊

**A freelance marketplace where every freelancer is a capybara agent, and every first draft is graded by real humans.**

> **Paste-ready blurb:** CapyGigs is a company with zero human employees. Eight capybara agents run the whole business: CEO, designer, copywriter, researcher, CFO, CMO, general counsel and a head of human feedback. They sell logo packs, landing-page copy and competitor reports, with the storefront and products on Whop (the agents deployed the site themselves with the Whop CLI). Agents can't grade their own homework, so Honey uses the Terac MCP end to end: she drafts and launches a general-population study, and real people grade the first drafts and upload their answers through Terac. The agents revise from that feedback, and a second blind before/after round measures whether the revision is actually better. Live: capygigs.whop.site

- **Live site (hosted on Whop):** https://capygigs.whop.site
- **Capybara HQ:** https://capygigs.whop.site/hq.html
- **Human report (before → after):** https://capygigs.whop.site/report.html
- **What Terac reviewers see:** https://capygigs.whop.site/review/r1.html
- **Demo video:** `capygigs-demo.mp4`

## What it is

Small businesses order a **logo pack ($5)**, **landing-page copy ($5)** or a **competitor report ($9)** and pay through a real **Whop** checkout. Capybara agents do the work. Agents can't grade their own homework, so **Honey**, our head of human feedback, uses the **Terac MCP** to recruit real people from the general population to grade the first drafts. The agents revise from what those people said. A second, blind panel then compares draft vs revision to measure whether the work actually got better.

Zero human employees. The only step a human takes is a customer paying.

## The staff (all AI agents)

| Capybara | Role | What it does |
|---|---|---|
| Capy Bara | CEO | Budget and pricing calls, decides when to ask humans (board-meeting memos in HQ) |
| Pixel | Designer | Logo packs as SVG |
| Quill | Copywriter | Landing-page copy |
| Scout | Researcher | Competitor reports |
| Honey | Head of Human Feedback | Runs the Terac MCP end to end |
| Hype | CMO | Launch posts |
| Penny | CFO | Whop products and checkouts, revenue |
| Lex | General Counsel | Terms, privacy and refund policies |

## How we used Terac (human in the loop)

Honey drives the whole study through the **Terac MCP**:

1. `terac_get_context` → `terac_list_projects`
2. `terac_create_opportunity`: general-population US adults, a short screener, a 6-minute grading task on our Whop-hosted review page, and an upload step so answers come back **through Terac**
3. `terac_launch_draft_opportunity`
4. Monitor with `terac_get_opportunity`, read each uploaded answers file with `terac_get_submissions`, then `terac_approve_submission` (which pays the reviewer)
5. The agents revise every draft from the reviewers' comments
6. Round 2: a fresh panel compares draft vs revision **blind** (A/B in random order) to measure the improvement

**Results:** see the report link above. The numbers there come only from real Terac submissions.

## How we used Whop

- The **whole public site is hosted on Whop** (`capygigs.whop.site`), deployed headlessly with the Whop CLI and our API key: the agents ship their own storefront.
- **Real Whop products and checkout links** for each gig (no Stripe).
- Prices are agent-set. All revenue is real and organic: we did not buy our own gigs.

## Status at submission (all real)

- **Terac:** round 1 launched at 4:31pm ET for 8 general-population reviewers at $7.50 each. Round 2, a blind before/after for 5 reviewers, is drafted and launches as soon as round 1 feedback is in and the agents have revised. Live numbers are in HQ and the report.
- **Whop:** site hosted on Whop, plus three products and checkout links created through the Whop API. Revenue so far: $0.

## Honest notes

- The agents run on Claude via Claude Code, which acts as their brain through a job queue (`/api/agent`). No API key is needed.
- Revenue so far is shown live in HQ. If it says $0, it's $0.
- Code: `chinesepowered/hack-teracnyc`, branch `claude/wonderful-thompson-57ckmm`.
