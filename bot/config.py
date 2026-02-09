"""Загрузка конфигурации из .env файла."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Конфигурация приложения."""

    # Telegram
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    ADMIN_IDS: list[int] = [
        int(uid.strip())
        for uid in os.getenv("ADMIN_IDS", "").split(",")
        if uid.strip().isdigit()
    ]

    # OpenAI Whisper
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "whisper-1")
    WHISPER_LANGUAGE: str = os.getenv("WHISPER_LANGUAGE", "ru")

    # Пути
    KNOWLEDGE_BASE_PATH: Path = Path(
        os.getenv("KNOWLEDGE_BASE_PATH", "./knowledge_base")
    )

    # Опции
    MAX_VOICE_DURATION: int = int(os.getenv("MAX_VOICE_DURATION", "300"))
    TRANSCRIPTION_PROVIDER: str = os.getenv("TRANSCRIPTION_PROVIDER", "openai")

    # faster-whisper (локальный, бесплатный)
    # Модели: tiny, base, small, medium, large-v3
    # Для русского рекомендуется medium или large-v3
    LOCAL_WHISPER_MODEL: str = os.getenv("LOCAL_WHISPER_MODEL", "medium")
    LOCAL_WHISPER_COMPUTE: str = os.getenv("LOCAL_WHISPER_COMPUTE", "int8")

    # Vosk (офлайн, бесплатный, лёгкий)
    # Скачать модель: https://alphacephei.com/vosk/models
    VOSK_MODEL_PATH: str = os.getenv("VOSK_MODEL_PATH", "./vosk-model")


config = Config()
