#!/usr/bin/env python3
"""
Detect the beat grid, per-beat strength/energy and transient "accents" of a
music track, using librosa's dynamic-programming beat tracker.

Output JSON schema:
{
  "audio": "...",
  "duration": 123.4,
  "tempo_bpm": 128.0,
  "beats": [
    {"index": 0, "time": 0.42, "strength": 0.81, "energy": 0.55, "is_downbeat": true},
    ...
  ],
  "accents": [0.11, 0.38, ...]   # extra onset hits independent of the steady beat grid
}

"strength"  = how percussive/prominent that beat's onset is, normalized 0..1
"energy"    = local RMS loudness at that beat, normalized 0..1 (use this to find
              build-ups/drops and scale cut density / transition intensity)
"is_downbeat" = naive 1-in-4 grouping anchored on the strongest of the first bar;
              good enough to bias "bigger" transitions onto bar starts.
"""
import argparse
import json

import librosa
import numpy as np


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("audio", help="path to the music file")
    ap.add_argument("--out", default="beats.json")
    ap.add_argument("--sr", type=int, default=22050)
    args = ap.parse_args()

    y, sr = librosa.load(args.audio, sr=args.sr, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    onset_env = librosa.onset.onset_strength(y=y, sr=sr, aggregate=np.median)
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, trim=False)
    tempo = float(np.atleast_1d(tempo)[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    strengths = onset_env[beat_frames] if len(beat_frames) else np.array([])
    if len(strengths):
        rng = np.ptp(strengths)
        norm_strengths = (strengths - strengths.min()) / (rng + 1e-9)
    else:
        norm_strengths = strengths

    rms = librosa.feature.rms(y=y)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)

    def energy_at(t):
        idx = min(np.searchsorted(rms_times, t), len(rms) - 1)
        return float(rms[idx])

    energies = np.array([energy_at(t) for t in beat_times])
    if len(energies):
        rng = np.ptp(energies)
        norm_energies = (energies - energies.min()) / (rng + 1e-9)
    else:
        norm_energies = energies

    group = 4
    offset = int(np.argmax(norm_strengths[:group])) if len(norm_strengths) >= group else 0

    beats = []
    for i, t in enumerate(beat_times):
        beats.append({
            "index": i,
            "time": round(float(t), 4),
            "strength": round(float(norm_strengths[i]), 4) if len(norm_strengths) else 0.0,
            "energy": round(float(norm_energies[i]), 4) if len(norm_energies) else 0.0,
            "is_downbeat": bool((i - offset) % group == 0),
        })

    onset_times = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units="time")

    result = {
        "audio": args.audio,
        "duration": round(float(duration), 4),
        "tempo_bpm": round(tempo, 2),
        "beats": beats,
        "accents": [round(float(t), 4) for t in onset_times],
    }

    with open(args.out, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Detected {len(beats)} beats, tempo={tempo:.1f} BPM, duration={duration:.1f}s -> {args.out}")


if __name__ == "__main__":
    main()
