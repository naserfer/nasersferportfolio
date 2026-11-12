// El nombre del hero, hecho de partículas.
// En reposo se ve el texto real del DOM. Cuando el cursor (o el dedo) se acerca, un canvas 2D
// toma su lugar: el texto se corta en una grilla de fragmentos que se apartan y vuelven con resortes.
// El <h1> nunca sale del DOM, así que buscadores y lectores de pantalla leen lo mismo que antes.
const h1 = document.getElementById('name');
const hero = h1.closest('.hero');
const holder = h1.firstElementChild;
const small = matchMedia('(max-width: 860px), (pointer: coarse)');
const STRETCH = { 50: 'ultra-condensed', 62.5: 'extra-condensed', 75: 'condensed', 87.5: 'semi-condensed', 100: 'normal', 112.5: 'semi-expanded', 125: 'expanded' };

const cv = document.createElement('canvas');
cv.className = 'nfx-c';
cv.setAttribute('aria-hidden', 'true');
const ctx = cv.getContext('2d');
let ink, inkColor = '#121a2b', cobalt = '#2438e8'; // el texto dibujado una vez y los dos colores
let D = 1, s = 4, n = 0, R = 100;   // escala, lado del fragmento, cantidad, radio de influencia
let HX, HY, X, Y, VX, VY, M, P, C, S, ON, GX, GY, G; // + deriva y turno de cada una al deshacerse con el scroll
let nameStart = 0, nameEnd = 1, sp = 0, dissolving = false, sraf = 0; // origen, posición, velocidad, masa, empuje, desvío y estado de cada partícula
let ox = 0, oy = 0, zone = [0, 0, 0, 0];
let built = false, live = false, visible = true, raf = 0, last = 0, timer = 0;
let px = -1e5, py = -1e5, pvx = 0, pvy = 0, near = false, stirred = false, dirty = null;

