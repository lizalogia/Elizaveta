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

  // Project video modal
  const videoModal = document.getElementById('videoModal');
  const videoPlayer = document.getElementById('videoModalPlayer');
  const videoEmpty = document.getElementById('videoModalEmpty');

  const openVideoModal = (src) => {
    if (src) {
      videoPlayer.src = src;
      videoPlayer.style.display = '';
      videoEmpty.style.display = 'none';
      videoPlayer.play().catch(() => {});
    } else {
      videoPlayer.removeAttribute('src');
      videoPlayer.style.display = 'none';
      videoEmpty.style.display = 'block';
    }
    videoModal.classList.add('is-open');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeVideoModal = () => {
    videoModal.classList.remove('is-open');
    videoModal.setAttribute('aria-hidden', 'true');
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => openVideoModal(card.dataset.video));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openVideoModal(card.dataset.video);
      }
    });
  });
  videoModal.querySelectorAll('[data-video-close]').forEach((el) => el.addEventListener('click', closeVideoModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal.classList.contains('is-open')) closeVideoModal();
  });

  // Projects carousel
  const projectsGrid = document.getElementById('projectsGrid');
  const projectsPrev = document.getElementById('projectsPrev');
  const projectsNext = document.getElementById('projectsNext');

  if (projectsGrid && projectsPrev && projectsNext) {
    const scrollByCard = (dir) => {
      const card = projectsGrid.querySelector('.project-card');
      const gap = parseFloat(getComputedStyle(projectsGrid).gap) || 0;
      const amount = card ? card.getBoundingClientRect().width + gap : 300;
      projectsGrid.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };
    const updateArrows = () => {
      const max = projectsGrid.scrollWidth - projectsGrid.clientWidth;
      projectsPrev.disabled = projectsGrid.scrollLeft <= 4;
      projectsNext.disabled = projectsGrid.scrollLeft >= max - 4;
    };

    projectsPrev.addEventListener('click', () => scrollByCard(-1));
    projectsNext.addEventListener('click', () => scrollByCard(1));
    projectsGrid.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }
})();
