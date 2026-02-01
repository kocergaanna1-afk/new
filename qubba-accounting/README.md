# Qubba Accounting

Профессиональная система бухгалтерского учёта для российских селлеров маркетплейсов.

## 🚀 Основные возможности

- **Бухгалтерский учёт**
  - План счетов РФ
  - Ручные и автоматические проводки
  - Оборотно-сальдовая ведомость
  - Карточка счёта

- **Интеграции с маркетплейсами**
  - Wildberries
  - Ozon
  - Yandex.Market
  - Автоматическая загрузка документов

- **Налоговый учёт**
  - ОСНО, УСН, ПСН
  - Книга покупок и продаж
  - КУДиР
  - Формирование деклараций

- **Интеграция с Qubba WMS**
  - Синхронизация закупок
  - Единая аутентификация
  - Общие справочники

## 📋 Технический стек

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL 15+
- **Cache**: Redis
- **Auth**: JWT + Passport.js

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build**: Vite
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS

## 🛠 Установка и запуск

### Требования
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (опционально)

### Быстрый старт с Docker

```bash
# Клонировать репозиторий
git clone <repository-url>
cd qubba-accounting

# Запустить все сервисы
docker-compose up -d

# Backend API: http://localhost:3000
# Frontend: http://localhost:5173
```

### Локальная разработка

#### Backend

```bash
cd backend

# Установить зависимости
npm install

# Создать файл .env
cp .env.example .env

# Запустить в режиме разработки
npm run start:dev
```

#### Frontend

```bash
cd frontend

# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev
```

## 📁 Структура проекта

```
qubba-accounting/
├── backend/
│   ├── src/
│   │   ├── auth/           # Аутентификация
│   │   ├── accounting/     # Бухгалтерский учёт
│   │   ├── integrations/   # Интеграции (МП, банки, ФНС)
│   │   ├── tax/            # Налоговый учёт
│   │   ├── payroll/        # Зарплата
│   │   ├── reporting/      # Отчёты
│   │   └── database/       # Entities, миграции
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── api/            # API клиенты
│   │   ├── components/     # UI компоненты
│   │   ├── pages/          # Страницы
│   │   ├── stores/         # Zustand stores
│   │   └── types/          # TypeScript типы
│   └── ...
└── docker-compose.yml
```

## 🔐 API Endpoints

### Аутентификация
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/refresh` - Обновление токена
- `GET /api/v1/auth/profile` - Профиль пользователя

### План счетов
- `GET /api/v1/accounts` - Список счетов
- `GET /api/v1/accounts/:code` - Получить счёт
- `POST /api/v1/accounts` - Создать счёт
- `PUT /api/v1/accounts/:id` - Обновить счёт
- `POST /api/v1/accounts/initialize` - Инициализировать стандартный план счетов

### Проводки
- `GET /api/v1/postings` - Список проводок
- `GET /api/v1/postings/:id` - Получить проводку
- `POST /api/v1/postings` - Создать проводку
- `POST /api/v1/postings/:id/cancel` - Отменить проводку

### Отчёты
- `GET /api/v1/reports/trial-balance` - Оборотно-сальдовая ведомость
- `GET /api/v1/reports/account-card` - Карточка счёта

## 🔧 Конфигурация

### Переменные окружения (Backend)

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=qubba_accounting
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Integrations
WMS_API_URL=http://localhost:4000/api
```

### Переменные окружения (Frontend)

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## 📈 Roadmap

### MVP (Фаза 1-2)
- [x] Аутентификация
- [x] План счетов
- [x] Ручные проводки
- [x] Оборотно-сальдовая ведомость
- [ ] Интеграция с Wildberries
- [ ] Интеграция с Ozon

### v1.0 (Фаза 3-4)
- [ ] Банковская интеграция
- [ ] Декларации НДС
- [ ] УСН (КУДиР)
- [ ] Зарплатный модуль
- [ ] Отчёты в ПФР/ФСС

### v2.0 (Фаза 5-6)
- [ ] Все маркетплейсы
- [ ] Электронный документооборот (ЭДО)
- [ ] Управленческая отчётность
- [ ] AI-ассистент
- [ ] OCR распознавание документов

## 📄 Лицензия

MIT

## 🤝 Поддержка

- Email: support@qubba.ru
- Документация: docs.qubba.ru