function build() {
  built = false;
  rest();
  if (!holder.children.length) return;
  h1.classList.add('nfx');
  D = Math.min(devicePixelRatio || 1, 1.5);
  const hr = hero.getBoundingClientRect(), r = holder.getBoundingClientRect();
  const cs = getComputedStyle(h1), size = parseFloat(cs.fontSize), gap = parseFloat(cs.letterSpacing) || 0;
  if (r.width < 40 || !size) return h1.classList.remove('nfx');

  // La línea de base sale de un elemento vacío puesto junto a las letras.
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0';
  holder.appendChild(probe);
  const base = probe.getBoundingClientRect().bottom;
  probe.remove();

  R = Math.max(44, Math.min(size * 0.6, 140));
  const pad = Math.round(R * 1.15), vw = document.documentElement.clientWidth;
  const left = Math.max(0, Math.floor(r.left - pad)), right = Math.min(vw, Math.ceil(r.right + pad));
  const top = Math.max(-Math.floor(scrollY), Math.floor(r.top - pad)), bottom = Math.ceil(r.bottom + pad);
  cv.width = Math.round((right - left) * D);
  cv.height = Math.round((bottom - top) * D);
  cv.style.cssText = `left:${left - hr.left}px;top:${top - hr.top}px;width:${cv.width / D}px;height:${cv.height / D}px`;
  if (!cv.isConnected) hero.appendChild(cv);

  // El texto se dibuja letra por letra en el mismo lugar donde lo puso el navegador.
  const gx = size * 0.12, gy = size * 0.3;
  ox = Math.round((r.left - gx - left) * D);
  oy = Math.round((r.top - gy - top) * D);
  const sw = Math.ceil((r.width + gx * 2) * D), sh = Math.ceil((r.height + gy * 2) * D);
  const x0 = left + ox / D, y0 = top + oy / D;
  ink = document.createElement('canvas');
  ink.width = sw; ink.height = sh;
  const ic = ink.getContext('2d', { willReadFrequently: true });
  ic.setTransform(D, 0, 0, D, 0, 0);
  ic.font = `${cs.fontStyle} ${STRETCH[parseFloat(cs.fontStretch)] || 'normal'} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
  ic.fillStyle = cs.color;
  ic.textBaseline = 'alphabetic';
  for (const el of holder.children) {
    const ch = el.textContent;
    if (!ch.trim()) continue;
    const lr = el.getBoundingClientRect();
    // Si el canvas no mide la letra igual que el DOM, la fuente no coincide: queda el texto normal.
    if (Math.abs(ic.measureText(ch).width + gap - lr.width) > Math.max(1, size * 0.012)) return h1.classList.remove('nfx');
    ic.fillText(ch, lr.left - x0, base - y0);
  }
  inkColor = cs.color;
  cobalt = getComputedStyle(document.documentElement).getPropertyValue('--cobalt').trim() || cobalt;

  // La grilla: se elige el lado del fragmento para llegar a la cantidad buscada.
  const a = ic.getImageData(0, 0, sw, sh).data;
  let inked = 0;
  for (let i = 3; i < a.length; i += 16) if (a[i] > 127) inked += 4;
  const goal = small.matches ? 1200 : 4200, cap = small.matches ? 1400 : 5000;
  s = Math.max(2, Math.round(Math.sqrt(inked / goal)));
  let cells;
  for (;;) {
    cells = [];
    const min = 255 * s * s * 0.1;
    for (let y = 0; y + s <= sh; y += s) for (let x = 0; x + s <= sw; x += s) {
      let sum = 0;
      for (let v = 0; v < s; v++) { let i = ((y + v) * sw + x) * 4 + 3; for (let u = 0; u < s; u++, i += 4) sum += a[i]; }
      if (sum > min) cells.push(x, y);
    }
    if (cells.length / 2 <= cap) break;
    s++;
  }
  n = cells.length / 2;
  HX = new Float32Array(n); HY = new Float32Array(n); X = new Float32Array(n); Y = new Float32Array(n);
  VX = new Float32Array(n); VY = new Float32Array(n); M = new Float32Array(n); ON = new Uint8Array(n);
  P = new Float32Array(n); C = new Float32Array(n); S = new Float32Array(n);
  GX = new Float32Array(n); GY = new Float32Array(n); G = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    X[i] = HX[i] = cells[i * 2] + ox; Y[i] = HY[i] = cells[i * 2 + 1] + oy;
    M[i] = 0.7 + Math.random() * 0.6;
    // Cada una sale con otra fuerza y un poco torcida, para que se desparramen en vez de formar un aro.
    const turn = (Math.random() - 0.5) * 1.5;
    P[i] = 0.35 + Math.random() ** 2 * 1.9; C[i] = Math.cos(turn); S[i] = Math.sin(turn);
  }
  // Al scrollear el nombre se deshace de izquierda a derecha: cada partícula sale hacia arriba con su propio rumbo.
  const RdD = R * D;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, d = (0.35 + Math.random() * 0.75) * RdD;
    GX[i] = Math.cos(a) * d; GY[i] = Math.sin(a) * d;
    G[i] = 0.65 * (HX[i] - ox) / sw + 0.35 * Math.random();
  }
  // Empieza a deshacerse cuando el nombre llega arriba de la pantalla y termina justo al salir.
  nameStart = Math.max(0, r.top + scrollY - 40);
  nameEnd = Math.max(nameStart + 60, r.bottom + scrollY - 10);
  const Rd = R * D;
  zone = [ox - Rd, oy - Rd, ox + sw + Rd, oy + sh + Rd];
  h1.dataset.particles = n;
  built = n > 0;
  if (!built) h1.classList.remove('nfx');
}

// Vuelve al texto real y apaga el canvas.
function rest() {
  cancelAnimationFrame(raf); raf = 0; last = 0;
  if (X) { X.set(HX); Y.set(HY); VX.fill(0); VY.fill(0); ON.fill(0); }
  near = false; px = py = -1e5; dirty = null;
  if (live) { live = false; h1.classList.remove('nfx-live'); ctx.clearRect(0, 0, cv.width, cv.height); }
}
const kick = () => { if (!raf && built && visible && !dissolving) raf = requestAnimationFrame(tick); };

// Devuelve un rectángulo del canvas a su estado de reposo: el texto entero.
function restore(b) {
  const x = Math.max(0, b[0]), y = Math.max(0, b[1]), w = Math.min(cv.width, b[2]) - x, hh = Math.min(cv.height, b[3]) - y;
  if (w <= 0 || hh <= 0) return;
  ctx.clearRect(x, y, w, hh);
  const sx = Math.max(x, ox), sy = Math.max(y, oy), ex = Math.min(x + w, ox + ink.width), ey = Math.min(y + hh, oy + ink.height);
  if (ex > sx && ey > sy) ctx.drawImage(ink, sx - ox, sy - oy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
}

function tick(t) {
  raf = 0;
  const dt = last ? Math.min(50, t - last) : 16.7;
  last = t;
  // Un solo paso por cuadro, escalado al tiempo real: se mueve igual a 30, 60 o 120 Hz.
  const f = Math.min(4, dt / 8.33), damp = 0.9 ** f, drag = 0.05 * f;
  const Rd = R * D, R2 = Rd * Rd, h = s / 2, push = 0.95 * D * f, qx = px - h, qy = py - h;
  let active = 0, speed = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < n; i++) {
    let dx = X[i] - qx, dy = Y[i] - qy, hit = false;
    if (near && dx < Rd && dx > -Rd && dy < Rd && dy > -Rd) {
      const d2 = dx * dx + dy * dy;
      if (d2 < R2) {
        const d = Math.sqrt(d2) || 1, u = 1 - d / Rd, g = u * u * push * P[i] / d;
        VX[i] += (dx * C[i] - dy * S[i]) * g + pvx * u * drag; VY[i] += (dx * S[i] + dy * C[i]) * g + pvy * u * drag;
        hit = true; ON[i] = 1;
      }
    }
    if (!ON[i]) continue;
    dx = HX[i] - X[i]; dy = HY[i] - Y[i];
    const k = 0.012 * M[i] * f;
    VX[i] = (VX[i] + dx * k) * damp; VY[i] = (VY[i] + dy * k) * damp;
    X[i] += VX[i] * f; Y[i] += VY[i] * f;
    const v = Math.abs(VX[i]) + Math.abs(VY[i]);
    if (!hit && v < 0.06 && Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) { X[i] = HX[i]; Y[i] = HY[i]; VX[i] = VY[i] = 0; ON[i] = 0; continue; }
    active++; if (v > speed) speed = v;
    const ax = X[i] < HX[i] ? X[i] : HX[i], bx = X[i] > HX[i] ? X[i] : HX[i], ay = Y[i] < HY[i] ? Y[i] : HY[i], by = Y[i] > HY[i] ? Y[i] : HY[i];
    if (ax < x0) x0 = ax; if (bx > x1) x1 = bx; if (ay < y0) y0 = ay; if (by > y1) y1 = by;
  }
  pvx *= 0.6; pvy *= 0.6;
  if (!active && !near) return rest();

  // Solo se repinta la zona donde hay partículas fuera de lugar (más la del cuadro anterior).
  const now = active ? [Math.floor(x0) - 2, Math.floor(y0) - 2, Math.ceil(x1) + s + 2, Math.ceil(y1) + s + 2] : null;
  if (!live) { ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(ink, ox, oy); }
  else if (dirty) restore(dirty);
  if (now && live) restore(now);
  dirty = now;
  for (let i = 0; i < n; i++) if (ON[i]) ctx.clearRect(HX[i], HY[i], s, s);
  // Las que se alejaron se pintan en dos tandas, una por color, cada una con un solo fill.
  const far = (5 * D) ** 2;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) if (ON[i]) {
      const dx = X[i] - HX[i], dy = Y[i] - HY[i];
      if ((dx * dx + dy * dy > far) === !!pass) ctx.rect(X[i], Y[i], s, s);
    }
    ctx.fillStyle = pass ? cobalt : inkColor;
    ctx.fill();
  }
  if (!live) { live = true; h1.classList.add('nfx-live'); }
  // Si nada se mueve y el cursor está quieto, el dibujo queda y el loop se detiene.
  if (!near || speed > 0.03 || stirred) raf = requestAnimationFrame(tick);
  else last = 0;
  stirred = false;
}

function point(e) {
  if (!built || !visible || dissolving) return;
  const b = cv.getBoundingClientRect();
  const x = (e.clientX - b.left) * D, y = (e.clientY - b.top) * D;
  const inside = x > zone[0] && y > zone[1] && x < zone[2] && y < zone[3];
  if (!inside && !near) return;
  if (near) { pvx = x - px; pvy = y - py; } else { pvx = pvy = 0; }
  px = x; py = y; near = inside; stirred = true;
  kick();
}
const leave = () => { if (near) { near = false; stirred = true; kick(); } };
hero.addEventListener('pointermove', point, { passive: true });
hero.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') point(e); }, { passive: true });
hero.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') { clearTimeout(timer); timer = setTimeout(leave, 160); } }, { passive: true });
hero.addEventListener('pointerleave', leave, { passive: true });
hero.addEventListener('pointercancel', leave, { passive: true });
// Dibujo del nombre deshaciéndose: depende solo de cuánto se scrolleó, así que va y vuelve con el dedo.
function dissolve() {
  sraf = 0;
  if (!built || !visible) return;
  const p = Math.min(1, (scrollY - nameStart) / (nameEnd - nameStart));
  if (p <= 0.004) { if (dissolving) { dissolving = false; rest(); } return; }
  if (!dissolving) { rest(); dissolving = true; }
  sp = p;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(ink, ox, oy);
  const k = sp * 1.5;
  for (let i = 0; i < n; i++) if (k - G[i] * 0.5 > 0) ctx.clearRect(HX[i], HY[i], s, s);
  // Cuatro tandas por opacidad: cada una es un solo fill, sin importar cuántas partículas haya.
  for (let b = 0; b < 4; b++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      let e = k - G[i] * 0.5;
      if (e <= 0) continue;
      if (e > 1) e = 1;
      if (Math.min(3, (e * 4) | 0) !== b) continue;
      const ee = e * e * (3 - 2 * e);
      ctx.rect(HX[i] + GX[i] * ee, HY[i] + GY[i] * ee, s, s);
    }
    ctx.globalAlpha = 1 - (b + 0.5) / 4.4;
    ctx.fillStyle = b ? cobalt : inkColor;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!live) { live = true; h1.classList.add('nfx-live'); }
}
addEventListener('scroll', () => { leave(); if (!sraf) sraf = requestAnimationFrame(dissolve); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) rest(); });
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) dissolve(); else if (!dissolving) rest(); }).observe(h1);

// Se arma cuando las letras terminaron de entrar, y de nuevo si cambia el tamaño o llega la fuente.
let again = 0;
let lastW = innerWidth;
const rebuild = (e) => {
  // En el celular la barra del navegador cambia el alto al scrollear: eso no cambia el nombre, no se rearma.
  if (e && e.type === 'resize' && innerWidth === lastW) return;
  lastW = innerWidth;
  built = false; dissolving = false; rest(); clearTimeout(again);
  again = setTimeout(() => { build(); dissolve(); }, 180);
};
const settled = () => Promise.all(h1.getAnimations({ subtree: true }).map((an) => an.finished.catch(() => {})));
const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
fonts.then(settled).then(() => {
  build();
  dissolve();
  addEventListener('resize', rebuild);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', rebuild);
});
