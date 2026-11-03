// Efectos diferidos. Para apagar uno, poné su valor en false.
const FX = { field: true, thread: true, titles: true, timeline: true, magnet: true, copy: true, konami: true, favicon: true };

(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;

  // Copiar el correo funciona siempre, con o sin animaciones.
  if (FX.copy) {
    const btn = document.getElementById('copy'), msg = document.getElementById('copy-msg');
    btn.hidden = false;
    let t;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('naserfer97@gmail.com'); msg.textContent = 'Correo copiado'; }
      catch { msg.textContent = 'No se pudo copiar. Escribí a naserfer97@gmail.com'; }
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
      el.innerHTML = '<span>Señal recibida. Hablemos.</span>';
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
    const paint = () => {
      c.fillStyle = '#2438e8'; c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#fff'; c.fill(nf);
      const d = (i / STEPS) * len * 4, side = Math.floor(d / len) % 4, o = d % len;
      const [x, y] = [[m + o, m], [m + len, m + o], [m + len - o, m + len], [m, m + len - o]][side];
      c.beginPath(); c.arc(x, y, 5, 0, 6.3); c.fillStyle = '#fff'; c.fill();
      link.href = cv.toDataURL('image/png');
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

  // Partículas que orbitan tu foto, como en el cierre de la función de 15 segundos.
  const startField = () => {
    if (!FX.field) return;
    const hero = document.querySelector('.hero'), img = document.querySelector('.portrait img');
    const cv = document.createElement('canvas');
    cv.className = 'field';
    cv.setAttribute('aria-hidden', 'true');
    hero.prepend(cv);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, cx = 0, cy = 0, rad = 100, ps = [], visible = true, raf = 0, last = 0, slow = 0, frames = 0, t0 = 0;
    let mx = -9999, my = -9999, limit = 0;
    const size = () => {
      const r = cv.getBoundingClientRect(), i = img.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      cx = i.left - r.left + i.width / 2; cy = i.top - r.top + i.height / 2; rad = i.width / 2;
      cv.width = W * d; cv.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const n = fine ? 340 : 160;
      limit = n;
      ps = Array.from({ length: n }, () => {
        const spread = Math.random() ** 2.2;
        return { a: Math.random() * 6.283, r: rad * (1.16 + spread * 0.95), v: (0.05 + Math.random() * 0.1) * (1.2 - spread * 0.7), s: 1.2 + Math.random() * 1.4, sx: Math.random() * W, sy: Math.random() * H, o: 0.28 + (1 - spread) * 0.62, ox: 0, oy: 0, d: Math.random() * 0.5 };
      });
      t0 = performance.now();
    };
    const out = (t) => 1 - (1 - t) ** 3;
    const draw = (now) => {
      raf = 0;
      if (!visible || document.hidden || root.classList.contains('show-on')) return;
      raf = requestAnimationFrame(draw);
      const dt = Math.min(now - last, 50); last = now;
      if (dt < 200) { frames++; if (dt > 26) slow++; }
      if (frames >= 90) { if (slow > 45 && limit > 90) limit = Math.round(limit * 0.7); frames = 0; slow = 0; }
      const T = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#2438e8';
      for (let i = 0; i < limit; i++) {
        const p = ps[i];
        p.a += p.v * dt * 0.001;
        const e = out(clamp((T - p.d) / 1.4, 0, 1));
        const rx = cx + Math.cos(p.a) * p.r, ry = cy + Math.sin(p.a) * p.r * 0.96;
        const x = p.sx + (rx - p.sx) * e, y = p.sy + (ry - p.sy) * e;
        const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
        let tx = 0, ty = 0;
        if (d2 < 19600) { const d = Math.sqrt(d2) || 1, f = (140 - d) / 140; tx = (dx / d) * f * 42; ty = (dy / d) * f * 42; }
        p.ox += (tx - p.ox) * 0.09; p.oy += (ty - p.oy) * 0.09;
        ctx.globalAlpha = p.o;
        ctx.fillRect(x + p.ox, y + p.oy, p.s, p.s);
      }
      ctx.globalAlpha = 1;
    };
    const go = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); } };
    size();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; go(); }).observe(cv);
    document.addEventListener('visibilitychange', go);
    addEventListener('show-end', go);
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(size, 60));
    if (fine) {
      hero.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
      hero.addEventListener('pointerleave', () => { mx = my = -9999; });
    }
    go();
  };
  (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(startField);

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
