/* l.media — shared behaviour across all pages */
(function () {
  "use strict";

  const page = document.body.dataset.page; // "home" | category slug
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function embedUrl(v) {
    if (!v || !v.source) return null;
    if (v.source === "drive") return "https://drive.google.com/file/d/" + v.id + "/preview";
    if (v.source === "rutube") return "https://rutube.ru/play/embed/" + v.id + "/";
    return null;
  }

  function fmtIdx(i, total) {
    return String(i + 1).padStart(2, "0") + "/" + total;
  }

  const GRADIENTS = [
    "linear-gradient(155deg,#3a2f22,#14100d)",
    "linear-gradient(155deg,#2c241c,#0f0b08)",
    "linear-gradient(155deg,#332a1e,#161009)",
    "linear-gradient(155deg,#241d16,#0c0906)",
    "linear-gradient(155deg,#3d3222,#181209)",
  ];

  function categoryLabel(slug) {
    const c = CATEGORIES.find((c) => c.slug === slug);
    return c ? c.name : slug;
  }
  function categoryHref(slug) {
    const c = CATEGORIES.find((c) => c.slug === slug);
    return c ? c.file : "index.html";
  }

  function buildCard(v, i, total, tagOverride) {
    const card = document.createElement("div");
    const hasLink = !!embedUrl(v);
    card.className = "card" + (hasLink ? "" : " disabled");
    const tag = tagOverride || (v.cat ? categoryLabel(v.cat) : "");
    card.innerHTML =
      '<div class="still" style="background:' + GRADIENTS[i % GRADIENTS.length] + '"></div>' +
      '<div class="card-top"><span>' + tag + "</span><span>" + fmtIdx(i, total) + "</span></div>" +
      (hasLink
        ? '<div class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>'
        : '<div class="soon">без ссылки</div>') +
      '<div class="card-body"><div class="cat">' + tag + '</div><h3>' + v.title + "</h3></div>";
    if (hasLink) {
      card.addEventListener("click", () => openLightbox(embedUrl(v), v.title));
    }
    return card;
  }

  /* ---------- marquee ---------- */
  function buildMarquee() {
    const a = document.getElementById("mqa");
    const b = document.getElementById("mqb");
    if (!a || !b) return;
    const doubledA = CLIENTS.concat(CLIENTS);
    const doubledB = [...CLIENTS].reverse().concat([...CLIENTS].reverse());
    a.innerHTML = doubledA.map((t) => "<span>" + t + "</span>").join("");
    b.innerHTML = doubledB.map((t) => "<span>" + t + "</span>").join("");
  }

  /* ---------- lightbox ---------- */
  let lightbox, lbInner, lbTitle;
  function openLightbox(src, title) {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.allow = "autoplay; fullscreen";
    iframe.allowFullscreen = true;
    const old = lbInner.querySelector("iframe");
    if (old) old.remove();
    lbInner.insertBefore(iframe, lbInner.firstChild);
    lbTitle.textContent = title;
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    const old = lbInner.querySelector("iframe");
    if (old) old.remove();
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  }

  /* ---------- hero + timecode ---------- */
  function initHero(heroEl) {
    if (!heroEl) return;
    requestAnimationFrame(() => heroEl.classList.add("loaded"));
    const tc = heroEl.querySelector(".tc-val");
    if (!tc) return;
    if (reduceMotion) {
      tc.textContent = "00:00:00:00";
      return;
    }
    let frame = 0;
    setInterval(() => {
      frame++;
      const ff = frame % 25;
      const ss = Math.floor(frame / 25) % 60;
      const mm = Math.floor(frame / 25 / 60) % 60;
      const hh = Math.floor(frame / 25 / 60 / 60);
      tc.textContent = [hh, mm, ss, ff].map((n) => String(n).padStart(2, "0")).join(":");
    }, 40);
  }

  /* ---------- nav mobile ---------- */
  function initNav() {
    const burger = document.querySelector(".burger");
    const links = document.querySelector(".nav-links");
    if (!burger || !links) return;
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        burger.classList.remove("open");
        document.body.style.overflow = "";
      })
    );
  }

  /* ---------- home page ---------- */
  function renderHome() {
    const reelTrack = document.getElementById("reelTrack");
    if (reelTrack) {
      HOME_REEL.forEach((v, i) => reelTrack.appendChild(buildCard(v, i, HOME_REEL.length)));
      const more = document.createElement("div");
      more.className = "reel-more";
      const total = Object.values(VIDEOS).reduce((s, arr) => s + arr.length, 0);
      more.innerHTML =
        '<span class="n">+' + total + '</span><span class="mono" style="font-size:.72rem;color:var(--muted);">в форматах ниже</span>';
      reelTrack.appendChild(more);
    }

    const catsGrid = document.getElementById("catsGrid");
    if (catsGrid) {
      CATEGORIES.forEach((c) => {
        const count = VIDEOS[c.slug] ? VIDEOS[c.slug].length : 0;
        const el = document.createElement("a");
        el.href = c.file;
        el.className = "cat-card";
        el.innerHTML =
          '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="' + c.icon + '"/></svg>' +
          "<h3>" + c.name + "</h3>" +
          "<p>" + c.desc + "</p>" +
          '<span class="count">' + count + " работ</span>" +
          '<span class="arrow mono">→</span>';
        catsGrid.appendChild(el);
      });
    }
  }

  /* ---------- category page ---------- */
  function renderCategory(slug) {
    const meta = CATEGORIES.find((c) => c.slug === slug);
    const list = VIDEOS[slug] || [];
    if (meta) {
      const titleEl = document.getElementById("catTitle");
      const descEl = document.getElementById("catDesc");
      const countEl = document.getElementById("catCount");
      const iconEl = document.getElementById("catIconPath");
      if (titleEl) titleEl.textContent = meta.name;
      if (descEl) descEl.textContent = meta.desc;
      if (countEl) countEl.textContent = list.length;
      if (iconEl) iconEl.setAttribute("d", meta.icon);
      document.title = meta.name + " — l.media";
    }

    const crumbs = document.getElementById("crumbs");
    if (crumbs) {
      CATEGORIES.forEach((c) => {
        const a = document.createElement("a");
        a.href = c.file;
        a.className = "crumb" + (c.slug === slug ? " active" : "");
        a.textContent = c.name;
        crumbs.appendChild(a);
      });
    }

    const grid = document.getElementById("grid");
    if (grid) {
      list.forEach((v, i) => grid.appendChild(buildCard(v, i, list.length, meta ? meta.name : "")));
    }
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    lightbox = document.getElementById("lightbox");
    lbInner = document.getElementById("lbInner");
    lbTitle = document.getElementById("lbTitle");

    initNav();
    buildMarquee();

    if (page === "home") {
      renderHome();
    } else if (page) {
      renderCategory(page);
    }

    if (lightbox) {
      document.getElementById("lbClose").addEventListener("click", closeLightbox);
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLightbox();
      });
    }

    document.querySelectorAll(".hero").forEach(initHero);
    initReveal();
  });
})();
