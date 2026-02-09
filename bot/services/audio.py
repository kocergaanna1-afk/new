"""Сервис конвертации аудио.

Конвертирует .ogg (Opus) файлы из Telegram в .wav для Whisper API.
"""

import asyncio
import logging
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


async def convert_ogg_to_wav(input_path: Path, output_path: Path | None = None) -> Path:
    """Конвертирует .ogg в .wav через ffmpeg.

    Args:
        input_path: путь к входному .ogg файлу
        output_path: путь к выходному .wav файлу (если None — генерируется автоматически)

    Returns:
        Путь к сконвертированному .wav файлу

    Raises:
        RuntimeError: если ffmpeg завершился с ошибкой
    """
    if output_path is None:
        output_path = input_path.with_suffix(".wav")

    logger.info("Конвертация %s → %s", input_path, output_path)

    process = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-i", str(input_path),
        "-ar", "16000",
        "-ac", "1",
        "-y",  # перезапись если файл существует
        str(output_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode("utf-8", errors="replace")
        logger.error("Ошибка ffmpeg: %s", error_msg)
        raise RuntimeError(f"ffmpeg error: {error_msg}")

    logger.info("Конвертация завершена: %s", output_path)
    return output_path


def get_temp_dir() -> Path:
    """Возвращает временную директорию для аудио файлов."""
    temp_dir = Path(tempfile.gettempdir()) / "knowledge_bot_audio"
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir
