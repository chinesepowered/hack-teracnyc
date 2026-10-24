const root = document.querySelector('.rate');
const form = document.getElementById('rate-form');
const error = document.getElementById('rate-error');
const key = `capy-session-${root.dataset.round}`;
let sessionId = null;
try { sessionId = localStorage.getItem(key); } catch {}
if (!sessionId) {
  sessionId = crypto.randomUUID();
  try { localStorage.setItem(key, sessionId); } catch {}
}
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.hidden = true;
  const data = new FormData(form);
  const answers = [...form.querySelectorAll('fieldset.item[data-order]')].map((f) => {
    const id = f.dataset.order;
    return root.dataset.kind === 'review'
      ? { orderId: id, score: Number(data.get(`score-${id}`)), wouldPay: data.get(`pay-${id}`) === 'yes', comment: data.get(`comment-${id}`) }
      : { orderId: id, left: Number(f.dataset.left), prefer: data.get(`prefer-${id}`), scoreA: Number(data.get(`scoreA-${id}`)), scoreB: Number(data.get(`scoreB-${id}`)), comment: data.get(`comment-${id}`) };
  });
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    const res = await fetch(`/api/rate/${root.dataset.round}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, t: Number(root.dataset.t), sig: root.dataset.sig, answers, attention: data.get('attention'), meta: Object.fromEntries(new URLSearchParams(location.search)) }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Something went wrong');
    form.hidden = true;
    document.getElementById('code').textContent = json.code;
    document.getElementById('done').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    button.disabled = false;
  }
});
