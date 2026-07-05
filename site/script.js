(() => {
  // Scroll-triggered reveal
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.setProperty('--d', i % 5);
    io.observe(el);
  });

  // Mobile nav drawer
  const toggle = document.getElementById('menuToggle');
  const drawer = document.getElementById('navDrawer');
  const scrim = document.getElementById('navScrim');

  const closeNav = () => {
    toggle.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('is-open');
    scrim.classList.remove('is-open');
  };
  const openNav = () => {
    toggle.setAttribute('aria-expanded', 'true');
    drawer.classList.add('is-open');
    scrim.classList.add('is-open');
  };

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeNav() : openNav();
  });
  scrim.addEventListener('click', closeNav);
  drawer.querySelectorAll('[data-close]').forEach((a) => a.addEventListener('click', closeNav));
})();
