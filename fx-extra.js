// Efectos diferidos. Para apagar uno, poné su valor en false.
const FX = { field: true, thread: true, titles: true, timeline: true, preview: false, ribbon: true, ring: true, magnet: true, copy: true, konami: true };

(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

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

  // Cinta con el mismo stack que figura en la lista.
  if (FX.ribbon) {
    const words = [...document.querySelectorAll('.skills div:nth-child(-n+3) dd')].flatMap((d) => d.textContent.split(/,\s*/));
    const box = document.createElement('div');
    box.className = 'ribbon';
    box.setAttribute('aria-hidden', 'true');
    const row = document.createElement('div');
    [...words, ...words].forEach((w) => { const s = document.createElement('span'); s.textContent = w; row.append(s); });
    box.append(row);
    document.querySelector('.skills').before(box);
    new IntersectionObserver(([e]) => box.classList.toggle('off', !e.isIntersecting)).observe(box);
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

  // Scroll: hilo de la señal, títulos y línea de tiempo comparten un solo cálculo.
  const thread = FX.thread ? document.createElement('div') : null;
  if (thread) { thread.className = 'thread'; thread.setAttribute('aria-hidden', 'true'); document.body.append(thread); }
  const titles = FX.titles ? [...document.querySelectorAll('.work h2,.ask h2,.exp h2')].map((el) => ({ el, top: 0 })) : [];
  const rowsBox = document.querySelector('.rows');
  let tl = null, tlTop = 0, tlH = 1, rows = [];
  if (FX.timeline) {
    tl = document.createElement('span');
    tl.className = 'tl';
    tl.setAttribute('aria-hidden', 'true');
    rowsBox.prepend(tl);
    document.documentElement.classList.add('js-tl');
    rows = [...rowsBox.querySelectorAll('.row')].map((el) => ({ el, y: 0 }));
  }
  let vh = 1, max = 1, ticking = false;
  const measure = () => {
    vh = innerHeight; max = Math.max(1, document.documentElement.scrollHeight - vh);
    titles.forEach((t) => { const tr = t.el.style.transform; t.el.style.transform = ''; t.top = t.el.getBoundingClientRect().top + scrollY; t.el.style.transform = tr; });
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

  // Campo de partículas, en Canvas 2D, solo cuando el inicio está a la vista.
  const startField = () => {
    if (!FX.field) return;
    const hero = document.querySelector('.hero');
    const cv = document.createElement('canvas');
    cv.className = 'field';
    cv.setAttribute('aria-hidden', 'true');
    hero.prepend(cv);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, pts = [], visible = true, raf = 0, last = 0, slow = 0, frames = 0, links = true;
    let mx = -9999, my = -9999;
    const seed = (n) => { pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, ox: 0, oy: 0 })); };
    const size = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(Math.min(fine ? 110 : 45, Math.round((W * H) / 13000)));
    };
    const draw = (now) => {
      raf = 0;
      if (!visible || document.hidden) return;
      raf = requestAnimationFrame(draw);
      const dt = now - last; last = now;
      if (dt < 200) { frames++; if (dt > 26) slow++; }
      if (frames >= 90) { // baja la calidad si no llega a unos 38 FPS
        if (slow > 45) { if (links) links = false; else if (pts.length > 25) pts.length = Math.round(pts.length * 0.7); }
        frames = 0; slow = 0;
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(36,56,232,.42)';
      const near = [];
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W;
        if (p.y < 0) p.y += H; else if (p.y > H) p.y -= H;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        let tx = 0, ty = 0;
        if (d2 < 32400) { const d = Math.sqrt(d2) || 1, f = (180 - d) / 180; tx = (dx / d) * f * 34; ty = (dy / d) * f * 34; }
        p.ox += (tx - p.ox) * 0.08; p.oy += (ty - p.oy) * 0.08;
        const x = p.x + p.ox, y = p.y + p.oy;
        ctx.fillRect(x - 1, y - 1, 2, 2);
        if (links && d2 < 57600) near.push(x, y);
      }
      if (near.length) {
        ctx.strokeStyle = 'rgba(36,56,232,.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < near.length; i += 2) for (let j = i + 2; j < near.length; j += 2) {
          const a = near[i] - near[j], b = near[i + 1] - near[j + 1];
          if (a * a + b * b < 8100) { ctx.moveTo(near[i], near[i + 1]); ctx.lineTo(near[j], near[j + 1]); }
        }
        ctx.stroke();
      }
    };
    const go = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); } };
    size();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; go(); }).observe(cv);
    document.addEventListener('visibilitychange', go);
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
    if (fine) {
      hero.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
      hero.addEventListener('pointerleave', () => { mx = my = -9999; });
    }
    go();
  };
  (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(startField);

  if (!fine) return;

  // Cursor, vista previa y botones comparten un solo bucle, activo solo al moverse.
  let px = -100, py = -100, rx = -100, ry = -100, vx = -100, vy = -100, loop = 0;
  const ring = FX.ring ? Object.assign(document.createElement('div'), { className: 'ring', innerHTML: '<b></b>' }) : null;
  const pv = FX.preview ? Object.assign(document.createElement('div'), { className: 'pv', innerHTML: '<i></i>' }) : null;
  [ring, pv].forEach((n) => { if (n) { n.setAttribute('aria-hidden', 'true'); document.body.append(n); } });
  const tick = () => {
    rx += (px - rx) * 0.24; ry += (py - ry) * 0.24;
    vx += (px - vx) * 0.12; vy += (py - vy) * 0.12;
    if (ring) ring.style.transform = `translate(${rx}px,${ry}px)`;
    if (pv) pv.style.transform = `translate(${clamp(vx + 22, 8, innerWidth - 248)}px,${clamp(vy - 176, 8, innerHeight - 158)}px)`;
    loop = Math.abs(px - rx) + Math.abs(py - ry) + Math.abs(px - vx) + Math.abs(py - vy) > 0.4 ? requestAnimationFrame(tick) : 0;
  };
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (ring) {
      ring.classList.add('on');
      const hot = e.target.closest && e.target.closest('a,button,input');
      ring.classList.toggle('hot', !!hot);
    }
    if (!loop) loop = requestAnimationFrame(tick);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (ring) ring.classList.remove('on'); });

  if (pv) {
    const looks = [['12%', '30%', '20deg'], ['78%', '22%', '140deg'], ['40%', '82%', '250deg'], ['88%', '70%', '320deg']];
    const art = pv.firstElementChild;
    document.querySelectorAll('.plist li').forEach((li, i) => {
      li.addEventListener('pointerenter', () => {
        const [x, y, a] = looks[i % looks.length];
        art.style.setProperty('--x', x); art.style.setProperty('--y', y); art.style.setProperty('--a', a);
        pv.classList.add('on');
      });
      li.addEventListener('pointerleave', () => pv.classList.remove('on'));
    });
  }

  if (FX.magnet) {
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
  }
})();
