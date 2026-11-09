// Los dispositivos de la lista de proyectos: un teléfono, una laptop o un monitor en 3D con la captura en pantalla.
// La geometría se genera acá mismo y la dibuja un renderer WebGL mínimo, en un solo canvas para toda la lista.
// Con pocos núcleos o sin WebGL se muestra la captura plana, en un marco hecho con CSS.
const list = document.querySelector('.plist');
const work = list.closest('.work');
const rows = [...list.querySelectorAll('li[data-device]')];
const root = document.documentElement;
const ROOT = root.dataset.root || '';
const EN = root.lang.startsWith('en');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4;
const coarse = matchMedia('(pointer: coarse)').matches;
const narrow = matchMedia('(max-width: 860px)');
const PI = Math.PI, FOV = 26 * PI / 180, DIST = 9, VIEW = 2 * DIST * Math.tan(FOV / 2);

const stage = document.createElement('div');
stage.className = 'dv';
stage.setAttribute('aria-hidden', 'true');

// Matrices 4x4, por columnas.
const mul = (a, b) => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
};
const mats = (...m) => m.reduce(mul);
const T = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
const Sc = (x, y, z) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);
const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
const persp = (asp) => { const t = 1 / Math.tan(FOV / 2), n = 4, f = 14; return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); };
const I = T(0, 0, 0);

// Contorno de un rectángulo de esquinas redondeadas: [x, y, normal x, normal y].
function ring(w, h, R, seg) {
  const o = [];
  R = Math.max(1e-3, Math.min(R, w / 2, h / 2));
  for (let c = 0; c < 4; c++) {
    const cx = (c === 0 || c === 3 ? 1 : -1) * (w / 2 - R), cy = (c < 2 ? 1 : -1) * (h / 2 - R);
    for (let k = 0; k <= seg; k++) { const a = (c + k / seg) * PI / 2, x = Math.cos(a), y = Math.sin(a); o.push([cx + R * x, cy + R * y, x, y]); }
  }
  return o;
}
// Una placa de esquinas redondeadas y canto biselado: la pieza con la que se arma todo.
function slab(o, m, col, w, h, t, R, b, seg) {
  const A = ring(w - 2 * b, h - 2 * b, R - b, seg), B = ring(w, h, R, seg), N = A.length, base = o.v.length / 9;
  const put = (x, y, z, nx, ny, nz) => o.v.push(
    m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14],
    m[0] * nx + m[4] * ny + m[8] * nz, m[1] * nx + m[5] * ny + m[9] * nz, m[2] * nx + m[6] * ny + m[10] * nz, col[0], col[1], col[2]);
  put(0, 0, t / 2, 0, 0, 1); put(0, 0, -t / 2, 0, 0, -1);
  A.forEach((p) => put(p[0], p[1], t / 2, 0, 0, 1));
  B.forEach((p) => put(p[0], p[1], t / 2 - b, p[2], p[3], 0));
  B.forEach((p) => put(p[0], p[1], b - t / 2, p[2], p[3], 0));
  A.forEach((p) => put(p[0], p[1], -t / 2, 0, 0, -1));
  const r = (k, j) => base + 2 + k * N + (j % N);
  for (let j = 0; j < N; j++) {
    o.i.push(base, r(0, j), r(0, j + 1), base + 1, r(3, j + 1), r(3, j));
    for (let k = 0; k < 3; k++) o.i.push(r(k, j), r(k + 1, j), r(k + 1, j + 1), r(k, j), r(k + 1, j + 1), r(k, j + 1));
  }
}

