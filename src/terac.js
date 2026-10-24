import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { TERAC } from './config.js';
import { createMessage, textOf } from './llm.js';
import { db, log, save } from './store.js';

// Honey never gets the destructive Terac tools.
const BLOCKED_TOOLS = new Set(['terac_delete_opportunity', 'terac_stop_opportunity', 'terac_reject_submission']);

let mcpClient = null;
let toolCache = null;

async function connect() {
  if (mcpClient) return mcpClient;
  const transport = new StreamableHTTPClientTransport(new URL(TERAC.url), {
    requestInit: { headers: { 'x-api-key': TERAC.apiKey } },
  });
  const client = new Client({ name: 'capygigs', version: '1.0.0' });
  await client.connect(transport);
  mcpClient = client;
  return client;
}

export async function teracTools() {
  if (toolCache) return toolCache;
  const client = await connect();
  const { tools } = await client.listTools();
  toolCache = tools;
  return tools;
}

export async function callTerac(name, args = {}) {
  const client = await connect();
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content || [])
    .map((c) => (c.type === 'text' ? c.text : JSON.stringify(c)))
    .join('\n');
  db.teracCalls ??= [];
  db.teracCalls.push({ at: new Date().toISOString(), tool: name, args, isError: Boolean(result.isError), preview: text.slice(0, 600) });
  if (db.teracCalls.length > 300) db.teracCalls.splice(0, db.teracCalls.length - 300);
  save();
  return { text, isError: Boolean(result.isError) };
}

const HONEY_SYSTEM = `You are Honey, Head of Human Feedback at CapyGigs, a company run entirely by AI agents (capybaras).
CapyGigs sells small creative gigs (logos, landing-page copy, competitor reports). Agents produce the work;
you use the Terac MCP tools to recruit real people who grade it, so the agents can improve.

Rules:
- Always start with terac_get_context.
- Recruit from the general population (adults, English-speaking). Do not add niche targeting; it slows recruitment.
- Never spend more than the budget you are given. If a quote exceeds it, reduce participants or stop and explain.
- Participants complete the task on our website and receive a unique completion code that starts with "CAPY-".
- Only approve submissions whose completion code appears in the list of valid codes you are given.
- Reuse existing projects, feasibility requests and opportunities instead of creating duplicates.
- Be efficient: use as few tool calls as needed.
- Finish with one line: RESULT {json} where json has keys status, feasibilityId, opportunityId, costPerParticipant, approved, notes.`;

// One autonomous step of Honey's job, as a Claude tool-use loop over the live Terac MCP tools.
export async function runHoney(task, { maxTurns = 16 } = {}) {
  const tools = (await teracTools())
    .filter((t) => !BLOCKED_TOOLS.has(t.name))
    .map((t) => ({
      name: t.name,
      description: (t.description || t.name).slice(0, 2000),
      input_schema: t.inputSchema?.type === 'object' ? (({ $schema, ...rest }) => rest)(t.inputSchema) : { type: 'object', properties: {} },
    }));

  const messages = [{ role: 'user', content: task }];
  for (let turn = 0; turn < maxTurns; turn++) {
    const message = await createMessage({
      system: HONEY_SYSTEM,
      tools,
      output_config: { effort: 'medium' },
      messages,
    });
    messages.push({ role: 'assistant', content: message.content });
    if (message.stop_reason === 'pause_turn') continue;
    if (message.stop_reason === 'refusal') throw new Error('Honey declined the Terac task');

    const uses = message.content.filter((b) => b.type === 'tool_use');
    if (uses.length === 0) return parseResult(textOf(message));

    const results = [];
    for (const use of uses) {
      log('honey', `Terac MCP → ${use.name}`, { tool: use.name });
      try {
        const out = await callTerac(use.name, use.input);
        results.push({ type: 'tool_result', tool_use_id: use.id, content: out.text.slice(0, 20000) || '(empty)', is_error: out.isError });
      } catch (err) {
        results.push({ type: 'tool_result', tool_use_id: use.id, content: String(err.message || err), is_error: true });
      }
    }
    messages.push({ role: 'user', content: results });
  }
  return { status: 'unfinished', notes: 'Stopped after the maximum number of turns.' };
}

function parseResult(text) {
  const match = text.match(/RESULT\s*(\{[\s\S]*\})\s*$/);
  if (match) {
    try {
      return { ...JSON.parse(match[1]), summary: text.slice(0, match.index).trim() };
    } catch {}
  }
  return { status: 'unknown', notes: text.slice(-800) };
}
