#!/usr/bin/env python3
"""
Assemble a beat-synced edit from:
  - beats.json  (from detect_beats.py)
  - clips.json  (from score_clips.py)
  - a music file

It picks cut points off the beat grid (denser cutting on high-energy beats),
greedily assigns the best still-unused scored source segment to each slot,
renders each slot with a fitting per-clip effect (zoom punch / shake / speed
ramp), stitches slots together with a varied rotation of trendy transitions
(hard cuts, flash cuts, glitch cuts, ffmpeg xfade styles), and muxes the
result against the (trimmed, faded-out) music track.

Every ffmpeg `xfade` crossfade overlaps the tail of clip A with the head of
clip B, which shortens the combined timeline by the transition's duration.
Left uncompensated across many crossfades this drags the edit out of sync
with the beat grid. To avoid that, each clip that is followed by an xfade
is rendered `duration` seconds longer than its nominal beat-slot length
(pulled from further along the same source file); xfade's overlap then
exactly consumes that extra tail, so the visible/unique screen time of
every slot still matches its intended beat-slot length.

Usage:
  python3 build_edit.py --beats beats.json --clips clips.json \\
      --music song.mp3 --out final.mp4 \\
      --resolution 1080x1920 --fps 30 --max-duration 30
"""
import argparse
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile

import transitions as tx

FFMPEG = "ffmpeg"
XFADE_DEFAULT_DURATION = 0.18
MIN_XFADE_DURATION = 0.06


