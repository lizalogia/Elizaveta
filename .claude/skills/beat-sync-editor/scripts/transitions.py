#!/usr/bin/env python3
"""
Library of "premium edit" style video effects and cut transitions, built on
top of stock ffmpeg filters (xfade, rgbashift, noise, crop, setpts). Used by
build_edit.py; not normally run directly.

Per-clip effects (applied while a single source segment is rendered):
  - apply_zoom_punch   : fast punch-in zoom at the start of a clip
  - apply_camera_shake : subtle sinusoidal handheld-style jitter
  - apply_speed_ramp   : two-step speed ramp (slow->fast or fast->slow) that
                          preserves the clip's total duration

Cut transitions (applied between two already-rendered clips):
  - hard_cut   : instant jump cut (a trend in itself for high-energy edits)
  - flash_cut  : brief white flash frame(s) right on the beat
  - glitch_cut : RGB channel shift + noise burst around the cut
  - xfade(...) : wraps ffmpeg's built-in xfade transition catalog (dissolve,
                 wipes, slides, circle/zoom opens, pixelize, etc.)
"""
import json
import os
import subprocess

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"

# Curated subset of ffmpeg's xfade transition catalog that reads as
# "premium"/trendy rather than a generic PowerPoint wipe.
XFADE_STYLES = [
    "fade", "fadeblack", "dissolve", "wipeleft", "wiperight",
    "slideup", "slidedown", "circleopen", "circleclose",
    "pixelize", "hblur", "distance", "zoomin", "radial",
    "squeezeh", "squeezev", "diagtl", "diagbr", "hlslice", "vuslice",
]


def probe_duration(path):
    out = subprocess.check_output([
        FFPROBE, "-v", "error", "-show_entries", "format=duration",
        "-of", "json", path,
    ])
    return float(json.loads(out)["format"]["duration"])


def _run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


# ---------------------------------------------------------------------------
# Per-clip effects
# ---------------------------------------------------------------------------

def apply_zoom_punch(in_path, out_path, fps, res, punch_dur=0.18, zoom_to=1.14):
    """Quick zoom-in over `punch_dur` seconds, then holds at zoom_to."""
    w, h = res
    ramp = f"min(t/{punch_dur}\\,1)"
    zoom = f"(1+({zoom_to}-1)*{ramp})"
    filt = (
        f"scale={w * 2}:-2,"
        f"crop=w='iw/{zoom}':h='ih/{zoom}':x='(iw-out_w)/2':y='(ih-out_h)/2',"
        f"scale={w}:{h},setsar=1,fps={fps}"
    )
    _run([FFMPEG, "-y", "-i", in_path, "-vf", filt, "-an", out_path])


def apply_camera_shake(in_path, out_path, fps, res, amplitude=6, freq=14):
    """Subtle sinusoidal jitter that reads as handheld/energetic motion."""
    w, h = res
    pad = amplitude * 4
    filt = (
        f"scale={w + pad}:{h + pad},"
        f"crop=w={w}:h={h}:"
        f"x='(in_w-out_w)/2+{amplitude}*sin(2*PI*{freq}*t)':"
        f"y='(in_h-out_h)/2+{amplitude}*cos(2*PI*{freq * 1.3}*t)',"
        f"setsar=1,fps={fps}"
    )
    _run([FFMPEG, "-y", "-i", in_path, "-vf", filt, "-an", out_path])


def apply_speed_ramp(in_path, out_path, fps, direction="slow_to_fast"):
    """Two-step speed ramp. f1+f2 is kept at 2.0 so total duration is unchanged,
    which keeps the clip aligned with its assigned beat slot."""
    dur = probe_duration(in_path)
    half = dur / 2
    f1, f2 = (1.4, 0.6) if direction == "slow_to_fast" else (0.6, 1.4)
    filt = (
        f"[0:v]trim=0:{half:.3f},setpts=PTS-STARTPTS,setpts={f1}*PTS[p1];"
        f"[0:v]trim={half:.3f}:{dur:.3f},setpts=PTS-STARTPTS,setpts={f2}*PTS[p2];"
        f"[p1][p2]concat=n=2:v=1:a=0,fps={fps},setsar=1[v]"
    )
    _run([FFMPEG, "-y", "-i", in_path, "-filter_complex", filt, "-map", "[v]", "-an", out_path])


