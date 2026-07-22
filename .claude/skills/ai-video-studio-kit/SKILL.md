---
name: ai-video-studio-kit
description: >
  Self-hosted, open pipeline for turning raw footage and briefs into finished
  short-form (9:16) video. Auto-clip long video into captioned highlights
  (Whisper transcribe → AI moment-pick → 9:16 reframe → burned-in captions),
  plan a shot list + narration script from a brief, render motion graphics from
  HTML/JS (Three.js/GSAP) frame-by-frame and stitch with ffmpeg, and drive a
  real NLE timeline from the command line. Craft docs (montage, studio process,
  editing playbooks) included. Use for auto-clipping, transcription/captions,
  HTML-to-video motion graphics, or studio-pipeline planning.
metadata: { "tags": "video, short-form, 9:16, auto-clipper, whisper, captions, html-to-video, montage, ffmpeg, self-hosted" }
---

# AI Video Studio Kit

An AI-assisted, self-hosted studio for short-form video. Bring `ffmpeg` and a
headless browser; the kit does the rest. Vendored from the upstream
`ai-video-studio-kit` (MIT). The large CC0 sample assets under
`assets/samples/` are intentionally **not** vendored — regrow them with
`node assets/arsenal-fetch.cjs` (see `assets/arsenal-README.md`).

## When to use

- **Auto-clip** a long video into captioned 9:16 highlights → start at `clipper/`.
- **Plan** a reel from a brief (shot list + narration) → `pipeline/STUDIO.md`, `pipeline/skills/`.
- **Render motion graphics** as code (HTML/JS → frames → ffmpeg) → `pipeline/STUDIO.md`, `pipeline/tool-guides/`.
- **Learn the craft** (montage, editing, studio process) → `pipeline/MONTAGE-CRAFT.md`, `docs/`.

## Map

| Path | What's there |
|---|---|
| `clipper/` | Runnable Node CLI: transcribe → moment-pick → 9:16 reframe → captions. Start at `clipper/README.md`, entry `clipper/clip.js`. |
| `pipeline/` | Studio process, montage craft, shot-list playbooks, per-skill `.md` guides, tool guides. Router at `pipeline/STUDIO-ROUTER.md`, start at `pipeline/00-START-HERE.md`. |
| `pipeline/skills/` | Atomic craft skills — camera angle/movement, hook structure, prompting, transitions/VFX, voiceover, realism, continuity, etc. |
| `pipeline/tool-guides/` | Tool-specific guides — ffmpeg, whisper, remotion, hyperframes, unreal, torch, tribev2, voxcpm. |
| `pipeline/cookbooks/`, `pipeline/playbooks/` | End-to-end worked workflows and reference prompts. |
| `docs/` | Architecture, editing craft, studio process, studio router. |
| `templates/` | Starting-point scene templates. |
| `assets/` | `00-INDEX.json` manifest, `arsenal-fetch.cjs` (regrows CC0 HDRIs/textures/props from Poly Haven), README, SVGs. Binary samples excluded. |
| `LICENSES.md` | Third-party component terms — **read before commercial use** (some optional add-ons, e.g. a TTS model, carry non-commercial licenses). |

## Quickstart

```bash
cd .claude/skills/ai-video-studio-kit
npm install                     # needs ffmpeg + a headless browser on PATH
node clipper/clip.js --help     # auto-clip a long video into captioned 9:16 highlights
cat pipeline/STUDIO.md          # render a motion-graphic scene from HTML to video
node assets/arsenal-fetch.cjs --hdris 3 --textures 3 --models 3   # (optional) regrow CC0 assets
```

## Principles (from the kit)

1. **Open core.** Clipper + HTML→video renderer run on just ffmpeg and a browser — no paid service.
2. **Draft, then finish.** Render one still to look at before a full-resolution pass.
3. **Respect third-party terms.** `LICENSES.md` flags any component with its own license.
4. **Repeatable edits.** Timeline actions are scripted, so a cut made once can be made again.
