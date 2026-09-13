# Diafilm — GitHub Pages

Легкий HTML-диафильм: изображения остаются отдельными JPG/PNG, видео не создается.

## Возможности

- автоматический запуск по ссылке;
- Пуск / Пауза;
- Назад / Вперёд;
- выбор интервала 3–30 секунд;
- циклический автопереход;
- полноэкранный режим по кнопке;
- клавиши ← →, Пробел, F;
- предзагрузка соседних кадров;
- несколько независимых альбомов.

> Важно: браузеры не разрешают веб-странице самостоятельно войти в полноэкранный режим.
> Автопоказ начинается сам, но для Fullscreen пользователь должен один раз нажать кнопку.

## Создание альбома

Пример:

```powershell
py ".\make_album.py" `
  --source "Y:\foto\cerkovnye-raskoly\_screen_1500_v2" `
  --repo "C:\Projects\Diafilm" `
  --slug "cerkovnye-raskoly" `
  --title "Церковные расколы" `
  --interval 8
```

Для другого каталога запускается та же команда с другим `--source`, `--slug`, `--title`.

## Публикация

Создайте public-репозиторий, например `diafilm`, и положите эти файлы в его корень.

Затем:

```powershell
git add .
git commit -m "Add diafilm player and albums"
git push
```

На GitHub: Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/(root)` → Save.

После публикации:

```text
https://ВАШ-ЛОГИН.github.io/diafilm/
```

Конкретный альбом:

```text
https://ВАШ-ЛОГИН.github.io/diafilm/albums/cerkovnye-raskoly/?autoplay=1&interval=8
```

Параметры ссылки:

- `autoplay=1` — начать показ автоматически;
- `autoplay=0` — открыть на паузе;
- `interval=3|5|8|10|15|20|30` — секунды между кадрами;
- `loop=1` — повторять по кругу;
- `loop=0` — остановиться после последнего кадра.
