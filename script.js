// Ajusta el nombre al ancho de la columna, con cualquier fuente que haya cargado.
const h1 = document.getElementById('name');
const mail = document.getElementById('mail');
function fit(el) {
  const box = el.parentElement, cs = getComputedStyle(box);
  const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  el.style.fontSize = '100px';
  el.style.fontSize = (100 * w / el.firstElementChild.getBoundingClientRect().width * 0.998) + 'px';
}

// Dibuja las conexiones del diagrama a partir de la posición real de cada nodo.
const flow = document.getElementById('flow');
const svg = document.getElementById('lines');
const q = (k) => [...flow.querySelectorAll(`[data-node="${k}"]`)];
const me = q('me')[0], tools = q('tool'), outs = q('out');
const NS = 'http://www.w3.org/2000/svg';
let paths = [];

function link(a, b, delay) {
  const f = flow.getBoundingClientRect(), r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
  const x1 = r1.right - f.left, y1 = r1.top + r1.height / 2 - f.top;
  const x2 = r2.left - f.left, y2 = r2.top + r2.height / 2 - f.top;
  const mx = (x1 + x2) / 2;
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`);
  p.setAttribute('pathLength', '1');
  p.style.setProperty('--d', delay + 's');
  svg.appendChild(p);
  paths.push({ p, a, b });
}
function drawLines() {
  svg.replaceChildren(); paths = [];
  tools.forEach((t) => link(me, t, 0));
  tools.forEach((t) => outs.forEach((o) => link(t, o, 0.6)));
  // Señales que recorren las conexiones.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paths.forEach(({ p }, i) => {
      p.id = 'route-' + i;
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', '3');
      dot.setAttribute('class', 'pulse');
      const m = document.createElementNS(NS, 'animateMotion');
      m.setAttribute('dur', '3.4s');
      m.setAttribute('begin', (1.6 + i * 0.47) + 's');
      m.setAttribute('repeatCount', 'indefinite');
      const mp = document.createElementNS(NS, 'mpath');
      mp.setAttribute('href', '#route-' + i);
      dot.setAttribute('opacity', '0');
      const show = document.createElementNS(NS, 'set');
      show.setAttribute('attributeName', 'opacity');
      show.setAttribute('to', '.85');
      show.setAttribute('begin', (1.6 + i * 0.47) + 's');
      m.appendChild(mp); dot.append(m, show); svg.appendChild(dot);
    });
  }
}
// Al pasar por un resultado, se ilumina el camino que llega a él.
outs.forEach((o) => {
  const set = (on) => paths.forEach(({ p, a, b }) => p.classList.toggle('on', on && (b === o || a === me)));
  o.addEventListener('pointerenter', () => set(true));
  o.addEventListener('pointerleave', () => set(false));
  o.addEventListener('focus', () => set(true));
  o.addEventListener('blur', () => set(false));
});

// Las señales se pausan cuando el diagrama no está a la vista.
if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { if (e.isIntersecting) svg.unpauseAnimations(); else svg.pauseAnimations(); }).observe(flow);
function layout() { fit(h1); fit(mail); drawLines(); }
layout();
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('anim');
  setTimeout(() => document.documentElement.classList.remove('anim'), 2000);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
addEventListener('resize', layout);
