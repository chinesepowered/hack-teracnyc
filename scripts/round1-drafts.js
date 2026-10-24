// First drafts (v1) for the first human review round, written by the agents (Pixel and Quill).
import fs from 'node:fs';
import { sanitizeSvg } from '../src/agents/workers.js';

const F = 'font-family="Helvetica, Arial, sans-serif"';
const svg = (inner) => sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${inner}</svg>`);

const items = [
  { id: 'bodega', gig: 'logo', brief: { business: 'Bodega Bagels', about: 'Late-night bagel shop in Williamsburg, Brooklyn', vibe: 'Playful, warm orange, a little retro' }, v1: { concepts: [
    { name: 'Night shift ring', idea: 'A glowing bagel ring on a midnight background for a shop that never sleeps.', svg: svg(`<rect width="512" height="512" fill="#1e2a44"/><circle cx="256" cy="220" r="110" fill="none" stroke="#f59e0b" stroke-width="56"/><g fill="#fff7ec"><circle cx="210" cy="140" r="5"/><circle cx="300" cy="150" r="5"/><circle cx="330" cy="230" r="5"/><circle cx="180" cy="250" r="5"/><circle cx="250" cy="320" r="5"/></g><text x="256" y="420" text-anchor="middle" ${F} font-size="40" font-weight="400" fill="#fff7ec" letter-spacing="4">BODEGA BAGELS</text>`) },
    { name: 'Corner sign', idea: 'The classic bodega awning sign, simplified.', svg: svg(`<rect width="512" height="512" fill="#fff7ec"/><rect x="56" y="156" width="400" height="200" rx="28" fill="#e8590c"/><text x="256" y="262" text-anchor="middle" ${F} font-size="78" font-weight="800" fill="#fff">Bodega</text><text x="256" y="318" text-anchor="middle" ${F} font-size="34" font-weight="700" fill="#ffe8cc" letter-spacing="10">BAGELS</text>`) },
    { name: 'Moon bagel', idea: 'A bagel that doubles as a crescent moon.', svg: svg(`<rect width="512" height="512" fill="#2b2140"/><circle cx="256" cy="230" r="120" fill="#f2b24c"/><circle cx="300" cy="200" r="110" fill="#2b2140"/><g fill="#fde68a"><circle cx="370" cy="120" r="6"/><circle cx="410" cy="190" r="4"/><circle cx="120" cy="140" r="5"/></g><text x="256" y="430" text-anchor="middle" ${F} font-size="36" font-weight="400" fill="#fde68a">bodega bagels</text>`) },
  ] } },
  { id: 'fixit', gig: 'logo', brief: { business: 'Fixit Fern', about: 'Mobile bike repair that comes to your door in Queens', vibe: 'Bold, green, friendly' }, v1: { concepts: [
    { name: 'Wheel and wrench', idea: 'A spoked wheel with a wrench: says bike repair at a glance.', svg: svg(`<rect width="512" height="512" fill="#f3fbf4"/><circle cx="256" cy="200" r="118" fill="#1f9d55"/><circle cx="256" cy="200" r="76" fill="none" stroke="#fff" stroke-width="12"/><circle cx="256" cy="200" r="10" fill="#fff"/><g stroke="#fff" stroke-width="5"><line x1="256" y1="124" x2="256" y2="276"/><line x1="180" y1="200" x2="332" y2="200"/><line x1="202" y1="146" x2="310" y2="254"/><line x1="310" y1="146" x2="202" y2="254"/></g><g transform="rotate(-45 340 300)"><rect x="328" y="250" width="24" height="110" rx="10" fill="#ffd166" stroke="#14532d" stroke-width="4"/><circle cx="340" cy="248" r="26" fill="#ffd166" stroke="#14532d" stroke-width="4"/><rect x="332" y="218" width="16" height="26" fill="#f3fbf4"/></g><text x="256" y="414" text-anchor="middle" ${F} font-size="54" font-weight="800" fill="#14532d">FIXIT FERN</text><text x="256" y="454" text-anchor="middle" ${F} font-size="20" font-weight="700" fill="#1f9d55" letter-spacing="6">BIKE REPAIR · QUEENS</text>`) },
    { name: 'Fern in a gear', idea: 'A fern growing inside a bike gear: the name, drawn.', svg: svg(`<rect width="512" height="512" fill="#14532d"/><g transform="translate(256 200)"><circle r="110" fill="none" stroke="#86efac" stroke-width="18" stroke-dasharray="28 14"/><path d="M0 84V-84" stroke="#bbf7d0" stroke-width="8" stroke-linecap="round"/><g fill="#4ade80"><ellipse cx="-22" cy="-52" rx="24" ry="9" transform="rotate(-30 -22 -52)"/><ellipse cx="22" cy="-52" rx="24" ry="9" transform="rotate(30 22 -52)"/><ellipse cx="-28" cy="-16" rx="30" ry="10" transform="rotate(-25 -28 -16)"/><ellipse cx="28" cy="-16" rx="30" ry="10" transform="rotate(25 28 -16)"/><ellipse cx="-32" cy="22" rx="34" ry="11" transform="rotate(-20 -32 22)"/><ellipse cx="32" cy="22" rx="34" ry="11" transform="rotate(20 32 22)"/><ellipse cx="-28" cy="58" rx="28" ry="10" transform="rotate(-15 -28 58)"/><ellipse cx="28" cy="58" rx="28" ry="10" transform="rotate(15 28 58)"/></g></g><text x="256" y="410" text-anchor="middle" ${F} font-size="54" font-weight="800" fill="#fff">Fixit Fern</text><text x="256" y="450" text-anchor="middle" ${F} font-size="20" fill="#86efac" letter-spacing="5">MOBILE BIKE REPAIR</text>`) },
    { name: 'We come to you', idea: 'A friendly badge with a bike, promising doorstep service.', svg: svg(`<rect width="512" height="512" fill="#fff"/><rect x="56" y="96" width="400" height="300" rx="150" fill="#1f9d55"/><g stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="190" cy="226" r="44"/><circle cx="322" cy="226" r="44"/><path d="M190 226l48-66h56l28 66M238 160l26 66h-74M294 160l12-18M228 150h26"/></g><text x="256" y="338" text-anchor="middle" ${F} font-size="40" font-weight="800" fill="#fff">FIXIT FERN</text><text x="256" y="460" text-anchor="middle" ${F} font-size="22" font-weight="700" fill="#14532d" letter-spacing="4">WE COME TO YOU · QUEENS</text>`) },
  ] } },
  { id: 'naptime', gig: 'copy', brief: { business: 'NapTime', about: 'An app that schedules 20-minute power naps around your calendar, for busy founders', tone: 'Confident, friendly, a little funny' }, v1: {
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
  } },
  { id: 'ledgerleaf', gig: 'copy', brief: { business: 'LedgerLeaf', about: 'Bookkeeping for independent plant shops, done by an accountant who loves plants', tone: 'Trustworthy, calm' }, v1: {
    headline: 'Bookkeeping for plant shops',
    subheadline: 'LedgerLeaf keeps your books tidy and your taxes on time, so you can spend your days with customers and cuttings instead of spreadsheets.',
    benefits: [
      { title: 'Made for plant shops', body: 'Seasonal stock, perishable inventory and workshop income, categorized the way your shop works.' },
      { title: 'Monthly books, done', body: 'Reconciled accounts and a plain-English report every month.' },
      { title: 'Taxes on time', body: 'Sales tax and quarterly estimates tracked so nothing sneaks up on you.' },
    ],
    cta: 'Book a free call',
    social_proof: '[Name of a plant shop you already work with]',
    faq: [
      { q: 'Do I need to switch software?', a: 'No. LedgerLeaf works with the accounting and point-of-sale tools you already use.' },
      { q: 'How much does it cost?', a: '[Your monthly price], with no setup fee and no long-term contract.' },
      { q: 'Do you only work with plant shops?', a: 'Mostly plant and garden shops, so we already know your busy seasons.' },
    ],
  } },
];
fs.writeFileSync('study/round1-items.json', JSON.stringify(items, null, 1));
console.log(`wrote ${items.length} first drafts to study/round1-items.json`);
