// Efectos diferidos. Para apagar uno, poné su valor en false.
const FX = { ring: true, thread: true, titles: true, timeline: true, magnet: true, copy: true, konami: true, favicon: true, verbs: true };

(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const EN = root.lang.startsWith('en');

  // Copiar el correo funciona siempre, con o sin animaciones.
  if (FX.copy) {
    const btn = document.getElementById('copy'), msg = document.getElementById('copy-msg');
    btn.hidden = false;
    let t;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('naserfer97@gmail.com'); msg.textContent = EN ? 'Email copied' : 'Correo copiado'; }
      catch { msg.textContent = EN ? 'Could not copy. Email naserfer97@gmail.com' : 'No se pudo copiar. Escribí a naserfer97@gmail.com'; }
      clearTimeout(t); t = setTimeout(() => { msg.textContent = ''; }, 3500);
    });
  }

  if (FX.konami) {
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let at = 0;
    addEventListener('keydown', (e) => {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      at = e.key.toLowerCase() === code[at].toLowerCase() ? at + 1 : (e.key === code[0] ? 1 : 0);
      if (at < code.length) return;
      at = 0;
      const el = document.createElement('div');
      el.className = 'signal';
      el.setAttribute('role', 'status');
      el.innerHTML = EN ? '<span>Signal received. Let’s talk.</span>' : '<span>Señal recibida. Hablemos.</span>';
      document.body.append(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
      setTimeout(() => el.classList.remove('on'), 2200);
      setTimeout(() => el.remove(), 2800);
    });
  }

  if (calm) return;

  // Favicon: una señal recorre el borde del ícono.
  if (FX.favicon) {
    const link = document.querySelector('link[rel="icon"]');
    const cv = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
    const c = cv.getContext('2d');
    const nf = new Path2D('M13 48V16h6l13 19V16h6v32h-6L19 29v19zM43 48V16h13v5.5h-7v7.5h6v5.5h-6V48z');
    const STEPS = 28, m = 5, len = 64 - m * 2;
    let i = 0;
    // Cada cuadro se genera una sola vez, y el ícono descansa mientras scrolleás.
    const urls = [];
    let lastScroll = 0;
    addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
    const paint = () => {
      if (performance.now() - lastScroll < 400) return;
      if (!urls[i]) {
        c.fillStyle = '#2438e8'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#fff'; c.fill(nf);
        const d = (i / STEPS) * len * 4, side = Math.floor(d / len) % 4, o = d % len;
        const [x, y] = [[m + o, m], [m + len, m + o], [m + len - o, m + len], [m, m + len - o]][side];
        c.beginPath(); c.arc(x, y, 5, 0, 6.3); c.fillStyle = '#fff'; c.fill();
        urls[i] = cv.toDataURL('image/png');
      }
      link.href = urls[i];
      i = (i + 1) % STEPS;
    };
    setInterval(paint, 130); // si la pestaña está en segundo plano, el navegador lo baja solo
  }

  // Scroll: hilo de la señal, títulos y línea de tiempo comparten un solo cálculo.
  const thread = FX.thread ? document.createElement('div') : null;
  if (thread) { thread.className = 'thread'; thread.setAttribute('aria-hidden', 'true'); document.body.append(thread); }
  const titles = FX.titles ? [...document.querySelectorAll('.work h2,.ask h2,.exp h2,.stack-s h2')].map((el) => ({ el, top: 0 })) : [];
  const rowsBox = document.querySelector('.rows');
  let tl = null, tlTop = 0, tlH = 1, rows = [];
  if (FX.timeline) {
    tl = document.createElement('span');
    tl.className = 'tl';
    tl.setAttribute('aria-hidden', 'true');
    rowsBox.prepend(tl);
    root.classList.add('js-tl');
    rows = [...rowsBox.querySelectorAll('.row')].map((el) => ({ el, y: 0 }));
  }
  // Pienso, Orquesto, Entrego: una línea se dibuja y cada palabra sube al pasar.
  if (FX.verbs) {
    const section = document.querySelector('.verbs');
    section.querySelectorAll('h3').forEach((h) => { h.innerHTML = `<span>${h.textContent}</span>`; });
    root.classList.add('js-verbs');
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { section.classList.add('in'); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(section);
  }
  let vh = 1, max = 1, ticking = false;
  const measure = () => {
    vh = innerHeight; max = Math.max(1, root.scrollHeight - vh);
    titles.forEach((t) => { const tr = t.el.style.translate; t.el.style.translate = 'none'; t.top = t.el.getBoundingClientRect().top + scrollY; t.el.style.translate = tr; });
    if (tl) {
      const r = rowsBox.getBoundingClientRect();
      tlTop = r.top + scrollY; tlH = r.height || 1;
      rows.forEach((o) => { o.y = o.el.offsetTop + 22; });
    }
  };
  const update = () => {
    ticking = false;
    const y = scrollY;
    if (thread) thread.style.transform = `scaleY(${clamp(y / max, 0, 1)})`;
    titles.forEach((t) => {
      if (t.el.offsetParent === null) return;
      const p = clamp((t.top - y - vh * 0.6) / (vh * 0.4), 0, 1); // ya alineado al llegar al 60 % de la pantalla
      t.el.style.translate = `${(p * 7).toFixed(2)}vw 0`;
    });
    if (tl) {
      const p = clamp((y + vh * 0.72 - tlTop) / tlH, 0, 1);
      tl.style.transform = `scaleY(${p.toFixed(4)})`;
      rows.forEach((o) => o.el.classList.toggle('lit', p * tlH >= o.y));
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  addEventListener('load', () => { measure(); update(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); update(); });
  measure(); update();

  if (!fine || !FX.magnet) return;

  // Botones magnéticos
  document.querySelectorAll('.take,.go,.copy').forEach((b) => {
    b.classList.add('magnet');
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2) - (parseFloat(b.dataset.x) || 0);
      const dy = e.clientY - (r.top + r.height / 2) - (parseFloat(b.dataset.y) || 0);
      b.dataset.x = dx * 0.18; b.dataset.y = dy * 0.3;
      b.style.transition = 'transform .12s';
      b.style.transform = `translate(${dx * 0.18}px,${dy * 0.3}px)`;
    });
    b.addEventListener('pointerleave', () => { b.dataset.x = 0; b.dataset.y = 0; b.style.transition = 'transform .35s cubic-bezier(.2,1.4,.4,1)'; b.style.transform = ''; });
  });
})();
