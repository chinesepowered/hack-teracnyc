// Narration with AssemblyAI. AssemblyAI has no standalone TTS endpoint, so each line is
// sent as the `greeting` of a Voice Agent session and we record the audio it speaks back.
import 'dotenv/config';
import fs from 'node:fs/promises';
import WebSocket from 'ws';
import { HttpsProxyAgent } from 'https-proxy-agent';

const WS_URL = 'wss://agents.assemblyai.com/v1/ws';
const SAMPLE_RATE = 24000; // reply.audio is base64 PCM16 mono at 24 kHz

export function pcmToWav(pcm, sampleRate = SAMPLE_RATE) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// Speak one line. Resolves with { pcm, transcript, seconds }.
export function speak(text, { voice = process.env.NARRATOR_VOICE || 'eve', timeoutMs = 90000 } = {}) {
  if (!process.env.ASSEMBLYAI_API_KEY) throw new Error('ASSEMBLYAI_API_KEY is not set');
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const ws = new WebSocket(WS_URL, {
    headers: { Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}` },
    agent: proxy ? new HttpsProxyAgent(proxy) : undefined,
  });
  const chunks = [];
  let transcript = '';
  return new Promise((resolve, reject) => {
    const fail = (err) => { clearTimeout(timer); ws.terminate(); reject(err); };
    const timer = setTimeout(() => fail(new Error(`TTS timed out for: ${text.slice(0, 40)}`)), timeoutMs);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          system_prompt: 'You are a voiceover narrator. After your greeting, stay silent.',
          greeting: text,
          output: { voice },
        },
      }));
    });
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'reply.audio') chunks.push(Buffer.from(msg.data, 'base64'));
      else if (msg.type === 'transcript.agent') transcript = msg.text;
      else if (msg.type === 'session.error') fail(new Error(`${msg.code}: ${msg.message}`));
      else if (msg.type === 'reply.done') {
        clearTimeout(timer);
        ws.send(JSON.stringify({ type: 'session.end' })); // avoids the billable resume window
        setTimeout(() => ws.close(), 200);
        const pcm = Buffer.concat(chunks);
        resolve({ pcm, transcript, seconds: pcm.length / 2 / SAMPLE_RATE });
      }
    });
    ws.on('error', fail);
  });
}

export async function speakToFile(text, file, opts) {
  const res = await speak(text, opts);
  await fs.writeFile(file, pcmToWav(res.pcm));
  return res;
}

// CLI: node scripts/tts.js "text" out.wav [voice]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [text, file = 'out.wav', voice] = process.argv.slice(2);
  const res = await speakToFile(text, file, { voice });
  console.log(`${file}: ${res.seconds.toFixed(2)}s, transcript: ${res.transcript}`);
}
