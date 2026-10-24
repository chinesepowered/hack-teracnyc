// Terac MCP from the command line (Honey's hands when the agent runs outside the server).
//   node scripts/terac-cli.js tools                 list tools with their input schemas
//   node scripts/terac-cli.js call <tool> '<json>'  call a tool; the call is narrated into the HQ feed
// Env: TERAC_API_KEY, optional AGENT_URL + ADMIN_TOKEN for narration.
import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [cmd, name, json] = process.argv.slice(2);
const transport = new StreamableHTTPClientTransport(new URL(process.env.TERAC_MCP_URL || 'https://terac.com/api/mcp'), {
  requestInit: { headers: { 'x-api-key': process.env.TERAC_API_KEY } },
});
const client = new Client({ name: 'capygigs-honey', version: '1.0.0' });
await client.connect(transport);

if (cmd === 'tools') {
  const { tools } = await client.listTools();
  for (const t of tools) console.log(`\n## ${t.name}\n${(t.description || '').trim()}\n${JSON.stringify(t.inputSchema)}`);
} else if (cmd === 'call') {
  const result = await client.callTool({ name, arguments: JSON.parse(json || '{}') });
  for (const c of result.content || []) console.log(c.type === 'text' ? c.text : JSON.stringify(c));
  if (result.isError) console.log('(tool reported an error)');
  const base = process.env.AGENT_URL;
  if (base && process.env.ADMIN_TOKEN) {
    await fetch(`${base.replace(/\/$/, '')}/api/agent/log`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'honey', text: `Terac MCP → ${name}`, teracTool: name, isError: Boolean(result.isError) }),
    }).catch(() => {});
  }
} else {
  console.log('usage: terac-cli.js tools | call <tool> <json>');
}
await client.close();