// Colores mate.
const INK = [0.1, 0.12, 0.18], DARK = [0.04, 0.05, 0.08], SILVER = [0.66, 0.69, 0.75], STEEL = [0.5, 0.53, 0.6], GREY = [0.28, 0.31, 0.38];
const MODELS = {
  phone() {
    const o = { v: [], i: [] };
    slab(o, I, INK, 0.98, 2, 0.12, 0.17, 0.035, 7);
    slab(o, T(0.497, 0.38, 0), GREY, 0.03, 0.3, 0.05, 0.012, 0.008, 2);
    return { ...o, w: 1.25, h: 2.1, ground: -1.3, shadow: [1.7, 0.9], screen: { m: T(0, 0, 0.0606), w: 0.886, h: 1.92, r: 0.12 } };
  },
  laptop() {
    const o = { v: [], i: [] }, y = -0.84;
    const lid = mats(T(0, y + 0.04, -0.9), RX(-0.3), T(0, 0.86, 0));
    slab(o, mats(T(0, y, 0), RX(-PI / 2)), SILVER, 2.6, 1.8, 0.08, 0.14, 0.03, 6);
    slab(o, mats(T(0, y + 0.041, -0.24), RX(-PI / 2)), DARK, 2.2, 0.8, 0.012, 0.04, 0.005, 3);
    slab(o, mats(T(0, y + 0.041, 0.5), RX(-PI / 2)), STEEL, 0.82, 0.46, 0.008, 0.04, 0.003, 3);
    slab(o, lid, SILVER, 2.6, 1.7, 0.05, 0.14, 0.02, 6);
    slab(o, mats(lid, T(0, 0, 0.026)), DARK, 2.5, 1.6, 0.006, 0.1, 0.002, 6);
    return { ...o, w: 2.75, h: 1.95, ground: y - 0.045, shadow: [3.3, 2.4], screen: { m: mats(lid, T(0, 0, 0.0305)), w: 2.4, h: 1.5, r: 0.05 } };
  },
  monitor() {
    const o = { v: [], i: [] };
    slab(o, T(0, 0.28, 0), INK, 2.9, 1.74, 0.09, 0.07, 0.03, 5);
    slab(o, T(0, -0.85, -0.1), STEEL, 0.3, 0.72, 0.06, 0.03, 0.02, 3);
    slab(o, mats(T(0, -1.2, 0), RX(-PI / 2)), SILVER, 1.15, 0.7, 0.05, 0.12, 0.02, 5);
    return { ...o, w: 3, h: 2.5, ground: -1.23, shadow: [2.2, 1.5], screen: { m: T(0, 0.28, 0.0456), w: 2.76, h: 1.5525, r: 0.03 } };
  },
};

const VS = 'attribute vec3 p,n,c;uniform mat4 P,M;varying vec3 vn,vc;void main(){vn=mat3(M)*n;vc=c;gl_Position=P*M*vec4(p,1.);}';
const FS = 'precision mediump float;varying vec3 vn,vc;uniform float a;void main(){vec3 n=normalize(vn);float k=max(dot(n,normalize(vec3(-.45,.7,.6))),0.),f=max(dot(n,normalize(vec3(.7,.1,.5))),0.),h=.5+.5*n.y;'
  + 'vec3 col=vc*(.5+.35*h+.75*k+.2*f)+vec3(.16,.2,.34)*pow(1.-max(n.z,0.),3.)*.35;gl_FragColor=vec4(col*a,a);}';
const QVS = 'attribute vec2 q;uniform mat4 P,M;varying vec2 u;void main(){u=q;gl_Position=P*M*vec4(q,0.,1.);}';
const SFS = 'precision mediump float;varying vec2 u;uniform sampler2D t;uniform vec2 s;uniform vec4 k;void main(){vec2 d=abs(u*s)-(s*.5-k.x);float e=length(max(d,0.))+min(max(d.x,d.y),0.)-k.x;'
  + 'float a=(1.-smoothstep(-k.y,k.y,e))*k.w;vec3 c=mix(vec3(.141,.22,.91),texture2D(t,u+.5).rgb,k.z);gl_FragColor=vec4(c*a,a);}';
const GFS = 'precision mediump float;varying vec2 u;uniform float a;void main(){float d=length(u)*2.;float o=(1.-smoothstep(.05,1.,d))*.3*a;gl_FragColor=vec4(vec3(.07,.1,.17)*o,o);}';

let cv, gl, pMesh, pScreen, pGround, quad, flat, mode = 'gl';
const built = {}, tex = [];
let D = 1, inline = false, want = -1, shown = -1, vis = 0, raf = 0, last = 0, visible = true;
let yaw = -0.4, pitch = 0.12, ty = -0.4, tp = 0.12;

