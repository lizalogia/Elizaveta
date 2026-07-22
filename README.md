# Lizalogia — персональный сайт видеографа

Editorial-luxury one-page сайт. Чистый **HTML5 + CSS3 + Vanilla JS**, без
фреймворков, сборщиков и внешних библиотек. Готов к публикации на **GitHub Pages**.

## Структура

```
/
├── index.html          # разметка (все секции)
├── style.css           # база + палитра + типографика + layout
├── animations.css      # reveal, keyframes, reduced-motion
├── adaptive.css        # адаптив: iPhone SE → 4K
├── script.js           # меню, reveal, счётчики, parallax, магнитные кнопки
├── .nojekyll           # отключает обработку Jekyll на GitHub Pages
└── assets/
    ├── images/         # portrait.svg (плейсхолдер портрета для контактов)
    ├── icons/          # telegram / instagram / phone (SVG)
    └── fonts/          # для self-host шрифтов при необходимости
```

## Публикация на GitHub Pages

1. Push в ветку репозитория.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Выбрать нужную ветку и `/ (root)`.
4. Сайт откроется по адресу `https://<user>.github.io/<repo>/`.

## Замена контента на реальный

- **Портрет в контактах** — положить фото в `assets/images/` и заменить
  `src` у `.contacts__photo img` в `index.html`.
- **Проекты** — блоки `.proj-card__media` используют CSS-градиенты как
  плейсхолдеры. Для реальных превью заменить фон на `background-image` или
  вставить `<img loading="lazy">` / `<video>`.
- **Ссылки** — Telegram, Instagram и телефон в секции «Контакты» и в меню
  указывают на заглушки (`https://t.me/`, `https://instagram.com/`,
  `tel:+70000000000`). Подставить реальные.
- **Фон Hero** — «сцена концерта» собрана на CSS-градиентах (в палитре,
  без чёрного). Для фото-фона добавить `background-image` в `.hero__stage`.

## Производительность и доступность

- Анимации только через `transform` / `opacity`, revved через
  `IntersectionObserver` (без scroll-листенеров на анимацию).
- Полная поддержка `prefers-reduced-motion`.
- Шрифты (Cormorant Garamond + Manrope, латиница + кириллица) с
  `preload` + `font-display: swap`.
- `loading="lazy"` на изображениях.

## Разработка

Статический сайт — сборка не нужна. Локально:

```bash
python3 -m http.server 8000
# открыть http://localhost:8000
```