def render_base_clip(seg, out_path, res, fps):
    w, h = res
    start = seg["start"]
    dur = seg["_render_duration"]
    filt = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},setsar=1,fps={fps}"
    )
    cmd = [
        FFMPEG, "-y", "-ss", f"{start:.3f}", "-i", seg["file"], "-t", f"{dur:.3f}",
        "-vf", filt, "-an", out_path,
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def build_cut_grid(beats, target_duration, energetic_threshold=0.7):
    """Return sorted cut times: downbeats normally, every beat during
    high-energy sections, merging cuts that would create sub-0.18s slots."""
    times = [0.0]
    for b in beats:
        if b["time"] > target_duration:
            break
        if b["is_downbeat"] or b["energy"] >= energetic_threshold:
            times.append(b["time"])
    times.append(target_duration)

    merged = [times[0]]
    for t in times[1:]:
        if t - merged[-1] >= 0.18:
            merged.append(t)
        elif t == target_duration:
            merged[-1] = t
    return merged


def energy_at_time(beats, t):
    if not beats:
        return 0.0
    closest = min(beats, key=lambda b: abs(b["time"] - t))
    return closest["energy"]


def assign_segments(cut_times, segments, beats):
    """Greedily give each slot the best-scoring unused segment long enough
    for it, avoiding the same source file twice in a row when possible."""
    pool = sorted(segments, key=lambda s: s["score"], reverse=True)
    used = [False] * len(pool)
    slots = []
    last_file = None

    for i in range(len(cut_times) - 1):
        slot_start = cut_times[i]
        slot_end = cut_times[i + 1]
        slot_dur = slot_end - slot_start
        energy = energy_at_time(beats, slot_start)

        best_idx = None
        best_idx_any_file = None
        for idx, seg in enumerate(pool):
            if used[idx]:
                continue
            if (seg["end"] - seg["start"]) + 1e-3 < slot_dur:
                continue
            if best_idx_any_file is None:
                best_idx_any_file = idx
            if seg["file"] != last_file:
                best_idx = idx
                break

        chosen_idx = best_idx if best_idx is not None else best_idx_any_file
        if chosen_idx is None:
            # pool exhausted for this slot length: reuse the best scoring
            # segment regardless of length/used flag, trimmed to what exists
            chosen_idx = 0 if pool else None

        if chosen_idx is None:
            continue

        seg = dict(pool[chosen_idx])
        used[chosen_idx] = True
        seg["_slot_duration"] = slot_dur
        seg["_energy"] = energy
        seg["_slot_start"] = slot_start
        last_file = seg["file"]
        slots.append(seg)

    return slots


def choose_transition(rng, energy, index):
    """Bias towards punchier transitions on high-energy beats, otherwise
    rotate through hard cuts and xfade styles for variety."""
    if energy >= 0.8:
        return rng.choice([
            ("flash_cut", None), ("glitch_cut", None),
            ("xfade", "zoomin"), ("xfade", "circleopen"),
        ])
    if energy >= 0.5:
        return rng.choice([
            ("hard_cut", None), ("xfade", "dissolve"),
            ("xfade", "wipeleft"), ("xfade", "hblur"),
        ])
    if index % 3 == 0:
        return ("hard_cut", None)
    return ("xfade", rng.choice(tx.XFADE_STYLES))


def plan_transitions_and_padding(slots, rng, source_durations):
    """Decide the transition for every boundary up front, then figure out
    how much extra tail each xfade-followed clip needs rendered so the
    crossfade's overlap doesn't shrink the timeline (see module docstring)."""
    n = len(slots)
    plan = [choose_transition(rng, slots[i]["_energy"], i) for i in range(1, n)]

    for i, seg in enumerate(slots):
        pad = 0.0
        if i < n - 1:
            kind, style = plan[i]
            if kind == "xfade":
                file_dur = source_durations[seg["file"]]
                slack = max(0.0, file_dur - seg["start"] - seg["_slot_duration"])
                pad = min(XFADE_DEFAULT_DURATION, slack)
                if pad < MIN_XFADE_DURATION:
                    plan[i] = ("hard_cut", None)
                    pad = 0.0
        seg["_render_duration"] = seg["_slot_duration"] + pad
        seg["_xfade_pad"] = pad

    return plan


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--beats", required=True)
    ap.add_argument("--clips", required=True)
    ap.add_argument("--music", required=True)
    ap.add_argument("--out", default="final.mp4")
    ap.add_argument("--resolution", default="1080x1920", help="WxH, default vertical 9:16")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--max-duration", type=float, default=None,
                     help="cap edit length in seconds (default: full music length)")
    ap.add_argument("--style-seed", type=int, default=7)
    ap.add_argument("--keep-temp", action="store_true")
    args = ap.parse_args()

    w, h = (int(x) for x in args.resolution.lower().split("x"))
    res = (w, h)
    rng = random.Random(args.style_seed)

    with open(args.beats) as f:
        beats_data = json.load(f)
    with open(args.clips) as f:
        clips_data = json.load(f)

    beats = beats_data["beats"]
    segments = clips_data["segments"]
    if not beats:
        sys.exit("No beats found in beats.json")
    if not segments:
        sys.exit("No candidate segments found in clips.json")

    target_duration = args.max_duration or beats_data["duration"]
    target_duration = min(target_duration, beats_data["duration"])

    cut_times = build_cut_grid(beats, target_duration)
    slots = assign_segments(cut_times, segments, beats)
    if not slots:
        sys.exit("Could not assign any source segments to beat slots")

    source_durations = {}
    for seg in slots:
        if seg["file"] not in source_durations:
            source_durations[seg["file"]] = tx.probe_duration(seg["file"])

    transitions_plan = plan_transitions_and_padding(slots, rng, source_durations)

    tmp = tempfile.mkdtemp(prefix="beatsync_")
    try:
        rendered = []
        for i, seg in enumerate(slots):
            raw_path = os.path.join(tmp, f"raw_{i:04d}.mp4")
            render_base_clip(seg, raw_path, res, args.fps)

            final_path = raw_path
            if seg["_energy"] >= 0.75:
                punched = os.path.join(tmp, f"fx_{i:04d}.mp4")
                tx.apply_zoom_punch(raw_path, punched, args.fps, res)
                final_path = punched
            elif seg["_energy"] >= 0.55 and i % 4 == 0:
                shaken = os.path.join(tmp, f"fx_{i:04d}.mp4")
                tx.apply_camera_shake(raw_path, shaken, args.fps, res)
                final_path = shaken

            rendered.append(final_path)

        # apply one speed ramp on the single highest-energy slot for a
        # signature "premium edit" beat, without shifting overall timing
        peak_i = max(range(len(slots)), key=lambda i: slots[i]["_energy"])
        ramped = os.path.join(tmp, f"ramp_{peak_i:04d}.mp4")
        tx.apply_speed_ramp(rendered[peak_i], ramped, args.fps, "slow_to_fast")
        rendered[peak_i] = ramped

        current = rendered[0]
        transitions_used = []
        for i in range(1, len(rendered)):
            kind, style = transitions_plan[i - 1]
            duration = slots[i - 1]["_xfade_pad"] if kind == "xfade" else XFADE_DEFAULT_DURATION
            combined = os.path.join(tmp, f"acc_{i:04d}.mp4")
            tx.apply_transition(kind, current, rendered[i], combined, args.fps, res,
                                 style=style, duration=duration)
            transitions_used.append(f"{kind}" + (f":{style}" if style else ""))
            current = combined

        silent_video = current

        music_trimmed = os.path.join(tmp, "music_trimmed.m4a")
        subprocess.run([
            FFMPEG, "-y", "-i", args.music, "-t", f"{target_duration:.3f}",
            "-af", "afade=t=out:st={:.3f}:d=1.2".format(max(target_duration - 1.2, 0)),
            "-vn", music_trimmed,
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

        subprocess.run([
            FFMPEG, "-y", "-i", silent_video, "-i", music_trimmed,
            "-map", "0:v", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest", args.out,
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    finally:
        if not args.keep_temp:
            shutil.rmtree(tmp, ignore_errors=True)
        else:
            print(f"Temp files kept at: {tmp}")

    print(f"Built {len(slots)} cuts over {target_duration:.1f}s -> {args.out}")
    print("Transitions used: " + ", ".join(transitions_used))


if __name__ == "__main__":
    main()
