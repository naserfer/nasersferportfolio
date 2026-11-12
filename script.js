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

// Al descargar el CV se elige el idioma. Sin JavaScript, el enlace baja el CV del idioma de la página.
(() => {
  const EN = document.documentElement.lang.startsWith('en'), base = document.documentElement.dataset.root || '';
  const files = [
    { lang: 'es', name: 'Español', note: 'PDF · 1 página', file: 'CV_Naser_Fernandez.pdf' },
    { lang: 'en', name: 'English', note: 'PDF · 1 page', file: 'CV_Naser_Fernandez_EN.pdf' },
  ];
  if (EN) files.reverse();
  let box;
  function build() {
    box = document.createElement('dialog');
    box.className = 'cvpick';
    box.setAttribute('aria-labelledby', 'cvpick-t');
    box.innerHTML = `<button class="cvpick-x" type="button" aria-label="${EN ? 'Close' : 'Cerrar'}">×</button>
      <h2 id="cvpick-t">${EN ? 'Download CV' : 'Descargar CV'}</h2>
      <p>${EN ? 'Which language do you want it in?' : '¿En qué idioma lo querés?'}</p>
      <div class="cvpick-opts">${files.map((f) => `<a href="${base}files/${f.file}" download="${f.file}" hreflang="${f.lang}" lang="${f.lang}">${f.name}<small>${f.note}</small></a>`).join('')}</div>`;
    box.querySelector('.cvpick-x').addEventListener('click', () => box.close());
    box.addEventListener('click', (e) => {
      const r = box.getBoundingClientRect(), out = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if ((e.target === box && out) || e.target.closest('.cvpick-opts a')) setTimeout(() => box.close(), 0);
    });
    document.body.appendChild(box);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="CV_Naser_Fernandez"]');
    if (!a || a.closest('.cvpick') || e.ctrlKey || e.metaKey || e.shiftKey || !window.HTMLDialogElement) return;
    e.preventDefault();
    if (!box) build();
    box.showModal();
    box.querySelector('.cvpick-opts a').focus();
  });
})();
