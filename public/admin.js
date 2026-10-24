const out = document.getElementById('out');
let token = null;
try { token = localStorage.getItem('capy-admin'); } catch {}
document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', async () => {
  if (!token) {
    token = prompt('Admin token (printed in the server log)');
    try { localStorage.setItem('capy-admin', token); } catch {}
  }
  out.textContent = `Running ${b.dataset.action}…`;
  const res = await fetch(`/api/admin/${b.dataset.action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { token = null; try { localStorage.removeItem('capy-admin'); } catch {} }
  out.textContent = JSON.stringify(await res.json(), null, 2);
}));
