# 🚀 Quick Start Guide

## Предварительные требования

1. **Node.js 20+** установлен
2. **Docker & Docker Compose** установлены
3. **Telegram Bot Token** (получите от [@BotFather](https://t.me/botfather))

## Шаг 1: Получение Bot Token

1. Откройте Telegram и найдите [@BotFather](https://t.me/botfather)
2. Отправьте `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например, "Ice Rating Bot")
   - Введите username бота (например, "ice_rating_bot")
4. Скопируйте полученный токен

## Шаг 2: Настройка окружения

```bash
cd /root/ice-rating-bot

# Добавьте BOT_TOKEN в backend/.env
nano backend/.env
# Вставьте: BOT_TOKEN=your_token_here
```

## Шаг 3: Запуск баз данных

```bash
# Запустить PostgreSQL и Redis
docker-compose up -d postgres redis

# Проверить статус
docker-compose ps
```

## Шаг 4: Установка зависимостей Backend

```bash
cd backend

# Установить пакеты
npm install

# Создать Prisma Client
npx prisma generate

# Создать и применить миграции
npx prisma migrate dev --name init

# (Опционально) Заполнить БД тестовыми данными
npx prisma db seed
```

## Шаг 5: Запуск Backend

```bash
# В директории backend/
npm run dev
```

Вы должны увидеть:
```
[info]: Configuration validated
[info]: Database connected
[info]: Redis connected
[info]: API server listening on port 3000
[info]: Bot @ice_rating_bot started
```

## Шаг 6: Установка зависимостей Frontend

Откройте новый терминал:

```bash
cd /root/ice-rating-bot/frontend

# Установить пакеты
npm install
```

## Шаг 7: Запуск Frontend

```bash
# В директории frontend/
npm run dev
```

Вы должны увидеть:
```
VITE ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Шаг 8: Настройка Mini App в BotFather

1. Откройте [@BotFather](https://t.me/botfather)
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Нажмите "Bot Settings" → "Menu Button"
5. Выберите "Edit menu button URL"
6. Введите: `http://localhost:5173` (для локального тестирования)

**Важно:** Для production вам нужно:
- Задеплоить frontend на Vercel/Netlify/свой сервер с HTTPS
- Обновить URL в BotFather на реальный (например, `https://ice-bot.vercel.app`)

## Шаг 9: Тестирование

1. Откройте Telegram и найдите вашего бота
2. Отправьте `/start`
3. Бот должен ответить приветственным сообщением с кнопкой "Open Mini App"
4. Нажмите на кнопку - должно открыться ваше Mini App

## 🎯 Что дальше?

### Следующие шаги разработки:

1. **Seed Database с начальными данными**
   - Создать achievements
   - Добавить NFT collections

2. **Реализовать TON Connect интеграцию**
   - NFT Scanner Service
   - Wallet verification

3. **Реализовать Points System**
   - Calculator Service
   - Leaderboard updates

4. **Добавить Background Jobs**
   - NFT scanning job
   - Leaderboard update job

5. **Подключить реальные API endpoints**
   - User routes
   - Leaderboard routes
   - NFT routes

## 📋 Полезные команды

### Backend

```bash
# Development mode
npm run dev

# Build для production
npm run build

# Запуск production build
npm start

# Prisma Studio (GUI для БД)
npx prisma studio

# Создать новую миграцию
npx prisma migrate dev --name migration_name

# Применить миграции на production
npx prisma migrate deploy

# Сгенерировать Prisma Client
npx prisma generate
```

### Frontend

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Запустить все сервисы
docker-compose up -d

# Остановить все сервисы
docker-compose down

# Посмотреть логи
docker-compose logs -f

# Перезапустить конкретный сервис
docker-compose restart postgres
```

## 🐛 Troubleshooting

### Бот не отвечает
- Проверьте что backend запущен: `npm run dev`
- Проверьте логи на ошибки
- Убедитесь что BOT_TOKEN правильный

### База данных не подключается
- Проверьте что PostgreSQL запущен: `docker-compose ps`
- Проверьте DATABASE_URL в `.env`
- Попробуйте перезапустить: `docker-compose restart postgres`

### Mini App не открывается
- Убедитесь что frontend запущен: `npm run dev`
- Проверьте что URL в BotFather правильный
- Для production нужен HTTPS

### Prisma ошибки
```bash
# Сброс БД (ОСТОРОЖНО: удалит все данные)
npx prisma migrate reset

# Пересоздать Prisma Client
npx prisma generate
```

## 📦 Production Deployment

См. подробное руководство в основном [README.md](README.md), раздел "Deployment Plan"

## 💡 Полезные ссылки

- [Grammy Documentation](https://grammy.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TON Connect Documentation](https://docs.ton.org/develop/dapps/ton-connect/overview)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Plan файл с полной архитектурой](/root/.claude/plans/gentle-inventing-kurzweil.md)
