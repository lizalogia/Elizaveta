#!/usr/bin/env python3
"""Рилс с мероприятия, шаг 3: склейка выбранных моментов, смена кадра в такт музыке, MP4 9:16.

Запуск:  python render_event.py plans/event1.json
План (plans/event1.json) пишет Claude:
{
  "music": "music/трек.mp3",
  "beats": "work/beats_трек.json",
  "name": "event1",
  "clips": [
    {"src": "sources/event1.mov", "start": 12.0, "beats": 4},
    {"src": "sources/event2.mov", "start": 3.5,  "beats": 2}
  ]
}
start - секунда исходника, с которой берём кадр; beats - сколько долей музыки он длится.
Кадр меняется ровно на долю музыки. Оригинальный звук мероприятия не используется (только музыка).
"""
import json, subprocess, sys, tempfile
from pathlib import Path
from render_expert import probe, W, H, FPS

TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,")


def main():
    plan = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    bt = json.loads(Path(plan["beats"]).read_text())
    beats, period = bt["beats"], 60 / bt["bpm"]
    srcs = sorted({c["src"] for c in plan["clips"]})
    inputs, idx, info = [], {}, {}
    for s in srcs:
        idx[s] = len(inputs) // 2
        inputs += ["-i", s]
        info[s] = probe(s)

    f, bi, t_out = [], 0, 0.0
    for i, c in enumerate(plan["clips"]):
        dur = c["beats"] * period
        if bi + c["beats"] >= len(beats):
            sys.exit("Музыки не хватает на все кадры - уменьшите число кадров или увеличьте --duration в beats.py")
        total = float(info[c["src"]]["format"]["duration"])
        if c["start"] + dur > total + 0.01:
            sys.exit(f"Кадр {i + 1}: от {c['start']} сек нужно {dur:.2f} сек, а исходник заканчивается на {total:.1f}")
        hdr = info[c["src"]]["streams"][0].get("color_transfer") in ("arib-std-b67", "smpte2084")
        f.append(f"[{idx[c['src']]}:v]trim=start={c['start']:.3f}:duration={dur:.3f},setpts=PTS-STARTPTS,"
                 f"{TONEMAP if hdr else ''}scale={W}:{H}:force_original_aspect_ratio=increase,"
                 f"crop={W}:{H},setsar=1,fps={FPS},format=yuv420p[v{i}]")
        bi += c["beats"]; t_out += dur
    n = len(plan["clips"])
    f.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[v]")
    # музыка: берём с первой доли (так кадры попадают в такт), в конце плавное затухание
    m_idx = len(inputs) // 2
    inputs += ["-i", plan["music"]]
    first = beats[0] + bt.get("music_start", 0)
    f.append(f"[{m_idx}:a]atrim=start={first:.3f}:duration={t_out:.3f},asetpts=PTS-STARTPTS,"
             f"afade=t=out:st={max(0, t_out - 1.2):.3f}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]")

    out = Path("output") / f"{plan.get('name', 'event')}_reel.mp4"
    out.parent.mkdir(exist_ok=True)
    script = Path(tempfile.mkdtemp()) / "f.txt"
    script.write_text(";\n".join(f))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-nostats", *inputs, "-filter_complex_script", str(script),
                    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", "-movflags", "+faststart", "-t", f"{t_out:.3f}", str(out)], check=True)
    print(f"Готово: {out} ({t_out:.1f} сек, {n} кадров, темп {bt['bpm']} уд/мин)")


if __name__ == "__main__":
    main()
