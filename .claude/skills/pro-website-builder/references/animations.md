# Animation recipes

All recipes animate only `transform`/`opacity`, all respect
`prefers-reduced-motion`, all are copy-paste-adapt, not drop-in-as-is.

Global guard to put once per project — every recipe below assumes this
exists so per-component code doesn't need to repeat it:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 1. Scroll-triggered entrance (reveal)

CSS:

```css
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

JS (IntersectionObserver — never a `scroll` listener):

```js
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target); // reveal once, don't re-trigger
    }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
```

## 2. Stagger (children reveal in sequence)

Give each child an incremental delay via inline custom property instead of
writing N CSS rules:

```html
<div class="stagger">
  <div class="reveal" style="--d: 0"></div>
  <div class="reveal" style="--d: 1"></div>
  <div class="reveal" style="--d: 2"></div>
</div>
```

```css
.reveal { transition-delay: calc(var(--d, 0) * 70ms); }
```

Or set it from JS when generating cards dynamically:
`el.style.setProperty('--d', index)`.

## 3. Magnetic / hover-lift button

```css
.btn {
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.15s ease-out;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -8px rgb(0 0 0 / 0.25);
}
.btn:active { transform: translateY(0); transition-duration: 0.05s; }
```

Optional true "magnetic" pull toward cursor (use sparingly, hero CTA only):

```js
btn.addEventListener('pointermove', (e) => {
  const r = btn.getBoundingClientRect();
  const x = e.clientX - r.left - r.width / 2;
  const y = e.clientY - r.top - r.height / 2;
  btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
});
btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
```

## 4. Card tilt on hover

```js
card.addEventListener('pointermove', (e) => {
  const r = card.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  card.style.transform = `perspective(600px) rotateX(${py * -6}deg) rotateY(${px * 6}deg)`;
});
card.addEventListener('pointerleave', () => { card.style.transform = ''; });
```

```css
.card { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }
```

## 5. Infinite marquee (logos, testimonials)

```css
.marquee { overflow: hidden; }
.marquee__track {
  display: flex;
  width: max-content;
  animation: marquee 30s linear infinite;
}
.marquee:hover .marquee__track { animation-play-state: paused; }
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); } /* track content duplicated once, exactly 2x */
}
```

Duplicate the track's children once in HTML (or via JS) so the loop from
`-50%` back to `0` is seamless.

## 6. Page/section transition (SPA-style fade+slide)

```css
.page-enter { opacity: 0; transform: translateY(12px); }
.page-enter-active {
  opacity: 1; transform: translateY(0);
  transition: opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1);
}
```

Toggle `page-enter-active` a frame after adding `page-enter` (via
`requestAnimationFrame`) so the browser registers the starting state before
transitioning.

## 7. Loading state (skeleton, not spinner, for anything content-shaped)

```css
.skeleton {
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
}
@keyframes skeleton-loading {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
```

## 8. Cursor-follow accent (use once per page max, never on mobile)

```js
if (matchMedia('(pointer: fine)').matches) {
  const dot = document.querySelector('.cursor-dot');
  window.addEventListener('pointermove', (e) => {
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });
}
```

Gate behind `(pointer: fine)` — a cursor-follow element with no cursor
(touch devices) just sits stuck in a corner and looks broken.

## Anti-patterns (things that read as "amateur," avoid)

- Animating every single element on page load at once with no stagger —
  looks like a slide deck, not a website.
- `transition: all` — always name the specific properties; `all` silently
  animates things you didn't intend (e.g. color scheme changes) and is
  slower to compute.
- Bounce/elastic easing on more than one hero element — one bouncy thing is
  playful, three is chaotic.
- Autoplaying carousels with no pause-on-hover and no reduced-motion guard.
- Parallax that moves faster than scroll speed (background outrunning
  foreground) — nauseating on trackpads/high-refresh scroll.
