# Tool reference (52 tools)

## Project & Navigation
- `get_project_info` — Get information about the current DaVinci Resolve project.
- `open_page` — Switch to a specific page in DaVinci Resolve.
- `get_current_page` — Get the currently active page in DaVinci Resolve.

## Media Pool
- `get_media_pool_structure` — Get the folder/clip structure of the media pool.
- `import_media` — Import media files into the current media pool folder.
- `create_timeline` — Create a new empty timeline in the current project.

## Timeline
- `get_current_timeline_info` — Get detailed information about the current timeline.
- `get_timeline_items` — List all clips/items on a specific track of the current timeline.
- `append_to_timeline` — Append media pool clips to the current timeline by name.
- `add_marker` — Add a marker to the current timeline.
- `get_markers` — Get all markers on the current timeline.
- `set_current_timecode` — Move the playhead to a specific timecode.
- `get_current_timecode` — Get the current playhead timecode.

## Item Properties
- `get_timeline_item_properties` — Get all properties of a specific timeline item.
- `set_timeline_item_property` — Set a property on a specific timeline item (Pan, Tilt, Zoom, Opacity, Crop, ...).

## Color Grading
- `get_node_graph` — Get the color grading node graph info for a timeline item.
- `set_lut` — Apply a LUT to a node in a clip's color node graph.
- `set_cdl` — Apply CDL (Color Decision List) values to a node.

## Rendering
- `get_render_formats` — Get available render formats and codecs.
- `get_render_settings` — Get current render format, codec, render job list, and render presets.
- `set_render_settings` — Configure render settings for the current project.
- `add_render_job` — Add a render job to the queue based on current render settings.
- `start_rendering` — Start rendering queued jobs.
- `get_render_status` — Get the status of a render job.
- `stop_rendering` — Stop any currently running render processes.

## AI / Neural Engine (Resolve Studio 19+)
- `create_magic_mask` — Create an AI-powered Magic Mask on a timeline item for subject isolation.
- `regenerate_magic_mask` — Regenerate an existing Magic Mask on a timeline item.
- `smart_reframe` — Apply Smart Reframe to a timeline item (AI-based reframing).
- `stabilize` — Apply stabilization to a timeline item using DaVinci Neural Engine.
- `detect_scene_cuts` — Detect scene cuts in the current timeline using AI.
- `create_subtitles_from_audio` — Generate subtitles from audio using AI speech recognition.

## Audio
- `get_voice_isolation_state` — Get the Voice Isolation state for an audio track.
- `set_voice_isolation_state` — Set Voice Isolation on an audio track to isolate speech from background noise.

## Fusion (Compositing / VFX)
- `get_fusion_comp_list` — Get all Fusion compositions associated with a timeline item.
- `add_fusion_comp` — Add a new Fusion composition to a timeline item.
- `import_fusion_comp` — Import a Fusion composition from file into a timeline item.
- `export_fusion_comp` — Export a Fusion composition from a timeline item to a file.
- `load_fusion_comp` — Load a named Fusion composition as the active composition.
- `delete_fusion_comp` — Delete a named Fusion composition from a timeline item.
- `rename_fusion_comp` — Rename a Fusion composition on a timeline item.
- `create_fusion_clip` — Create a Fusion clip from one or more timeline items.
- `insert_fusion_generator` — Insert a Fusion generator into the current timeline at the playhead.
- `insert_fusion_composition` — Insert a blank Fusion composition into the current timeline at the playhead.
- `insert_fusion_title` — Insert a Fusion title into the current timeline at the playhead.

## Export
- `export_timeline` — Export the current timeline to a file.
- `export_current_frame` — Export the current frame as a still image.

## Thumbnail
- `get_current_thumbnail` — Get a thumbnail of the current frame from the Color page.

## Local Transcription (macOS/Apple Silicon only)
- `transcribe_audio` — Transcribe an audio/video file locally using mlx-whisper. Auto-chunks long files (5-min pieces via ffmpeg).
- `transcribe_and_add_subtitles` — Transcribe audio locally and add subtitle markers to the timeline.
- `export_srt` — Transcribe audio and save as an SRT subtitle file.
- `list_whisper_models` — List available mlx-whisper models with their HuggingFace repo paths (default: `turbo`).

## Screenshot (macOS only)
- `screenshot` — Take a screenshot of DaVinci Resolve so Claude can SEE the current state. Sends the image to Anthropic — mind NDAs/privacy.

## Code Execution
- `execute_resolve_code` — Execute arbitrary Python in the Resolve scripting environment (`resolve`, `project`, `mediaPool`, `timeline`, `mediaStorage` pre-loaded). Anything the Resolve Python API can do. Review code before running it.
