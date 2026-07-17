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

  // Subtle hero parallax — the photo drifts slower than the scroll, capped
  // so it never moves more than a few percent of the viewport.
  const heroParallax = document.querySelector('.hero__photo-parallax');
  if (heroParallax && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ticking = false;
    const updateParallax = () => {
      ticking = false;
      const offset = Math.min(Math.max(window.scrollY * 0.12, 0), 60);
      heroParallax.style.transform = `translate3d(0, ${offset}px, 0)`;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateParallax);
      }
    }, { passive: true });
    updateParallax();
  }

  // Hero starfield — a dense field of tiny light points baked once into a
  // canvas, sitting under the smaller set of DOM spans that actually
  // twinkle. It's a static bitmap (redrawn only on resize), so 100k points
  // cost nothing per animation frame.
  const starCanvas = document.querySelector('.hero__starfield');
  if (starCanvas) {
    const sctx = starCanvas.getContext('2d');
    const STAR_COUNT = 100000;
    const BAND_MIN = 0.33;
    const BAND_MAX = 0.79;
    let points = null;

    const renderStars = () => {
      const rect = starCanvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      starCanvas.width = w;
      starCanvas.height = h;

      if (!points) {
        points = {
          x: new Float32Array(STAR_COUNT),
          y: new Float32Array(STAR_COUNT),
          a: new Uint8Array(STAR_COUNT),
          big: new Uint8Array(STAR_COUNT),
        };
        for (let i = 0; i < STAR_COUNT; i++) {
          points.x[i] = Math.random();
          points.y[i] = BAND_MIN + Math.random() * (BAND_MAX - BAND_MIN);
          points.a[i] = 18 + Math.floor(Math.random() * 90);
          points.big[i] = Math.random() < 0.04 ? 1 : 0;
        }
      }

      const img = sctx.createImageData(w, h);
      const data = img.data;
      const plot = (px, py, a) => {
        if (px < 0 || px >= w || py < 0 || py >= h) return;
        const idx = (py * w + px) * 4;
        if (a > data[idx + 3]) {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = a;
        }
      };
      for (let i = 0; i < STAR_COUNT; i++) {
        const px = Math.floor(points.x[i] * w);
        const py = Math.floor(points.y[i] * h);
        const a = points.a[i];
        plot(px, py, a);
        if (points.big[i]) {
          plot(px + 1, py, a);
          plot(px, py + 1, a);
          plot(px + 1, py + 1, a);
        }
      }
      sctx.putImageData(img, 0, 0);
    };

    renderStars();
    let starResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(starResizeTimer);
      starResizeTimer = setTimeout(renderStars, 200);
    });
  }

  // Header contrast: mix-blend-mode against scrolled content is unreliable
  // across browsers, so past the hero we switch to an explicit light/dark
  // class based on whichever [data-theme] band sits under the header.
  const siteHeader = document.querySelector('.site-header');
  const hero = document.getElementById('hero');
  let headerTicking = false;

  if (hero) {
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
  } else {
    // Sub-pages (format categories) have no hero band, so the header stays
    // in its default light-on-photo blend mode; give it an explicit theme
    // instead since there's no scrolled content underneath to blend against.
    siteHeader.classList.add('site-header--dark');
  }

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

  // RuTube links (including /shorts/) embed the same way via its own player.
  const getRutubeEmbedUrl = (src) => {
    const match = src.match(/rutube\.ru\/(?:video|shorts)\/([a-zA-Z0-9]+)/);
    return match ? `https://rutube.ru/play/embed/${match[1]}` : null;
  };

  const openVideoModal = (src) => {
    const embedUrl = src ? (getDriveEmbedUrl(src) || getRutubeEmbedUrl(src)) : null;
    videoPlayer.style.display = 'none';
    videoFrame.style.display = 'none';
    videoEmpty.style.display = 'none';
    if (embedUrl) {
      videoFrame.src = embedUrl;
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

  // Roaming "Смотреть" cursor label over project cards. Only on devices
  // with a real mouse — touch has no hover/cursor concept.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.documentElement.classList.add('has-fine-pointer');

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

    document.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('mouseenter', () => cursor.classList.add('is-active'));
      card.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
    });
  }

  // Client-logo marquee: pause the auto-scroll while the user is touching it.
  document.querySelectorAll('.marquee--clients').forEach((marquee) => {
    marquee.addEventListener('touchstart', () => marquee.classList.add('is-touched'), { passive: true });
    marquee.addEventListener('touchend', () => marquee.classList.remove('is-touched'));
    marquee.addEventListener('touchcancel', () => marquee.classList.remove('is-touched'));
  });
})();
