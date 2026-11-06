#!/bin/bash
# Одноразовая установка на MacBook с чипом Apple (M1/M2/M3/M4).
# Запуск из папки reels-kit:  bash setup_mac.sh
# НЕ проверялось на реальном Mac (скрипт написан в облачном Linux) - если что-то упало,
# покажите текст ошибки Claude Code.
set -e
cd "$(dirname "$0")"

echo "1/5 Проверяю Homebrew (менеджер программ для Mac)..."
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew не найден. Установите его командой с сайта https://brew.sh и запустите этот скрипт снова."
  exit 1
fi

echo "2/5 Ставлю ffmpeg (программа для нарезки и склейки видео)..."
brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg

echo "3/5 Ищу подходящий Python (нужен 3.10 или новее)..."
PY=""
for c in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v $c >/dev/null 2>&1 && $c -c 'import sys; sys.exit(0 if sys.version_info>=(3,10) else 1)'; then PY=$c; break; fi
done
if [ -z "$PY" ]; then
  brew install python@3.12
  PY=$(brew --prefix python@3.12)/bin/python3.12
fi
echo "   Использую: $PY"

echo "4/5 Создаю изолированную среду .venv и ставлю mlx-whisper и Pillow..."
$PY -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install mlx-whisper pillow

echo "5/5 Проверяю, что ffmpeg умеет всё нужное..."
need="concat overlay loudnorm trim"
for f in $need; do
  ffmpeg -hide_banner -filters 2>/dev/null | grep -qE " $f " || { echo "В ffmpeg нет фильтра: $f"; exit 1; }
done
ffmpeg -hide_banner -filters 2>/dev/null | grep -qE " zscale " \
  && echo "   zscale есть: HDR с iPhone можно переводить в обычные цвета" \
  || echo "   ВНИМАНИЕ: zscale нет. Снимайте с выключенным HDR (Настройки > Камера > Запись видео > HDR-видео)"

echo
echo "Готово. Дальше: положите видео в папку sources/ и попросите Claude Code смонтировать рилс."
echo "При первой расшифровке скачается модель whisper-large-v3-turbo (около 1,6 ГБ, один раз)."
