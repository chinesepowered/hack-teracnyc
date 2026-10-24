// Static review page: answers go back to Terac as an uploaded file (or a screenshot of the summary card).
const form = document.getElementById('rate-form');
const error = document.getElementById('rate-error');
const root = document.querySelector('.rate');
const started = Date.now();
const code = `CAPY-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  error.hidden = true;
  const data = new FormData(form);
  const lines = [`CapyGigs ${root.dataset.kind === 'review' ? 'review' : 'comparison'} · round ${root.dataset.round} · code ${code}`, `Seconds spent: ${Math.round((Date.now() - started) / 1000)}`, ''];
  const items = [...form.querySelectorAll('fieldset.item[data-order]')];
  items.forEach((f, i) => {
    const id = f.dataset.order;
    const name = f.dataset.name;
    if (root.dataset.kind === 'review') {
      lines.push(`${i + 1}. ${name} [${id}]: score ${data.get(`score-${id}`)}/10 · would pay: ${data.get(`pay-${id}`)}`);
    } else {
      const left = f.dataset.left; // which version (1 = first draft, 2 = revision) was shown as A
      lines.push(`${i + 1}. ${name} [${id}] A=v${left} B=v${left === '1' ? 2 : 1}: prefers ${data.get(`prefer-${id}`)} · A ${data.get(`scoreA-${id}`)}/10 · B ${data.get(`scoreB-${id}`)}/10`);
    }
    lines.push(`   "${String(data.get(`comment-${id}`) || '').replace(/\s+/g, ' ').trim()}"`);
  });
  lines.push('', `Attention check: ${data.get('attention')}`);
  const text = lines.join('\n');
  document.getElementById('summary').textContent = text;
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.getElementById('download');
  link.href = URL.createObjectURL(blob);
  link.download = `capygigs-${code}.txt`;
  form.hidden = true;
  document.getElementById('code').textContent = code;
  document.getElementById('done').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
