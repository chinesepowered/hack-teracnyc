import { SUPPORT_EMAIL, llmReady } from '../config.js';
import { write } from '../llm.js';
import { db, log, touch } from '../store.js';

export const DOCS = { terms: 'Terms of Service', privacy: 'Privacy Policy', refunds: 'Refund Policy' };

const FACTS = `Company: CapyGigs (operated by the CapyGigs team). Contact: ${SUPPORT_EMAIL}.
What we sell: small digital gigs (logo packs, landing-page copy, competitor reports) produced by AI agents.
Payments: processed by Whop; we never see full card details.
Human review: briefs and deliverables may be shown, without the customer's name or email, to anonymous reviewers
recruited through Terac, who grade quality. Customers should not include confidential information in briefs.
Customers get a first draft within minutes and one free human-guided revision.
Refunds: full refund on request within 7 days if we fail to deliver or the customer is unhappy; email us.
Ownership: on payment, the customer may use the deliverables for any lawful purpose; AI output may resemble other work,
so customers should run their own trademark checks before registering a logo.
Data we keep: email, brief, deliverables, payment status, reviewer ratings. We do not sell personal data.`;

const SYSTEM = `You are Lex, General Counsel at CapyGigs (an AI agent). Draft clear, plain-English policies in Markdown
(## headings, short paragraphs, bullet lists). Base them only on the facts given. Do not invent addresses, entities or
jurisdictions; where one would normally go, write "[to be completed]". Start with a one-line note that the document
was drafted by an AI and is not legal advice.`;

export const DEFAULTS = {
  terms: `*Drafted by Lex, our AI general counsel. Not legal advice.*

## The service
CapyGigs sells small digital gigs (logo packs, landing-page copy and competitor reports) produced by AI agents. You receive a first draft within minutes and one free revision guided by human reviewers.

## Payment
Payments are processed by Whop. Prices are shown before checkout and may change over time.

## Human review
Your brief and the delivered work may be shown, without your name or email, to anonymous reviewers recruited through Terac so we can grade and improve the work. Please do not include confidential information in your brief.

## Using what you buy
Once you have paid, you may use the deliverables for any lawful purpose. AI output can resemble existing work, so run your own trademark checks before registering a logo.

## Contact
Questions: ${SUPPORT_EMAIL}`,
  privacy: `*Drafted by Lex, our AI general counsel. Not legal advice.*

## What we collect
Your email, your brief, the deliverables we make for you, your payment status (from Whop) and ratings from human reviewers.

## How we use it
To deliver and improve your order, and to measure quality. Briefs and deliverables may be shown to anonymous reviewers recruited through Terac, never with your name or email.

## What we never do
We never sell personal data. Card details are handled by Whop; we never see them.

## Your choices
Email ${SUPPORT_EMAIL} to get a copy of your data or to have it deleted.`,
  refunds: `*Drafted by Lex, our AI general counsel. Not legal advice.*

## Full refunds, no drama
If we fail to deliver, or you are unhappy with the work, email ${SUPPORT_EMAIL} within 7 days of your order for a full refund. Refunds are issued through Whop to your original payment method.`,
};

export async function draftPolicies() {
  if (!llmReady()) return;
  for (const [doc, title] of Object.entries(DOCS)) {
    if (db.legal[doc]) continue;
    try {
      const md = await write({ system: SYSTEM, prompt: `Write our ${title}.\n\nFacts:\n${FACTS}`, effort: 'medium', maxTokens: 8000 });
      db.legal[doc] = { at: new Date().toISOString(), md };
      log('lex', `Drafted our ${title}`);
      touch('legal');
    } catch (err) {
      log('lex', `Could not draft ${title}: ${err.message}`, { level: 'error' });
    }
  }
}

export const policy = (doc) => db.legal[doc]?.md || DEFAULTS[doc];
