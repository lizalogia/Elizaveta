#!/usr/bin/env python3
"""Рилс с мероприятия, шаг 2: найти ритм музыки (темп и моменты долей).

Запуск:  python beats.py music/трек.mp3 [--start 0] [--duration 60] [--bpm 120]
Результат: work/beats_<имя>.json  {"bpm":..., "beats":[сек, сек, ...]}
Простой анализ без внешних библиотек (только numpy). Для чёткого ударного трека точен;
для плавной музыки без ударных может ошибаться (в том числе на «половину/двойной» темп).
Если слышите, что темп неверный, укажите --bpm вручную и --first-beat (секунда первого удара).
"""
import argparse, json, subprocess
from pathlib import Path
import numpy as np

SR, HOP, N = 22050, 256, 1024


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("music"); ap.add_argument("--start", type=float, default=0)
    ap.add_argument("--duration", type=float, default=60)
    ap.add_argument("--bpm", type=float); ap.add_argument("--first-beat", type=float)
    a = ap.parse_args()
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(a.start), "-t", str(a.duration), "-i", a.music,
                          "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    win = np.hanning(N)
    nfr = 1 + (len(x) - N) // HOP
    mag = np.abs(np.array([np.fft.rfft(x[i * HOP:i * HOP + N] * win) for i in range(nfr)]))
    d = np.maximum(0, np.diff(np.log1p(10 * mag), axis=0))
    z = lambda v: (v - v.mean()) / (v.std() + 1e-9)
    # бочка и бас (до ~260 Гц) важнее для ощущения доли, чем высокие звуки
    flux = z(d.sum(axis=1)) + 2 * z(d[:, :12].sum(axis=1))
    fps = SR / HOP

    def score(bpm_, ph_):
        idx = (np.arange(ph_, len(flux) / fps, 60 / bpm_) * fps).astype(int)
        idx = idx[idx < len(flux)]
        return flux[idx].sum()

    if a.bpm:
        bpm = a.bpm
    else:   # грубо по автокорреляции (80-170 уд/мин), затем уточняем перебором
        ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
        lo, hi = int(fps * 60 / 170), int(fps * 60 / 80)
        lag = lo + int(np.argmax(ac[lo:hi]))
        bpm0 = 60 * fps / lag
        bpm = max(np.arange(bpm0 - 1.5, bpm0 + 1.5, 0.05),
                  key=lambda b: max(score(b, ph) for ph in np.arange(0, 60 / b, 0.02)))
    period = 60 / bpm
    if a.first_beat is not None:
        phase = a.first_beat
    else:
        phase = max(np.arange(0, period, 0.005), key=lambda ph: score(bpm, ph))
    beats = [round(float(t), 3) for t in np.arange(phase, len(x) / SR, period)]
    out = Path("work"); out.mkdir(exist_ok=True)
    p = out / f"beats_{Path(a.music).stem}.json"
    p.write_text(json.dumps({"bpm": round(bpm, 2), "music_start": a.start, "beats": beats}, indent=1))
    print(f"Темп ~{bpm:.1f} уд/мин, долей: {len(beats)}, первая доля на {beats[0]} сек -> {p}")


if __name__ == "__main__":
    main()
