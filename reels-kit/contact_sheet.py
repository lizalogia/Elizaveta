#!/usr/bin/env python3
"""Рилс с мероприятия, шаг 1: кадры-превью исходника, чтобы выбрать удачные моменты.

Запуск:  python contact_sheet.py sources/event1.mov [--every 1.0]
Результат: work/<имя>/sheet_01.jpg, sheet_02.jpg ... (30 кадров на лист, подпись = секунда в исходнике).
Claude читает эти картинки и выбирает моменты. Он оценивает ТОЛЬКО эти кадры (раз в N секунд),
движение между ними и звук он не видит.
"""
import argparse, json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source"); ap.add_argument("--every", type=float, default=1.0)
    ap.add_argument("--font", default="fonts/Montserrat-ExtraBold.ttf")
    a = ap.parse_args()
    src = Path(a.source)
    dur = float(json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(src)],
        capture_output=True, text=True, check=True).stdout)["format"]["duration"])
    out = Path("work") / src.stem
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("sheet_*.jpg"):
        f.unlink()
    tmp = out / "_frames"
    tmp.mkdir(exist_ok=True)
    for f in tmp.glob("*.jpg"):
        f.unlink()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vf",
                    f"fps=1/{a.every},scale=270:480:force_original_aspect_ratio=decrease,pad=270:480:(ow-iw)/2:(oh-ih)/2",
                    str(tmp / "f%04d.jpg")], check=True)
    frames = sorted(tmp.glob("f*.jpg"))
    font = ImageFont.truetype(a.font, 26)
    per, cols = 30, 6
    for si in range(0, len(frames), per):
        chunk = frames[si:si + per]
        rows = (len(chunk) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * 270, rows * 480), "black")
        d = ImageDraw.Draw(sheet)
        for i, fp in enumerate(chunk):
            x, y = (i % cols) * 270, (i // cols) * 480
            sheet.paste(Image.open(fp), (x, y))
            t = (si + i) * a.every
            d.text((x + 8, y + 8), f"{t:.0f}s" if a.every >= 1 else f"{t:.1f}s",
                   font=font, fill="white", stroke_width=3, stroke_fill="black")
        sheet.save(out / f"sheet_{si // per + 1:02d}.jpg", quality=82)
    for f in frames:
        f.unlink()
    tmp.rmdir()
    print(f"Исходник {dur:.1f} сек -> листов: {(len(frames) + per - 1) // per} в {out}/")


if __name__ == "__main__":
    main()
