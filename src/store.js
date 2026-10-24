import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { DATA_FILE } from './config.js';

const EMPTY = () => ({
  orders: [],
  rounds: [],
  ratings: [],
  events: [],
  decisions: [],
  posts: [],
  legal: {},
  webhookIds: [],
  settings: { prices: {}, paused: {} },
  metrics: { visits: 0, orderStarts: 0, checkouts: 0 },
});

function load() {
  try {
    return { ...EMPTY(), ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
  } catch {
    return EMPTY();
  }
}

export const db = load();
export const bus = new EventEmitter();
bus.setMaxListeners(200);

let timer = null;
export function save() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
    fs.renameSync(tmp, DATA_FILE);
  }, 150);
}

export function resetDb(next = EMPTY()) {
  for (const key of Object.keys(db)) delete db[key];
  Object.assign(db, EMPTY(), next);
  save();
}

export const newId = (prefix) => `${prefix}_${crypto.randomBytes(5).toString('hex')}`;

// Every agent action lands here: it feeds the HQ screen and the audit trail.
export function log(agent, text, extra = {}) {
  const event = { id: newId('ev'), at: new Date().toISOString(), agent, text, ...extra };
  db.events.push(event);
  if (db.events.length > 600) db.events.splice(0, db.events.length - 600);
  save();
  bus.emit('event', event);
  console.log(`[${agent}] ${text}`);
  return event;
}

export function touch(kind, payload = {}) {
  save();
  bus.emit('change', { kind, ...payload });
}

export const findOrder = (id) => db.orders.find((o) => o.id === id);
export const findRound = (id) => db.rounds.find((r) => r.id === id);

export function stats() {
  const paid = db.orders.filter((o) => o.paidAt && !o.sample);
  const revenue = paid.reduce((sum, o) => sum + (o.amountPaid ?? o.price), 0);
  const completed = db.ratings.filter((r) => r.complete);
  const humans = new Set(completed.map((r) => r.sessionId)).size;
  const review = db.rounds.find((r) => r.kind === 'review' && r.results);
  const compare = db.rounds.find((r) => r.kind === 'compare' && r.results);
  return {
    revenue: Math.round(revenue * 100) / 100,
    customers: new Set(paid.map((o) => o.email || o.id)).size,
    orders: paid.length,
    delivered: paid.filter((o) => o.deliverables?.length).length,
    humans,
    ratings: completed.length,
    before: compare?.results?.avgV1 ?? review?.results?.avg ?? null,
    after: compare?.results?.avgV2 ?? null,
    preferRevised: compare?.results?.preferV2Pct ?? null,
    visits: db.metrics.visits,
    checkouts: db.metrics.checkouts,
  };
}
