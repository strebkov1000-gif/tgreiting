# 🧊 Ice Rating Bot

Telegram Mini App + Bot для рейтинговой системы держателей NFT стикеров проекта [@ice_creators](https://t.me/ice_creators)

## 📋 Описание

Бот с gamification элементами, который:
- Отслеживает NFT стикеры в TON кошельках пользователей
- Начисляет баллы за NFT и активность
- Показывает leaderboard с рейтингом
- Награждает за достижения (achievements)
- Поддерживает реферальную систему
- Дает бусты за участие в чатах проекта

## 🏗️ Архитектура

### Backend
- Node.js 20+ с TypeScript
- Grammy (Telegram Bot Framework)
- Express.js (REST API)
- PostgreSQL 15+ (основная БД)
- Redis 7+ (кэш + leaderboard)
- Prisma (ORM)
- TON SDK (блокчейн интеграция)

### Frontend
- React 18 + TypeScript
- Vite (сборщик)
- TailwindCSS (стили)
- TON Connect UI (подключение кошельков)
- Zustand (state management)
- Framer Motion (анимации)

## 🚀 Быстрый старт

### Требования
- Node.js 20+
- Docker & Docker Compose
- Telegram Bot Token (от @BotFather)

### Установка

1. **Клонируйте проект**
```bash
cd /root/ice-rating-bot
```

2. **Настройте environment variables**
```bash
# Backend
cp backend/.env.example backend/.env
# Отредактируйте backend/.env и добавьте BOT_TOKEN

# Frontend
cp frontend/.env.example frontend/.env
# Отредактируйте frontend/.env
```

3. **Запустите базы данных**
```bash
docker-compose up -d postgres redis
```

4. **Установите зависимости (Backend)**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

5. **Установите зависимости (Frontend)**
```bash
cd ../frontend
npm install
npm run dev
```

### Миграции базы данных

```bash
cd backend

# Создать миграцию
npx prisma migrate dev --name init

# Применить миграции
npx prisma migrate deploy

# Открыть Prisma Studio
npx prisma studio
```

## 📁 Структура проекта

```
ice-rating-bot/
├── backend/              # Backend (Bot + API)
│   ├── src/
│   │   ├── bot/         # Grammy bot handlers
│   │   ├── api/         # Express REST API
│   │   ├── services/    # Бизнес-логика
│   │   ├── jobs/        # Background tasks
│   │   └── database/    # Prisma + Redis
│   └── package.json
├── frontend/            # Mini App (React)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── store/
│   └── package.json
├── assets/              # Дизайн, иконки, гифки
└── docker-compose.yml
```

## 🎯 Основные фичи

- [x] Приветствие с именем пользователя
- [x] TON Connect интеграция
- [x] Автоматическое сканирование NFT
- [x] Система баллов
- [x] Leaderboard
- [x] Профиль пользователя
- [x] Реферальная система
- [x] Daily check-in / Streak
- [x] Достижения (Achievements)
- [x] Парсинг участников чатов
- [x] Уведомления

## 📝 Scripts

### Backend
```bash
npm run dev          # Development mode (hot reload)
npm run build        # Production build
npm run start        # Start production
npm run prisma:migrate  # Run migrations
npm run test         # Run tests
```

### Frontend
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

## 🔐 Environment Variables

См. `.env.example` файлы в `backend/` и `frontend/` директориях

## 📚 API Endpoints

### User
- `GET /api/user/:telegramId` - Получить пользователя
- `POST /api/user/checkin` - Daily check-in
- `GET /api/user/:id/nfts` - NFT пользователя

### Leaderboard
- `GET /api/leaderboard` - Топ пользователей
- `GET /api/leaderboard/rank/:userId` - Ранг пользователя

### NFT
- `POST /api/nft/scan` - Сканировать кошелек

### Referral
- `GET /api/referral/:code` - Инфо о реферале
- `GET /api/referral/:userId/stats` - Статистика рефералов

## 🤖 Bot Commands

- `/start [referral_code]` - Начать (открывает Mini App)
- `/leaderboard` - Показать рейтинг
- `/profile` - Профиль
- `/rank` - Твоя позиция
- `/help` - Помощь
- `/connect` - Подключить кошелек

## 📊 Background Jobs

- **NFT Scanner** - каждые 6 часов (сканирование кошельков)
- **Leaderboard Update** - каждые 5 минут
- **Streak Checker** - ежедневно в 00:00 UTC
- **Chat Member Sync** - каждые 12 часов

## 🎨 Design

Референс UI/UX: [@repcoinbot](https://t.me/repcoinbot)

**Цветовая схема:**
- Primary: Ice Blue (#00D4FF)
- Background: Dark (#1e1e1e)
- Accent: Градиенты

**Шрифты:**
- Inter / SF Pro (основной)
- SF Mono (монорпространный)

## 🔧 Разработка

### Добавление нового endpoint
1. Создайте route в `backend/src/api/routes/`
2. Добавьте в `backend/src/api/index.ts`
3. Создайте соответствующий service

### Добавление новой страницы
1. Создайте компонент в `frontend/src/pages/`
2. Добавьте route в `App.tsx`
3. Обновите навигацию

## 📄 License

MIT

## 👥 Авторы

Ice Creators Team

---

**Папка для assets:** `/root/ice-rating-bot/assets/`
Загружайте туда дизайн, иконки, гифки для проекта.
