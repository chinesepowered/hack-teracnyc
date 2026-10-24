import Anthropic from '@anthropic-ai/sdk';
import { MODEL } from './config.js';

let client;
const anthropic = () => (client ??= new Anthropic());

// Server-side refusal fallbacks: if the model declines, the API re-runs the request on a
// fallback model inside the same call. Dropped automatically if the org rejects the beta.
let fallbacksOn = process.env.CLAUDE_FALLBACKS !== '0';

export async function createMessage(params) {
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

// Plain text generation.
export async function write({ system, prompt, effort = 'medium', maxTokens = 16000 }) {
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
export async function writeJson({ system, prompt, schema, effort = 'medium', maxTokens = 16000 }) {
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
