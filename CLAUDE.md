# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What this repository is

This is a **Claude Code skills library**, not an application. The entire payload
lives under `.claude/skills/` — there is no root `package.json`, no build step,
no test suite, and no service to run. Each subdirectory is a self-contained
**skill**: a package of instructions (and often helper scripts, references, and
sub-agent prompts) that Claude loads on demand to perform a particular kind of
task.

Most skills form one coherent ecosystem: **HyperFrames**, a system that
**renders video from HTML** — a composition is an HTML file whose DOM declares
timing with `data-*` attributes, driven by a seekable animation runtime and the
`npx hyperframes` CLI. A few skills (`pro-website-builder`, `figma`) are
adjacent but standalone.

When you edit files here you are authoring skill content — Markdown instructions
and the scripts they invoke — that *other* Claude sessions will later load. You
are rarely "running" anything in this repo; you are curating the instructions.

## Repository layout

```
.claude/
└── skills/
    ├── hyperframes/              # ← router / entry skill (read first for video work)
    ├── hyperframes-core/         # domain: the HTML composition contract
    ├── hyperframes-animation/    # domain: motion rules, blueprints, runtime adapters
    ├── hyperframes-keyframes/    # domain: seek-safe keyframes (GSAP/CSS/WAAPI/…)
    ├── hyperframes-creative/     # domain: design spec, palettes, typography, narration
    ├── hyperframes-registry/     # domain: install/wire registry blocks & components
    ├── hyperframes-cli/          # domain: the `npx hyperframes` dev loop
    ├── media-use/                # domain: resolve/generate audio, image, icon, LUT, TTS
    ├── figma/                    # domain: import Figma content into a composition
    │
    ├── product-launch-video/     # workflow: product/SaaS promo from URL/brief/script
    ├── website-to-video/         # workflow: tour of a site from its own screenshots
    ├── faceless-explainer/       # workflow: topic explainer from arbitrary text
    ├── pr-to-video/              # workflow: GitHub PR → code-change explainer
    ├── embedded-captions/        # workflow: burn captions into a talking-head clip
    ├── talking-head-recut/       # workflow: designed graphic overlays on existing footage
    ├── motion-graphics/          # workflow: short, unnarrated motion-first piece
    ├── music-to-video/           # workflow: beat-synced video from a music track
    ├── slideshow/                # workflow: navigable deck (not an MP4)
    ├── general-video/            # workflow: fallback for anything else / multi-scene
    ├── remotion-to-hyperframes/  # workflow: port a Remotion (React) source to HyperFrames
    │
    └── pro-website-builder/      # standalone: professional/animated website building
```

### Two kinds of HyperFrames skill

The split is **ownership, not output type** (see `hyperframes/SKILL.md`):

- **Workflows** own an end-to-end deliverable — their own project directory,
  gated steps, sub-agents, and a final artifact (usually an MP4). One workflow
  runs a task start to finish.
- **Domain skills** are capability layers a workflow pulls in mid-flight
  (`hyperframes-core`, `-animation`, `-creative`, `media-use`, etc.). They never
  own the task.

`hyperframes/SKILL.md` is the **router**: it holds the capability map and the
intent-routing table that dispatches a "make me a video" request to the right
workflow. It intentionally lists trigger phrases for workflows that may not be
installed locally, so start there when reasoning about how video requests flow.

## Anatomy of a skill

Every skill directory contains a `SKILL.md` and, as needed, supporting folders:

- **`SKILL.md`** — required. Opens with YAML frontmatter, then the instructions.
  Frontmatter fields in use:
  - `name` — must match the directory name.
  - `description` — a dense paragraph packed with trigger phrases and scope
    boundaries ("use when…", "not for… → /other-skill", "unclear → /hyperframes").
    This is what a routing agent reads to decide whether to load the skill, so it
    carries most of the disambiguation weight.
  - `metadata` — optional; typically `{ "tags": "…" }`.
- **`references/`** — deeper Markdown docs loaded only when a task needs them,
  keeping `SKILL.md` scannable.
- **`scripts/`** — executable helpers the skill invokes. Overwhelmingly Node ESM
  (`.mjs`, `#!/usr/bin/env node`), with some `.cjs`, a few `.sh`/`.py`, and
  occasional `.tsx`. These are **deterministic** by design — they do the
  mechanical work (assemble an index, extract audio, build a captions
  sub-composition) so the LLM only makes the creative choices. Comments in the
  scripts state this contract explicitly.
- **`sub-agents/`** or **`agents/`** — Markdown prompts for sub-agents a workflow
  spawns (e.g. `pr-to-video/sub-agents/frame-worker.md`).
- **`assets/`, `templates/`, `themes/`, `palettes/`, etc.** — skill-specific
  static resources.

`embedded-captions` and `talking-head-recut` are the largest, most
fully-featured examples; `hyperframes-core` and `hyperframes-creative` are the
most concise. Match whichever neighbor you are extending.

## Working conventions

- **Editing a skill:** keep the `SKILL.md` scannable — push depth into
  `references/`, keep mechanical steps in `scripts/`. Preserve the
  trigger-phrase density in `description`; it is load-bearing for routing.
- **Cross-references** between skills use the `/skill-name` slash-command form
  (e.g. "unclear → `/hyperframes`"). Keep that convention when adding routing
  hints, and keep the router table in `hyperframes/SKILL.md` consistent with any
  new or renamed workflow.
- **Scripts stay deterministic.** If logic can be mechanical, put it in a script
  rather than asking the LLM to redo it each run. Don't add judgment calls to a
  script whose job is to be reproducible.
- **`name` must equal the directory name.** Renaming a skill means renaming the
  directory, the frontmatter `name`, and every `/old-name` reference.
- **The HyperFrames CLI is external.** Skills invoke `npx hyperframes …`
  (`init`, `add`, `lint`, `check`, `render`, `skills update <name>`, etc.); the
  CLI itself is not vendored in this repo. Don't reimplement it here — reference
  it.
- **No app to run/test.** There is nothing to `npm install` or `npm test` at the
  repo root. "Testing" a change means reviewing the Markdown and, where a script
  changed, reasoning about or running that individual script.

## Provenance & licensing

- Most skills originate from **`heygen-com/hyperframes`** (see git history) and
  are kept current via the HyperFrames skills registry.
- **`talking-head-recut`** is adapted from the MIT-licensed
  [`vtake-skills`](https://github.com/notedit/vtake-skills) project; see its
  `NOTICE.md` for the required attribution and the list of adaptations. Preserve
  that `NOTICE.md` when editing the skill.

## Git & contribution workflow

- Development happens on feature branches (current: `claude/*`). Commit with
  clear, descriptive messages and push with `git push -u origin <branch>`.
- **Do not open a pull request unless explicitly asked.**
- The active GitHub repository scope for this workspace is `lizalogia/elizaveta`.
