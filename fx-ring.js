// Un anillo de puntos rodea tu foto. Al bajar, se abre y sus puntos caen hasta formar la línea
// que abre "Pienso, Orquesto, Entrego". Cada posición del scroll es un estado exacto y reversible.
(() => {
  if (!FX.ring || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement, $ = (s) => document.querySelector(s);
  const hero = $('.hero'), img = $('.portrait img'), verbs = $('.verbs');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const COLOR = '#2438e8', TAU = 6.28318;

  const cv = document.createElement('canvas');
  cv.className = 'ring';
  cv.setAttribute('aria-hidden', 'true');
  hero.prepend(cv);
  const ctx = cv.getContext('2d');

  // Dos anillos regulares, y cada punto ya sabe a qué lugar de la línea va.
  const RINGS = [{ n: 44, k: 1.13, r: 1.5, o: 0.95, dir: 1 }, { n: 30, k: 1.27, r: 1.05, o: 0.5, dir: -1 }];
  const dots = [];
  RINGS.forEach((g, ri) => {
    for (let i = 0; i < g.n; i++) dots.push({ a0: (i / g.n) * TAU + ri * 0.05, g, f: 0, side: 1, idx: dots.length });
  });

  let W = 1, cx = 0, cy = 0, rad = 100, lineY = 0, leftLen = 1, rightLen = 1, range = 1, ox = 0, oy = 0, width = 1, height = 1;
  const measure = () => {
    const sy = scrollY, hr = hero.getBoundingClientRect(), ir = img.getBoundingClientRect(), vr = verbs.getBoundingClientRect();
    const gut = parseFloat(getComputedStyle(verbs).paddingLeft) || 16, H = innerHeight;
    W = root.clientWidth; rad = ir.width / 2;
    const pcx = ir.left + rad, pcy = ir.top + rad + sy, ly = vr.top + sy;
    const lineL = vr.left + gut, lineR = vr.right - gut;
    leftLen = pcx - lineL; rightLen = lineR - pcx;
    verbs.style.setProperty('--vo', `${leftLen}px`);
    const top = pcy - rad * 1.6;
    // El lienzo es parte de la página: se mueve junto con la foto, sin ningún retraso.
    width = W; height = ly - top + 16;
    cv.style.cssText = `left:${-hr.left}px;top:${top - (hr.top + sy)}px;width:${width}px;height:${height}px`;
    const d = Math.min(devicePixelRatio || 1, W > 1500 ? 1.25 : W > 1200 ? 1.5 : 2);
    cv.width = width * d; cv.height = height * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    cx = pcx; cy = pcy - top; lineY = ly - top;
    range = Math.max(H * 0.32, ly - H * 0.38);
    // Los puntos de abajo salen primero y caen más cerca; los de arriba llegan a las puntas.
    dots.forEach((p) => {
      const fromBottom = ((p.a0 - Math.PI / 2 + TAU * 1.5) % TAU) - Math.PI;
      p.side = fromBottom < 0 ? 1 : -1;
      p.f = 0.06 + (Math.abs(fromBottom) / Math.PI) * 0.94;
    });
    q = clamp(scrollY / range); qS = q; dirty = true;
  };

  let q = 0, qS = 0, last = 0, raf = 0, t0 = 0, visible = true, dirty = true, lastLine = -1;
  const draw = (now) => {
    raf = 0;
    if (!visible || document.hidden || root.classList.contains('show-on')) return;
    const dt = Math.max(0, Math.min(now - last, 50)) / 1000; last = now;
    const t = (now - t0) / 1000;
    // Un filtro breve quita los saltos de la rueda; al frenar llega siempre al mismo estado.
    const prev = qS;
    qS += (q - qS) * (1 - Math.exp(-dt / 0.085));
    if (Math.abs(q - qS) < 0.0004) qS = q;
    const introing = t < 2.2;
    const alive = qS < 0.999; // ya en la línea, no queda nada que dibujar
    const moving = qS !== prev || qS !== q || introing || dirty;
    if (alive || moving) raf = requestAnimationFrame(draw);
    if (!alive && !moving) return;
    dirty = false;

    const openR = 1 + 0.1 * smooth(clamp(qS / 0.28));
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLOR;
    for (let i = 0; i < dots.length; i++) {
      const p = dots[i], g = p.g;
      const appear = smooth(clamp((t - 0.45 - (i / dots.length) * 0.9) / 0.5));
      if (appear <= 0) continue;
      const a = p.a0 + g.dir * t * 0.05, r = rad * g.k * openR * (1 - (1 - easeOut(appear)) * 0.06);
      const rx = cx + Math.cos(a) * r, ry = cy + Math.sin(a) * r;
      // Sale según su lugar en el anillo y aterriza justo cuando la línea llega hasta él.
      const e = clamp((qS - 0.1 - p.f * 0.4) / (0.5));
      const ye = smooth(clamp(e / 0.62)), xe = smooth(clamp((e - 0.28) / 0.72));
      const tx = cx + p.side * p.f * (p.side > 0 ? rightLen : leftLen);
      const x = rx + (tx - rx) * xe, y = ry + (lineY - ry) * ye;
      const al = g.o * appear * (1 - smooth(clamp((e - 0.88) / 0.12)));
      if (al < 0.01) continue;
      ctx.globalAlpha = al;
      ctx.beginPath(); ctx.arc(x, y, g.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // La línea nace de los puntos que van llegando.
    const lp = clamp((qS - 0.6) / 0.4);
    if (Math.abs(lp - lastLine) > 0.0005) { verbs.style.setProperty('--vl', lp.toFixed(4)); lastLine = lp; }
  };
  const go = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); } };

  root.classList.add('scrub');
  addEventListener('scroll', () => { q = clamp(scrollY / range); go(); }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; go(); }).observe(cv);
  document.addEventListener('visibilitychange', go);
  addEventListener('show-end', go);
  const remeasure = () => { measure(); go(); };
  let rt, rw = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === rw) return; // la barra del celular no cambia nada
    rw = innerWidth; clearTimeout(rt); rt = setTimeout(remeasure, 180);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(remeasure, 60));
  addEventListener('load', () => setTimeout(remeasure, 80));
  t0 = performance.now();
  measure();
  go();
})();
