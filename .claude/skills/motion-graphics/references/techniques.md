# Technique recipes

Copy-paste-adapt, not drop-in-as-is. See `principles.md` for the timing/
easing values referenced below.

## 1. SVG line-draw reveal (logo/icon draws itself in)

Works on any stroked SVG path/shape.

```css
.mark path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-dasharray: var(--len);
  stroke-dashoffset: var(--len);
  animation: draw 900ms linear forwards;
}
@keyframes draw {
  to { stroke-dashoffset: 0; }
}
```

```js
document.querySelectorAll('.mark path').forEach((path) => {
  const len = path.getTotalLength();
  path.style.setProperty('--len', len);
});
```

Follow the draw with a fill/settle beat (see principles.md timing table):

```css
.mark path {
  fill: currentColor;
  fill-opacity: 0;
  animation: draw 900ms linear forwards,
             fill-in 400ms cubic-bezier(0.16,1,0.3,1) 900ms forwards;
}
@keyframes fill-in { to { fill-opacity: 1; } }
```

## 2. Shape/path morph

For simple shapes with the same point count, plain SVG/CSS `d` interpolation
works if both paths share structure — browsers now animate `d` directly:

```css
.blob { animation: morph 6s ease-in-out infinite alternate; }
@keyframes morph {
  from { d: path('M ...'); }
  to   { d: path('M ...'); } /* same command count/order as `from` */
}
```

For shapes that don't share point count/order (e.g. morphing letterforms
into each other), hand-authoring is unreliable — use the `flubber` library
(interpolates between arbitrary paths) or GSAP's MorphSVG plugin if the
project already has a GSAP license. Don't try to hand-tween mismatched paths
frame-by-frame.

## 3. Kinetic typography (word/character stagger)

Split text into spans, animate each with a staggered delay. Split by word
for anything longer than a few characters (see principles.md — char-stagger
on long text takes too long to resolve):

```js
function splitWords(el) {
  el.innerHTML = el.textContent
    .split(' ')
    .map((w, i) => `<span class="word" style="--i:${i}">${w}</span>`)
    .join(' ');
}
```

```css
.word {
  display: inline-block;
  opacity: 0;
  filter: blur(6px);
  transform: translateY(0.4em) rotate(2deg);
  animation: word-in 450ms cubic-bezier(0.16,1,0.3,1) forwards;
  animation-delay: calc(var(--i) * 90ms);
}
@keyframes word-in {
  to { opacity: 1; filter: blur(0); transform: translateY(0) rotate(0); }
}
```

For character-level (short headlines/wordmarks only), same pattern splitting
on `[...el.textContent]` instead of `.split(' ')`, with 15-35ms stagger
instead of 60-120ms.

## 4. Clip-path wipe transition

```css
.wipe {
  clip-path: inset(0 100% 0 0);
  animation: wipe-in 700ms cubic-bezier(0.65,0,0.35,1) forwards;
}
@keyframes wipe-in {
  to { clip-path: inset(0 0 0 0); }
}
```

Direction controlled by which side of `inset()` starts at 100% — swap
`0 100% 0 0` for `0 0 0 100%` etc. for the opposite direction.

## 5. Multi-layer parallax scene

Give each depth layer its own transform speed relative to a single driving
value (scroll progress or a timeline, not raw scroll position per layer):

```css
.layer-bg  { transform: translateY(calc(var(--p) * 10px)); }
.layer-mid { transform: translateY(calc(var(--p) * 25px)); }
.layer-fg  { transform: translateY(calc(var(--p) * 50px)); }
```

```js
document.documentElement.style.setProperty('--p', progress); // 0..1
```

Foreground layers should always move *more* than background layers relative
to the driving value — parallax where background outruns foreground reads
as broken, not deep.

## 6. Seamless ambient loop (background)

Animate a gradient's position/angle from a start state back to the *same*
visual state, not just the same numeric value at a different rotation
(e.g. 0deg and 360deg look identical, so the loop point is invisible):

```css
.ambient {
  background: radial-gradient(circle at 30% 30%, var(--c1), var(--c2) 60%);
  animation: drift 14s linear infinite;
}
@keyframes drift {
  0%   { filter: hue-rotate(0deg); background-position: 0% 0%; }
  100% { filter: hue-rotate(360deg); background-position: 0% 0%; }
}
```

`hue-rotate(360deg)` visually equals `0deg`, so the loop has no seam. Always
verify by scrubbing to the exact last frame and comparing it to the first —
see SKILL.md verification step.

## 7. GSAP timeline for sequencing multi-beat pieces

Once a piece has more than ~3 sequenced beats, a hand-rolled `animation-delay`
chain gets hard to reason about. GSAP's timeline with labels keeps the beat
sheet legible in code (GSAP core is MIT-licensed, load from CDN):

```js
import gsap from 'gsap';

const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

tl.addLabel('markDraw')
  .to('.mark path', { strokeDashoffset: 0, duration: 0.9, ease: 'none' })
  .addLabel('markFill', '+=0')
  .to('.mark path', { fillOpacity: 1, duration: 0.4 })
  .addLabel('wordmark', '-=0.1') // slight overlap = follow-through
  .from('.word', { opacity: 0, y: 12, filter: 'blur(6px)', stagger: 0.09, duration: 0.45 })
  .addLabel('tagline', '-=0.1')
  .from('.tagline', { opacity: 0, y: 8, duration: 0.5 });
```

Labels let you re-time individual beats (`tl.seek('wordmark')` while
tuning) without recalculating absolute offsets by hand.

## 8. Exporting to mp4/webm/gif (Remotion)

When the deliverable must be an actual video file rather than something
that plays in a browser, compose the same visual techniques above as a
Remotion project (React components rendered frame-by-frame to video):

```bash
npm create video@latest   # scaffolds a Remotion project
```

```tsx
// Composition.tsx
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Bumper = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const markOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const wordmarkY = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: '#0a0a0a' }}>
      <Mark style={{ opacity: markOpacity }} />
      <Wordmark style={{ transform: `translateY(${(1 - wordmarkY) * 20}px)` }} />
    </AbsoluteFill>
  );
};
```

Drive everything off `useCurrentFrame()` (deterministic per-frame state,
not wall-clock time) — this is what makes it renderable frame-by-frame
instead of just screen-recordable. Set `fps`/`width`/`height` in the
`<Composition>` registration to match the target aspect ratio from
principles.md, then render:

```bash
npx remotion render Bumper out/bumper.mp4
npx remotion render Bumper out/bumper.gif --codec=gif
```

If a full Remotion project is overkill for a one-off (e.g. exporting a pure
CSS/SVG scene that already plays correctly in a browser), capture it instead
with Playwright frame-stepping + ffmpeg assembly rather than hand-rolling a
React video project — but prefer Remotion for anything reused or re-rendered
more than once.

## 9. Lottie playback (After-Effects exports)

When given a Bodymovin/Lottie `.json` export, just play it — don't
hand-author Lottie JSON, it's an export format, not an authoring one:

```html
<script src="https://cdn.jsdelivr.net/npm/lottie-web/build/player/lottie.min.js"></script>
<div id="lottie-target"></div>
<script>
  lottie.loadAnimation({
    container: document.getElementById('lottie-target'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'animation.json',
  });
</script>
```

Respect `prefers-reduced-motion` here too — pause the instance
(`anim.pause()`) and jump to a meaningful static frame
(`anim.goToAndStop(frame, true)`) rather than leaving it looping.
