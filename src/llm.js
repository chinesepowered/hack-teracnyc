import Anthropic from '@anthropic-ai/sdk';
import { MODEL, llmReady } from './config.js';
import { bus, db, newId, save, touch } from './store.js';

// Two brains:
// - API mode (ANTHROPIC_API_KEY set): the server calls Claude directly.
// - Agent mode (no key): every piece of thinking becomes a job on a queue, and an external Claude
//   agent (Claude Code) claims it through /api/agent/*, does the work and posts the result back.
export const agentMode = () => !llmReady();

let client;
const anthropic = () => (client ??= new Anthropic());

// Server-side refusal fallbacks: if the model declines, the API re-runs the request on a
// fallback model inside the same call. Dropped automatically if the org rejects the beta.
let fallbacksOn = process.env.CLAUDE_FALLBACKS !== '0';

export async function createMessage(params) {
  if (agentMode()) throw new Error('No ANTHROPIC_API_KEY: this step runs through the agent queue instead');
  const base = { model: MODEL, max_tokens: 16000, ...params };
  if (fallbacksOn) {
    try {
      return await anthropic().beta.messages.create({
        ...base,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    } catch (err) {
      if (!(err instanceof Anthropic.BadRequestError)) throw err;
      console.warn('[llm] request with fallbacks was rejected, retrying without them:', err.message);
      fallbacksOn = false;
    }
  }
  return anthropic().beta.messages.create(base);
}

export const textOf = (message) =>
  message.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();

function checkStop(message) {
  if (message.stop_reason === 'refusal') {
    throw new Error(`Claude declined (${message.stop_details?.category ?? 'no category'})`);
  }
  if (message.stop_reason === 'max_tokens') throw new Error('Claude ran out of output tokens');
}

// ---------- agent job queue ----------
const JOB_TIMEOUT_MS = Number(process.env.AGENT_JOB_TIMEOUT_MIN || 45) * 60000;
const waiting = new Map();

function enqueue(job) {
  db.jobs ??= [];
  const record = { id: newId('job'), status: 'pending', createdAt: new Date().toISOString(), ...job };
  db.jobs.push(record);
  const done = db.jobs.filter((j) => j.status !== 'pending');
  if (done.length > 200) db.jobs = db.jobs.filter((j) => j.status === 'pending' || done.slice(-200).includes(j));
  touch('job', { id: record.id });
  bus.emit('job', record);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiting.delete(record.id);
      record.status = 'expired';
      save();
      reject(new Error(`agent job ${record.id} timed out`));
    }, JOB_TIMEOUT_MS);
    waiting.set(record.id, { resolve, reject, timer });
  });
}

export const pendingJobs = () => (db.jobs || []).filter((j) => j.status === 'pending' && waiting.has(j.id));

// Jobs left over from a previous process have nobody waiting on them.
export function orphanStaleJobs() {
  for (const j of db.jobs || []) if (j.status === 'pending' && !waiting.has(j.id)) j.status = 'orphaned';
  save();
}

export function completeJob(id, result) {
  const job = (db.jobs || []).find((j) => j.id === id);
  const w = waiting.get(id);
  if (!job || job.status !== 'pending' || !w) throw new Error('job is not pending');
  if (job.kind === 'json') {
    const problem = validate(result, job.schema, '$');
    if (problem) throw new Error(`result does not match schema: ${problem}`);
  } else if (typeof result !== 'string' || !result.trim()) {
    throw new Error('text jobs need a non-empty string result');
  }
  clearTimeout(w.timer);
  waiting.delete(id);
  job.status = 'done';
  job.doneAt = new Date().toISOString();
  save();
  w.resolve(result);
}

export function failJob(id, error) {
  const job = (db.jobs || []).find((j) => j.id === id);
  const w = waiting.get(id);
  if (!job || !w) throw new Error('job is not pending');
  clearTimeout(w.timer);
  waiting.delete(id);
  job.status = 'failed';
  job.error = String(error).slice(0, 500);
  save();
  w.reject(new Error(job.error));
}

// Minimal JSON-schema check for the subset our schemas use.
function validate(value, schema, at) {
  if (!schema) return null;
  if (schema.enum && !schema.enum.includes(value)) return `${at} must be one of ${schema.enum.join(', ')}`;
  switch (schema.type) {
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return `${at} must be an object`;
      for (const key of schema.required || []) if (!(key in value)) return `${at}.${key} is missing`;
      for (const [key, sub] of Object.entries(schema.properties || {})) {
        if (key in value) { const p = validate(value[key], sub, `${at}.${key}`); if (p) return p; }
      }
      return null;
    }
    case 'array':
      if (!Array.isArray(value)) return `${at} must be an array`;
      for (const [i, item] of value.entries()) { const p = validate(item, schema.items, `${at}[${i}]`); if (p) return p; }
      return null;
    case 'string': return typeof value === 'string' ? null : `${at} must be a string`;
    case 'number': return typeof value === 'number' ? null : `${at} must be a number`;
    default: return null;
  }
}

// ---------- the two calls the agents use ----------
// Plain text generation.
export async function write({ agent = 'bara', system, prompt, effort = 'medium', maxTokens = 16000 }) {
  if (agentMode()) return enqueue({ kind: 'text', agent, system, prompt });
  const message = await createMessage({
    system,
    max_tokens: maxTokens,
    output_config: { effort },
    messages: [{ role: 'user', content: prompt }],
  });
  checkStop(message);
  return textOf(message);
}

// JSON generation constrained by a JSON schema (structured outputs).
export async function writeJson({ agent = 'bara', system, prompt, schema, effort = 'medium', maxTokens = 16000 }) {
  if (agentMode()) return enqueue({ kind: 'json', agent, system, prompt, schema });
  const message = await createMessage({
    system,
    max_tokens: maxTokens,
    output_config: { effort, format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: prompt }],
  });
  checkStop(message);
  return JSON.parse(textOf(message));
}

// Helper for strict object schemas: every property required, no extras.
export function obj(properties) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
export const str = (description) => ({ type: 'string', ...(description ? { description } : {}) });
export const arr = (items, description) => ({ type: 'array', items, ...(description ? { description } : {}) });
