#!/usr/bin/env python3
"""Шаг 1. Расшифровка речи с метками времени по словам.

Запуск:  python transcribe.py sources/мой_ролик.mp4
Результат (папка work/<имя_ролика>/):
  audio.wav        - звук 16 кГц для распознавания
  words.json       - каждое слово с началом и концом (нужно для нарезки и субтитров)
  transcript.txt   - читаемый текст с временем (его читает Claude, чтобы выбрать мысль)

Работает полностью на вашем компьютере, без интернета после скачивания модели.
На Mac с чипом Apple использует mlx-whisper, на других системах - faster-whisper.
"""
import argparse, json, subprocess, sys
from pathlib import Path


def fmt(t):
    m, s = divmod(t, 60)
    return f"{int(m):02d}:{s:05.2f}"


def extract_audio(src: Path, wav: Path):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vn", "-ac", "1",
         "-ar", "16000", "-c:a", "pcm_s16le", str(wav)], check=True)


def run_mlx(wav, model, lang, prompt):
    import mlx_whisper
    res = mlx_whisper.transcribe(
        str(wav), path_or_hf_repo=model, language=lang, word_timestamps=True,
        initial_prompt=prompt or None, condition_on_previous_text=False)
    segs = []
    for s in res["segments"]:
        words = [{"w": w["word"].strip(), "start": float(w["start"]), "end": float(w["end"])}
                 for w in s.get("words", []) if w["word"].strip()]
        segs.append({"start": float(s["start"]), "end": float(s["end"]),
                     "text": s["text"].strip(), "words": words})
    return segs


def run_faster(wav, model, lang, prompt):
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device="cpu", compute_type="int8")
    it, _ = m.transcribe(str(wav), language=lang, word_timestamps=True,
                         vad_filter=True, initial_prompt=prompt or None,
                         condition_on_previous_text=False)
    segs = []
    for s in it:
        words = [{"w": w.word.strip(), "start": float(w.start), "end": float(w.end)}
                 for w in (s.words or []) if w.word.strip()]
        segs.append({"start": float(s.start), "end": float(s.end),
                     "text": s.text.strip(), "words": words})
    return segs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--lang", default="ru")
    ap.add_argument("--backend", choices=["auto", "mlx", "faster"], default="auto")
    ap.add_argument("--model", default=None,
                    help="mlx: mlx-community/whisper-large-v3-turbo (по умолчанию); "
                         "faster: large-v3-turbo (по умолчанию)")
    ap.add_argument("--prompt", default="",
                    help="Подсказка с терминами и именами, например: 'косметология, SPF, ретинол'")
    a = ap.parse_args()

    src = Path(a.source)
    out = Path("work") / src.stem
    out.mkdir(parents=True, exist_ok=True)
    wav = out / "audio.wav"
    extract_audio(src, wav)

    backend = a.backend
    if backend == "auto":
        try:
            import mlx_whisper  # noqa: F401
            backend = "mlx"
        except ImportError:
            backend = "faster"
    print(f"Распознавание: {backend}", file=sys.stderr)
    if backend == "mlx":
        segs = run_mlx(wav, a.model or "mlx-community/whisper-large-v3-turbo", a.lang, a.prompt)
    else:
        segs = run_faster(wav, a.model or "large-v3-turbo", a.lang, a.prompt)

    words = [w for s in segs for w in s["words"]]
    (out / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = [f"[{fmt(s['start'])} - {fmt(s['end'])}] {s['text']}" for s in segs]
    (out / "transcript.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\nГотово: {out}/words.json и {out}/transcript.txt ({len(words)} слов)", file=sys.stderr)


if __name__ == "__main__":
    main()
