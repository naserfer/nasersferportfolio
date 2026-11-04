// Una corriente de puntos sale de tu foto, baja con vos por la página y termina orbitando tu correo.
// Se dibuja con un scroll suavizado propio: así el movimiento nunca hereda los saltos de la rueda del mouse.
(() => {
  if (!FX.flow || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement, $ = (s) => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const COBALT = '#2438e8', WHITE = '#ffffff', STEP = 10;
  const btn = document.getElementById('flow-toggle');
  let stopped = false;
  try { stopped = localStorage.getItem('nf-flow') === 'off'; } catch {}

  const cv = document.createElement('canvas');
  cv.className = 'flow';
  cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv);
  const ctx = cv.getContext('2d');

  let W = 1, H = 1, gut = 16, maxS = 1, Ltot = 1, nPath = 0, ready = false;
  let X, Y, NX, NY, TX, TY;
  let pc = { x: 0, y: 0, r: 100 }, end = { x: 0, y: 0, rx: 100, ry: 40 }, dark = [];
  // Mide cada elemento en su lugar final, sin el desplazamiento de su animación de entrada.
  const liftOf = (el) => { let y = 0; for (let e = el; e && e !== document.body; e = e.parentElement) { const t = getComputedStyle(e).transform; if (t && t !== 'none') y += new DOMMatrix(t).m42; } return y; };
  const pageRect = (el) => {
    const r = el.getBoundingClientRect(), t = (parseFloat(el.style.translate) || 0) * innerWidth / 100, ly = liftOf(el);
    return { l: r.left - t, r: r.right - t, t: r.top + scrollY - ly, b: r.bottom + scrollY - ly, w: r.width, h: r.height };
  };

  // El recorrido une la foto, las líneas de la página, la línea de tiempo y tu correo.
  const buildPath = () => {
    const img = pageRect($('.portrait img')), verbs = pageRect($('.verbs')), wh = pageRect($('.work h2')), pl = pageRect($('.plist'));
    const eh = pageRect($('.exp h2')), rows = pageRect($('.rows')), stack = pageRect($('.stack-s')), sh = pageRect($('.stack-s h2'));
    const skills = pageRect($('.skills')), foot = pageRect($('.contact')), mail = pageRect($('#mail')), mailText = pageRect($('#mail span') || $('#mail'));
    pc = { x: img.l + img.w / 2, y: img.t + img.h / 2, r: img.w / 2 };
    end = { x: W / 2, y: mail.t + mail.h / 2, rx: Math.min(W * 0.47, mailText.w * 0.56), ry: Math.max(mail.h * 0.92, 46) };
    dark = [[stack.t, stack.b], [foot.t, foot.b + 400]];
    const m = gut * 0.5, right = W - m, railX = rows.l + 5, A = [
      [pc.x, pc.y + pc.r], [pc.x, verbs.t], [gut, verbs.t + 1], [m, wh.t - 8], [gut, wh.b + 5], [Math.min(wh.l + wh.w, W - gut), wh.b + 6],
      [right, pl.t], [right, pl.b], [right, eh.t - 16], [Math.min(eh.l + eh.w, W - gut), eh.b + 5], [railX, eh.b + 6], [railX, rows.t + 8], [railX, rows.b],
      [railX, stack.t], [m, sh.t - 6], [gut, sh.b + 5], [Math.min(sh.l + sh.w, W - gut), sh.b + 6], [right, skills.t], [right, skills.b], [right, foot.t], [end.x + end.rx, end.y],
    ];
    const raw = [];
    for (let i = 0; i < A.length - 1; i++) {
      const [ax, ay] = A[i], [bx, by] = A[i + 1], n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 8));
      for (let k = 0; k < n; k++) raw.push([ax + (bx - ax) * k / n, Math.max(ay, ay + (by - ay) * k / n)]);
    }
    // Curvas suaves en cada esquina y distancia uniforme a lo largo del hilo.
    const sm = raw.map((_, i) => { let x = 0, y = 0, c = 0; for (let j = Math.max(0, i - 9); j <= Math.min(raw.length - 1, i + 9); j++) { x += raw[j][0]; y += raw[j][1]; c++; } return [x / c, y / c]; });
    const cum = [0];
    for (let i = 1; i < sm.length; i++) cum[i] = cum[i - 1] + Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]);
    Ltot = cum[cum.length - 1]; nPath = Math.floor(Ltot / STEP) + 2;
    X = new Float32Array(nPath); Y = new Float32Array(nPath); NX = new Float32Array(nPath); NY = new Float32Array(nPath); TX = new Float32Array(nPath); TY = new Float32Array(nPath);
    let j = 0, top = -1e9;
    for (let i = 0; i < nPath; i++) {
      const u = Math.min(i * STEP, Ltot);
      while (j < sm.length - 2 && cum[j + 1] < u) j++;
      const f = (u - cum[j]) / Math.max(0.001, cum[j + 1] - cum[j]);
      X[i] = sm[j][0] + (sm[j + 1][0] - sm[j][0]) * f;
      top = Math.max(top, sm[j][1] + (sm[j + 1][1] - sm[j][1]) * f); Y[i] = top;
    }
    for (let i = 0; i < nPath; i++) {
      const a = Math.max(0, i - 2), b = Math.min(nPath - 1, i + 2), dx = X[b] - X[a], dy = Y[b] - Y[a], l = Math.hypot(dx, dy) || 1;
      TX[i] = dx / l; TY[i] = dy / l; NX[i] = -dy / l; NY[i] = dx / l;
    }
    ready = true;
  };
  const centerU = (py) => {
    let a = 0, b = nPath - 1;
    while (a < b) { const c = (a + b) >> 1; if (Y[c] < py) a = c + 1; else b = c; }
    return a * STEP;
  };

  let density = Math.min(devicePixelRatio || 1, 1.5);
  const applyDensity = () => {
    const d = W > 1500 ? Math.min(density, 1.25) : density;
    cv.width = W * d; cv.height = H * d;
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  };
  const measure = () => {
    W = root.clientWidth; H = innerHeight; maxS = Math.max(1, root.scrollHeight - H);
    gut = parseFloat(getComputedStyle($('.wrap')).paddingLeft) || 16;
    applyDensity();
    buildPath();
  };

  const N = fine ? 340 : 170;
  let limit = N;
  const dots = Array.from({ length: N }, (_, i) => {
    const spread = Math.random() ** 2.2;
    return { a: Math.random() * 6.283, sp: spread, v: (0.05 + Math.random() * 0.1) * (1.2 - spread * 0.7), s: 1.2 + Math.random() * 1.4, sx: Math.random(), sy: Math.random(), o: 0.28 + (1 - spread) * 0.62,
      d: Math.random() * 0.45, ph: i / N + (Math.random() - 0.5) * 0.02, off: Math.random() * 2 - 1, w: 0.6 + Math.random() * 1.6, f: Math.random() * 6.283, px: 0, py: 0, al: 0, lt: 0, rx: 0, ry: 0, tx: 0, ty: 0 };
  });

  let curS = scrollY, s1 = curS, sm = curS, lastSm = curS, uNow = 0, flow = 0, vel = 0, last = 0, raf = 0, frames = 0, slow = 0, t0 = 0;
  addEventListener('scroll', () => { curS = scrollY; }, { passive: true });
  const pointer = { x: -9999, y: -9999, on: false };
  const inDark = (y) => dark.some(([a, b]) => y >= a && y < b);

  const draw = (now) => {
    raf = 0;
    if (stopped || document.hidden || root.classList.contains('show-on')) return;
    raf = requestAnimationFrame(draw);
    const dtMs = Math.max(0, Math.min(now - last, 50)); last = now;
    if (!ready || !dtMs) return;
    const dt = dtMs / 1000, T = (now - t0) / 1000;
    if (T > 2.5) {
      frames++; if (dtMs > 26) slow++;
      // Si el equipo sufre, primero baja la resolución del lienzo y después la cantidad de puntos.
      if (frames >= 60) { if (slow > 24) { if (density > 1) { density = 1; applyDensity(); } else if (limit > 90) limit = Math.round(limit * 0.8); } frames = 0; slow = 0; }
    }
    // Dos filtros seguidos: la rueda da saltos, pero lo que se dibuja arranca y frena sin escalones.
    const kS = 1 - Math.exp(-dt / 0.07);
    s1 += (curS - s1) * kS; sm += (s1 - sm) * kS;
    if (Math.abs(curS - sm) < 0.02) sm = s1 = curS;
    vel += ((sm - lastSm) / dt - vel) * (1 - Math.exp(-dt / 0.14)); lastSm = sm;
    const speed = clamp(Math.abs(vel) / 2600);

    ctx.clearRect(0, 0, W, H);
    uNow += (centerU(sm + H * 0.5) - uNow) * (1 - Math.exp(-dt / 0.3));
    flow += dt * (24 + vel * 0.42);
    const Lw = H * 2 + W * 1.2, u0 = uNow - Lw / 2, width = (W < 600 ? 7 : 15) * (1 - speed * 0.72) + 2;
    const rel1 = sm / (H * 0.32), end1 = (sm - (maxS - H * 0.55)) / (H * 0.5), trail = speed * 20, kP = 1 - Math.exp(-dt / 0.12);
    const sign = vel < 0 ? -1 : 1;
    const lineC = [], lineW = [];
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? WHITE : COBALT;
      for (let i = 0; i < limit; i++) {
        const p = dots[i];
        if (pass === 0) {
          p.a += p.v * dt;
          const e = 1 - (1 - clamp((T - p.d) / 1.4)) ** 3;
          const r = pc.r * (1.16 + p.sp * 0.95);
          let x = p.sx * W + (pc.x + Math.cos(p.a) * r - p.sx * W) * e, y = p.sy * H + (pc.y + Math.sin(p.a) * r * 0.96 - p.sy * H) * e, al = p.o;
          const ri = smooth(clamp((rel1 - p.d) / 0.55));
          if (ri > 0) {
            const rel = (((p.ph * Lw + flow - u0) % Lw) + Lw) % Lw, u = u0 + rel;
            let fa = Math.min(1, rel / 180, (Lw - rel) / 180);
            if (u < 0 || u >= Ltot) fa = 0;
            // Interpola entre muestras del recorrido: el punto avanza en continuo, nunca de a saltos.
            const q = clamp(u, 0, Ltot - 0.01) / STEP, k = Math.floor(q), f = q - k, k2 = Math.min(nPath - 1, k + 1);
            const nx = NX[k] + (NX[k2] - NX[k]) * f, ny = NY[k] + (NY[k2] - NY[k]) * f;
            const o = p.off * width * (0.7 + 0.3 * Math.sin(T * p.w + p.f));
            const fx = X[k] + (X[k2] - X[k]) * f + nx * o, fy = Y[k] + (Y[k2] - Y[k]) * f + ny * o;
            x += (fx - x) * ri; y += (fy - y) * ri; al += (fa * (0.45 + p.o * 0.55) - al) * ri;
            p.tx = TX[k]; p.ty = TY[k];
          }
          const ei = smooth(clamp((end1 - p.d) / 0.5));
          if (ei > 0) {
            const a2 = p.f + T * p.v * 0.7, q = 1 + p.sp * 0.4;
            x += (end.x + Math.cos(a2) * end.rx * q - x) * ei; y += (end.y + Math.sin(a2) * end.ry * q - y) * ei; al += (0.35 + p.o * 0.6 - al) * ei;
          }
          const sx = x, sy = y - sm;
          // El cursor abre un espacio entre los puntos, sin empujarlos de golpe.
          let tx = 0, ty = 0;
          if (pointer.on) {
            const dx = sx - pointer.x, dy = sy - pointer.y, d2 = dx * dx + dy * dy;
            if (d2 < 14400) { const d = Math.sqrt(d2) || 1, g = (120 - d) / 120 * 30; tx = dx / d * g; ty = dy / d * g; }
          }
          p.rx += (tx - p.rx) * kP; p.ry += (ty - p.ry) * kP;
          p.px = sx + p.rx; p.py = sy + p.ry; p.al = al; p.lt = inDark(y) ? 1 : 0;
        }
        if (p.lt !== pass || p.al < 0.02 || p.py < -10 || p.py > H + 10) continue;
        ctx.globalAlpha = p.al;
        ctx.fillRect(p.px, p.py, p.s, p.s);
        if (trail > 1.5 && rel1 > 1.2 && end1 < 0) (pass ? lineW : lineC).push(p);
      }
    }
    // Estelas: crecen de a poco con la velocidad, para que no aparezcan de golpe.
    if (trail > 1.5) {
      ctx.lineWidth = 1; ctx.globalAlpha = 0.42 * clamp((trail - 1.5) / 6);
      [[lineC, COBALT], [lineW, WHITE]].forEach(([list, color]) => {
        if (!list.length) return;
        ctx.strokeStyle = color; ctx.beginPath();
        for (const p of list) { ctx.moveTo(p.px, p.py); ctx.lineTo(p.px - p.tx * trail * sign, p.py - p.ty * trail * sign); }
        ctx.stroke();
      });
    }
    ctx.globalAlpha = 1;
  };
  const go = () => { if (!raf && !stopped && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); } };

  if (fine) {
    addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true; }, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.on = false; });
  }

  // Apagar y encender
  const paint = () => { if (btn) { btn.hidden = false; btn.textContent = stopped ? 'Encender animación' : 'Apagar animación'; } cv.hidden = stopped; };
  if (btn) btn.addEventListener('click', () => {
    stopped = !stopped;
    try { localStorage.setItem('nf-flow', stopped ? 'off' : 'on'); } catch {}
    paint();
    if (!stopped) go();
  });
  paint();

  t0 = performance.now();
  const start = () => { curS = s1 = sm = lastSm = scrollY; measure(); uNow = centerU(sm + H * 0.5); go(); };
  (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(start);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(() => { if (ready) measure(); }, 80));
  addEventListener('load', () => setTimeout(() => { if (ready) measure(); }, 120));
  let rt, rw = innerWidth, rh = innerHeight;
  addEventListener('resize', () => {
    if (innerWidth === rw && Math.abs(innerHeight - rh) < 140) return; // la barra del celular no reinicia nada
    rw = innerWidth; rh = innerHeight;
    clearTimeout(rt); rt = setTimeout(measure, 200);
  });
  document.addEventListener('visibilitychange', go);
  addEventListener('show-end', go);
})();
