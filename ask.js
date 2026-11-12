// El chat solo aparece si el servidor tiene la clave configurada.
(async () => {
  const EN = document.documentElement.lang.startsWith('en');
  const section = document.getElementById('preguntar');
  try {
    const health = await fetch('/api/ask');
    if (!health.ok || !(await health.json()).ok) return;
  } catch { return; }
  section.hidden = false;
  const form = document.getElementById('ask-form');
  const input = document.getElementById('ask-q');
  const out = document.getElementById('ask-out');
  const send = form.querySelector('button');

  async function ask(question) {
    send.disabled = true;
    out.className = 'ask-out';
    out.textContent = EN ? 'Finding the answer…' : 'Buscando la respuesta…';
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, lang: EN ? 'en' : 'es' }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      out.textContent = data.answer;
    } catch (e) {
      out.className = 'ask-out error';
      out.textContent = e.message || (EN ? 'Could not answer right now. Email Naser at naserfer97@gmail.com.' : 'No se pudo responder ahora. Escribile a Naser a naserfer97@gmail.com.');
    }
    send.disabled = false;
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value.trim()); });
  section.querySelectorAll('.ask-chips button').forEach((b) => b.addEventListener('click', () => { input.value = b.textContent; ask(b.textContent); }));
})();
