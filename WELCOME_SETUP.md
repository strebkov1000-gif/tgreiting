# Настройка приветственного сообщения /start

## Что было изменено:

✅ **Текст приветствия** обновлен на стиль "Welcome Pilgrim"
✅ **Две кнопки** вместо трех:
- 🚀 **open REP** - открывает Mini App
- 👥 **join community** - ссылка на https://t.me/ice_creators

✅ **Поддержка изображения** (опционально)

## Как добавить изображение к приветствию:

### Вариант 1: Использовать URL изображения

1. Загрузите вашу картинку на хостинг (например, Imgur, Cloudinary)
2. Скопируйте прямую ссылку на изображение
3. Добавьте в `backend/.env`:
   ```env
   WELCOME_IMAGE_URL=https://i.imgur.com/your-image.jpg
   ```

### Вариант 2: Использовать локальный файл

1. Сохраните изображение в папку `/root/ice-rating-bot/assets/`
2. Загрузите файл в Telegram:
   ```bash
   # Отправьте файл боту через любой чат
   # Или используйте API Telegram для загрузки
   ```
3. Используйте file_id от Telegram в `.env`:
   ```env
   WELCOME_IMAGE_URL=AgACAgIAAxkBAAI...
   ```

### Вариант 3: Без изображения

Если `WELCOME_IMAGE_URL` не указан (пустой), бот будет отправлять только текст с кнопками.

## Как изменить ссылку на комьюнити:

В файле `backend/.env`:
```env
COMMUNITY_URL=https://t.me/ice_creators
```

## Перезапуск бота:

После изменений в `.env`:
```bash
cd backend
npm run dev
```

Или если используете PM2:
```bash
pm2 restart ice-bot
```

## Пример приветственного сообщения:

```
Welcome Pilgrim

Through some combination of reality, fate, entropy, and randomness, you have found yourself here... ©

The question is who connected whom. Wanna go alone?

[🚀 open REP]
[👥 join community]
```

---

**Файлы, которые были изменены:**
- `backend/src/bot/commands/start.ts` - обработчик команды /start
- `backend/src/config/index.ts` - добавлен config.community.url
- `backend/.env` - добавлены COMMUNITY_URL и WELCOME_IMAGE_URL
