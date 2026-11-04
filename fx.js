(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hero = document.querySelector('.hero');

  // Las letras grandes se arman una por una y reaccionan al cursor.
  function split(host) {
    const holder = host.firstElementChild;
    const text = holder.textContent;
    if (host.tagName === 'H1') host.setAttribute('aria-label', text);
    else host.setAttribute('aria-label', 'Escribir a ' + text);
    holder.setAttribute('aria-hidden', 'true');
    holder.replaceChildren(...[...text].map((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ltr';
      s.style.setProperty('--i', i);
      s.textContent = ch;
      return s;
    }));
    return [...holder.children].map((el) => ({ el, v: 0, x: 0, y: 0 }));
  }
  function wave(host, zone, letters, activeColor) {
    let mx = -9999, my = -9999, running = false, size = 0, measured = false;
    const measure = () => {
      size = parseFloat(getComputedStyle(host).fontSize);
      letters.forEach((l) => {
        const r = l.el.getBoundingClientRect();
        l.x = r.left + r.width / 2 + scrollX; l.y = r.top + r.height / 2 + scrollY;
      });
      measured = true;
    };
    const frame = () => {
      let moving = false;
      letters.forEach((l) => {
        const d = Math.hypot(mx + scrollX - l.x, my + scrollY - l.y);
        const target = Math.exp(-((d / (size * 0.95)) ** 2));
        l.v += (target - l.v) * 0.16;
        if (Math.abs(target - l.v) > 0.002) moving = true;
        l.el.style.transform = l.v < 0.003 ? '' : `translateY(${-size * 0.09 * l.v}px) scaleY(${1 + 0.2 * l.v})`;
        l.el.style.color = l.v > 0.45 ? activeColor : '';
      });
      running = moving;
      if (moving) requestAnimationFrame(frame);
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    zone.addEventListener('pointerenter', () => { measured = false; });
    zone.addEventListener('pointermove', (e) => { if (!measured) measure(); mx = e.clientX; my = e.clientY; kick(); });
    zone.addEventListener('pointerleave', () => { mx = my = -9999; kick(); });
    addEventListener('resize', () => { measured = false; });
  }
  const h1 = document.getElementById('name');
  const mail = document.getElementById('mail');
  const nameLetters = split(h1), mailLetters = split(mail);
  dispatchEvent(new Event('resize'));
  if (fine && !calm) {
    wave(h1, hero, nameLetters, 'var(--cobalt)');
    wave(mail, document.getElementById('contacto'), mailLetters, '#c9d0ff');
  }

  // Los títulos aparecen al llegar a ellos.
  if (!calm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); e.target.classList.remove('pre'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.work h2,.exp h2,.ask h2,.stack-s h2,.mail').forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pre'); io.observe(el); }
    });
  }

  // La función de 15 segundos: un solo canvas y una sola línea de tiempo.
  // Todo sale del tiempo T, así que no depende de los FPS y se puede saltar o repetir.
  const tw = document.getElementById('tw');
  const cv = document.getElementById('tw-canvas');
  const ctx = cv.getContext('2d', { alpha: false });
  const fill = document.getElementById('tw-fill'), foot = document.getElementById('tw-foot');
  const skip = document.getElementById('tw-skip'), sr = document.getElementById('tw-sr');
  const root = document.documentElement;

  const COB = [36, 56, 232], INK = [18, 26, 43], PAP = [244, 246, 248], WHT = [255, 255, 255], SOFT = [169, 180, 255];
  const END = 15.3;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const map = (t, a, b) => clamp((t - a) / (b - a));
  const out4 = (t) => 1 - (1 - t) ** 4;
  const inOut = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - ((-2 * t + 2) ** 4) / 2);
  const back = (t) => { const u = t - 1; return 1 + 2.4 * u ** 3 + 1.4 * u ** 2; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const font = (px, w = 700) => `condensed ${w} ${px}px "Instrument Sans", Inter, system-ui, sans-serif`;

  let W = 0, H = 0, D = 1, L = null, T = 0, last = 0, raf = 0, ended = false, nextEvent = 0;
  let frames = 0, slowSum = 0;

  // Partículas: arreglos planos, posición calculada solo desde el tiempo.
  const MAX = 1800;
  const fx = new Float32Array(MAX), fy = new Float32Array(MAX), tx = new Float32Array(MAX), ty = new Float32Array(MAX);
  const px = new Float32Array(MAX), py = new Float32Array(MAX), delay = new Float32Array(MAX);
  const swirl = new Float32Array(MAX), phase = new Float32Array(MAX), size = new Float32Array(MAX);
  for (let i = 0; i < MAX; i++) { delay[i] = Math.random(); swirl[i] = (Math.random() - 0.5) * 2; phase[i] = Math.random() * 6.28; size[i] = 1.3 + Math.random() * 1.5; }
  let active = 0, pStart = 0, pDur = 1, pSpread = 0, pSwirl = 0;

  function retarget(pts, dur, spread, sw) {
    for (let i = 0; i < active; i++) { fx[i] = px[i]; fy[i] = py[i]; tx[i] = pts[i * 2]; ty[i] = pts[i * 2 + 1]; }
    pStart = T; pDur = dur; pSpread = spread; pSwirl = sw;
  }
  function teleport(pts) {
    for (let i = 0; i < active; i++) { fx[i] = tx[i] = px[i] = pts[i * 2]; fy[i] = ty[i] = py[i] = pts[i * 2 + 1]; }
    pStart = -9; pDur = 1; pSpread = 0; pSwirl = 0;
  }
  function particles(alpha, color) {
    const c = Math.cos, s = Math.sin, shimmer = T > 14 ? 0.8 : 1.1;
    const rot = T > 15 ? (T - 15) * 0.2 : 0, cr = c(rot), sr2 = s(rot);
    const cx = L ? L.end.cx : 0, cy = L ? L.end.cy : 0, dot = W > 900 ? 1.3 : 1;
    if (alpha > 0.01) ctx.fillStyle = rgba(color, alpha);
    for (let i = 0; i < active; i++) {
      const e = inOut(clamp((T - pStart - delay[i] * pSpread) / pDur));
      const bend = s(e * 3.1416) * swirl[i] * pSwirl;
      const dx = tx[i] - fx[i], dy = ty[i] - fy[i];
      const x = fx[i] + dx * e - dy * bend, y = fy[i] + dy * e + dx * bend;
      px[i] = x; py[i] = y;
      if (alpha <= 0.01) continue;
      let X = x + s(T * 1.4 + phase[i]) * shimmer, Y = y + c(T * 1.1 + phase[i]) * shimmer;
      if (rot) { const ox = X - cx, oy = Y - cy; X = cx + ox * cr - oy * sr2; Y = cy + ox * sr2 + oy * cr; }
      const q = size[i] * dot;
      ctx.fillRect(X, Y, q, q);
    }
  }

  // Medición y texto
  function fit(lines, maxW, maxH, w = 700) {
    ctx.font = font(100, w);
    const width = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const p = Math.min((100 * maxW) / width, maxH / (lines.length * 1.06));
    return { lines, px: p, font: font(p, w), lh: p * 1.06, h: p * 1.06 * lines.length, x: W / 2, y: H / 2 };
  }
  function put(c, o, dy = 0) {
    c.font = o.font;
    o.lines.forEach((l, i) => c.fillText(l, o.x, o.y + dy + (i - (o.lines.length - 1) / 2) * o.lh));
  }
  function maskOf(painters) {
    const s = 0.34, m = document.createElement('canvas');
    m.width = Math.ceil(W * s); m.height = Math.ceil(H * s);
    const c = m.getContext('2d', { willReadFrequently: true });
    c.scale(s, s); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
    painters(c);
    const d = c.getImageData(0, 0, m.width, m.height).data, w = m.width, h = m.height, ink = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 120) ink.push(x / s, y / s);
    const pts = new Float32Array(MAX * 2), n = ink.length / 2;
    for (let i = 0; i < MAX; i++) {
      const k = n ? Math.floor(Math.random() * n) : 0;
      pts[i * 2] = n ? ink[k * 2] + Math.random() * 2 : W / 2; pts[i * 2 + 1] = n ? ink[k * 2 + 1] + Math.random() * 2 : H / 2;
    }
    // Punto macizo para entrar con la cámara dentro de una letra.
    let best = { x: W / 2, y: H / 2, r: 4 }, score = -1;
    const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 200;
    for (let i = 0; i < ink.length; i += 8) {
      const x = Math.round(ink[i] * s), y = Math.round(ink[i + 1] * s);
      let r = 1;
      while (r < 40 && at(x + r, y) && at(x - r, y) && at(x, y + r) && at(x, y - r)) r++;
      const v = r * 6 - Math.hypot(x - w / 2, y - h / 2) * 0.12;
      if (v > score) { score = v; best = { x: x / s, y: y / s, r: r / s }; }
    }
    return { pts, focus: best };
  }
  function scatter(margin = 0.06) {
    const p = new Float32Array(MAX * 2);
    for (let i = 0; i < MAX; i++) { p[i * 2] = lerp(-W * margin, W * (1 + margin), Math.random()); p[i * 2 + 1] = lerp(-H * margin, H * (1 + margin), Math.random()); }
    return p;
  }
  const REEL = ['Angular', 'React', 'Flutter', 'Node.js', 'Rust', '', 'Web', 'Móvil', 'Escritorio'];
  const photo = new Image();
  photo.src = 'images/foto-perfil.webp';

  // Red de agentes: geometría propia para que las letras sean nítidas.
  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function segDist(px0, py0, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, t = clamp(((px0 - ax) * dx + (py0 - ay) * dy) / (dx * dx + dy * dy || 1));
    return Math.hypot(px0 - ax - dx * t, py0 - ay - dy * t);
  }
  function buildNet(h, cx, cy) {
    const iw = 0.25 * h, gap = 0.14 * h, aw = 0.86 * h, total = iw + gap + aw;
    const x0 = cx - total / 2, y0 = cy - h / 2, ax = x0 + iw + gap;
    const a = (u, v) => [ax + u * h, y0 + v * h];
    const mid = aw / h / 2, top = 0.115, foot = 0.27, apex = 0.2, barT = 0.56, barB = 0.72;
    // Borde interno de cada pierna: de la base hasta el vértice interno.
    const innerL = (v) => foot + ((mid - foot) * (1 - v)) / (1 - apex);
    const innerR = (v) => aw / h - innerL(v);
    const I = [[x0, y0], [x0 + iw, y0], [x0 + iw, y0 + h], [x0, y0 + h]];
    const Aout = [a(0, 1), a(mid - top, 0), a(mid + top, 0), a(aw / h, 1), a(aw / h - foot, 1), a(innerR(barB), barB), a(innerL(barB), barB), a(foot, 1)];
    const Ahole = [a(mid, apex), a(innerR(barT), barT), a(innerL(barT), barT)];
    const loops = [I, Aout, Ahole];
    const s = h / (W < 600 ? 10 : 12);
    const X = [], Y = [], edges = [], rim = [];
    const add = (x, y) => { X.push(x); Y.push(y); return X.length - 1; };
    // Contorno: nodos parejos y siempre uno en cada vértice.
    loops.forEach((loop) => {
      const first = X.length;
      loop.forEach(([xa, ya], i) => {
        const [xb, yb] = loop[(i + 1) % loop.length], len = Math.hypot(xb - xa, yb - ya), n = Math.max(1, Math.round(len / s));
        for (let k = 0; k < n; k++) add(xa + ((xb - xa) * k) / n, ya + ((yb - ya) * k) / n);
      });
      const last = X.length - 1;
      for (let i = first; i <= last; i++) { const j = i === last ? first : i + 1; edges.push([i, j]); rim.push([i, j]); }
    });
    const rimCount = X.length;
    // Malla interior en triángulos, alejada del borde.
    const inside = (x, y) => inPoly(x, y, I) || (inPoly(x, y, Aout) && !inPoly(x, y, Ahole));
    const clear = (x, y) => loops.every((loop) => loop.every(([xa, ya], i) => { const [xb, yb] = loop[(i + 1) % loop.length]; return segDist(x, y, xa, ya, xb, yb) > s * 0.42; }));
    const rowH = s * 0.866;
    for (let r = 0, y = y0 + s * 0.5; y < y0 + h; y += rowH, r++) {
      for (let x = x0 + (r % 2 ? s / 2 : 0); x < x0 + total; x += s) if (inside(x, y) && clear(x, y)) add(x, y);
    }
    // Conexiones de la malla, solo si la línea queda dentro de la letra.
    const count = X.length, maxD = s * 1.22;
    for (let i = 0; i < count; i++) for (let j = Math.max(i + 1, rimCount); j < count; j++) {
      const d = Math.hypot(X[i] - X[j], Y[i] - Y[j]);
      if (d < maxD && inside((X[i] + X[j]) / 2 , (Y[i] + Y[j]) / 2)) edges.push([i, j]);
    }
    // Tres puentes unen la I con la A: una sola red.
    [0.32, 0.58, 0.84].forEach((v) => {
      const yb = y0 + v * h, near = (test) => { let best = 0, bd = 1e9; for (let i = 0; i < rimCount; i++) if (test(X[i])) { const d = Math.abs(Y[i] - yb) + Math.abs(X[i] - (x0 + iw + gap * 0.5)) * 0.5; if (d < bd) { bd = d; best = i; } } return best; };
      edges.push([near((x) => x <= x0 + iw + 1), near((x) => x >= ax - 1)]);
    });
    // Distancia de cada nodo al origen, siguiendo las conexiones.
    const adj = Array.from({ length: count }, () => []);
    edges.forEach(([a1, b1]) => { adj[a1].push(b1); adj[b1].push(a1); });
    const hop = new Float32Array(count).fill(-1), queue = [0];
    hop[0] = 0;
    for (let q = 0; q < queue.length; q++) adj[queue[q]].forEach((n) => { if (hop[n] < 0) { hop[n] = hop[queue[q]] + 1; queue.push(n); } });
    let far = 1;
    for (let i = 0; i < count; i++) { if (hop[i] < 0) hop[i] = 0; if (hop[i] > far) far = hop[i]; }
    for (let i = 0; i < count; i++) hop[i] /= far;
    const sx = new Float32Array(count), sy = new Float32Array(count), ph = new Float32Array(count), st = new Float32Array(count);
    for (let i = 0; i < count; i++) { sx[i] = Math.random() * W; sy[i] = Math.random() * H; ph[i] = Math.random() * 6.283; st[i] = Math.random(); }
    return { count, X, Y, edges, rim, loops, hop, sx, sy, ph, st, nx: new Float32Array(count), ny: new Float32Array(count), arrive: new Float32Array(count), lit: new Float32Array(count) };
  }
  const PULSES = [[10.85, 11.22], [11.36, 11.72], [11.62, 11.98]];
  function drawNet() {
    const n = L.net, lite = active < 650;
    for (let i = 0; i < n.count; i++) {
      const a = T <= 10.35 ? 0 : inOut(clamp((T - 10.35 - n.st[i] * 0.18) / 0.32));
      n.arrive[i] = a;
      const dx = n.sx[i] + Math.sin(T * 1.1 + n.ph[i]) * 34, dy = n.sy[i] + Math.cos(T * 0.9 + n.ph[i]) * 26;
      n.nx[i] = dx + (n.X[i] - dx) * a; n.ny[i] = dy + (n.Y[i] - dy) * a;
      let l = 0;
      for (const [s0, s1] of PULSES) {
        if (T < s0 || T > s1 + 0.12) continue;
        const front = ((T - s0) / (s1 - s0)) * 1.2 - 0.1, g = (n.hop[i] - front) / 0.075;
        l = Math.max(l, Math.exp(-g * g));
      }
      n.lit[i] = l;
    }
    const out = T > 12 ? 1 - map(T, 12, 12.2) : 1;
    // Líneas: un path por brillo.
    const faint = [new Path2D(), new Path2D(), new Path2D()], signal = new Path2D();
    n.edges.forEach(([a1, b1]) => {
      const o = Math.min(n.arrive[a1], n.arrive[b1]);
      if (o < 0.55) return;
      if (lite && a1 >= n.rim.length && b1 >= n.rim.length && !(n.lit[a1] || n.lit[b1])) return;
      const path = n.lit[a1] > 0.4 || n.lit[b1] > 0.4 ? signal : faint[o < 0.72 ? 0 : o < 0.9 ? 1 : 2];
      path.moveTo(n.nx[a1], n.ny[a1]); path.lineTo(n.nx[b1], n.ny[b1]);
    });
    ctx.lineWidth = 1;
    [0.1, 0.2, 0.34].forEach((al, i) => { ctx.strokeStyle = rgba([127, 141, 255], al * out); ctx.stroke(faint[i]); });
    ctx.strokeStyle = rgba(SOFT, 0.95 * out); ctx.lineWidth = 1.5; ctx.stroke(signal);
    // Resolución: el contorno se enciende de golpe y queda nítido.
    const solved = map(T, 11.2, 11.3);
    if (solved > 0) {
      const shape = new Path2D();
      n.loops.forEach((loop) => { loop.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y))); shape.closePath(); });
      const flash = T < 11.4 ? Math.sin(map(T, 11.2, 11.4) * 3.1416) * 0.24 : 0;
      if (flash > 0) { ctx.fillStyle = rgba(SOFT, flash); ctx.fill(shape, 'evenodd'); }
      ctx.strokeStyle = rgba(WHT, solved * 0.92 * out); ctx.lineWidth = 1.6; ctx.stroke(shape);
    }
    if (T >= 12) return; // desde acá siguen las partículas
    // Nodos
    const fade = map(T, 10, 10.2), breath = 1 + Math.sin(T * 3.2) * 0.06;
    const base = new Path2D(), hot = new Path2D();
    for (let i = 0; i < n.count; i++) {
      const lit = n.lit[i], r = (i < n.rim.length ? 1.9 : 1.5) * (1 + lit * 0.9) * breath, p = lit > 0.25 ? hot : base;
      p.moveTo(n.nx[i] + r, n.ny[i]); p.arc(n.nx[i], n.ny[i], r, 0, 6.2832);
    }
    ctx.fillStyle = rgba(WHT, 0.74 * fade); ctx.fill(base);
    ctx.fillStyle = rgba(WHT, fade); ctx.fill(hot);
  }

  function prepare() {
    const narrow = W < 600;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = fit(['Full Stack'], W * 0.9, H * 0.36); fs.y = H * 0.46;
    const fs2 = fit(['+4 años en producción'], W * 0.8, H * 0.07); fs2.y = fs.y + fs.px * 0.62 + fs2.px * 0.55;
    const reel = fit(['Escritorio'], W * 0.84, H * 0.21);
    const rh = reel.px * 1.14;
    const miles = fit(narrow ? ['Miles de', 'personas'] : ['Miles de personas'], W * 0.88, H * 0.38); miles.y = H * 0.45;
    const miles2 = fit(['usan mis apps cada día'], W * 0.8, H * 0.07); miles2.y = miles.y + miles.h / 2 + miles2.px * 0.75;
    const netH = Math.min(H * 0.44, W * 0.66), netY = H * 0.41;
    const ia2 = fit(['Dirijo agentes de IA'], W * 0.82, H * 0.08); ia2.y = Math.min(netY + netH / 2 + ia2.px * 1.05, H * 0.86);
    const l1 = fit(narrow ? ['Cofundé una fábrica', 'de software'] : ['Cofundé una fábrica de software'], W * 0.86, H * 0.17);
    const l2 = fit(narrow ? ['y respondo por', 'cada entrega'] : ['y respondo por cada entrega'], W * 0.86, H * 0.17);
    const gap = Math.max(l1.px, l2.px) * 0.55, total = l1.h + l2.h + gap;
    l1.y = H / 2 - total / 2 + l1.h / 2; l2.y = H / 2 + total / 2 - l2.h / 2;

    // Cierre
    const bottom = narrow ? 150 : 104, area = H - bottom - 56;
    const dia = Math.min(area * 0.42, W * 0.42, 190), rad = dia / 2;
    const name = fit(['Naser Fernández'], W * 0.88, Math.min(area * 0.2, 120));
    const role = fit(['Full Stack Developer en Asunción, Paraguay'], W * 0.86, 26, 500);
    const ringOuter = rad * 1.46, stack = ringOuter * 2 + name.px * 1.15 + role.px * 1.7;
    const top = 56 + (area - stack) / 2, cy = top + ringOuter;
    name.y = top + ringOuter * 2 + name.px * 0.68; role.y = name.y + name.px * 0.52 + role.px * 0.9;
    const ring = new Float32Array(MAX * 2);
    for (let i = 0; i < MAX; i++) {
      const a = Math.random() * 6.2832, r = rad * (1.2 + Math.random() * Math.random() * 0.26);
      ring[i * 2] = W / 2 + Math.cos(a) * r; ring[i * 2 + 1] = cy + Math.sin(a) * r;
    }
    const portrait = document.createElement('canvas');
    portrait.width = portrait.height = Math.ceil(dia * D);
    if (photo.complete && photo.naturalWidth) {
      const c = portrait.getContext('2d');
      c.beginPath(); c.arc(portrait.width / 2, portrait.width / 2, portrait.width / 2, 0, 6.3); c.clip();
      c.imageSmoothingQuality = 'high';
      c.drawImage(photo, 0, 0, portrait.width, portrait.width);
    }
    const wme = maskOf((c) => {
      c.font = reel.font;
      [6, 7, 8].forEach((i) => c.fillText(REEL[i], W / 2, H / 2 + (i - 7) * rh));
    });
    L = {
      fs, fs2, reel, rh, miles, miles2, ia2, l1, l2, name, role, dia, ring, portrait,
      end: { cx: W / 2, cy },
      mFs: maskOf((c) => put(c, fs)), mWme: wme, mMiles: maskOf((c) => put(c, miles)),
      fx: [], stage: null, net: buildNet(netH, W / 2, netY), mL1: maskOf((c) => put(c, l1)), stars: scatter(), crowd: scatter(0.02),
    };
    active = W < 600 ? 900 : MAX;
  }
  function sizeCanvas() {
    W = innerWidth; H = innerHeight;
    D = Math.min(devicePixelRatio || 1, innerWidth >= 1200 ? 1.5 : 1.75);
    D = Math.min(D, Math.sqrt(3400000 / (W * H))); // tope de píxeles para que ande en cualquier equipo
    cv.width = Math.round(W * D); cv.height = Math.round(H * D);
    if ('textRendering' in ctx) ctx.textRendering = 'geometricPrecision';
    if ('fontKerning' in ctx) ctx.fontKerning = 'normal';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }

  // Dibujo
  const base = () => ctx.setTransform(D, 0, 0, D, 0, 0);
  const paint = (c) => { ctx.fillStyle = rgba(c); ctx.fillRect(0, 0, W, H); };
  function text(o, color, alpha, { scale = 1, dy = 0 } = {}) {
    if (alpha <= 0.004) return;
    ctx.fillStyle = rgba(color, alpha);
    if (scale !== 1) {
      ctx.setTransform(D * scale, 0, 0, D * scale, D * W / 2 * (1 - scale), D * o.y * (1 - scale));
      put(ctx, o, dy); base();
    } else put(ctx, o, dy);
  }
  function diveInto(o, focus, color, push, z) { // la cámara entra en una letra hasta llenar la pantalla
    const maxS = Math.min((Math.hypot(W, H) / Math.max(focus.r, 4)) * 1.3, 140);
    const s = push * Math.exp(Math.log(maxS) * z * z * z);
    const k = z * z, cx = lerp(focus.x, W / 2, k), cy = lerp(focus.y, H / 2, k);
    ctx.fillStyle = rgba(color);
    ctx.setTransform(D * s, 0, 0, D * s, D * (cx - focus.x * s), D * (cy - focus.y * s));
    put(ctx, o); base();
  }
  function iris(color, t) {
    if (t <= 0) return;
    ctx.fillStyle = rgba(color);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.hypot(W, H) * 0.56 * t, 0, 6.3); ctx.fill();
  }
  function reelPos(t) {
    const u = (t - 2.85) / 0.48, i = Math.floor(u);
    if (i < 0) return -1.2;
    if (i < 5) return lerp(i === 0 ? -1.2 : i - 1, i, out4(map(u - i, 0, 0.55)));
    return 4 + 3 * inOut(map(t, 5.25, 5.85));
  }
  // Luces del carrete. Escenario, palabras, halos y reflejos se generan una sola vez;
  // en cada cuadro solo se copian, así el brillo casi no cuesta nada.
  const makeLayer = (cw, ch, opts) => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(cw); c.height = Math.ceil(ch);
    const x = c.getContext('2d', opts);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    return [c, x];
  };
  function reelStage() {
    if (L.stage) return L.stage;
    const px = L.reel.px, floor = H / 2 + px * 0.38, extra = L.rh + 4;
    const [c, x] = makeLayer(W * D, (H + extra) * D, { alpha: false });
    x.scale(D, D);
    x.fillStyle = rgba(PAP); x.fillRect(0, 0, W, H + extra);
    const back = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.56);
    back.addColorStop(0, rgba(COB, 0.1)); back.addColorStop(0.5, rgba(COB, 0.028)); back.addColorStop(1, rgba(COB, 0));
    x.fillStyle = back; x.fillRect(0, 0, W, H + extra);
    const fl = x.createLinearGradient(0, floor, 0, Math.min(H, floor + H * 0.34));
    fl.addColorStop(0, 'rgba(196,204,222,.42)'); fl.addColorStop(1, 'rgba(196,204,222,0)');
    x.fillStyle = fl; x.fillRect(0, floor, W, H + extra - floor);
    const hw = Math.min(W * 0.46, W * 0.2 + px * 1.3), line = x.createLinearGradient(W / 2 - hw, 0, W / 2 + hw, 0);
    line.addColorStop(0, rgba(COB, 0)); line.addColorStop(0.5, rgba(COB, 0.4)); line.addColorStop(1, rgba(COB, 0));
    x.fillStyle = line; x.fillRect(W / 2 - hw, floor - 0.75, hw * 2, 1.5);
    L.stage = c;
    return c;
  }
  function reelFx(i) {
    const word = REEL[i];
    if (!word || L.fx[i]) return L.fx[i];
    const px = L.reel.px;
    ctx.font = L.reel.font;
    const tw = ctx.measureText(word).width, tallH = px * 1.4, tallW = tw + px * 0.2;
    const paintWord = (fill) => {
      const [c, x] = makeLayer(tallW * D, tallH * D);
      x.font = font(px * D); x.fillStyle = fill(x); x.fillText(word, c.width / 2, c.height / 2);
      return c;
    };
    const ink = paintWord(() => rgba(INK));
    // Material con luz propia: más claro arriba, como si se encendiera desde adentro.
    const lit = paintWord((x) => {
      const m = tallH * D / 2, g = x.createLinearGradient(0, m - px * D * 0.42, 0, m + px * D * 0.42);
      g.addColorStop(0, 'rgb(92,110,255)'); g.addColorStop(0.55, rgba(COB)); g.addColorStop(1, 'rgb(27,42,196)');
      return g;
    });
    // Halo: el brillo se expande alrededor de la palabra. Es difuso, así que alcanza con baja resolución.
    const pad = px * 0.5, gw = tw + pad * 2, gh = px * 1.1 + pad * 2, gs = 0.33 * D;
    const [glow, g] = makeLayer(gw * gs, gh * gs), far = glow.width * 2;
    g.font = font(px * gs);
    [[0.5, 0.42], [0.22, 0.6], [0.08, 0.7]].forEach(([blur, al]) => {
      g.shadowColor = rgba(COB, al); g.shadowBlur = px * gs * blur; g.shadowOffsetX = far;
      g.fillText(word, glow.width / 2 - far, glow.height / 2);
    });
    // Se pasa una vez a tamaño final: copiarlo sin reescalar es mucho más barato en cada cuadro.
    const [halo, hx] = makeLayer(gw * D, gh * D);
    hx.imageSmoothingQuality = 'high';
    hx.drawImage(glow, 0, 0, halo.width, halo.height);
    // Reflejo: nítido junto al piso y cada vez más difuso a medida que se aleja.
    const rs = D, rw = tw + px * 0.4, rh = px * 1.05, contact = px * 0.38 * rs;
    const [ref, r] = makeLayer(rw * rs, rh * rs), [soft, b] = makeLayer(rw * rs, rh * rs);
    const mirror = (x) => { x.font = font(px * rs); x.setTransform(1, 0, 0, -1, 0, 2 * contact); };
    mirror(r); r.fillStyle = rgba(COB); r.fillText(word, ref.width / 2, contact);
    r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'destination-in';
    let m = r.createLinearGradient(0, 0, 0, ref.height * 0.6); m.addColorStop(0, 'rgba(0,0,0,.95)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    r.fillStyle = m; r.fillRect(0, 0, ref.width, ref.height); r.globalCompositeOperation = 'source-over';
    mirror(b); b.shadowColor = rgba(COB, 0.9); b.shadowBlur = px * rs * 0.1; b.shadowOffsetX = far * 3;
    b.fillText(word, soft.width / 2 - far * 3, contact);
    b.setTransform(1, 0, 0, 1, 0, 0); b.shadowColor = 'transparent'; b.globalCompositeOperation = 'destination-in';
    m = b.createLinearGradient(0, 0, 0, soft.height); m.addColorStop(0, 'rgba(0,0,0,.4)'); m.addColorStop(0.5, 'rgba(0,0,0,.42)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = m; b.fillRect(0, 0, soft.width, soft.height);
    r.drawImage(soft, 0, 0);
    L.fx[i] = { ink, lit, halo, ref };
    return L.fx[i];
  }
  const snap = (v) => Math.round(v * D) / D;
  // Si un equipo no llega, se apagan solo los halos: el resto de la escena sigue igual.
  let reelLast = 0, reelSlow = 0, reelLite = false;
  function drawReel(alpha) {
    const tn = performance.now();
    if (tn - reelLast > 40 && tn - reelLast < 400 && ++reelSlow >= 5) reelLite = true;
    reelLast = tn;
    const pos = reelPos(T), v = Math.abs(reelPos(T + 0.016) - pos);
    const smear = 1 + Math.min(0.2, v * 1.4), block = map(T, 5.65, 5.9), px = L.reel.px;
    const contact = px * 0.38, shift = L.rh * inOut(map(T, 5.25, 5.85)), floor = H / 2 + contact + shift;
    const u = (T - 2.85) / 0.48, kick = u >= 0 && u < 5 ? Math.exp(-(u - Math.floor(u)) * 3.2) : Math.exp(-Math.max(0, T - 5.8) * 3);
    const stage = map(T, 2.85, 3.1);
    const first = Math.max(0, Math.floor(pos) - 2), lastI = Math.min(8, Math.ceil(pos) + 2);
    const power = (d, i) => (i < 6 ? clamp(1 - d * 2.2) : block);
    if (stage > 0) {
      ctx.globalAlpha = stage;
      const st = reelStage(); ctx.drawImage(st, 0, snap(shift), st.width / D, st.height / D);
    }
    // Reflejos en el piso
    for (let i = first; i <= lastI; i++) {
      if (!REEL[i]) continue;
      const y = H / 2 + (i - pos) * L.rh, gap = floor - (y + contact);
      if (gap < -px * 0.05 || gap > L.rh * 1.1) continue;
      const fx = reelFx(i), near = 1 - clamp(gap / (L.rh * 1.1)), hit = power(Math.abs(i - pos), i);
      const al = (0.1 + 0.68 * hit * (0.8 + 0.3 * kick)) * near * near * stage;
      if (al < 0.01) continue;
      ctx.globalAlpha = Math.min(1, al);
      ctx.drawImage(fx.ref, snap(W / 2 - fx.ref.width / D / 2), snap(floor + Math.max(0, gap)), fx.ref.width / D, fx.ref.height / D);
    }
    // Halo y palabra
    for (let i = first; i <= lastI; i++) {
      if (!REEL[i]) continue;
      const d = Math.abs(i - pos), y = H / 2 + (i - pos) * L.rh, hit = power(d, i), fx = reelFx(i);
      if (hit >= 0.03 && !reelLite) {
        const gw = fx.halo.width / D, gh = fx.halo.height / D;
        ctx.globalAlpha = Math.min(1, hit * (0.68 + 0.42 * kick)) * alpha;
        ctx.drawImage(fx.halo, snap(W / 2 - gw / 2), snap(y - gh / 2), gw, gh);
      }
      const near = Math.max(0.09, 1 - d * 0.9), rise = i > pos ? clamp(1 - (y - floor) / (px * 0.5)) : 1;
      const a = (i >= 6 ? lerp(near, 1, block) : near) * rise * alpha;
      if (a < 0.005) continue;
      const tw = fx.ink.width / D, th = (fx.ink.height / D) * (smear < 1.015 ? 1 : smear), wx = snap(W / 2 - tw / 2), wy = snap(y - th / 2);
      const lit = clamp(hit * (0.8 + 0.2 * kick) * 1.25);
      if (lit < 0.995) { ctx.globalAlpha = a * (1 - lit * 0.999); ctx.drawImage(fx.ink, wx, wy, tw, th); }
      if (lit > 0.005) { ctx.globalAlpha = a * lit; ctx.drawImage(fx.lit, wx, wy, tw, th); }
    }
    ctx.globalAlpha = 1;
  }
  function particleAlpha() {
    if (T < 1.15) return Math.min(map(T, 0, 0.12), 1 - map(T, 0.85, 1.15));
    if (T < 6.95) return 0;
    if (T < 8.4) return 1 - map(T, 8.1, 8.4);
    if (T < 10) return 0;
    if (T < 12) return 0;
    if (T < 12.4) return 1;
    if (T < 14.45) return 1 - 0.72 * map(T, 12.4, 12.8);
    return lerp(0.28, 1, map(T, 14.45, 14.75));
  }
  function render() {
    base();
    if (T < 2.85) {
      const z = map(T, 2.35, 2.85), push = 1 + 0.03 * map(T, 0.9, 2.35);
      paint(COB);
      if (T < 2.35) text(L.fs, WHT, map(T, 0.5, 0.92), { scale: push });
      else diveInto(L.fs, L.mFs.focus, mix(WHT, PAP, z), push, z);
      text(L.fs2, WHT, Math.min(out4(map(T, 0.95, 1.3)), 1 - map(T, 2.35, 2.47)), { dy: 26 * (1 - out4(map(T, 0.95, 1.35))) });
      if (z > 0.72) { ctx.fillStyle = rgba(PAP, map(z, 0.72, 1)); ctx.fillRect(0, 0, W, H); }
    } else if (T < 7.45) {
      paint(PAP);
      drawReel(1 - map(T, 6.95, 7.06));
      iris(COB, inOut(map(T, 6.95, 7.45)));
    } else if (T < 10) {
      const z = map(T, 9.5, 10), push = 1 + 0.03 * map(T, 8.2, 9.5), color = mix(WHT, INK, map(z, 0, 0.3));
      paint(COB);
      if (T < 9.5) text(L.miles, WHT, map(T, 7.95, 8.28), { scale: push });
      else diveInto(L.miles, L.mMiles.focus, color, push, z);
      text(L.miles2, WHT, Math.min(out4(map(T, 8.25, 8.55)), 1 - map(T, 9.5, 9.6)), { dy: 22 * (1 - out4(map(T, 8.25, 8.6))) });
      if (z > 0.72) { ctx.fillStyle = rgba(INK, map(z, 0.72, 1)); ctx.fillRect(0, 0, W, H); }
    } else if (T < 14.9) {
      paint(INK);
      if (T < 12.25) drawNet();
      text(L.ia2, WHT, Math.min(out4(map(T, 11.05, 11.32)), 1 - map(T, 11.98, 12.1)), { dy: 18 * (1 - out4(map(T, 11.05, 11.38))) });
      const fade = 1 - map(T, 14.45, 14.62);
      text(L.l1, WHT, Math.min(map(T, 12.4, 12.68), fade), { scale: 1 + 0.02 * map(T, 12.7, 14.45) });
      text(L.l2, SOFT, Math.min(out4(map(T, 12.95, 13.25)), fade), { dy: 24 * (1 - out4(map(T, 12.95, 13.3))), scale: 1 + 0.02 * map(T, 13.2, 14.45) });
      iris(COB, inOut(map(T, 14.45, 14.9)));
    } else paint(COB);

    const c = T >= 6.95 && T < 7.3 ? mix(COB, WHT, map(T, 7.0, 7.3)) : WHT;
    particles(particleAlpha(), c);

    if (T > 14.72) {
      const p = back(map(T, 14.72, 15.15));
      if (L.portrait.width) {
        const d = L.dia * p, a = map(T, 14.72, 14.9);
        ctx.globalAlpha = a;
        ctx.drawImage(L.portrait, W / 2 - d / 2, L.end.cy - d / 2, d, d);
        ctx.globalAlpha = 1;
      }
      text(L.name, WHT, map(T, 14.88, 15.15), { dy: 26 * (1 - out4(map(T, 14.88, 15.25))) });
      text(L.role, WHT, map(T, 15.02, 15.28), { dy: 18 * (1 - out4(map(T, 15.02, 15.35))) });
    }
    fill.style.transform = `scaleX(${clamp(T / END)})`;
  }
  // Momentos en que las partículas cambian de forma
  const EVENTS = [
    [0, () => { teleport(L.stars); retarget(L.mFs.pts, 0.72, 0.22, 0.28); }],
    [6.95, () => { teleport(L.mWme.pts); retarget(L.crowd, 0.5, 0.05, 0.18); }],
    [7.42, () => retarget(L.mMiles.pts, 0.68, 0.16, 0.22)],
    [12, () => {
      // Cada partícula toma el lugar exacto de un nodo y sale en el orden de la red.
      const n = L.net;
      for (let i = 0; i < active; i++) { const k = i % n.count; px[i] = n.X[k]; py[i] = n.Y[k]; delay[i] = n.hop[k]; }
      retarget(L.mL1.pts, 0.42, 0.3, 0.12);
    }],
    [12.75, () => { for (let i = 0; i < MAX; i++) delay[i] = Math.random(); retarget(L.stars, 1.6, 0.4, 0.12); }],
    [14.45, () => retarget(L.ring, 0.72, 0.16, 0.5)],
  ];
  function tick(now) {
    if (!tw.open) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    const dt = Math.min(now - last, 50); last = now;
    if (dt > 0) {
      T += dt / 1000;
      // Si el equipo sufre, se reducen partículas: el texto y los tiempos no cambian.
      slowSum += dt; frames++;
      if (frames === 30) { if (slowSum / 30 > 21 && active > 650) active = Math.round(active * 0.8); frames = 0; slowSum = 0; }
    }
    while (nextEvent < EVENTS.length && T >= EVENTS[nextEvent][0]) EVENTS[nextEvent++][1]();
    render();
    if (!ended && T >= END) finish();
  }
  function finish() {
    ended = true;
    skip.hidden = true; foot.hidden = false;
    foot.focus({ preventScroll: true });
  }
  function start(at = 0) {
    T = at; ended = false; frames = 0; slowSum = 0;
    nextEvent = at ? EVENTS.length - 1 : 0;
    skip.hidden = false; foot.hidden = true;
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(tick);
  }
  let warmKey = '';
  function begin() {
    sizeCanvas();
    if (calm) {
      sr.classList.remove('sr'); sr.classList.add('tw-static');
      cv.hidden = true; skip.hidden = true; foot.hidden = false;
      fill.style.transform = 'scaleX(1)';
      foot.focus({ preventScroll: true });
      return;
    }
    if (warmKey !== `${W}x${H}`) { prepare(); warmKey = `${W}x${H}`; }
    reelStage(); REEL.forEach((_, i) => reelFx(i)); // lo que no llegó a generarse antes se completa acá
    start(0);
  }
  const openBtn = document.getElementById('twenty');
  openBtn.hidden = false;
  openBtn.addEventListener('click', () => {
    root.classList.add('show-on'); // la página de abajo descansa mientras corre la función
    openBtn.classList.add('played'); // ya la vio: el botón deja de llamar la atención
    tw.showModal();
    begin();
  });
  document.getElementById('tw-close').addEventListener('click', () => tw.close());
  document.getElementById('tw-again').addEventListener('click', () => { if (!calm) start(0); });
  skip.addEventListener('click', () => {
    if (T < 14.45) { for (let i = 0; i < active; i++) { fx[i] = px[i]; fy[i] = py[i]; } start(14.45); }
  });
  tw.addEventListener('close', () => {
    cancelAnimationFrame(raf); raf = 0;
    root.classList.remove('show-on');
    dispatchEvent(new Event('show-end'));
  });
  let rw = innerWidth, rh = innerHeight;
  addEventListener('resize', () => {
    if (!tw.open || calm) return;
    const same = innerWidth === rw && Math.abs(innerHeight - rh) < 140; // la barra del navegador móvil no reinicia nada
    if (same) return;
    rw = innerWidth; rh = innerHeight;
    const at = T;
    sizeCanvas(); prepare(); warmKey = `${W}x${H}`;
    reelStage(); REEL.forEach((_, i) => reelFx(i));
    if (at >= 14.45) start(14.45); else start(0);
  });
  // Se prepara antes de tiempo, para que al tocar el botón arranque sin esperas.
  const warm = () => {
    if (calm || tw.open) return;
    const go = () => {
      if (tw.open) return;
      sizeCanvas(); prepare(); warmKey = `${W}x${H}`;
      // Los efectos de luz se generan de a una palabra, para no trabar la página.
      const idle = window.requestIdleCallback || ((c) => setTimeout(c, 120));
      const key = warmKey; let i = 0;
      const next = () => { if (tw.open || key !== warmKey || i >= REEL.length) return; if (!i) reelStage(); reelFx(i++); idle(next); };
      setTimeout(() => idle(next), 2500); // espera a que la página termine de cargar
    };
    (window.requestIdleCallback || ((c) => setTimeout(c, 200)))(go);
  };
  photo.addEventListener('load', warm);
  if (document.fonts && document.fonts.load) document.fonts.load(font(100)).then(warm, warm); else warm();
})();
