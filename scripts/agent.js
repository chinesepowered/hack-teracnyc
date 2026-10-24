// CLI for the Claude agent that does CapyGigs' thinking when the server runs without an API key.
//   node scripts/agent.js wait [--max=600]      block until a job is queued (or max seconds pass)
//   node scripts/agent.js jobs                  print pending jobs (system, prompt, schema)
//   node scripts/agent.js done <jobId> <file>   submit a result (.json for json jobs, any text file for text jobs)
//   node scripts/agent.js fail <jobId> <reason>
//   node scripts/agent.js log <agent> <text>    narrate into the HQ feed
//   node scripts/agent.js rounds                rounds, URLs, completion codes
//   node scripts/agent.js round <roundId> <json>  record Terac state ({status, feasibilityId, opportunityId, costPerParticipant, notes, live})
//   node scripts/agent.js approved <roundId> <CODE,CODE>
//   node scripts/agent.js close <roundId> [reason]
//   node scripts/agent.js backup [dir] | restore <file>
// Env: AGENT_URL (server base URL), ADMIN_TOKEN.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.AGENT_URL || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN = process.env.ADMIN_TOKEN;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(p, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status} ${text.slice(0, 400)}`);
  try { return JSON.parse(text); } catch { return text; }
}

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [cmd, ...rest] = args.filter((a) => !a.startsWith('--'));

switch (cmd) {
  case 'wait': {
    const until = Date.now() + Number(flags.max || 600) * 1000;
    while (Date.now() < until) {
      try {
        const r = await api('/api/agent/wait?max=25');
        if (r.pending) { console.log(`WORK: ${r.pending} pending job(s)`); process.exit(0); }
      } catch (err) {
        console.error(`wait: ${err.message}`);
        await sleep(5000);
      }
    }
    console.log('TIMEOUT: no new jobs; time for housekeeping');
    break;
  }
  case 'jobs': {
    const jobs = await api('/api/agent/jobs');
    if (!jobs.length) console.log('No pending jobs.');
    for (const j of jobs) {
      console.log(`\n===== ${j.id} · ${j.kind} · agent=${j.agent} · ${j.createdAt}`);
      if (j.system) console.log(`--- system\n${j.system}`);
      console.log(`--- prompt\n${j.prompt}`);
      if (j.schema) console.log(`--- schema\n${JSON.stringify(j.schema)}`);
    }
    break;
  }
  case 'done': {
    const [id, file] = rest;
    const raw = fs.readFileSync(file, 'utf8');
    const result = file.endsWith('.json') ? JSON.parse(raw) : raw;
    console.log(JSON.stringify(await api(`/api/agent/jobs/${id}/complete`, { method: 'POST', body: { result } })));
    break;
  }
  case 'fail':
    console.log(JSON.stringify(await api(`/api/agent/jobs/${rest[0]}/fail`, { method: 'POST', body: { error: rest.slice(1).join(' ') } })));
    break;
  case 'log':
    await api('/api/agent/log', { method: 'POST', body: { agent: rest[0], text: rest.slice(1).join(' '), teracTool: flags.tool } });
    console.log('logged');
    break;
  case 'rounds':
    console.log(JSON.stringify(await api('/api/agent/rounds'), null, 1));
    break;
  case 'round':
    console.log(JSON.stringify(await api(`/api/agent/rounds/${rest[0]}`, { method: 'POST', body: JSON.parse(rest[1] || '{}') }), null, 1));
    break;
  case 'approved':
    console.log(JSON.stringify(await api(`/api/agent/rounds/${rest[0]}/approved`, { method: 'POST', body: { codes: (rest[1] || '').split(',').filter(Boolean) } })));
    break;
  case 'close':
    console.log(JSON.stringify(await api(`/api/agent/rounds/${rest[0]}/close`, { method: 'POST', body: { reason: rest.slice(1).join(' ') } })));
    break;
  case 'backup': {
    const dir = rest[0] || process.env.BACKUP_DIR || 'backups';
    fs.mkdirSync(dir, { recursive: true });
    const data = await api('/api/agent/export');
    const file = path.join(dir, `db-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify(data));
    fs.copyFileSync(file, path.join(dir, 'latest.json'));
    console.log(`${file} (orders=${data.orders.length}, ratings=${data.ratings.length})`);
    break;
  }
  case 'restore':
    console.log(JSON.stringify(await api('/api/agent/import', { method: 'POST', body: JSON.parse(fs.readFileSync(rest[0], 'utf8')) })));
    break;
  default:
    console.log('commands: wait jobs done fail log rounds round approved close backup restore');
}
