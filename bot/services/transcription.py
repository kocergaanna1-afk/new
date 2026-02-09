"""Сервис транскрипции аудио.

Поддерживает два провайдера:
- OpenAI Whisper API (облако)
- faster-whisper (локально) — заглушка для будущей реализации

Выбор через переменную TRANSCRIPTION_PROVIDER.
"""

import asyncio
import logging
import time
from pathlib import Path

from bot.config import config

logger = logging.getLogger(__name__)

# Максимальное количество попыток при ошибке API
MAX_RETRIES = 3
# Базовая задержка для exponential backoff (секунды)
BASE_DELAY = 2.0


async def transcribe(audio_path: Path) -> str:
    """Транскрибирует аудиофайл в текст.

    Args:
        audio_path: путь к аудиофайлу (.wav или .ogg)

    Returns:
        Текст транскрипции

    Raises:
        RuntimeError: если не удалось транскрибировать после всех попыток
    """
    provider = config.TRANSCRIPTION_PROVIDER

    if provider == "openai":
        return await _transcribe_openai(audio_path)
    elif provider == "local":
        return await _transcribe_local(audio_path)
    else:
        raise ValueError(f"Неизвестный провайдер транскрипции: {provider}")


async def _transcribe_openai(audio_path: Path) -> str:
    """Транскрипция через OpenAI Whisper API."""
    import openai

    client = openai.AsyncOpenAI(api_key=config.OPENAI_API_KEY)
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            start_time = time.time()
            logger.info(
                "Попытка транскрипции #%d: %s",
                attempt,
                audio_path.name,
            )

            with open(audio_path, "rb") as audio_file:
                response = await client.audio.transcriptions.create(
                    model=config.WHISPER_MODEL,
                    file=audio_file,
                    language=config.WHISPER_LANGUAGE,
                )

            elapsed = time.time() - start_time
            text = response.text.strip()

            logger.info(
                "Транскрипция завершена за %.1f сек, %d символов",
                elapsed,
                len(text),
            )

            return text

        except Exception as e:
            last_error = e
            logger.warning(
                "Ошибка транскрипции (попытка %d/%d): %s",
                attempt,
                MAX_RETRIES,
                str(e),
            )

            if attempt < MAX_RETRIES:
                delay = BASE_DELAY * (2 ** (attempt - 1))
                logger.info("Повтор через %.1f сек...", delay)
                await asyncio.sleep(delay)

    raise RuntimeError(
        f"Не удалось транскрибировать после {MAX_RETRIES} попыток: {last_error}"
    )


async def _transcribe_local(audio_path: Path) -> str:
    """Транскрипция через faster-whisper (локально).

    Заглушка — будет реализована при необходимости.
    """
    raise NotImplementedError(
        "Локальная транскрипция через faster-whisper ещё не реализована. "
        "Используйте TRANSCRIPTION_PROVIDER=openai"
    )
