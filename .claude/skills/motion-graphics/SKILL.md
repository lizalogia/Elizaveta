---
name: motion-graphics
description: Use when creating standalone motion graphics — logo reveals, kinetic typography, intro/outro bumpers, animated banners, looping background scenes, or anything that needs to be exported as a video/GIF rather than embedded as page micro-interactions. Triggers on requests like "make a motion graphic", "animate this logo", "kinetic typography", "animated intro/bumper", "make this feel like a real motion designer made it", "export as mp4/gif".
---

# Motion graphics

Goal: produce motion that reads as designed by someone who's staged a shot
before, not a pile of CSS keyframes. This skill is guidance + copy-adapt
recipes, not a rigid template.

For UI micro-interactions and scroll animations tied to a specific website
(hover states, scroll reveals, page transitions), use the sibling
`pro-website-builder` skill instead — this skill is for freestanding pieces:
things that could just as well be a video file as a web page.

## Process

1. **Storyboard before code.** Write a one-line beat sheet with timestamps
   before touching a keyframe: `0.0s stage set (bg only) → 0.3s mark draws in
   → 1.1s mark fills/settles → 1.4s wordmark reveals → 2.2s tagline fades in
   → hold → loop/exit`. Every recipe below is meaningless without knowing
   what happens when — this is the actual design step, the code is
   transcription.
2. **Decide the delivery format up front**, it changes the build approach:
   - Embeddable (plays in a browser, e.g. hero section, landing page) → pure
     SVG/CSS/JS, see `references/techniques.md` §1-6.
   - Exported file (mp4/webm/gif for social, email, slides, a video editor)
     → same visual techniques, but composed as a Remotion project and
     rendered, see `references/techniques.md` §7.
   - Given a Lottie/After Effects export (`.json` from Bodymovin) → just wire
     up playback, see `references/techniques.md` §8. Don't hand-author Lottie
     JSON from scratch; it's not a authoring format, only an export one.
3. **Apply staging discipline.** Read `references/principles.md` — the short
   version: one focal move at a time, ease everything (nothing linear except
   truly mechanical/robotic motion), give the eye a split second of
   anticipation before a big move, let secondary elements overlap/lag instead
   of moving in lockstep, and leave a beat of stillness before and after the
   main action so it doesn't feel rushed.
4. **Build from the template.** `assets/template.html` is a working piece
   (SVG line-draw logo mark → kinetic-typography wordmark → tagline fade,
   over a looping ambient gradient) demonstrating the full staging pattern
   plus a replay control and the reduced-motion fallback. Copy the parts that
   fit the storyboard, don't ship the demo verbatim.
5. **Verify before calling it done.** In a browser: confirm the
   reduced-motion path still shows the end state (not a frozen mid-animation
   frame), confirm any loop's last frame matches its first frame exactly (no
   visible jump), and scrub slow motion (browser devtools "Animation
   speed: 0.25x" or similar) to catch overlapping easing that fights itself.
   If exporting a file, render it and actually watch the output, not just the
   preview — encoding can introduce frame drops Remotion's preview won't show.

## Format & safe-area guardrails (when exporting for social/video)

- Compose at the target aspect ratio from the start (16:9 for YouTube/web,
  9:16 for Reels/TikTok/Stories, 1:1 for feed posts) — don't crop a 16:9
  scene down to 9:16 after the fact, staging and type size won't survive it.
  See `references/principles.md` for safe-margin numbers per format.
- Keep any text inside the safe-title area; platforms overlay their own UI
  (captions, profile chrome) over the outer ~10% edge on vertical formats.
- Target 24fps for a cinematic feel or 30/60fps for anything with fast UI-
  style motion; don't mix frame rates within one render.

## Reference files

- `references/principles.md` — timing/spacing tables by beat type (logo
  reveal, per-word/per-char kinetic type, scene transition, ambient loop),
  the easing curves to reach for and what each communicates, staging/
  anticipation/follow-through/arcs explained for 2D motion graphics
  specifically (not the full 12-principles animation-school version), and
  safe-margin numbers per aspect ratio.
- `references/techniques.md` — copy-pasteable recipes: SVG line-draw reveal,
  shape/path morphing, kinetic typography (word and character split with
  stagger), clip-path wipes, multi-layer parallax scenes, seamless ambient
  loops, a GSAP timeline pattern for sequencing beats with labels, a Remotion
  starter for rendering to mp4/gif/webm, and Lottie playback for
  After-Effects-exported JSON.
- `assets/template.html` — a small working piece demonstrating the full
  beat-sheet pattern (stage set → mark draw-in → fill/settle → kinetic
  wordmark → tagline → ambient loop) with replay control and reduced-motion
  fallback.
