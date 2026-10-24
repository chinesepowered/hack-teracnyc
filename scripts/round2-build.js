// Adds the before/after round (r2) to study/rounds.json from the first drafts and the agents' revisions.
// Version order alternates per item (A = draft for some, A = revision for others) to cancel position bias.
import fs from 'node:fs';

const rounds = JSON.parse(fs.readFileSync('study/rounds.json', 'utf8'));
const revisions = JSON.parse(fs.readFileSync('study/revisions.json', 'utf8'));
const r1 = rounds.find((r) => r.slug === 'r1');
const items = r1.items.filter((it) => revisions[it.id]).map((it, i) => ({ ...it, v2: revisions[it.id], left: i % 2 ? 1 : 2 }));
const r2 = { slug: 'r2', kind: 'compare', items, terac: JSON.parse(fs.readFileSync('study/round2-draft.json', 'utf8')) };
const next = rounds.filter((r) => r.slug !== 'r2').concat(r2);
fs.writeFileSync('study/rounds.json', JSON.stringify(next, null, 1));
console.log(`r2 with ${items.length} pairs (A=${items.map((i) => `v${i.left}`).join(',')})`);
