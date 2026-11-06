#!/usr/bin/env python3
"""Шаг 2. Сборка экспертного рилса: нарезка по плану + русские субтитры + вертикальный MP4 9:16.

Запуск:
  python render_expert.py sources/ролик.mp4 plans/ролик.json
План (plan.json) пишет Claude после чтения transcript.txt:
  {"segments": [{"start": 3.2, "end": 9.8}, {"start": 14.0, "end": 21.5}]}
Времена можно давать примерно: скрипт сам притянет границы к границам слов.

Результат: output/<имя_ролика>_reel.mp4 (1080x1920, 30 к/с, H.264 + AAC) и
файл субтитров output/<имя_ролика>_reel.srt для проверки/правки.
"""
import argparse, json, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
HEAD_PAD, TAIL_PAD = 0.04, 0.12   # запас до первого и после последнего слова фразы, сек


def probe(src):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,color_transfer:stream_side_data=rotation:format=duration",
         "-of", "json", str(src)], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def snap_segments(plan, words, total):
    """Притягивает границы фраз к границам слов и возвращает [(src_start, src_end, [слова])]."""
    res = []
    for seg in plan["segments"]:
        ws = [w for w in words if seg["start"] <= (w["start"] + w["end"]) / 2 <= seg["end"]]
        if not ws:
            print(f"! В отрезке {seg} нет слов - пропускаю", file=sys.stderr)
            continue
        s = max(0.0, ws[0]["start"] - HEAD_PAD)
        e = min(total, ws[-1]["end"] + TAIL_PAD)
        res.append((s, e, ws))
    # если соседние отрезки перекрылись из-за запаса - подвинуть границу
    for i in range(1, len(res)):
        if res[i][0] < res[i - 1][1]:
            mid = (res[i][0] + res[i - 1][1]) / 2
            res[i - 1] = (res[i - 1][0], mid, res[i - 1][2])
            res[i] = (mid, res[i][1], res[i][2])
    return res


def build_chunks(segs, max_words=4, max_chars=26):
    """Группирует слова в короткие подписи; время пересчитывается на время готового ролика."""
    chunks, offset = [], 0.0
    for s, e, ws in segs:
        cur = []
        def flush():
            nonlocal cur
            if cur:
                chunks.append({"text": " ".join(c["w"] for c in cur),
                               "start": offset + cur[0]["start"] - s,
                               "end": offset + cur[-1]["end"] - s})
                cur = []
        for w in ws:
            cur.append(w)
            text = " ".join(c["w"] for c in cur)
            punct = w["w"][-1:] in ".!?…,;:"
            short_tail = len(w["w"].strip(".,!?…;:")) <= 3   # не заканчивать подпись на «не», «на», «и»...
            if punct or ((len(cur) >= max_words or len(text) >= max_chars) and not short_tail) \
                    or len(text) >= max_chars + 14:
                flush()
        flush()
        # одинокое последнее слово отрезка приклеить к предыдущей подписи
        if len(chunks) >= 2 and " " not in chunks[-1]["text"] and chunks[-2]["end"] <= chunks[-1]["start"] + 0.01 \
                and chunks[-2]["start"] >= offset and len(chunks[-2]["text"] + chunks[-1]["text"]) <= max_chars + 14:
            chunks[-2] = {"text": chunks[-2]["text"] + " " + chunks[-1]["text"],
                          "start": chunks[-2]["start"], "end": chunks[-1]["end"]}
            chunks.pop()
        offset += e - s
    # подпись держится до начала следующей, чтобы не мигала; не дольше 1.2 сек после слова
    for i, c in enumerate(chunks):
        nxt = chunks[i + 1]["start"] if i + 1 < len(chunks) else c["end"] + 0.5
        c["end"] = min(max(c["end"], c["start"] + 0.35), nxt, c["end"] + 1.2)
        t = c["text"].rstrip(".,;:")
        c["text"] = t
    return chunks