function program(vs, fs, attrs) {
  const p = gl.createProgram();
  attrs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
  [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([type, src]) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  });
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
  return { p, u };
}
function startGL() {
  cv = document.createElement('canvas');
  gl = cv.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) throw new Error('sin WebGL');
  pMesh = program(VS, FS, ['p', 'n', 'c']); pScreen = program(QVS, SFS, ['q']); pGround = program(QVS, GFS, ['q']);
  quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.CULL_FACE); gl.depthFunc(gl.LEQUAL);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; useFlat(); });
  stage.replaceChildren(cv);
}
function model(type) {
  if (built[type]) return built[type];
  const m = MODELS[type](), vb = gl.createBuffer(), ib = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.v), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.i), gl.STATIC_DRAW);
  return (built[type] = { ...m, vb, ib, count: m.i.length });
}
// La captura se pasa a una textura de lados potencia de dos, con mipmaps para que no titile al girar.
function texture(i) {
  if (tex[i] !== undefined) return;
  tex[i] = null;
  const img = new Image(), tall = rows[i].dataset.device === 'phone';
  img.onload = () => {
    if (mode !== 'gl' || gl.isContextLost()) return;
    const c = document.createElement('canvas');
    c.width = tall ? 512 : 1024; c.height = tall ? 1024 : 512;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    tex[i] = t;
    if (shown === i || want === i) kick();
  };
  img.src = ROOT + rows[i].dataset.shot;
}

