---
name: resolve-claude-mcp
description: Use when the user wants Claude to control DaVinci Resolve Studio directly — video editing, color grading, Fusion compositing, rendering, or AI features (Magic Mask, Smart Reframe, stabilization, scene-cut detection, subtitles, voice isolation) via the resolve-claude-mcp MCP server. Triggers on requests like "edit this in DaVinci Resolve", "color grade this clip", "set up Resolve MCP", "add a Fusion title", "render this timeline", "transcribe this footage" when a Resolve project is involved.
---

# Resolve Claude MCP

Controls a running **DaVinci Resolve Studio** instance through the
[resolve-claude-mcp](https://github.com/barckley75/resolve-claude-mcp) MCP
server — 52 tools spanning project navigation, media/timeline editing, color
grading, Fusion, rendering, AI Neural Engine features, and local
(mlx-whisper) transcription. It's a third-party project, unaffiliated with
Blackmagic Design or Anthropic — treat `execute_resolve_code` and any
destructive edit as something to double-check before firing.

## Is the server available?

These tools only exist if the user has already installed and configured the
MCP server (see `references/setup.md` if not — macOS/Apple Silicon only for
transcription and screenshot tools, core editing tools are cross-platform in
theory but only verified on macOS). Check for tools named like
`get_project_info`, `get_current_timeline_info`, `execute_resolve_code`. If
they're missing, walk the user through `references/setup.md` before doing
anything else — don't try to fake the workflow with `execute_resolve_code`
guesses when the server isn't even connected.

## Workflow

1. **Look before you act.** Call `screenshot()` to see the actual Resolve UI,
   `get_project_info()`, `get_current_timeline_info()`, and
   `get_current_page()` before making changes. Screenshot again after any
   change that has a visual effect (color, transform, Fusion, reframe) to
   confirm it did what was intended — don't just trust the tool's success
   string.
2. **Media & timeline setup:** `get_media_pool_structure()` to see what's
   already imported, `import_media()` for new footage, `create_timeline()`
   for a new edit, `append_to_timeline()` to build it out.
3. **Editing:** `get_timeline_items()` to inspect a track,
   `set_timeline_item_property()` for Pan/Tilt/Zoom/Crop/Opacity,
   `add_marker()` / `get_markers()`, `set_current_timecode()` to navigate.
4. **Color grading — switch to the Color page first:** `get_node_graph()`,
   `set_lut()`, `set_cdl()`.
5. **Transcription/subtitles** (macOS local, no Studio dependency):
   `transcribe_audio()`, `transcribe_and_add_subtitles()`, `export_srt()`,
   `list_whisper_models()`. Long files auto-chunk; default model is `turbo`.
6. **AI Neural Engine features** (Resolve Studio 19+ only):
   `detect_scene_cuts()`, `create_magic_mask()` / `regenerate_magic_mask()`,
   `smart_reframe()`, `stabilize()`, `create_subtitles_from_audio()`,
   `set_voice_isolation_state()`.
7. **Rendering:** `get_render_formats()` → `set_render_settings()` →
   `add_render_job()` → `start_rendering()` → `get_render_status()` to poll.
8. **Fusion (compositing/VFX):** `get_fusion_comp_list()`, `add_fusion_comp()`,
   `import_fusion_comp()` / `export_fusion_comp()`, `create_fusion_clip()`,
   `insert_fusion_generator()` / `insert_fusion_title()`. For node-graph-level
   Fusion work beyond these tools, drop to `execute_resolve_code()`.
9. **Anything not covered by a dedicated tool:** `execute_resolve_code()` runs
   arbitrary Python against the live `resolve`, `project`, `mediaPool`,
   `timeline`, `mediaStorage` objects. It's the power tool, and also the one
   that can do the most damage — explain what the code does before running
   it on anything that isn't a throwaway test project.

Full tool list with one-line descriptions: `references/tools.md`.

## Guardrails

- **DaVinci Resolve must be running** with a project open for any tool
  besides the local transcription tools to work.
- **Work on backups.** This is real project data — recommend the user keep
  Resolve's built-in project backups current before letting Claude make
  bulk edits, and don't run destructive operations (deleting Fusion comps,
  overwriting render settings, `execute_resolve_code` deletions) without the
  user confirming first.
- **`screenshot()` sends an image of the Resolve window to Anthropic.**
  Don't call it if the user hasn't accepted that (client footage, NDAs,
  anything visible elsewhere on screen).
- Some tools require a specific page to be active (thumbnails need the
  Color page, for example) — `open_page()` first if a call fails with a
  page-context error.
- AI Neural Engine tools require **Resolve Studio 19+**; the free version of
  Resolve has limited scripting support overall.
- Local transcription (`transcribe_*`, `export_srt`, `list_whisper_models`)
  and `screenshot()` are **macOS/Apple Silicon only** (mlx-whisper,
  Quartz/`screencapture`). The other tools work regardless of platform in
  principle but are only verified on macOS.

## Reference files

- `references/setup.md` — installing the server, configuring
  `claude_desktop_config.json` (macOS/Windows/Linux env vars), and enabling
  scripting inside Resolve's preferences.
- `references/tools.md` — all 52 tools grouped by category with a one-line
  description of each, pulled from the server's own docstrings.
