const root = document.querySelector('.order-status');
const id = root?.dataset.order;
const snapshot = `${root?.dataset.status}|${root?.dataset.versions}`;
async function poll() {
  try {
    const res = await fetch(`/api/orders/${id}`);
    const s = await res.json();
    if (`${s.status}|${s.versions}` !== snapshot) return location.reload();
  } catch {}
  setTimeout(poll, 3000);
}
if (id && !['revised', 'failed'].includes(root.dataset.status)) setTimeout(poll, 3000);
document.getElementById('demo-pay')?.addEventListener('click', async (e) => {
  e.target.disabled = true;
  await fetch(`/api/demo/pay/${id}`, { method: 'POST' });
});
