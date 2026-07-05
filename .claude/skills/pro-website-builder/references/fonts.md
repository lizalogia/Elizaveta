# Font pairings by mood

Pick one mood, one pairing. Don't combine pairings from different rows.
All fonts listed are free on Google Fonts unless noted. Format:
**Heading / Body** — rationale.

Always set a matching system-font fallback stack so text stays legible and
correctly-metriced (roughly the same width) while the web font loads.

## Corporate / trustworthy

- **Space Grotesk / Inter** — geometric-but-warm display face over the most
  battle-tested UI body font. Reads as SaaS/fintech.
- **General Sans / General Sans** (single family, weight contrast 600/400) —
  safe, modern, slightly Swiss. Good when you want zero personality risk.
- **Sora / IBM Plex Sans** — Sora's rounded terminals soften Plex's technical
  precision. Good for dashboards and B2B tools.

Fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

## Editorial / elegant

- **Fraunces / Inter** — Fraunces is a "wonky" high-contrast serif with a lot
  of optical-size personality (use `font-variation-settings: "SOFT" 100`
  or the wght axis for character); Inter keeps body text quiet so the serif
  can be the whole personality.
- **Playfair Display / Source Sans 3** — classic magazine/editorial pairing,
  high contrast serif headline over a humble grotesque body.
- **Cormorant Garamond / Karla** — bookish, quiet luxury (skincare, hospitality,
  studios).

Fallback stack for serif headings: `Georgia, "Times New Roman", serif`

## Playful / creative

- **Clash Display (Fontshare, free) / Satoshi (Fontshare, free)** — both from
  the same foundry so they share proportions; Clash has a distinctive
  geometric personality in the headline, Satoshi stays clean in body.
- **Bricolage Grotesque / Inter** — a variable font with built-in "grade" and
  optical size axes, gives a hand-crafted-but-controlled feel. Great for
  agencies/portfolios.
- **Unbounded / Manrope** — chunky, confident display face for hero
  headlines, paired with a friendly rounded-ish body.

Note: Fontshare fonts (Clash Display, Satoshi, General Sans) are not on
Google Fonts — self-host the woff2 files or link their CDN.

## Technical / minimal

- **JetBrains Mono / Inter** — monospace headline for a dev-tool/technical
  feel, humanist sans for body so long text stays readable.
- **Instrument Sans / Instrument Sans** — single-family, very neutral, lets
  animation and layout carry the personality instead of type.
- **Söhne-alike: Public Sans / Public Sans** — US-government-grade neutrality,
  good when the content itself needs to be the star (docs, technical writing).

## Implementation pattern

```html
<!-- Preload the heading weight used above the fold to avoid reflow -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: "Fraunces", Georgia, "Times New Roman", serif;
  --font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
h1, h2, h3, .display { font-family: var(--font-display); }
body { font-family: var(--font-body); }
```

For self-hosted (Fontshare/custom) fonts, always declare `font-display: swap`
in the `@font-face` block and subset to latin if the site doesn't need other
scripts — cuts file size significantly.
