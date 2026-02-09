# Telegram-бот «База знаний Qubba»

Telegram-бот для сбора и структуризации голосовой базы знаний. Принимает голосовые и текстовые сообщения, транскрибирует их и сохраняет в структурированном виде — по проектам и разделам.

## Возможности

- **Голосовые записи** — надиктуйте информацию, бот транскрибирует и сохранит
- **Текстовые записи** — отправьте текст напрямую
- **Проекты и разделы** — двухуровневая организация знаний
- **CRUD** — полное управление проектами и разделами через бота
- **Поиск** — полнотекстовый поиск по всей базе
- **Экспорт** — выгрузка отдельных разделов или всей базы (ZIP)
- **Авторизация** — доступ только для указанных пользователей

## Быстрый старт

### 1. Клонирование и настройка

```bash
git clone <repository-url>
cd knowledge-bot
cp .env.example .env
```

Заполните `.env`:
- `BOT_TOKEN` — токен Telegram-бота (получите у [@BotFather](https://t.me/BotFather))
- `ADMIN_IDS` — Telegram ID авторизованных пользователей (через запятую)
- `OPENAI_API_KEY` — ключ API OpenAI для транскрипции

### 2. Запуск через Docker

```bash
docker-compose up -d
```

### 3. Запуск локально

```bash
pip install -r requirements.txt
python -m bot.main
```

**Требования:** Python 3.11+, ffmpeg

## Структура проекта

```
├── bot/
│   ├── main.py                 # Точка входа
│   ├── config.py               # Конфигурация (.env)
│   ├── states.py               # FSM-состояния
│   ├── handlers/
│   │   ├── start.py            # /start, главное меню
│   │   ├── navigation.py       # Навигация по проектам/разделам
│   │   ├── recording.py        # Приём голосовых и текстовых
│   │   ├── management.py       # CRUD проектов и разделов
│   │   ├── export.py           # /export, /export_all
│   │   └── search.py           # /search, /last, /undo
│   ├── services/
│   │   ├── transcription.py    # Whisper API транскрипция
│   │   ├── storage.py          # Работа с файлами и meta.json
│   │   └── audio.py            # Конвертация аудио (ffmpeg)
│   ├── keyboards/
│   │   └── inline.py           # Inline-клавиатуры
│   └── middleware/
│       └── auth.py             # Проверка авторизации
├── knowledge_base/             # База знаний (создаётся автоматически)
│   └── meta.json
├── tests/
│   ├── test_storage.py         # 41 тест хранилища
│   └── test_transcription.py   # 5 тестов транскрипции
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Главное меню |
| `/cancel` | Выход из текущего режима |
| `/status` | Текущий проект и раздел |
| `/export` | Экспорт текущего раздела (.md) |
| `/export_all` | Экспорт всей базы (ZIP) |
| `/search <запрос>` | Полнотекстовый поиск |
| `/last` | Последние 5 записей |
| `/undo` | Удалить последнюю запись |

## Хранение данных

База знаний хранится в файловой системе:

```
knowledge_base/
├── project-slug/
│   ├── section-slug.md
│   └── another-section.md
└── meta.json
```

Формат записи в `.md`:
```markdown
---
## Запись от 2026-02-09 14:32

Текст транскрипции голосового сообщения...

---
## Запись от 2026-02-09 15:10 [текст]

Текстовая запись, добавленная вручную...
```

## Конфигурация (.env)

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `BOT_TOKEN` | Токен Telegram-бота | — |
| `ADMIN_IDS` | ID пользователей (через запятую) | — |
| `OPENAI_API_KEY` | Ключ OpenAI API | — |
| `WHISPER_MODEL` | Модель Whisper | `whisper-1` |
| `WHISPER_LANGUAGE` | Язык транскрипции | `ru` |
| `KNOWLEDGE_BASE_PATH` | Путь к базе знаний | `./knowledge_base` |
| `MAX_VOICE_DURATION` | Макс. длительность (сек) | `300` |
| `TRANSCRIPTION_PROVIDER` | Провайдер (`openai`/`local`) | `openai` |

## Тесты

```bash
pip install pytest pytest-asyncio
python -m pytest tests/ -v
```

## Лицензия

MIT
