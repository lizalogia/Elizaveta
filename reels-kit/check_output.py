#!/usr/bin/env python3
"""Шаг 3. Проверка готового ролика.

Запуск:  python check_output.py output/ролик_reel.mp4
Печатает размер, длительность, формат, громкость и сохраняет кадры-превью
(по одному на каждую подпись + контактный лист) в work/check_<имя>/.
"""
import json, re, subprocess, sys
from pathlib import Path
from PIL import Image


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    mp4 = Path(sys.argv[1])
    d = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(mp4)]).stdout)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    dur = float(d["format"]["duration"])
    print(f"Файл:        {mp4} ({int(d['format']['size']) / 1e6:.1f} МБ)")
    print(f"Видео:       {v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']} к/с, пикс.формат {v['pix_fmt']}")
    print(f"Звук:        {a['codec_name'] if a else 'НЕТ'} {a.get('sample_rate', '') if a else ''} Гц")
    print(f"Длительность: {dur:.1f} сек")
    ok = (v["width"], v["height"]) == (1080, 1920)
    print(f"Формат 9:16 (1080x1920): {'да' if ok else 'НЕТ'}")
    print(f"Длина до 60 сек:         {'да' if dur <= 60 else 'НЕТ - длиннее минуты'}")

    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4), "-af", "loudnorm=I=-14:TP=-1.5:print_format=json", "-f", "null", "-"])
    m = re.search(r"\{[^{}]*input_i[^{}]*\}", r.stderr, re.S)
    if m:
        j = json.loads(m.group(0))
        print(f"Громкость:   {float(j['input_i']):.1f} LUFS (цель около -14), пик {float(j['input_tp']):.1f} dB")

    out = Path("work") / f"check_{mp4.stem.replace('_reel', '')}"
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("*.jpg"):
        f.unlink()
    srt = mp4.with_suffix(".srt")
    times = [0.2]
    if srt.exists():
        for blk in srt.read_text(encoding="utf-8").strip().split("\n\n"):
            ln = blk.split("\n")
            t = re.findall(r"(\d+):(\d+):(\d+),(\d+)", ln[1])
            s, e = [int(h) * 3600 + int(mi) * 60 + int(se) + int(ms) / 1000 for h, mi, se, ms in t]
            times.append((s + e) / 2)
    times = sorted(set(round(min(t, dur - 0.1), 2) for t in times))
    files = []
    for i, t in enumerate(times):
        p = out / f"f{i:02d}_{t:05.1f}s.jpg"
        run(["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", str(mp4), "-frames:v", "1", "-vf", "scale=360:-2", str(p)])
        files.append(p)
    # контактный лист
    cols = 6
    ims = [Image.open(p) for p in files]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h), "black")
    for i, im in enumerate(ims):
        sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    sheet.save(out / "contact_sheet.jpg", quality=85)
    print(f"Кадры-превью: {out}/ (контактный лист: contact_sheet.jpg, кадров: {len(files)})")


if __name__ == "__main__":
    main()
