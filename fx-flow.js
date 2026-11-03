// Una corriente de puntos baja con vos por la página y de ella salen tus agentes:
// palitos que siguen el scroll, se cuelgan de las letras y hacen boludeces.
(() => {
  if (!FX.flow || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement, $ = (s) => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const COBALT = '#2438e8', WHITE = '#ffffff';
  const btn = document.getElementById('flow-toggle');
  let stored = false;
  try { stored = localStorage.getItem('nf-flow') === 'off'; } catch {}

  const cv = document.createElement('canvas');
  cv.className = 'flow';
  cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv);
  const ctx = cv.getContext('2d');
  const mctx = document.createElement('canvas').getContext('2d');

  let W = 1, H = 1, gut = 16, maxS = 1, step = 10, Ltot = 1;
  let X, Y, NX, NY, TX, TY, nPath = 0;
  let pc = { x: 0, y: 0, r: 100 }, end = { x: 0, y: 0, rx: 100, ry: 40 }, dark = [];
  let slots = [], railReady = false;
  // Mide cada elemento en su lugar final, sin el desplazamiento de su animación de entrada.
  const liftOf = (el) => { let y = 0; for (let e = el; e && e !== document.body; e = e.parentElement) { const t = getComputedStyle(e).transform; if (t && t !== 'none') y += new DOMMatrix(t).m42; } return y; };
  const pageRect = (el) => {
    const r = el.getBoundingClientRect(), t = (parseFloat(el.style.translate) || 0) * innerWidth / 100, ly = liftOf(el);
    return { l: r.left - t, r: r.right - t, t: r.top + scrollY - ly, b: r.bottom + scrollY - ly, w: r.width, h: r.height };
  };
  // Mide cada letra de verdad: la parte alta para sentarse y la baja para colgarse.
  const letters = (el) => {
    const cs = getComputedStyle(el), out = [];
    mctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const tx = (parseFloat(el.style.translate) || 0) * innerWidth / 100, ly = liftOf(el);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (let i = 0; i < n.length; i++) {
        const ch = n.data[i];
        if (!ch.trim()) continue;
        range.setStart(n, i); range.setEnd(n, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width) continue;
        const m = mctx.measureText(ch), base = r.top + (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        out.push({ ch, x: r.left + r.width / 2 - tx, top: base - m.actualBoundingBoxAscent + scrollY - ly, bottom: base + m.actualBoundingBoxDescent + scrollY - ly });
      }
    }
    return out;
  };
  const pick = (list, score, count, gap) => {
    const res = [];
    [...list].sort((a, b) => score(b) - score(a)).forEach((l) => {
      if (res.length < count && res.every((o) => Math.abs(o.x - l.x) > gap)) res.push(l);
    });
    return res;
  };
  const buildSlots = () => {
    slots = [];
    const small = W < 600;
    ['.work h2', '.exp h2', '.stack-s h2', '#mail'].forEach((sel) => {
      const el = $(sel), ls = letters(el);
      if (!ls.length) return;
      const lowest = Math.max(...ls.map((l) => l.bottom)), minX = ls[0].x, maxX = ls[ls.length - 1].x, span = maxX - minX || 1;
      const hang = pick(ls, (l) => (l.bottom - lowest + 40) / 40 + (l.x - minX) / span, small ? 0 : 2, W * 0.09);
      const sit = pick(ls, (l) => (/[fldhkbtSEH]/.test(l.ch) ? 1 : 0) + Math.random() * 0.5, small ? 3 : 2, W * 0.09);
      hang.forEach((l) => slots.push({ type: 'hang', el, x: l.x, y: l.bottom - 1, by: null }));
      sit.forEach((l) => { if (!hang.includes(l)) slots.push({ type: 'sit', el, x: l.x, y: l.top + 1, by: null }); });
    });
  };
  const slotX = (s) => s.x + (parseFloat(s.el.style.translate) || 0) * W / 100;

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
    const sm = raw.map((_, i) => { let x = 0, y = 0, c = 0; for (let j = Math.max(0, i - 7); j <= Math.min(raw.length - 1, i + 7); j++) { x += raw[j][0]; y += raw[j][1]; c++; } return [x / c, y / c]; });
    const cum = [0];
    for (let i = 1; i < sm.length; i++) cum[i] = cum[i - 1] + Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]);
    Ltot = cum[cum.length - 1]; nPath = Math.floor(Ltot / step) + 1;
    X = new Float32Array(nPath); Y = new Float32Array(nPath); NX = new Float32Array(nPath); NY = new Float32Array(nPath); TX = new Float32Array(nPath); TY = new Float32Array(nPath);
    let j = 0, top = -1e9;
    for (let i = 0; i < nPath; i++) {
      const u = i * step;
      while (j < sm.length - 2 && cum[j + 1] < u) j++;
      const f = (u - cum[j]) / Math.max(0.001, cum[j + 1] - cum[j]);
      X[i] = sm[j][0] + (sm[j + 1][0] - sm[j][0]) * f;
      top = Math.max(top, sm[j][1] + (sm[j + 1][1] - sm[j][1]) * f); Y[i] = top;
    }
    for (let i = 0; i < nPath; i++) {
      const a = Math.max(0, i - 2), b = Math.min(nPath - 1, i + 2), dx = X[b] - X[a], dy = Y[b] - Y[a], l = Math.hypot(dx, dy) || 1;
      TX[i] = dx / l; TY[i] = dy / l; NX[i] = -dy / l; NY[i] = dx / l;
    }
    railReady = true;
  };
  const centerU = (py) => {
    let a = 0, b = nPath - 1;
    while (a < b) { const c = (a + b) >> 1; if (Y[c] < py) a = c + 1; else b = c; }
    return a * step;
  };

  let density = Math.min(devicePixelRatio || 1, 1.5);
  const applyDensity = () => {
    const d = W > 1500 ? Math.min(density, 1.25) : density;
    cv.width = W * d; cv.height = H * d;
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  };
  const measure = () => {
    W = root.clientWidth; H = innerHeight; maxS = Math.max(1, root.scrollHeight - H);
    gut = parseFloat(getComputedStyle($('.wrap')).paddingLeft) || 16;
    applyDensity();
    buildPath(); buildSlots();
    sticks.forEach((s) => { s.slot = null; if (s.mode === 'hang' || s.mode === 'sit' || s.mode === 'reach') s.mode = 'ride'; });
  };

  // Puntos
  const N = fine ? 340 : 170;
  let limit = N;
  const dots = Array.from({ length: N }, (_, i) => {
    const spread = Math.random() ** 2.2;
    return { a: Math.random() * 6.283, sp: spread, v: (0.05 + Math.random() * 0.1) * (1.2 - spread * 0.7), s: 1.2 + Math.random() * 1.4, sx: Math.random(), sy: Math.random(), o: 0.28 + (1 - spread) * 0.62,
      d: Math.random() * 0.45, ph: i / N + (Math.random() - 0.5) * 0.02, off: (Math.random() * 2 - 1), w: 0.6 + Math.random() * 1.6, f: Math.random() * 6.283, px: 0, py: 0 };
  });

  // Palitos: 11 puntos unidos por varillas, con física simple.
  const STICKS = fine ? 5 : 3, SZ = W0() < 600 ? 34 : 46;
  function W0() { return root.clientWidth; }
  const B = [[0, 1, 0.2], [1, 2, 0.36], [1, 3, 0.19], [3, 4, 0.19], [1, 5, 0.19], [5, 6, 0.19], [2, 7, 0.23], [7, 8, 0.23], [2, 9, 0.23], [9, 10, 0.23]];
  const sticks = [];
  const newStick = (x, y, i) => {
    const s = { x: new Float32Array(11), y: new Float32Array(11), ox: new Float32Array(11), oy: new Float32Array(11), mode: 'ride', slot: null, foot: null, t: 0, cool: 0.6 + i * 0.5, gag: '', gagT: 2 + Math.random() * 3, gagLeft: 0, a: 0, gone: false, offU: (i - (STICKS - 1) / 2) * H * 0.2, u: 0, seed: Math.random() * 10, dir: Math.random() < 0.5 ? -1 : 1 };
    for (let k = 0; k < 11; k++) { const a = Math.random() * 6.283; s.x[k] = s.ox[k] = x + Math.cos(a) * 3; s.y[k] = s.oy[k] = y + Math.sin(a) * 3; }
    return s;
  };
  const release = (s, mode = 'ride') => {
    if (s.slot) { s.slot.by = null; s.slot = null; }
    sticks.forEach((o) => { if (o.foot && o.foot.s === s) { o.foot = null; o.mode = 'thrown'; o.t = 0; } });
    s.foot = null; s.mode = mode; s.t = 0; s.gag = ''; s.cool = 1 + Math.random() * 2;
  };
  const apart = (s, a, b, min) => {
    const dx = s.x[b] - s.x[a], m = min * SZ;
    if (Math.abs(dx) >= m) return;
    const e = (m - Math.abs(dx)) * 0.5 * (dx < 0 ? -1 : 1);
    s.x[a] -= e; s.x[b] += e;
  };
  const pinTo = (s, k, x, y) => { s.x[k] = x; s.y[k] = y; s.ox[k] = x; s.oy[k] = y; };
  const pull = (s, k, x, y, f) => { s.x[k] += (x - s.x[k]) * f; s.y[k] += (y - s.y[k]) * f; };
  let drag = null, pointer = { x: -9999, y: -9999, on: false };

  const updateStick = (s, dt, dScroll, T) => {
    s.t += dt;
    const dt2 = dt * dt, gScale = s.mode === 'ride' ? 0.28 : s.mode === 'sit' ? 0.6 : 1, g = 1700 * (SZ / 38) * gScale;
    const hang = s.mode === 'hang' || s.mode === 'sit' || s.mode === 'reach';
    for (let k = 0; k < 11; k++) {
      const vx = (s.x[k] - s.ox[k]) * 0.985, vy = (s.y[k] - s.oy[k]) * 0.985;
      s.ox[k] = s.x[k]; s.oy[k] = s.y[k];
      s.x[k] += vx; s.y[k] += vy + g * dt2;
      if (hang) s.y[k] += dScroll * 0.1; // el cuerpo reacciona al scroll como si tuviera peso
    }
    if (s.gagLeft > 0) s.gagLeft -= dt;
    else s.gag = '';
    if (s.mode === 'ride') {
      const target = clamp(uNow + s.offU, 0, Ltot - 1), k0 = 1 - Math.exp(-dt / 0.28);
      s.u += (target - s.u) * k0;
      const i = Math.min(nPath - 1, Math.floor(s.u / step));
      const wob = Math.sin(T * 1.6 + s.seed) * SZ * 0.3;
      pull(s, 2, X[i] + NX[i] * wob, Y[i] + NY[i] * wob - SZ * 0.3, Math.min(0.28, 0.14 + k0));
      pull(s, 0, s.x[2], s.y[2] - SZ * 0.56, 0.05);
      pull(s, 1, s.x[2], s.y[2] - SZ * 0.36, 0.08);
      const sw = Math.sin(T * 5 + s.seed) * SZ * 0.14;
      s.x[8] += sw * dt * 8; s.x[10] -= sw * dt * 8;
      // Brazos abiertos, como quien mantiene el equilibrio sobre la corriente.
      pull(s, 4, s.x[1] - SZ * 0.32, s.y[1] + Math.sin(T * 3 + s.seed) * SZ * 0.08, 0.1);
      pull(s, 6, s.x[1] + SZ * 0.32, s.y[1] - Math.sin(T * 3 + s.seed) * SZ * 0.08, 0.1);
    } else if (s.mode === 'reach' || s.mode === 'hang') {
      let ax, ay;
      if (s.foot) { ax = s.foot.s.x[s.foot.k]; ay = s.foot.s.y[s.foot.k]; } else { ax = slotX(s.slot); ay = s.slot.y; }
      if (s.mode === 'reach') {
        const f = Math.min(0.4, 0.1 + s.t * 0.7);
        pull(s, 4, ax - SZ * 0.09, ay, f); pull(s, 6, ax + SZ * 0.09, ay, f);
        if (s.t > 0.42 || Math.hypot(s.x[4] - ax, s.y[4] - ay) < 5) { s.mode = 'hang'; s.t = 0; s.gagT = 1.5 + Math.random() * 3; }
      } else {
        s.gagT -= dt;
        if (s.gagT <= 0 && !s.gag) {
          const opts = s.foot ? ['kick', 'swing', 'kick'] : ['kick', 'wave', 'swing', 'kick', 'wave', 'drop'];
          s.gag = opts[Math.floor(Math.random() * opts.length)];
          s.gagLeft = s.gag === 'kick' ? 1.5 : s.gag === 'wave' ? 1.9 : 0.8;
          s.gagT = 2.2 + Math.random() * 3.6;
          if (s.gag === 'swing') { const i = s.dir * SZ * 0.42; s.x[2] += i * 0.5; s.x[8] += i; s.x[10] += i; s.dir *= -1; }
          if (s.gag === 'drop') { release(s, 'thrown'); s.cool = 1.4; return; }
        }
        if (s.gag === 'kick') { const k = Math.sin(T * 15 + s.seed) * SZ * 0.055; s.x[8] += k; s.x[10] -= k; s.y[8] -= Math.abs(k) * 0.5; s.y[10] -= Math.abs(k) * 0.5; }
        const waving = s.gag === 'wave';
        if (waving) { const hx = s.x[1] + s.dir * SZ * 0.34 + Math.sin(T * 12) * SZ * 0.13, hy = s.y[1] + SZ * 0.05; pull(s, 6, hx, hy, 0.4); }
        for (let it = 0; it < 1; it++) { pinTo(s, 4, ax - SZ * 0.09, ay); if (!waving) pinTo(s, 6, ax + SZ * 0.09, ay); }
      }
    } else if (s.mode === 'sit') {
      const ax = slotX(s.slot), ay = s.slot.y - 1;
      s.gagT -= dt;
      if (s.gagT <= 0 && !s.gag) { s.gag = Math.random() < 0.55 ? 'kick' : 'wave'; s.gagLeft = s.gag === 'kick' ? 1.8 : 1.6; s.gagT = 2 + Math.random() * 4; }
      pinTo(s, 2, ax, ay);
      pull(s, 1, ax - SZ * 0.02, ay - SZ * 0.36, 0.5);
      pull(s, 0, ax - SZ * 0.02, ay - SZ * 0.56, 0.5);
      pull(s, 7, ax + SZ * 0.2, ay + SZ * 0.05, 0.3);
      pull(s, 9, ax - SZ * 0.2, ay + SZ * 0.05, 0.3);
      const swing = s.gag === 'kick' ? Math.sin(T * 11 + s.seed) * SZ * 0.16 : Math.sin(T * 1.7 + s.seed) * SZ * 0.04;
      pull(s, 8, ax + SZ * 0.24 + swing, ay + SZ * 0.28, 0.25);
      pull(s, 10, ax - SZ * 0.24 - swing, ay + SZ * 0.28, 0.25);
      pull(s, 4, ax - SZ * 0.2, ay - SZ * 0.05, 0.2);
      if (s.gag === 'wave') pull(s, 6, ax + SZ * 0.26 + Math.sin(T * 12) * SZ * 0.09, ay - SZ * 0.58, 0.4);
      else pull(s, 6, ax + SZ * 0.2, ay - SZ * 0.05, 0.2);
    } else if (s.mode === 'thrown') {
      if (s.t > 1.15) { s.mode = 'ride'; s.t = 0; s.u = centerU(s.y[2]); }
    }
    // Varillas
    const iters = 4;
    for (let it = 0; it < iters; it++) {
      for (const [a, b, l] of B) {
        const dx = s.x[b] - s.x[a], dy = s.y[b] - s.y[a], d = Math.hypot(dx, dy) || 0.001, e = (d - l * SZ) / d * 0.5;
        s.x[a] += dx * e; s.y[a] += dy * e; s.x[b] -= dx * e; s.y[b] -= dy * e;
      }
      if (s.mode === 'hang') {
        const ax = s.foot ? s.foot.s.x[s.foot.k] : slotX(s.slot), ay = s.foot ? s.foot.s.y[s.foot.k] : s.slot.y;
        pinTo(s, 4, ax - SZ * 0.09, ay);
        if (s.gag !== 'wave') pinTo(s, 6, ax + SZ * 0.09, ay);
      } else if (s.mode === 'sit') pinTo(s, 2, slotX(s.slot), s.slot.y - 1);
      // La cabeza siempre va sobre el cuello y las piernas no se pegan.
      const hk = s.mode === 'thrown' ? (drag && drag.s === s ? 0.12 : 0.08) : 0.55;
      pull(s, 0, s.x[1], s.y[1] - SZ * 0.2, hk);
      if (s.mode !== 'sit') { apart(s, 7, 9, 0.13); apart(s, 8, 10, 0.2); }
      if (drag && drag.s === s) pinTo(s, drag.k, pointer.x, pointer.y + curS);
    }
    if (s.mode === 'thrown') {
      const floor = curS + H - 3;
      for (let k = 0; k < 11; k++) {
        if (s.y[k] > floor) { const v = s.y[k] - s.oy[k]; s.y[k] = floor; s.oy[k] = floor + v * 0.45; s.ox[k] = s.x[k] - (s.x[k] - s.ox[k]) * 0.7; }
        if (s.x[k] < 2) { s.x[k] = 2; s.ox[k] = 2; } else if (s.x[k] > W - 2) { s.x[k] = W - 2; s.ox[k] = W - 2; }
      }
    }
  };
  // Busca dónde colgarse o sentarse dentro de la pantalla.
  const assign = (sy) => {
    const free = (s) => s.mode === 'ride' && s.cool <= 0 && s.a > 0.9 && !s.gone;
    sticks.forEach((s) => {
      if (!free(s)) return;
      const opts = slots.filter((o) => !o.by && o.y > sy + H * 0.1 && o.y < sy + H * 0.72);
      if (opts.length) {
        const o = opts[Math.floor(Math.random() * opts.length)];
        o.by = s; s.slot = o; s.mode = o.type === 'sit' ? 'sit' : 'reach'; s.t = 0; s.gagT = 1.2 + Math.random() * 3;
        return;
      }
      // Sin lugar libre, se agarra del pie de otro.
      const host = sticks.find((o) => o !== s && o.mode === 'hang' && !o.foot && o.slot && o.slot.el.matches('.work h2') && !sticks.some((x) => x.foot && x.foot.s === o));
      if (host && host.y[8] > sy && host.y[8] < sy + H && Math.random() < 0.45) { s.foot = { s: host, k: Math.random() < 0.5 ? 8 : 10 }; s.mode = 'reach'; s.t = 0; s.gagT = 2 + Math.random() * 3; }
      else s.cool = 0.8;
    });
    sticks.forEach((s) => {
      if (s.slot && (s.slot.y < sy - 70 || s.slot.y > sy + H + 70)) release(s);
      if (s.foot && s.foot.s.mode !== 'hang') release(s, 'thrown');
    });
  };

  let curS = scrollY;
  addEventListener('scroll', () => { curS = scrollY; }, { passive: true });
  let uNow = 0, flow = 0, lastS = curS, vel = 0, last = 0, raf = 0, frames = 0, slow = 0, t0 = 0, assignT = 0, stopped = stored;
  const inDark = (y) => dark.some(([a, b]) => y >= a && y < b);
  const draw = (now) => {
    raf = 0;
    if (stopped || document.hidden || root.classList.contains('show-on')) return;
    raf = requestAnimationFrame(draw);
    const dtMs = Math.max(0, Math.min(now - last, 50)); last = now;
    if (!railReady || !dtMs) return;
    const dt = dtMs / 1000, sy = curS, dS = sy - lastS; lastS = sy;
    vel += (dS / dt - vel) * (1 - Math.exp(-dt / 0.12));
    const speed = clamp(Math.abs(vel) / 2600), T = (now - t0) / 1000;
    frames++; if (dtMs > 26) slow++;
    // Si el equipo sufre, primero baja la resolución del lienzo y después la cantidad de puntos.
    if (frames >= 60) { if (slow > 24) { if (density > 1) { density = 1; applyDensity(); } else if (limit > 90) limit = Math.round(limit * 0.75); } frames = 0; slow = 0; }
    ctx.clearRect(0, 0, W, H);

    // La corriente: dots fijos a la página, que avanzan con la velocidad del scroll.
    uNow += (centerU(sy + H * 0.5) - uNow) * (1 - Math.exp(-dt / 0.22));
    flow += dt * (24 + vel * 0.42);
    const Lw = H * 2 + W * 1.2, u0 = uNow - Lw / 2, width = (W < 600 ? 7 : 15) * (1 - speed * 0.72) + 2;
    const rel1 = sy / (H * 0.32), end1 = (sy - (maxS - H * 0.55)) / (H * 0.5), trail = speed > 0.1 ? speed * 20 : 0;
    ctx.fillStyle = COBALT;
    const streak = [new Path2D(), new Path2D()];
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
            const k = u < 0 ? 0 : u >= Ltot ? nPath - 1 : Math.floor(u / step);
            const o = p.off * width * (0.7 + 0.3 * Math.sin(T * p.w + p.f));
            const fx = X[k] + NX[k] * o, fy = Y[k] + NY[k] * o;
            let fa = Math.min(1, rel / 150, (Lw - rel) / 150);
            if (u < 0 || u >= Ltot) fa = 0;
            x += (fx - x) * ri; y += (fy - y) * ri; al = al + (fa * (0.45 + p.o * 0.55) - al) * ri;
            if (trail) { p.tx = TX[k]; p.ty = TY[k]; }
          }
          const ei = smooth(clamp((end1 - p.d) / 0.5));
          if (ei > 0) {
            const a2 = p.f + T * p.v * 0.7, q = 1 + p.sp * 0.4;
            x += (end.x + Math.cos(a2) * end.rx * q - x) * ei; y += (end.y + Math.sin(a2) * end.ry * q - y) * ei; al += (0.35 + p.o * 0.6 - al) * ei;
          }
          // El cursor abre un espacio entre los puntos.
          let sx = x, sy2 = y - sy;
          if (pointer.on) {
            const dx = sx - pointer.x, dy = sy2 - pointer.y, d2 = dx * dx + dy * dy;
            if (d2 < 14400) { const d = Math.sqrt(d2) || 1, f = (120 - d) / 120 * 30; sx += dx / d * f; sy2 += dy / d * f; }
          }
          p.px = sx; p.py = sy2; p.al = al; p.w8 = inDark(y) ? 1 : 0;
        }
        if (p.w8 !== pass || p.al < 0.02 || p.py < -10 || p.py > H + 10) continue;
        ctx.globalAlpha = p.al;
        ctx.fillRect(p.px, p.py, p.s, p.s);
        if (trail && p.tx !== undefined && rel1 > 1.2) { streak[pass].moveTo(p.px, p.py); streak[pass].lineTo(p.px - p.tx * trail * Math.sign(vel || 1), p.py - p.ty * trail * Math.sign(vel || 1)); }
      }
    }
    if (trail) {
      ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
      ctx.strokeStyle = COBALT; ctx.stroke(streak[0]);
      ctx.strokeStyle = WHITE; ctx.stroke(streak[1]);
    }
    ctx.globalAlpha = 1;

    // Palitos
    const wantAlive = sy > H * 0.16;
    if (wantAlive && sticks.length < STICKS && T - (sticks.lastAt || 0) > 0.28) {
      const i = sticks.length, u = clamp(uNow + (i - (STICKS - 1) / 2) * H * 0.2, 0, Ltot - 1), k = Math.floor(u / step), s = newStick(X[k], Y[k], i);
      s.u = u; sticks.push(s); sticks.lastAt = T;
    }
    assignT -= dt;
    if (assignT <= 0) { assignT = 0.25; assign(sy); }
    const paths = [new Path2D(), new Path2D()], heads = [new Path2D(), new Path2D()];
    let anyAlpha = 1;
    for (const s of sticks) {
      s.cool -= dt;
      s.gone = !wantAlive && sy < H * 0.09;
      s.a = clamp(s.a + dt * (s.gone ? -3.4 : 2.8));
      if (s.gone && s.slot) release(s);
      updateStick(s, dt, dS, T);
      if (s.a <= 0) continue;
      anyAlpha = Math.min(anyAlpha, s.a);
      const c = inDark(s.y[2]) ? 1 : 0, q = paths[c], y = (k) => s.y[k] - sy;
      if (y(2) < -60 || y(2) > H + 60) continue;
      q.moveTo(s.x[1], y(1)); q.lineTo(s.x[2], y(2));
      q.moveTo(s.x[4], y(4)); q.lineTo(s.x[3], y(3)); q.lineTo(s.x[1], y(1)); q.lineTo(s.x[5], y(5)); q.lineTo(s.x[6], y(6));
      q.moveTo(s.x[8], y(8)); q.lineTo(s.x[7], y(7)); q.lineTo(s.x[2], y(2)); q.lineTo(s.x[9], y(9)); q.lineTo(s.x[10], y(10));
      const hr = SZ * 0.105;
      heads[c].moveTo(s.x[0] + hr, y(0)); heads[c].arc(s.x[0], y(0), hr, 0, 6.2832);
    }
    if (sticks.length) {
      ctx.lineWidth = Math.max(1.6, SZ * 0.048); ctx.globalAlpha = anyAlpha;
      ctx.strokeStyle = COBALT; ctx.fillStyle = COBALT; ctx.stroke(paths[0]); ctx.fill(heads[0]);
      ctx.strokeStyle = WHITE; ctx.fillStyle = WHITE; ctx.stroke(paths[1]); ctx.fill(heads[1]);
      ctx.globalAlpha = 1;
    }
  };
  const go = () => { if (!raf && !stopped && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); } };

  // Se pueden agarrar y lanzar. En el celular, un toque los hace saltar.
  const hit = (cx, cy) => {
    let best = null, bd = 18 * 18;
    for (const s of sticks) for (let k = 0; k < 11; k++) { const dx = s.x[k] - cx, dy = s.y[k] - curS - cy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { s, k }; } }
    return best;
  };
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.on = e.pointerType === 'mouse';
    if (fine && !drag) document.body.classList.toggle('flow-grab', !!hit(e.clientX, e.clientY));
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.on = false; });
  let swallow = false;
  addEventListener('pointerdown', (e) => {
    if (stopped) return;
    const h = hit(e.clientX, e.clientY);
    if (!h) return;
    if (e.pointerType === 'touch') { release(h.s, 'thrown'); for (let k = 0; k < 11; k++) { h.s.oy[k] = h.s.y[k] + SZ * 0.28; h.s.ox[k] = h.s.x[k] + (Math.random() - 0.5) * SZ * 0.25; } return; }
    e.preventDefault(); e.stopPropagation();
    release(h.s, 'thrown'); drag = h; h.s.t = -99; swallow = true;
    document.body.classList.add('flow-drag');
  }, { capture: true });
  addEventListener('pointerup', () => {
    if (!drag) return;
    drag.s.t = 0; drag = null;
    document.body.classList.remove('flow-drag');
    setTimeout(() => { swallow = false; }, 0);
  });
  addEventListener('click', (e) => { if (swallow) { e.preventDefault(); e.stopPropagation(); swallow = false; } }, { capture: true });

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
  const start = () => { curS = scrollY; lastS = curS; measure(); uNow = centerU(curS + H * 0.5); go(); };
  (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(start);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(() => { if (railReady) measure(); }, 80));
  addEventListener('load', () => setTimeout(() => { if (railReady) measure(); }, 120));
  let rt, rw = innerWidth, rh = innerHeight;
  addEventListener('resize', () => {
    if (innerWidth === rw && Math.abs(innerHeight - rh) < 140) return; // la barra del celular no reinicia nada
    rw = innerWidth; rh = innerHeight;
    clearTimeout(rt); rt = setTimeout(measure, 200);
  });
  document.addEventListener('visibilitychange', go);
  addEventListener('show-end', go);
})();
