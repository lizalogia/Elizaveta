# Principles, timing, and easing

Adapted for 2D motion graphics (logo reveals, kinetic type, scene
transitions, ambient loops) — not the full animation-school 12-principles
list, just the parts that actually change whether a piece reads as
professional.

## Staging: one focal move at a time

The eye can only track one primary motion per beat. If the logo mark is
drawing in, nothing else on screen should be moving at more than 10-20%
opacity/scale change simultaneously — background ambience is fine (it's
pre-attentive, doesn't compete), a second foreground element animating at
full strength is not. Sequence, don't stack.

## Anticipation

A big move reads as more intentional with a tiny opposite/setup move first.
A wordmark that will slide up and settle should first dip down 4-8px over
80-120ms before the real move — barely conscious, but its absence is why raw
CSS keyframes feel stiff. Skip anticipation only for genuinely instant UI
feedback (that's the website skill's territory, not this one).

## Follow-through & overlap

Secondary elements shouldn't stop on the exact same frame as the primary one.
If a logo mark settles at 1.1s, a tagline or subtitle underneath it should
start its own move 100-200ms later and finish 100-200ms after — the lag is
what makes a scene feel like it has weight and depth instead of everything
being welded to one timeline. Never end two unrelated elements' motion on
the identical frame.

## Arcs

Things that move under real motion (a mark settling into place, a shape
transitioning) rarely travel in a straight line — give translation a slight
curved path (animate x and y with offset easing/timing rather than identical
curves) or add a few degrees of rotation through the move. Straight-line
linear-easing motion is what reads as "computer did this," arcs read as
"someone staged this."

## Exaggeration, used sparingly

A tiny overshoot (2-4% past the resting scale/position, then settling back)
sells weight and impact on a big reveal moment (logo lock-up, hero title).
Use it once per piece, on the single most important beat — overshoot on
every element is chaotic, not punchy.

## Timing & spacing by beat type

| Beat type | Duration | Notes |
|---|---|---|
| Micro flourish (icon tick, small shape settle) | 150-300ms | ease-out only |
| Logo mark draw-in (stroke reveal) | 600-1100ms | linear stroke-offset is fine here — the *reveal* is the interest, not the easing |
| Logo mark fill/settle after draw | 300-500ms | slight overshoot allowed |
| Kinetic type, per word | 350-550ms per word, 60-120ms stagger between words | |
| Kinetic type, per character | 200-350ms per char, 15-35ms stagger between chars | only for short headlines (<12 chars); longer text should split by word, not char — char-stagger on a full sentence takes too long to resolve |
| Scene/section transition (wipe, crossfade) | 500-900ms | |
| Tagline/subtitle fade after headline | 400-600ms, starts 100-200ms after headline settles | |
| Hold before loop/exit | 800-1500ms | give the viewer time to actually read it before cutting away |
| Ambient background loop (gradient drift, particles) | 8-20s full cycle | slow enough to be subliminal, never the focal motion |

## Easing curves

- `cubic-bezier(0.16, 1, 0.3, 1)` — "ease-out-expo" feel: fast start, long
  soft landing. Default for anything entering/settling.
- `cubic-bezier(0.65, 0, 0.35, 1)` — symmetric ease-in-out. Use for
  transitions where an element moves *through* the frame (wipes, crossfades)
  rather than resting at the end.
- `cubic-bezier(0.34, 1.56, 0.64, 1)` — back-out overshoot. Reserve for the
  one exaggerated beat per piece (see above).
- Truly `linear` is only correct for continuous mechanical motion — a
  stroke-offset line draw, a seamless marquee/loop, a rotating dial. Linear
  on anything that starts or stops reads as robotic.
- Never mix an overshoot easing and a plain ease-out on two elements that
  move together (e.g. a card and its shadow) — they'll visibly separate
  mid-motion.

## Safe margins by aspect ratio (when exporting for delivery)

| Format | Ratio | Keep text/logo inside |
|---|---|---|
| Landscape (YouTube, web hero video) | 16:9 | ~90% of frame, standard title-safe margin |
| Square (feed post) | 1:1 | ~85% of frame |
| Vertical (Reels/TikTok/Stories) | 9:16 | ~80% of frame height — top ~12% and bottom ~20% get covered by platform UI (profile chrome, captions, controls) |

Compose at the target ratio from the start; don't build 16:9 and crop to
9:16 afterward — staging and type scale that worked wide will crowd or spill
in a tall crop.

## Anti-patterns

- Every element entering with the same easing and duration — no hierarchy,
  reads as a PowerPoint build, not a designed sequence.
- No hold time — cutting to the next beat the instant the last one settles
  gives the viewer no chance to register what they just saw.
- Elastic/bounce easing on more than one beat in the whole piece.
- Kinetic type that character-staggers a full sentence (takes too long to
  become legible) instead of splitting by word.
- Looping content where the last frame doesn't exactly match the first
  (visible pop/jump at the loop point) — always check this explicitly.
