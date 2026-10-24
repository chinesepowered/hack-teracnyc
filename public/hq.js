const feed = document.getElementById('feed');
const fmt = (n) => `$${Number(n || 0).toFixed(Number(n) % 1 ? 2 : 0)}`;
const time = (iso) => new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' });
const names = Object.fromEntries([...document.querySelectorAll('.desk')].map((d) => [d.dataset.agent, d.querySelector('.nameplate b').textContent]));

function setStat(key, value) {
  const el = document.querySelector(`#ticker [data-k="${key}"]`);
  if (!el || el.textContent === String(value)) return;
  el.textContent = value;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function onEvent(e) {
  const li = document.createElement('li');
  li.dataset.agent = e.agent;
  if (e.level === 'error') li.className = 'err';
  li.innerHTML = `<time></time> <b></b> <span></span>`;
  li.querySelector('time').textContent = time(e.at);
  li.querySelector('b').textContent = names[e.agent] || e.agent;
  li.querySelector('span').textContent = e.text;
  feed.prepend(li);
  while (feed.children.length > 80) feed.lastChild.remove();
  const desk = document.querySelector(`.desk[data-agent="${e.agent}"]`);
  if (desk) {
    desk.querySelector('.bubble').textContent = e.text;
    desk.classList.add('working');
    clearTimeout(desk._t);
    desk._t = setTimeout(() => desk.classList.remove('working'), 8000);
  }
  if (e.kind === 'revenue') document.body.classList.add('cha-ching'), setTimeout(() => document.body.classList.remove('cha-ching'), 1600);
}

function onStats(s) {
  setStat('revenue', fmt(s.revenue));
  setStat('customers', s.customers);
  setStat('delivered', s.delivered);
  setStat('humans', s.humans);
  setStat('score', s.before != null && s.after != null ? `${s.before} → ${s.after}` : s.before ?? '—');
}

let refresh = null;
async function refreshPanels() {
  const res = await fetch('/api/hq');
  const s = await res.json();
  if (s.decision) document.getElementById('memo').textContent = s.decision.memo;
  const rounds = document.getElementById('rounds');
  if (s.rounds.length) {
    rounds.innerHTML = '';
    for (const r of s.rounds) {
      const div = document.createElement('div');
      div.className = 'round';
      div.innerHTML = `<b></b> <code></code> <span class="pill"></span><div class="bar"><i></i></div><small></small>`;
      div.querySelector('b').textContent = r.kind === 'review' ? 'Review round' : 'Before/after round';
      div.querySelector('code').textContent = r.id;
      div.querySelector('.pill').textContent = r.status;
      div.querySelector('.pill').classList.add(`s-${r.status}`);
      div.querySelector('i').style.width = `${Math.min(100, (100 * r.valid) / r.target)}%`;
      div.querySelector('small').textContent = `${r.valid}/${r.target} humans · ${r.items} items${r.terac?.status ? ` · Terac: ${r.terac.status}` : ''}`;
      rounds.append(div);
    }
  }
}

const es = new EventSource('/api/stream');
es.addEventListener('event', (m) => onEvent(JSON.parse(m.data)));
es.addEventListener('stats', (m) => onStats(JSON.parse(m.data)));
es.addEventListener('change', () => { clearTimeout(refresh); refresh = setTimeout(refreshPanels, 400); });
