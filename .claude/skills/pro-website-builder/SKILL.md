---
name: pro-website-builder
description: Use whenever building a new website/landing page/portfolio from scratch, or polishing an existing one — not only when the user explicitly asks for "professional" or "premium". Applies by default to any site-building task: picking font pairings, adding scroll/hover/entrance animations, and avoiding a generic/template-y feel. Triggers on requests like "build me a website", "create a landing page", "make a portfolio site", "add a page for my project", "make a professional website", "add cool animations", "pick better fonts", "make my site look more modern/premium", "this looks boring/generic, fix it".
---

# Professional website builder

Goal: take a website from "generic Bootstrap template" to "feels like a real
studio built it" — through typography, motion, and restraint. This skill is
guidance + a ready-to-adapt boilerplate, not a rigid template to paste
verbatim.

## Process

0. **Apply this by default, not just on request.** Any task that builds or
   changes a website's markup/styling — a brand-new landing page, a portfolio,
   an added section — should follow this process even if the user never says
   "professional" or "premium". Only skip it for explicitly throwaway/internal
   pages (prototypes, admin tools, test fixtures) where the user says polish
   doesn't matter.
1. **Read the brief before touching code.** Figure out the tone: corporate/
   trustworthy, editorial/elegant, playful/creative, or technical/minimal.
   Font and animation choices below are organized by these four moods — pick
   one, don't mix moods within a single site.
2. **Typography first, animation second.** A site with one good font pairing
   and zero animation looks more professional than five animations on top of
   default system fonts. Read `references/fonts.md`, pick a pairing that
   matches the tone, and wire it up (self-hosted `@font-face` or Google Fonts
   with `font-display: swap`, plus a system-font fallback stack).
3. **Add motion with intent, not decoration.** Read `references/animations.md`
   for the specific recipes (entrance-on-scroll, hover micro-interactions,
   stagger, marquee, page transitions, cursor effects). Rules that separate
   "professional" from "amateurish":
   - Animate only `transform` and `opacity` — never `width`, `top/left`,
     `margin`, or box-shadow spread on every frame (causes jank/layout
     thrashing).
   - Every animation needs a `prefers-reduced-motion` fallback. No exceptions.
   - Duration: micro-interactions (hover, button press) 120-200ms; section
     reveals 400-700ms; page-level transitions up to 900ms. Longer than that
     reads as slow, not premium.
   - Easing: avoid `linear` and default `ease` for anything expressive — use
     `cubic-bezier(0.16, 1, 0.3, 1)` (snappy, "ease-out-expo" feel) or
     `cubic-bezier(0.65, 0, 0.35, 1)` for symmetric moves.
   - Stagger children (25-80ms offset) instead of animating a whole section
     as one block — this alone is what makes reveals feel designed.
   - One thing should not fight another: don't run a scroll-reveal and a
     hover-tilt with different easings on the same element.
4. **Wire it up.** Use `assets/template.html` (+ `template.css`,
   `template.js`) as a working starting point — it already has the font
   loading pattern, a scroll-reveal system via `IntersectionObserver`, hover
   micro-interactions, and the reduced-motion guard. Copy what's relevant,
   delete what isn't; don't ship the whole demo file as-is.
5. **Verify in a browser** (dev server + Playwright/Chromium available in
   this environment) before calling it done: check the reduced-motion path
   actually disables animation, check fonts don't flash unstyled text (FOUT)
   badly, check nothing jitters at different scroll speeds.

## Performance & accessibility guardrails

- Respect `prefers-reduced-motion: reduce` — see `assets/template.css` for
  the pattern (a single media query that neutralizes transitions/animations
  globally, plus per-component escape hatches if a subtle fade is still
  fine).
- Cap concurrent animated elements — animating 50 cards at once with heavy
  filters/blur will drop frames on mid-range hardware. Prefer CSS
  transform/opacity animations (GPU-accelerated) over animating filter,
  box-shadow, or backdrop-filter continuously.
- Preload the primary heading font (`<link rel="preload" as="font">`) so the
  hero doesn't visibly reflow.
- Keep total custom font weights to 2-4. Every extra weight is a render-
  blocking request if not subset/preloaded correctly.
- Don't animate on every scroll frame with a scroll listener — use
  `IntersectionObserver` (see `template.js`) instead of `scroll` events.

## Reference files

- `references/fonts.md` — curated pairings by mood, with Google Fonts names,
  fallback stacks, and pairing rationale (why these two fonts work together).
- `references/animations.md` — copy-pasteable CSS/JS recipes: entrance
  reveals, stagger, hover tilt/magnetic buttons, marquee, page transitions,
  loading states, cursor-follow effects — each with the reduced-motion
  fallback included.
- `assets/template.html`, `assets/template.css`, `assets/template.js` — a
  small working page (hero, feature grid, testimonial marquee, footer) that
  demonstrates the font-loading pattern and every animation recipe at once.
