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
