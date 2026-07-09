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

  // Header contrast: mix-blend-mode against scrolled content is unreliable
  // across browsers, so past the hero we switch to an explicit light/dark
  // class based on whichever [data-theme] band sits under the header.
  const siteHeader = document.querySelector('.site-header');
  const hero = document.getElementById('hero');
  let headerTicking = false;

  const updateHeaderTheme = () => {
    headerTicking = false;
    const heroBottom = hero.getBoundingClientRect().bottom;
    if (heroBottom > 10) {
      siteHeader.classList.remove('site-header--light', 'site-header--dark');
      return;
    }
    const probeX = 24;
    const probeY = 60;
    const stack = document.elementsFromPoint(probeX, probeY);
    const themed = stack.find((el) => el.dataset && el.dataset.theme);
    const theme = themed ? themed.dataset.theme : 'light';
    siteHeader.classList.toggle('site-header--light', theme === 'light');
    siteHeader.classList.toggle('site-header--dark', theme === 'dark');
  };

  window.addEventListener('scroll', () => {
    if (!headerTicking) {
      headerTicking = true;
      requestAnimationFrame(updateHeaderTheme);
    }
  }, { passive: true });
  window.addEventListener('resize', updateHeaderTheme);
  updateHeaderTheme();

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
  const videoFrame = document.getElementById('videoModalFrame');
  const videoEmpty = document.getElementById('videoModalEmpty');

  // Google Drive doesn't serve a stable direct file URL for hotlinking, so
  // Drive-sourced videos play through Drive's own embeddable preview (full
  // original quality, no re-encoding) instead of the native <video> tag.
  const getDriveEmbedUrl = (src) => {
    const match = src.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
  };

  const openVideoModal = (src) => {
    const driveEmbed = src ? getDriveEmbedUrl(src) : null;
    videoPlayer.style.display = 'none';
    videoFrame.style.display = 'none';
    videoEmpty.style.display = 'none';
    if (driveEmbed) {
      videoFrame.src = driveEmbed;
      videoFrame.style.display = '';
    } else if (src) {
      videoPlayer.src = src;
      videoPlayer.style.display = '';
      videoPlayer.play().catch(() => {});
    } else {
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
    videoFrame.removeAttribute('src');
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

  // Luxury interaction layer: magnetic buttons, roaming "Смотреть" cursor,
  // 3D tilt on project cards. Only on devices with a real mouse — touch
  // has no hover/cursor concept, so none of this applies there.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.documentElement.classList.add('has-fine-pointer');

    // Magnetic pull on circular buttons
    const magnetize = (el, strength) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transition = 'transform 0.15s ease-out';
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform 0.4s var(--ease-out-expo)';
        el.style.transform = '';
      });
    };
    document.querySelectorAll('.projects__arrow, .video-modal__close').forEach((el) => magnetize(el, 0.35));
    document.querySelectorAll('.format-card, .contacts__grid a').forEach((el) => magnetize(el, 0.06));

    // Ambient spotlight that follows the cursor on dark sections
    document.querySelectorAll('.formats').forEach((section) => {
      const glow = document.createElement('div');
      glow.className = 'section-glow';
      glow.setAttribute('aria-hidden', 'true');
      section.prepend(glow);
      section.addEventListener('mouseenter', () => glow.classList.add('is-active'));
      section.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
      section.addEventListener('mousemove', (e) => {
        const r = section.getBoundingClientRect();
        glow.style.setProperty('--gx', `${e.clientX - r.left}px`);
        glow.style.setProperty('--gy', `${e.clientY - r.top}px`);
      });
    });

    // Roaming cursor over project cards
    const cursor = document.getElementById('customCursor');
    let cursorX = 0;
    let cursorY = 0;
    let cursorRafId = null;
    const positionCursor = () => {
      cursorRafId = null;
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
    };
    window.addEventListener('mousemove', (e) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      if (!cursorRafId) cursorRafId = requestAnimationFrame(positionCursor);
    });

    // 3D tilt + cursor activation on project cards
    document.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('mouseenter', () => {
        card.style.transition = 'box-shadow 0.5s ease';
        cursor.classList.add('is-active');
      });
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${py * -10}deg) rotateY(${px * 10}deg) scale3d(1.02, 1.02, 1.02)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s var(--ease-out-expo), box-shadow 0.5s ease';
        card.style.transform = '';
        cursor.classList.remove('is-active');
      });
    });
  }
})();
