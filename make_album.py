#!/usr/bin/env python3
# Создает/обновляет альбом GitHub Pages из папки с JPG/PNG.
# Никаких внешних библиотек не требуется.

from __future__ import annotations
import argparse
import json
import re
import shutil
from pathlib import Path

EXTS = {".jpg", ".jpeg", ".png", ".webp"}
DEFAULT_INTERVAL = 8

ALBUM_HTML = """<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="dark">
  <title>Диафильм</title>
  <link rel="stylesheet" href="../../style.css">
</head>
<body>
  <div id="viewer" class="viewer">
    <div class="stage">
      <img id="slide" alt="">
      <div id="loading" class="loading">Загрузка…</div>
      <div id="error" class="error" hidden></div>
    </div>
    <div class="controls" aria-label="Управление диафильмом">
      <button id="prev" type="button">← Назад</button>
      <button id="play" type="button">▶ Пуск</button>
      <button id="next" type="button">Вперёд →</button>
      <span id="counter" class="counter">— / —</span>
      <label>Интервал
        <select id="interval" aria-label="Интервал">
          <option value="3">3 с</option>
          <option value="5">5 с</option>
          <option value="8" selected>8 с</option>
          <option value="10">10 с</option>
          <option value="15">15 с</option>
          <option value="20">20 с</option>
          <option value="30">30 с</option>
        </select>
      </label>
      <button id="fullscreen" type="button">⛶ Полный экран</button>
    </div>
  </div>
  <h1 id="album-title" hidden>Диафильм</h1>
  <script src="../../player.js"></script>
</body>
</html>
"""

def natural_key(path: Path):
    return [int(t) if t.isdigit() else t.casefold()
            for t in re.split(r"(\d+)", path.name)]

def slug_ok(s: str) -> bool:
    return bool(re.fullmatch(r"[a-z0-9][a-z0-9-]*", s))

def load_album_index(path: Path) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"albums": []}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="Папка с готовыми изображениями")
    ap.add_argument("--repo", required=True, help="Корень локального репозитория diafilm")
    ap.add_argument("--slug", required=True, help="Адрес альбома: латиница/цифры/дефисы")
    ap.add_argument("--title", required=True, help="Название альбома")
    ap.add_argument("--interval", type=int, default=DEFAULT_INTERVAL,
                    choices=[3,5,8,10,15,20,30])
    args = ap.parse_args()

    src = Path(args.source)
    repo = Path(args.repo)
    slug = args.slug.strip().lower()

    if not src.is_dir():
        raise SystemExit(f"Нет папки: {src}")
    if not slug_ok(slug):
        raise SystemExit("slug: только a-z, 0-9 и дефис; например cerkovnye-raskoly")

    files = sorted(
        [p for p in src.iterdir() if p.is_file() and p.suffix.lower() in EXTS],
        key=natural_key
    )
    if not files:
        raise SystemExit("В исходной папке нет изображений.")

    album_dir = repo / "albums" / slug
    images_dir = album_dir / "images"

    if album_dir.exists():
        shutil.rmtree(album_dir)
    images_dir.mkdir(parents=True, exist_ok=True)

    slides = []
    for n, p in enumerate(files, 1):
        # Оставляем исходное имя; URL-кодирование браузер делает сам.
        dst = images_dir / p.name
        shutil.copy2(p, dst)
        slides.append({"src": f"./images/{p.name}"})

    manifest = {
        "title": args.title,
        "interval": args.interval,
        "slides": slides,
    }
    (album_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (album_dir / "index.html").write_text(ALBUM_HTML, encoding="utf-8")

    index_path = repo / "albums" / "index.json"
    idx = load_album_index(index_path)
    albums = [a for a in idx.get("albums", []) if a.get("slug") != slug]
    albums.append({"slug": slug, "title": args.title, "count": len(slides)})
    albums.sort(key=lambda a: a["title"].casefold())
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(
        json.dumps({"albums": albums}, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"Готово: {len(slides)} кадров")
    print(f"Альбом: {album_dir}")
    print("После git push ссылка будет вида:")
    print(f"https://<ВАШ-GITHUB>.github.io/<РЕПОЗИТОРИЙ>/albums/{slug}/?autoplay=1&interval={args.interval}")

if __name__ == "__main__":
    main()
