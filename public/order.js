const form = document.getElementById('order-form');
const error = document.getElementById('order-error');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.hidden = true;
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  button.textContent = 'Opening Whop checkout…';
  const body = Object.fromEntries(new FormData(form));
  body.gig = form.dataset.gig;
  try {
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Something went wrong');
    location.href = json.url;
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    button.disabled = false;
    button.textContent = 'Try again';
  }
});
