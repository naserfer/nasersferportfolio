// Ajusta el nombre y el correo al ancho disponible, con cualquier fuente que haya cargado.
const h1 = document.getElementById('name');
const mailLink = document.getElementById('mail');
function fit(el) {
  const box = el.parentElement, cs = getComputedStyle(box);
  const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  el.style.fontSize = '100px';
  el.style.fontSize = (100 * w / el.firstElementChild.getBoundingClientRect().width * 0.998) + 'px';
}
function layout() { fit(h1); fit(mailLink); }
layout();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
addEventListener('resize', layout);

// El selector de idioma recuerda la elección para las próximas visitas.
document.querySelectorAll('a.lang').forEach((a) => a.addEventListener('click', () => {
  document.cookie = `nf-lang=${a.dataset.lang}; path=/; max-age=31536000; samesite=lax`;
}));

// Los efectos pesados se cargan aparte, solo en equipos que los pueden mover y si no se pidió menos movimiento.
const calmFx = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowFx = (navigator.hardwareConcurrency || 8) <= 4;
const idleFx = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
if (!calmFx && !lowFx && h1.getAnimations) addEventListener('load', () => idleFx(() => import('./fx-name.js').catch(() => {})));
// Los dispositivos 3D de los proyectos se piden recién cuando la sección está por entrar en pantalla.
const workFx = document.querySelector('.work');
if (workFx && 'IntersectionObserver' in window) {
  const seen = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    seen.disconnect();
    import('./fx-devices.js').catch(() => {});
  }, { rootMargin: '120px 0px' });
  seen.observe(workFx);
}
