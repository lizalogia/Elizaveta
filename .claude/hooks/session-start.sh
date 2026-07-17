#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# ffmpeg/ffprobe are required by whisper and video-use to decode/encode media.
if ! command -v ffmpeg >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ffmpeg
fi

# Install (or upgrade) openai/whisper from source.
pip install --break-system-packages --upgrade "git+https://github.com/openai/whisper.git"

echo "whisper setup complete: $(whisper --help >/dev/null 2>&1 && echo ok)"

# Install video-use skill's Python dependencies (vendored at .claude/skills/video-use).
pip install --break-system-packages --upgrade requests librosa matplotlib pillow numpy

echo "video-use deps installed: $(python3 -c 'import librosa, matplotlib, PIL, numpy, requests' >/dev/null 2>&1 && echo ok)"

# Install moviepy for the video-toolkit "moviepy" skill (vendored at .claude/skills/moviepy).
pip install --break-system-packages --upgrade moviepy

echo "moviepy installed: $(python3 -c 'import moviepy' >/dev/null 2>&1 && echo ok)"
