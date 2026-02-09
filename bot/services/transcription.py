"""Сервис транскрипции аудио.

Поддерживает три провайдера:
- OpenAI Whisper API (облако) — платный, высокое качество
- faster-whisper (локально) — бесплатный, работает на CPU/GPU
- vosk (локально) — бесплатный, лёгкий, работает офлайн

Выбор через переменную TRANSCRIPTION_PROVIDER.
"""

import asyncio
import json
import logging
import time
import wave
from pathlib import Path

from bot.config import config

logger = logging.getLogger(__name__)

# Максимальное количество попыток при ошибке API
MAX_RETRIES = 3
# Базовая задержка для exponential backoff (секунды)
BASE_DELAY = 2.0

# Кеш загруженных моделей (чтобы не грузить каждый раз)
_faster_whisper_model = None
_vosk_model = None


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
    elif provider == "vosk":
        return await _transcribe_vosk(audio_path)
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

    Бесплатная альтернатива OpenAI Whisper API.
    Модель загружается один раз и кешируется.
    Для русского языка рекомендуется модель 'medium' или 'large-v3'.
    """
    global _faster_whisper_model

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise RuntimeError(
            "faster-whisper не установлен. Выполните:\n"
            "  pip install faster-whisper\n"
            "Или используйте TRANSCRIPTION_PROVIDER=openai"
        )

    # Загружаем модель (один раз)
    loop = asyncio.get_event_loop()

    def _load_and_transcribe():
        global _faster_whisper_model

        if _faster_whisper_model is None:
            model_size = config.LOCAL_WHISPER_MODEL
            compute_type = config.LOCAL_WHISPER_COMPUTE
            logger.info(
                "Загрузка модели faster-whisper: %s (compute: %s)",
                model_size,
                compute_type,
            )
            _faster_whisper_model = WhisperModel(
                model_size,
                device="auto",
                compute_type=compute_type,
            )
            logger.info("Модель faster-whisper загружена")

        start_time = time.time()
        segments, info = _faster_whisper_model.transcribe(
            str(audio_path),
            language=config.WHISPER_LANGUAGE,
            beam_size=5,
            vad_filter=True,
        )

        text = " ".join(segment.text.strip() for segment in segments)
        elapsed = time.time() - start_time

        logger.info(
            "Локальная транскрипция завершена за %.1f сек, язык: %s (вероятность: %.0f%%)",
            elapsed,
            info.language,
            info.language_probability * 100,
        )

        return text.strip()

    # Запускаем в отдельном потоке, чтобы не блокировать event loop
    text = await loop.run_in_executor(None, _load_and_transcribe)
    return text


async def _transcribe_vosk(audio_path: Path) -> str:
    """Транскрипция через Vosk (офлайн).

    Самый лёгкий вариант — работает на слабых серверах.
    Требует скачанную модель в VOSK_MODEL_PATH.
    Модели: https://alphacephei.com/vosk/models
    Для русского: vosk-model-ru-0.42 (~1.8 ГБ) или vosk-model-small-ru-0.22 (~45 МБ)
    """
    global _vosk_model

    try:
        from vosk import KaldiRecognizer, Model, SetLogLevel
    except ImportError:
        raise RuntimeError(
            "vosk не установлен. Выполните:\n"
            "  pip install vosk\n"
            "И скачайте модель: https://alphacephei.com/vosk/models\n"
            "Или используйте TRANSCRIPTION_PROVIDER=openai"
        )

    loop = asyncio.get_event_loop()

    def _load_and_transcribe():
        global _vosk_model

        SetLogLevel(-1)  # Отключаем лишние логи Vosk

        if _vosk_model is None:
            model_path = config.VOSK_MODEL_PATH
            if not Path(model_path).exists():
                raise RuntimeError(
                    f"Модель Vosk не найдена: {model_path}\n"
                    "Скачайте модель с https://alphacephei.com/vosk/models\n"
                    "и укажите путь в VOSK_MODEL_PATH"
                )
            logger.info("Загрузка модели Vosk: %s", model_path)
            _vosk_model = Model(model_path)
            logger.info("Модель Vosk загружена")

        start_time = time.time()

        # Открываем WAV файл
        wf = wave.open(str(audio_path), "rb")
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2:
            raise RuntimeError(
                "Vosk требует mono 16-bit WAV. "
                "Проверьте конвертацию через ffmpeg."
            )

        recognizer = KaldiRecognizer(_vosk_model, wf.getframerate())
        recognizer.SetWords(True)

        results = []
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if recognizer.AcceptWaveform(data):
                part = json.loads(recognizer.Result())
                if part.get("text"):
                    results.append(part["text"])

        # Финальный результат
        final = json.loads(recognizer.FinalResult())
        if final.get("text"):
            results.append(final["text"])

        wf.close()
        text = " ".join(results)
        elapsed = time.time() - start_time

        logger.info(
            "Vosk транскрипция завершена за %.1f сек, %d символов",
            elapsed,
            len(text),
        )

        return text.strip()

    text = await loop.run_in_executor(None, _load_and_transcribe)
    return text