def make_caption_png(text, font_path, path, size=76):
    font = ImageFont.truetype(str(font_path), size)
    probe_img = Image.new("RGBA", (W, 10))
    d = ImageDraw.Draw(probe_img)
    # перенос по ширине
    maxw, lines, line = W - 160, [], ""
    for word in text.split():
        t = (line + " " + word).strip()
        if d.textlength(t, font=font) <= maxw or not line:
            line = t
        else:
            lines.append(line); line = word
    lines.append(line)
    lh = int(size * 1.25)
    img = Image.new("RGBA", (W, lh * len(lines) + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, ln in enumerate(lines):
        x = (W - d.textlength(ln, font=font)) / 2
        d.text((x, 20 + i * lh), ln, font=font, fill=(255, 255, 255, 255),
               stroke_width=7, stroke_fill=(0, 0, 0, 255))
    img.save(path)
    return img.size[1]


def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source"); ap.add_argument("plan")
    ap.add_argument("--font", default="fonts/Montserrat-ExtraBold.ttf")
    ap.add_argument("--font-size", type=int, default=76)
    ap.add_argument("--caption-y", type=float, default=0.66, help="высота подписи: 0 верх, 1 низ")
    ap.add_argument("--crop-x", type=float, default=0.5,
                    help="для горизонтального исходника: 0 левый край, 0.5 центр, 1 правый")
    ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--music", help="файл музыки (необязательно)")
    ap.add_argument("--music-vol", type=float, default=0.10)
    ap.add_argument("--out")
    a = ap.parse_args()

    src, stem = Path(a.source), Path(a.source).stem
    words = json.loads(Path("work", stem, "words.json").read_text(encoding="utf-8"))
    plan = json.loads(Path(a.plan).read_text(encoding="utf-8"))
    info = probe(src)
    st = info["streams"][0]
    total = float(info["format"]["duration"])
    segs = snap_segments(plan, words, total)
    if not segs:
        sys.exit("План пуст - нечего монтировать")
    out_dur = sum(e - s for s, e, _ in segs)

    # --- видео-цепочка
    hdr = st.get("color_transfer") in ("arib-std-b67", "smpte2084")
    tonemap = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
               "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,") if hdr else ""
    if hdr:
        print("HDR-исходник: применяю перевод в обычные цвета (проверьте цвета на результате)", file=sys.stderr)
    fit = (f"scale={W}:{H}:force_original_aspect_ratio=increase,"
           f"crop={W}:{H}:(iw-{W})*{a.crop_x}:(ih-{H})/2,setsar=1,fps={FPS},format=yuv420p")

    f = []
    for i, (s, e, _) in enumerate(segs):
        f.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS,{tonemap}{fit}[v{i}]")
        fade = min(0.03, (e - s) / 4)
        f.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,aresample=48000,"
                 f"afade=t=in:d={fade:.3f},afade=t=out:st={(e - s) - fade:.3f}:d={fade:.3f}[a{i}]")
    n = len(segs)
    f.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[vc][ac]")

    # --- субтитры
    chunks = [] if a.no_captions else build_chunks(segs)
    tmp = Path(tempfile.mkdtemp(prefix="caps_"))
    inputs = ["-i", str(src)]
    last = "vc"
    for k, c in enumerate(chunks):
        png = tmp / f"c{k:03d}.png"
        h = make_caption_png(c["text"], a.font, png, a.font_size)
        inputs += ["-i", str(png)]
        y = int(H * a.caption_y - h / 2)
        nxt = f"o{k}"
        f.append(f"[{last}][{k + 1}:v]overlay=0:{y}:enable='between(t,{c['start']:.3f},{c['end']:.3f})'[{nxt}]")
        last = nxt
    vmap = last

    # --- звук
    if a.music:
        mi = len(chunks) + 1
        inputs += ["-stream_loop", "-1", "-i", a.music]
        f.append(f"[{mi}:a]atrim=0:{out_dur:.3f},volume={a.music_vol},"
                 f"afade=t=out:st={max(0, out_dur - 1.5):.3f}:d=1.5[m]")
        f.append("[ac][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
    else:
        f.append("[ac]loudnorm=I=-14:TP=-1.5:LRA=11[aout]")

    out = Path(a.out) if a.out else Path("output") / f"{stem}_reel.mp4"
    out.parent.mkdir(exist_ok=True)
    script = tmp / "filters.txt"
    script.write_text(";\n".join(f), encoding="utf-8")
    cmd = ["ffmpeg", "-y", "-v", "error", "-nostats", *inputs,
           "-filter_complex_script", str(script), "-map", f"[{vmap}]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-profile:v", "high",
           "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-movflags", "+faststart", "-t", f"{out_dur:.3f}", str(out)]
    subprocess.run(cmd, check=True)

    srt = out.with_suffix(".srt")
    srt.write_text("\n".join(f"{i + 1}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}\n"
                             for i, c in enumerate(chunks)), encoding="utf-8")
    (out.with_suffix(".cuts.json")).write_text(json.dumps(
        [{"src_start": round(s, 3), "src_end": round(e, 3), "text": " ".join(w["w"] for w in ws)}
         for s, e, ws in segs], ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Готово: {out} ({out_dur:.1f} сек), субтитры: {srt}")


if __name__ == "__main__":
    main()
