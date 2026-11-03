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
    document.querySelectorAll('.work h2,.exp h2,.ask h2,.mail').forEach((el) => {
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

  function prepare() {
    const narrow = W < 600;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = fit(['Full Stack'], W * 0.9, H * 0.36); fs.y = H * 0.46;
    const fs2 = fit(['+4 años en producción'], W * 0.8, H * 0.07); fs2.y = fs.y + fs.px * 0.62 + fs2.px * 0.55;
    const reel = fit(['Escritorio'], W * 0.84, H * 0.21);
    const rh = reel.px * 1.14;
    const miles = fit(narrow ? ['Miles de', 'personas'] : ['Miles de personas'], W * 0.88, H * 0.38); miles.y = H * 0.45;
    const miles2 = fit(['usan mis apps cada día'], W * 0.8, H * 0.07); miles2.y = miles.y + miles.h / 2 + miles2.px * 0.75;
    const ia = fit(['IA'], W * 0.72, H * 0.5, 700); ia.y = H * 0.41;
    const ia2 = fit(['Dirijo agentes de IA'], W * 0.82, H * 0.08); ia2.y = Math.min(ia.y + ia.px * 0.62 + ia2.px * 0.7, H * 0.86);
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
      fs, fs2, reel, rh, miles, miles2, ia, ia2, l1, l2, name, role, dia, ring, portrait,
      end: { cx: W / 2, cy },
      mFs: maskOf((c) => put(c, fs)), mWme: wme, mMiles: maskOf((c) => put(c, miles)),
      mIa: maskOf((c) => put(c, ia)), mL1: maskOf((c) => put(c, l1)), stars: scatter(), crowd: scatter(0.02),
    };
    active = W < 600 ? 900 : MAX;
  }
  function sizeCanvas() {
    W = innerWidth; H = innerHeight;
    D = Math.min(devicePixelRatio || 1, 2);
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
  function drawReel(alpha) {
    const pos = reelPos(T), v = Math.abs(reelPos(T + 0.016) - pos);
    const smear = 1 + Math.min(0.2, v * 1.4), block = map(T, 5.65, 5.9), o = L.reel;
    ctx.font = o.font;
    for (let i = Math.max(0, Math.floor(pos) - 2); i <= Math.min(8, Math.ceil(pos) + 2); i++) {
      if (!REEL[i]) continue;
      const d = Math.abs(i - pos), y = H / 2 + (i - pos) * L.rh;
      const near = Math.max(0.09, 1 - d * 0.9), a = i >= 6 ? lerp(near, 1, block) : near;
      const hit = i < 6 ? clamp(1 - d * 2.2) : block;
      ctx.fillStyle = rgba(mix(INK, COB, hit * (i < 6 ? 1 : 0)), a * alpha);
      ctx.setTransform(D, 0, 0, D * smear, 0, D * y * (1 - smear));
      ctx.fillText(REEL[i], W / 2, y);
    }
    base();
  }
  function particleAlpha() {
    if (T < 1.15) return Math.min(map(T, 0, 0.12), 1 - map(T, 0.85, 1.15));
    if (T < 6.95) return 0;
    if (T < 8.4) return 1 - map(T, 8.1, 8.4);
    if (T < 10) return 0;
    if (T < 12.4) return map(T, 10, 10.15);
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
      text(L.ia, WHT, Math.min(0.16 * map(T, 10.55, 11), 1 - map(T, 11.95, 12.05)));
      text(L.ia2, WHT, Math.min(out4(map(T, 10.55, 10.85)), 1 - map(T, 11.9, 12.05)), { dy: 22 * (1 - out4(map(T, 10.55, 10.9))) });
      const fade = 1 - map(T, 14.45, 14.62);
      text(L.l1, WHT, Math.min(map(T, 12.4, 12.68), fade), { scale: 1 + 0.02 * map(T, 12.7, 14.45) });
      text(L.l2, SOFT, Math.min(out4(map(T, 12.95, 13.25)), fade), { dy: 24 * (1 - out4(map(T, 12.95, 13.3))), scale: 1 + 0.02 * map(T, 13.2, 14.45) });
      iris(COB, inOut(map(T, 14.45, 14.9)));
    } else paint(COB);

    const c = T >= 6.95 && T < 7.3 ? mix(INK, WHT, map(T, 7.0, 7.3)) : WHT;
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
    [10, () => { teleport(L.stars); retarget(L.mIa.pts, 0.82, 0.2, 0.34); }],
    [12, () => retarget(L.mL1.pts, 0.5, 0.1, 0.4)],
    [12.75, () => retarget(L.stars, 1.6, 0.4, 0.12)],
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
      if (frames === 30) { if (slowSum / 30 > 21 && active > 350) active = Math.round(active * 0.75); frames = 0; slowSum = 0; }
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
    start(0);
  }
  const openBtn = document.getElementById('twenty');
  openBtn.hidden = false;
  openBtn.addEventListener('click', () => {
    root.classList.add('show-on'); // la página de abajo descansa mientras corre la función
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
    if (at >= 14.45) start(14.45); else start(0);
  });
  // Se prepara antes de tiempo, para que al tocar el botón arranque sin esperas.
  const warm = () => {
    if (calm || tw.open) return;
    const go = () => { if (tw.open) return; sizeCanvas(); prepare(); warmKey = `${W}x${H}`; };
    (window.requestIdleCallback || ((c) => setTimeout(c, 200)))(go);
  };
  photo.addEventListener('load', warm);
  if (document.fonts && document.fonts.load) document.fonts.load(font(100)).then(warm, warm); else warm();
})();
