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

  // La vuelta de rosca: una función de 15 segundos.
  const tw = document.getElementById('tw'), stage = document.getElementById('tw-stage');
  const cv = document.getElementById('tw-canvas'), ctx = cv.getContext('2d');
  const fill = document.getElementById('tw-fill'), foot = document.getElementById('tw-foot');
  const skip = document.getElementById('tw-skip'), sr = document.getElementById('tw-sr');
  const COB = '#2438e8', INK = '#121a2b', WHT = '#f4f6f8';
  const SLAM = 'cubic-bezier(.12,.9,.2,1)', IN = 'cubic-bezier(.7,0,.84,0)';
  let run = 0, W = 0, H = 0, raf = 0, parts = [], pColor = '#fff', barAnim = null;

  class Stop extends Error {}
  const wait = (ms, id) => new Promise((ok, no) => setTimeout(() => (id === run ? ok() : no(new Stop())), ms));
  const play = (el, kf, ms, ease = 'linear', id) => el.animate(kf, { duration: ms, easing: ease, fill: 'forwards' }).finished.then(() => { if (id !== run) throw new Stop(); });
  function clear() { stage.querySelectorAll('.tw-t,.tw-iris,.tw-end').forEach((n) => n.remove()); }
  function word(text, { fit = 0.9, maxH = 0.42, color = '#fff', y = 0, cls = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'tw-t ' + cls;
    el.innerHTML = '<span></span>';
    el.firstChild.textContent = text;
    el.style.color = color;
    stage.append(el);
    el.style.fontSize = '100px';
    const r = el.firstChild.getBoundingClientRect();
    const fs = Math.min(100 * (W * fit) / r.width, (H * maxH) / 1.05);
    el.style.fontSize = fs + 'px';
    el.style.top = (H / 2 + y) + 'px';
    return el;
  }
  function iris(color, id) { // cambia el fondo con un círculo que crece desde el centro
    const c = document.createElement('div');
    c.className = 'tw-iris';
    c.style.background = color;
    stage.append(c);
    const k = (Math.hypot(W, H) / 40) * 1.05;
    return play(c, [{ transform: 'scale(0)' }, { transform: `scale(${k})` }], 340, 'cubic-bezier(.6,0,.2,1)', id).then(() => { stage.style.background = color; c.remove(); });
  }

  // Partículas: toman la forma de lo que se dibuje en un lienzo oculto.
  function sizeCanvas() {
    const d = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function targets(draw, n) {
    const o = document.createElement('canvas'), s = 0.25;
    o.width = Math.ceil(W * s); o.height = Math.ceil(H * s);
    const c = o.getContext('2d', { willReadFrequently: true });
    c.scale(s, s); c.fillStyle = '#000'; draw(c);
    const data = c.getImageData(0, 0, o.width, o.height).data, pts = [];
    for (let y = 0; y < o.height; y++) for (let x = 0; x < o.width; x++) if (data[(y * o.width + x) * 4 + 3] > 128) pts.push([x / s, y / s]);
    return Array.from({ length: n }, () => pts[Math.floor(Math.random() * pts.length)] || [W / 2, H / 2]);
  }
  function morph(pts) { parts.forEach((p, i) => { [p.tx, p.ty] = pts[i % pts.length]; p.free = false; }); }
  function burst() { parts.forEach((p) => { const a = Math.random() * 6.28, f = 8 + Math.random() * 26; p.vx = Math.cos(a) * f; p.vy = Math.sin(a) * f; p.free = true; }); }
  function draw() {
    raf = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = pColor;
    const t = performance.now() / 700;
    for (const p of parts) {
      if (p.free) { p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; }
      else {
        p.x += (p.tx + Math.sin(t + p.s) * 1.6 - p.x) * p.k;
        p.y += (p.ty + Math.cos(t + p.s) * 1.6 - p.y) * p.k;
      }
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }
  }
  function startParts() {
    const n = W < 600 ? 700 : 1400;
    parts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, tx: 0, ty: 0, vx: 0, vy: 0, k: 0.07 + Math.random() * 0.1, s: Math.random() * 6.28, r: 1.4 + Math.random() * 1.4, free: true }));
    parts.forEach((p) => { p.vx = 0; p.vy = 0; });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
  }
  function stopParts() { cancelAnimationFrame(raf); raf = 0; parts = []; ctx.clearRect(0, 0, W, H); }

  async function show(id) {
    // 1. Golpe de zoom
    stage.style.background = COB;
    const a = word('Full Stack', { fit: 0.92 });
    await play(a, [{ transform: 'translate(-50%,-50%) scale(9)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], 480, SLAM, id);
    const a2 = word('+4 años en producción', { fit: 0.82, maxH: 0.09, y: Math.min(H * 0.2, W * 0.16) });
    await play(a2, [{ transform: 'translate(-50%,calc(-50% + 40px))', opacity: 0 }, { transform: 'translate(-50%,-50%)', opacity: 1 }], 260, SLAM, id);
    await wait(1250, id);
    iris(INK, id);
    await play(a, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(16)', opacity: 0 }], 300, IN, id);
    clear();
    // 2. Ráfaga de tecnologías
    for (const [i, w] of ['Angular', 'React', 'Flutter', 'Node.js', 'Rust'].entries()) {
      const el = word(w, { fit: 0.8, color: i % 2 ? '#a9b4ff' : '#fff' });
      el.animate([{ transform: `translate(-50%,-50%) scale(.62) rotate(${i % 2 ? 3 : -3}deg)`, opacity: 0.2 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 240, easing: SLAM, fill: 'forwards' });
      await wait(430, id);
      if (i < 4) el.remove(); else {
        iris(WHT, id);
        await play(el, [{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(.05)', opacity: 0 }], 300, IN, id);
      }
    }
    clear();
    // 3. Tres frentes
    const rowH = H * 0.2;
    const rows = [['Web', -rowH * 1.05, -1], ['Móvil', 0, 1], ['Escritorio', rowH * 1.05, -1]].map(([t, y, dir]) => {
      const el = word(t, { fit: 0.86, maxH: 0.2, color: INK, y });
      el.animate([{ transform: `translate(calc(-50% + ${dir * 110}vw),-50%)` }, { transform: 'translate(-50%,-50%)' }], { duration: 340, easing: SLAM, fill: 'forwards' });
      return [el, dir];
    });
    await wait(1500, id);
    iris(COB, id);
    rows.forEach(([el, dir]) => el.animate([{ transform: 'translate(-50%,-50%)' }, { transform: `translate(calc(-50% + ${-dir * 110}vw),-50%)` }], { duration: 300, easing: IN, fill: 'forwards' }));
    await wait(320, id); clear();
    // 4. Zoom a través de las palabras
    const m = word(W < 600 ? 'Miles de\npersonas' : 'Miles de personas', { fit: 0.9 });
    const m2 = word('usan mis apps cada día', { fit: 0.8, maxH: 0.08, y: W < 600 ? W * 0.36 : Math.min(H * 0.16, W * 0.12) });
    m.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 380, easing: SLAM, fill: 'forwards' });
    m2.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: 480, fill: 'forwards' });
    await wait(1800, id);
    m2.remove();
    stage.style.background = COB;
    iris(INK, id);
    await play(m, [{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(26)', opacity: 0 }], 340, IN, id);
    clear();
    // 5. Las partículas se vuelven palabras
    pColor = '#fff';
    startParts();
    const big = Math.min(H * 0.56, W * 0.52);
    morph(targets((c) => { c.font = `700 ${big}px "Instrument Sans",Inter,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('IA', W / 2, H * 0.42); }, parts.length));
    const d = word('Dirijo agentes de IA', { fit: 0.82, maxH: 0.08, y: H * 0.29 });
    d.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration: 600, fill: 'forwards' });
    await wait(1800, id);
    burst(); d.remove();
    // 6. Sello
    const s1 = word(W < 600 ? 'Cofundé una fábrica\nde software' : 'Cofundé una fábrica de software', { fit: 0.82, maxH: 0.12, y: -H * 0.09 });
    await play(s1, [{ transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], 220, SLAM, id);
    await wait(900, id);
    const s2 = word(W < 600 ? 'y respondo por\ncada entrega' : 'y respondo por cada entrega', { fit: 0.82, maxH: 0.12, y: H * 0.09, color: '#a9b4ff' });
    await play(s2, [{ transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], 220, SLAM, id);
    await wait(1300, id);
    // 7. El cierre: quién es y qué hacer ahora
    await iris(COB, id);
    clear();
    endCard(true);
    await wait(800, id);
    finish();
  }
  function endCard(animated) {
    const end = document.createElement('div');
    end.className = 'tw-end';
    end.innerHTML = '<img src="images/foto-perfil.webp" alt="" width="150" height="150"><strong>Naser Fernández</strong><span>Full Stack Developer en Asunción, Paraguay</span>';
    stage.append(end);
    const [img, name, role] = end.children;
    if (animated) {
      const r = img.getBoundingClientRect(), s = stage.getBoundingClientRect(); // medir antes de animar
      [img, name, role].forEach((el, i) => el.animate([{ transform: i ? 'translateY(24px)' : 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: i * 90, easing: SLAM, fill: 'backwards' }));
      const cx = r.left - s.left + r.width / 2, cy = r.top - s.top + r.height / 2, rad = r.width / 2;
      pColor = '#fff';
      if (!parts.length) startParts();
      morph(targets((c) => { c.lineWidth = rad * 0.34; c.beginPath(); c.arc(cx, cy, rad * 1.34, 0, 6.3); c.stroke(); }, parts.length));
    }
  }
  function finish() {
    fill.style.width = '100%';
    if (barAnim) barAnim.cancel();
    skip.hidden = true; foot.hidden = false;
    foot.querySelector('a').focus({ preventScroll: true });
  }
  function jumpEnd() {
    run++;
    stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    clear();
    stage.style.background = COB;
    endCard(!calm);
    finish();
  }
  function begin() {
    const id = ++run;
    sizeCanvas();
    stopParts(); clear();
    stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    skip.hidden = false; foot.hidden = true;
    fill.style.width = '0';
    if (calm) { sr.classList.remove('sr'); sr.classList.add('tw-static'); stage.style.background = COB; skip.hidden = true; foot.hidden = false; foot.querySelector('a').focus(); return; }
    barAnim = fill.animate([{ width: '0%' }, { width: '100%' }], { duration: 14500, fill: 'forwards' });
    show(id).catch((e) => { if (!(e instanceof Stop) && e.name !== 'AbortError') throw e; });
  }
  const openBtn = document.getElementById('twenty');
  openBtn.hidden = false;
  openBtn.addEventListener('click', () => { tw.showModal(); begin(); });
  document.getElementById('tw-close').addEventListener('click', () => tw.close());
  document.getElementById('tw-again').addEventListener('click', begin);
  skip.addEventListener('click', jumpEnd);
  tw.addEventListener('close', () => { run++; stopParts(); clear(); if (barAnim) barAnim.cancel(); });
  addEventListener('resize', () => { if (tw.open) { sizeCanvas(); } });
})();
