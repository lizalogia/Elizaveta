// Scroll-triggered reveal — IntersectionObserver, not a scroll listener.
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Card tilt on hover.
document.querySelectorAll('.card').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(600px) rotateX(${py * -6}deg) rotateY(${px * 6}deg)`;
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
});

// Magnetic pull on the primary CTA only.
const cta = document.getElementById('cta');
if (cta) {
  cta.addEventListener('pointermove', (e) => {
    const r = cta.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    cta.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
  });
  cta.addEventListener('pointerleave', () => { cta.style.transform = ''; });
}

// Cursor-follow accent — desktop pointers only, never on touch.
if (matchMedia('(pointer: fine)').matches) {
  const dot = document.querySelector('.cursor-dot');
  window.addEventListener('pointermove', (e) => {
    dot.classList.add('is-active');
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });
}
