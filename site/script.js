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
    toggle.focus({ preventScroll: true });
  };
  const openNav = () => {
    toggle.setAttribute('aria-expanded', 'true');
    drawer.classList.add('is-open');
    scrim.classList.add('is-open');
    const first = drawer.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeNav();
  });

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
  // Unlisted videos live under /video/private/<id>/?p=<access token>; the token
  // has to travel with the embed URL or the player answers with a black frame,
  // and "private" must not be mistaken for the id itself.
  const getRutubeEmbedUrl = (src) => {
    const match = src.match(/rutube\.ru\/(?:video\/private|video|shorts)\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    const token = src.match(/[?&]p=([a-zA-Z0-9_-]+)/);
    return `https://rutube.ru/play/embed/${match[1]}${token ? `?p=${token[1]}` : ''}`;
  };

  const openVideoModal = (src) => {
    const embedUrl = src ? (getDriveEmbedUrl(src) || getRutubeEmbedUrl(src)) : null;
    videoPlayer.style.display = 'none';
    videoFrame.style.display = 'none';
    videoEmpty.style.display = 'none';
    if (embedUrl) {
      videoFrame.src = embedUrl;
      videoFrame.style.display = 'block';
    } else if (src) {
      videoPlayer.src = src;
      videoPlayer.style.display = 'block';
      videoPlayer.play().catch(() => {});
    } else {
      videoEmpty.style.display = 'block';
    }
    videoModal.classList.add('is-open');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lastVideoTrigger = document.activeElement;
    // The dialog fades in via a visibility transition; the close button only
    // becomes focusable once the transition has ticked, so defer past it.
    setTimeout(() => {
      if (!videoModal.classList.contains('is-open')) return;
      const closeBtn = videoModal.querySelector('.video-modal__close');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }, 80);
  };
  let lastVideoTrigger = null;
  const closeVideoModal = () => {
    videoModal.classList.remove('is-open');
    videoModal.setAttribute('aria-hidden', 'true');
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    videoFrame.removeAttribute('src');
    document.body.style.overflow = '';
    if (lastVideoTrigger && lastVideoTrigger.isConnected) lastVideoTrigger.focus({ preventScroll: true });
  };

  document.querySelectorAll('[data-video]').forEach((card) => {
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
      // Tilt follows the pointer within the card — drives the rotateX/rotateY
      // in the CSS hover transform via --mx/--my (0..1, card-relative).
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3));
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3));
      });
    });
  }

  // Any marquee (client logos, case reel): pause the auto-scroll while the user is touching it.
  document.querySelectorAll('.marquee:not(.marquee--cases)').forEach((marquee) => {
    marquee.addEventListener('touchstart', () => marquee.classList.add('is-touched'), { passive: true });
    marquee.addEventListener('touchend', () => marquee.classList.remove('is-touched'));
    marquee.addEventListener('touchcancel', () => marquee.classList.remove('is-touched'));
  });

  // Case reel: auto-scrolls via native scrollLeft (rAF) instead of a CSS
  // transform, so a real swipe, trackpad, mouse wheel, or click-drag always
  // takes over immediately — the strip is genuinely user-scrollable, not
  // just a decorative animation. Cards are duplicated in the markup so the
  // loop can reset seamlessly once scrollLeft passes the halfway point.
  const casesTrack = document.querySelector('.marquee--cases');
  if (casesTrack) {
    const casesReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let autoPlay = !casesReduceMotion;
    let isDragging = false;
    let dragMoved = 0;
    let dragStartX = 0;
    let dragStartScroll = 0;

    const normalizeLoop = () => {
      const half = casesTrack.scrollWidth / 2;
      if (casesTrack.scrollLeft >= half) casesTrack.scrollLeft -= half;
      else if (casesTrack.scrollLeft < 0) casesTrack.scrollLeft += half;
    };

    const tick = () => {
      if (autoPlay && !isDragging) {
        casesTrack.scrollLeft += 0.3;
        normalizeLoop();
      }
      requestAnimationFrame(tick);
    };
    if (!casesReduceMotion) requestAnimationFrame(tick);

    casesTrack.addEventListener('mouseenter', () => { autoPlay = false; });
    casesTrack.addEventListener('mouseleave', () => { if (!isDragging) autoPlay = !casesReduceMotion; });
    casesTrack.addEventListener('touchstart', () => { autoPlay = false; }, { passive: true });
    casesTrack.addEventListener('touchend', () => { autoPlay = !casesReduceMotion; });
    casesTrack.addEventListener('wheel', () => { autoPlay = false; }, { passive: true });

    // Click-and-drag with a mouse (touch already scrolls natively).
    casesTrack.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      isDragging = true;
      dragMoved = 0;
      autoPlay = false;
      dragStartX = e.clientX;
      dragStartScroll = casesTrack.scrollLeft;
      casesTrack.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const delta = e.clientX - dragStartX;
      dragMoved = Math.max(dragMoved, Math.abs(delta));
      casesTrack.scrollLeft = dragStartScroll - delta;
    });
    window.addEventListener('pointerup', () => {
      if (!isDragging) return;
      isDragging = false;
      casesTrack.classList.remove('is-dragging');
      normalizeLoop();
      autoPlay = !casesReduceMotion;
    });

    // Suppress the video-modal click that would otherwise fire on the card
    // right under the cursor when a drag ends.
    casesTrack.addEventListener('click', (e) => {
      if (dragMoved > 6) { e.preventDefault(); e.stopPropagation(); dragMoved = 0; }
    }, true);
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Process arrow-flow: draw the vertical line when it scrolls into view.
  const flow = document.getElementById('flow');
  if (flow) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      flow.classList.add('is-drawn');
    } else {
      const fo = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { flow.classList.add('is-drawn'); fo.unobserve(flow); }
        });
      }, { threshold: 0.25 });
      fo.observe(flow);
    }
  }

  // Statistics count-up animation.
  const stats = document.querySelectorAll('[data-count]');
  if (stats.length) {
    const runCount = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      // A year (e.g. 2023) must never pick up a thousands separator the way
      // a real count (50 000) does — 'noGroup' opts a tile out of grouping.
      const format = (n) => (el.dataset.noGroup !== undefined ? String(n) : n.toLocaleString('ru-RU'));
      if (reduceMotion) { el.textContent = format(target) + suffix; return; }
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = format(Math.round(target * eased)) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      const so = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { runCount(entry.target); so.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      stats.forEach((el) => so.observe(el));
    } else {
      stats.forEach(runCount);
    }
  }

  // Active-section highlight in the nav drawer (scroll spy).
  if (drawer && 'IntersectionObserver' in window) {
    const navLinks = [...drawer.querySelectorAll('a[href^="#"]')];
    const idToLink = new Map(
      navLinks.map((a) => [a.getAttribute('href').slice(1), a]).filter(([id]) => id)
    );
    if (idToLink.size) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const link = idToLink.get(entry.target.id);
          if (!link) return;
          navLinks.forEach((a) => a.classList.remove('is-active'));
          link.classList.add('is-active');
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      idToLink.forEach((_link, id) => {
        const section = document.getElementById(id);
        if (section) spy.observe(section);
      });
    }
  }

  // Cinematic cross-page transition: veil out before navigating to another
  // page in the site, so category pages never flash the browser's raw load.
  const pageFade = document.getElementById('pageFade');
  if (pageFade && !reduceMotion) {
    document.querySelectorAll('a[href$=".html"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const url = link.getAttribute('href');
        if (!url || link.target === '_blank' || link.hasAttribute('download')) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        pageFade.classList.add('is-leaving');
        window.setTimeout(() => { window.location.href = url; }, 420);
      });
    });
    // Restore the veil to its idle state if the page is shown from bfcache
    // (back/forward), so it doesn't stay covered.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) pageFade.classList.remove('is-leaving');
    });
  }
})();
