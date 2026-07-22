/* =========================================================
   LIZALOGIA — script.js
   Vanilla JS. No dependencies. Progressive enhancement.
   ========================================================= */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Menu (burger + overlay) ---------- */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    nav.setAttribute('aria-hidden', String(!open));
  };

  if (burger && nav) {
    burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    nav.querySelectorAll('[data-nav]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
    });
  }

  /* ---------- Header: hide on scroll down, show on scroll up ---------- */
  const header = document.getElementById('header');
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 12);
    if (!document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > lastY && y > 240);
    }
    lastY = y;

    // scroll progress
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? y / max : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${p})`;

    ticking = false;
  };
  const progressBar = document.querySelector('.scroll-progress span');
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Stat count-up ---------- */
  const stats = document.querySelectorAll('[data-count]');
  if (stats.length && !reduceMotion && 'IntersectionObserver' in window) {
    const fmt = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ');
    const animateCount = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        el.textContent = fmt(Math.round(target * eased)) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const so = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { animateCount(entry.target); so.unobserve(entry.target); }
      }
    }, { threshold: 0.6 });
    stats.forEach((el) => so.observe(el));
  }

  /* ---------- Parallax (hero phone + wordmark) ---------- */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !reduceMotion) {
    let px = false;
    const applyParallax = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (center - vh / 2) * -parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      px = false;
    };
    window.addEventListener('scroll', () => {
      if (!px) { requestAnimationFrame(applyParallax); px = true; }
    }, { passive: true });
    applyParallax();
  }

  /* ---------- Magnetic buttons (fine pointer only) ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const strength = 0.25;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${(x * strength).toFixed(1)}px, ${(y * strength).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    /* ---------- Card tilt ---------- */
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const media = card.querySelector('.proj-card__media');
      if (!media) return;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        media.style.transform = `perspective(700px) rotateX(${(py * -5).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) scale(1.015)`;
      });
      card.addEventListener('pointerleave', () => { media.style.transform = ''; });
    });
  }
})();
