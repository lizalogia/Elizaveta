#!/usr/bin/env python3
"""
Scan one or more source videos and score short time-windows ("candidate
segments") by how good they'd look as a cut in a beat-synced edit:

  - sharpness  : Laplacian variance (penalizes blurry/out-of-focus frames)
  - exposure   : penalizes over/under-exposed frames
  - motion     : rewards a "healthy" amount of motion (dynamic, not static;
                 but not so much that the frame is just blur)
  - faces      : bonus if a face is detected (useful for vlog/portrait footage)

It also avoids proposing a segment that straddles a hard scene cut in the
source (detected via a spike in frame-to-frame difference), so a picked
segment is always taken from a single continuous shot.

Output JSON schema:
{
  "slot_duration": 0.6,
  "segments": [
    {"file": "clip1.mp4", "start": 3.2, "end": 3.8, "score": 0.83}, ...
  ]
}
Sorted by score descending. build_edit.py greedily assigns the best
still-unused segment to each beat slot.
"""
import argparse
import json

import cv2
import numpy as np


def analyze_video(path, sample_fps=8):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = max(int(round(fps / sample_fps)), 1)

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    samples = []
    prev_gray = None
    frame_idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_idx % step == 0:
            t = frame_idx / fps
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            small = cv2.resize(gray, (320, 180))
            sharpness = float(cv2.Laplacian(small, cv2.CV_64F).var())
            brightness = float(np.mean(small))
            motion = 0.0
            if prev_gray is not None:
                motion = float(np.mean(cv2.absdiff(small, prev_gray)))
            faces = face_cascade.detectMultiScale(small, 1.2, 4)
            samples.append({
                "t": t,
                "sharpness": sharpness,
                "brightness": brightness,
                "motion": motion,
                "faces": len(faces),
            })
            prev_gray = small
        frame_idx += 1
    cap.release()
    return samples


def score_sample(s, sharp_max, motion_ref):
    sharp_score = min(s["sharpness"] / (sharp_max + 1e-9), 1.0)
    expo_score = 1.0 - abs(s["brightness"] - 128.0) / 128.0
    motion_score = 1.0 - abs(s["motion"] - motion_ref) / (motion_ref + 1e-9)
    motion_score = max(0.0, min(1.0, motion_score))
    face_bonus = min(s["faces"], 2) * 0.15
    return 0.45 * sharp_score + 0.20 * expo_score + 0.20 * motion_score + face_bonus


def build_segments(samples, slot_duration, sharp_max, motion_ref, scene_cut_thresh=35.0):
    segments = []
    i = 0
    n = len(samples)
    while i < n:
        t0 = samples[i]["t"]
        j = i
        straddles_cut = False
        while j < n and samples[j]["t"] - t0 < slot_duration:
            if j > i and samples[j]["motion"] - samples[j - 1]["motion"] > scene_cut_thresh:
                straddles_cut = True
                break
            j += 1
        if straddles_cut:
            i = j
            continue
        window = samples[i:j] or [samples[i]]
        avg_score = float(np.mean([score_sample(s, sharp_max, motion_ref) for s in window]))
        t_end = window[-1]["t"] if len(window) > 1 else t0 + slot_duration
        segments.append({
            "start": round(t0, 3),
            "end": round(max(t_end, t0 + slot_duration * 0.5), 3),
            "score": round(avg_score, 4),
        })
        i = j if j > i else i + 1
    return segments


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("videos", nargs="+", help="source video files")
    ap.add_argument("--slot-duration", type=float, default=0.6,
                     help="typical cut length to score segments against (seconds)")
    ap.add_argument("--out", default="clips.json")
    args = ap.parse_args()

    all_segments = []
    for path in args.videos:
        samples = analyze_video(path)
        if not samples:
            continue
        sharp_max = max(s["sharpness"] for s in samples) or 1.0
        motion_ref = float(np.median([s["motion"] for s in samples])) or 1.0
        segs = build_segments(samples, args.slot_duration, sharp_max, motion_ref)
        for seg in segs:
            seg["file"] = path
        all_segments.extend(segs)

    all_segments.sort(key=lambda c: c["score"], reverse=True)

    with open(args.out, "w") as f:
        json.dump({"slot_duration": args.slot_duration, "segments": all_segments}, f, indent=2)

    print(f"Scored {len(all_segments)} candidate segments from {len(args.videos)} source video(s) -> {args.out}")


if __name__ == "__main__":
    main()
