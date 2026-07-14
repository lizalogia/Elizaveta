#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# ffmpeg is required by whisper to decode audio.
if ! command -v ffmpeg >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ffmpeg
fi

# Install (or upgrade) openai/whisper from source.
pip install --break-system-packages --upgrade "git+https://github.com/openai/whisper.git"

echo "whisper setup complete: $(whisper --help >/dev/null 2>&1 && echo ok)"