# ---------------------------------------------------------------------------
# Cut transitions (combine two already-rendered, same-resolution clips)
# ---------------------------------------------------------------------------

def hard_cut(clip_a, clip_b, out_path, fps):
    concat_txt = out_path + ".txt"
    with open(concat_txt, "w") as f:
        f.write(f"file '{os.path.abspath(clip_a)}'\n")
        f.write(f"file '{os.path.abspath(clip_b)}'\n")
    _run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", concat_txt, "-c", "copy", out_path])
    os.remove(concat_txt)


def flash_cut(clip_a, clip_b, out_path, fps, res, flash_frames=2):
    w, h = res
    flash_dur = max(flash_frames / fps, 1 / fps)
    filt = (
        f"color=white:size={w}x{h}:duration={flash_dur:.3f}:rate={fps},format=yuv420p[wf];"
        f"[0:v][wf][1:v]concat=n=3:v=1:a=0[v]"
    )
    _run([FFMPEG, "-y", "-i", clip_a, "-i", clip_b, "-filter_complex", filt,
          "-map", "[v]", "-r", str(fps), "-an", out_path])


def glitch_cut(clip_a, clip_b, out_path, fps, glitch_dur=0.12):
    dur_a = probe_duration(clip_a)
    dur_b = probe_duration(clip_b)
    ta = min(glitch_dur, dur_a)
    tb = min(glitch_dur, dur_b)
    a_main_end = max(dur_a - ta, 0)
    filt = (
        f"[0:v]trim=0:{a_main_end:.3f},setpts=PTS-STARTPTS[a_main];"
        f"[0:v]trim={a_main_end:.3f}:{dur_a:.3f},setpts=PTS-STARTPTS,"
        f"rgbashift=rh=6:bh=-6:rv=2,noise=alls=20:allf=t[a_glitch];"
        f"[1:v]trim=0:{tb:.3f},setpts=PTS-STARTPTS,"
        f"rgbashift=rh=-6:bh=6:rv=-2,noise=alls=20:allf=t[b_glitch];"
        f"[1:v]trim={tb:.3f}:{dur_b:.3f},setpts=PTS-STARTPTS[b_main];"
        f"[a_main][a_glitch][b_glitch][b_main]concat=n=4:v=1:a=0[v]"
    )
    _run([FFMPEG, "-y", "-i", clip_a, "-i", clip_b, "-filter_complex", filt,
          "-map", "[v]", "-r", str(fps), "-an", out_path])


def xfade(clip_a, clip_b, out_path, style, duration, fps):
    dur_a = probe_duration(clip_a)
    dur_b = probe_duration(clip_b)
    duration = max(0.08, min(duration, dur_a - 0.05, dur_b - 0.05))
    offset = max(dur_a - duration, 0)
    filt = f"[0:v][1:v]xfade=transition={style}:duration={duration:.3f}:offset={offset:.3f},format=yuv420p[v]"
    _run([FFMPEG, "-y", "-i", clip_a, "-i", clip_b, "-filter_complex", filt,
          "-map", "[v]", "-r", str(fps), "-an", out_path])


def apply_transition(kind, clip_a, clip_b, out_path, fps, res, style=None, duration=0.18):
    """Dispatch helper used by build_edit.py."""
    if kind == "hard_cut":
        hard_cut(clip_a, clip_b, out_path, fps)
    elif kind == "flash_cut":
        flash_cut(clip_a, clip_b, out_path, fps, res)
    elif kind == "glitch_cut":
        glitch_cut(clip_a, clip_b, out_path, fps)
    elif kind == "xfade":
        xfade(clip_a, clip_b, out_path, style or "fade", duration, fps)
    else:
        raise ValueError(f"unknown transition kind: {kind}")