function draw() {
  gl.viewport(0, 0, cv.width, cv.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (shown < 0 || vis <= 0) return;
  const d = model(rows[shown].dataset.device), asp = cv.width / cv.height, P = persp(asp);
  const e = 1 - (1 - vis) ** 3, fit = Math.min(VIEW * 0.76 / d.h, VIEW * asp * 0.78 / d.w);
  const spin = (1 - e) * (shown === want ? -0.9 : 0.9), size = fit * (0.9 + 0.1 * e);
  const MV = mats(T(0, 0, -DIST), RX(pitch), RY(yaw + spin), Sc(size, size, size));
  const quadAt = (prog) => { gl.useProgram(prog.p); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.uniformMatrix4fv(prog.u.P, false, P); };

  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.CULL_FACE);
  quadAt(pGround);
  gl.uniformMatrix4fv(pGround.u.M, false, mats(MV, T(0, d.ground, 0), RX(-PI / 2), Sc(d.shadow[0], d.shadow[1], 1)));
  gl.uniform1f(pGround.u.a, e);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.enable(gl.CULL_FACE);
  gl.useProgram(pMesh.p);
  gl.bindBuffer(gl.ARRAY_BUFFER, d.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, d.ib);
  for (let k = 0; k < 3; k++) { gl.enableVertexAttribArray(k); gl.vertexAttribPointer(k, 3, gl.FLOAT, false, 36, k * 12); }
  gl.uniformMatrix4fv(pMesh.u.P, false, P); gl.uniformMatrix4fv(pMesh.u.M, false, MV); gl.uniform1f(pMesh.u.a, e);
  gl.drawElements(gl.TRIANGLES, d.count, gl.UNSIGNED_SHORT, 0);
  gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2);

  const s = d.screen, t = tex[shown];
  quadAt(pScreen);
  gl.uniformMatrix4fv(pScreen.u.M, false, mats(MV, s.m, Sc(s.w, s.h, 1)));
  gl.uniform2f(pScreen.u.s, s.w, s.h);
  gl.uniform4f(pScreen.u.k, s.r, 1.5 * VIEW / cv.height / size, t ? 1 : 0, e);
  if (t) gl.bindTexture(gl.TEXTURE_2D, t);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function frame(t) {
  raf = 0;
  const dt = last ? Math.min(60, t - last) : 16.7;
  last = t;
  if (calm) { shown = want; vis = want < 0 ? 0 : 1; yaw = ty; pitch = tp; }
  else {
    if (shown !== want) { vis -= dt / 150; if (vis <= 0) { vis = 0; shown = want; } }
    else if (shown >= 0 && vis < 1) vis = Math.min(1, vis + dt / 420);
    const k = 1 - Math.exp(-dt / 130);
    yaw += (ty - yaw) * k; pitch += (tp - pitch) * k;
  }
  draw();
  const moving = shown !== want || (shown >= 0 && (vis < 1 || Math.abs(ty - yaw) > 0.002 || Math.abs(tp - pitch) > 0.002));
  if (moving && !calm) raf = requestAnimationFrame(frame); else last = 0;
}
// El loop solo corre mientras algo cambia, la sección está a la vista y la pestaña está activa.
const kick = () => { if (mode === 'gl' && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };

function useFlat() {
  mode = 'flat';
  flat = document.createElement('div');
  flat.className = 'dv-flat';
  flat.appendChild(Object.assign(new Image(), { alt: '', decoding: 'async' }));
  stage.replaceChildren(flat);
  if (want >= 0) show(want);
}

function show(i) {
  if (inline) {
    rows.forEach((li, j) => { li.classList.toggle('dv-open', j === i); li.querySelector('.dv-btn').setAttribute('aria-expanded', j === i); });
    if (i >= 0) { rows[i].appendChild(stage); size(); }
  }
  want = i;
  if (mode === 'flat') {
    if (i >= 0) { flat.firstChild.src = ROOT + rows[i].dataset.shot; flat.className = 'dv-flat ' + rows[i].dataset.device; }
    requestAnimationFrame(() => flat.classList.toggle('on', i >= 0));
    return;
  }
  if (i >= 0) texture(i);
  kick();
}

function size() {
  if (mode !== 'gl') return;
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  D = Math.min(devicePixelRatio || 1, 1.5);
  if (cv.width !== Math.round(w * D) || cv.height !== Math.round(h * D)) { cv.width = Math.round(w * D); cv.height = Math.round(h * D); }
}
// En pantallas anchas el dispositivo va a la derecha, en el espacio que cada fila deja reservado con CSS.
// En celular se abre debajo de la fila que se toca.
function place() {
  const room = narrow.matches ? 0 : parseFloat(getComputedStyle(rows[0]).paddingRight) - 6;
  const next = room < 150;
  if (next !== inline || !stage.isConnected) { rows.forEach((li) => li.classList.remove('dv-open')); want = -1; if (mode === 'gl') { shown = -1; vis = 0; } else flat.classList.remove('on'); }
  inline = next;
  list.classList.toggle('dv-in', inline);
  if (inline) { stage.style.cssText = ''; if (!stage.isConnected) rows[0].appendChild(stage); }
  else {
    stage.style.cssText = `width:${room}px;top:${list.offsetTop + list.offsetHeight / 2}px;right:${getComputedStyle(work).paddingRight}`;
    work.appendChild(stage);
  }
  size();
  ty = inline || coarse ? -0.34 : -0.4; tp = 0.12;
  kick();
}

rows.forEach((li, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'dv-btn';
  const name = li.children[1].textContent.trim();
  b.setAttribute('aria-label', EN ? `Show the ${name} screenshot` : `Ver la captura de ${name}`);
  b.setAttribute('aria-expanded', 'false');
  li.appendChild(b);
  li.addEventListener('pointerenter', (e) => { if (!inline && e.pointerType === 'mouse') show(i); });
  li.addEventListener('focusin', () => { if (!inline) show(i); });
  li.addEventListener('click', (e) => { if (inline && !e.target.closest('a')) show(want === i ? -1 : i); });
});
list.addEventListener('pointerleave', () => { if (!inline) show(-1); });
list.addEventListener('focusout', (e) => { if (!inline && !list.contains(e.relatedTarget)) show(-1); });
if (!coarse && !calm) list.addEventListener('pointermove', (e) => {
  if (inline || mode !== 'gl') return;
  const r = list.getBoundingClientRect();
  ty = -0.4 + ((e.clientX - r.left) / r.width - 0.5) * 0.5;
  tp = 0.12 + ((e.clientY - r.top) / r.height - 0.5) * 0.3;
  kick();
}, { passive: true });

if (low) useFlat();
else try { startGL(); } catch (e) { useFlat(); }
place();
let again = 0;
addEventListener('resize', () => { clearTimeout(again); again = setTimeout(place, 160); });
document.addEventListener('visibilitychange', kick);
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) kick(); else { cancelAnimationFrame(raf); raf = 0; last = 0; } }).observe(work);
