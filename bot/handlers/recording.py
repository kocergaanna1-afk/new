"""Обработчики приёма голосовых и текстовых сообщений."""

import logging
import os
import tempfile
from pathlib import Path

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot.config import config
from bot.keyboards.inline import recording_keyboard
from bot.services.audio import convert_ogg_to_wav, get_temp_dir
from bot.services.storage import storage
from bot.services.transcription import transcribe
from bot.states import BotStates

logger = logging.getLogger(__name__)

router = Router(name="recording")


@router.message(BotStates.recording, F.voice)
async def handle_voice(message: Message, state: FSMContext, bot: Bot) -> None:
    """Обработка голосового сообщения в режиме записи."""
    data = await state.get_data()
    project_id = data.get("project_id")
    section_id = data.get("section_id")

    if not project_id or not section_id:
        await message.answer("❌ Не выбран проект или раздел. Используйте /start")
        return

    # Проверяем длительность
    duration = message.voice.duration or 0
    if duration > config.MAX_VOICE_DURATION:
        await message.answer(
            f"⚠️ Слишком длинное сообщение. "
            f"Максимум — {config.MAX_VOICE_DURATION // 60} минут."
        )
        return

    # Отправляем сообщение о процессе
    status_msg = await message.answer("⏳ Транскрибирую...")

    temp_dir = get_temp_dir()
    ogg_path = temp_dir / f"{message.voice.file_id}.ogg"
    wav_path = temp_dir / f"{message.voice.file_id}.wav"

    try:
        # Скачиваем аудиофайл
        file = await bot.get_file(message.voice.file_id)
        await bot.download_file(file.file_path, destination=str(ogg_path))

        # Конвертируем ogg → wav
        await convert_ogg_to_wav(ogg_path, wav_path)

        # Транскрибируем
        text = await transcribe(wav_path)

        if not text or not text.strip():
            await status_msg.edit_text(
                "⚠️ Не удалось распознать речь. Попробуйте ещё раз."
            )
            return

        # Сохраняем запись
        entry = storage.append_entry(project_id, section_id, text, source="voice")

        # Формируем ответ
        section = storage.get_section(project_id, section_id)
        section_name = section.name if section else section_id
        preview = text[:200] + "..." if len(text) > 200 else text

        await status_msg.edit_text(
            f"✅ Запись добавлена в <b>{section_name}</b> "
            f"({entry.word_count} слов)\n\n"
            f"<i>{preview}</i>",
            reply_markup=recording_keyboard(project_id, section_id),
            parse_mode="HTML",
        )

    except RuntimeError as e:
        logger.error("Ошибка транскрипции: %s", e)
        # Сохраняем ogg для ручной обработки
        saved_path = config.KNOWLEDGE_BASE_PATH / project_id / f"_pending_{message.voice.file_id}.ogg"
        saved_path.parent.mkdir(parents=True, exist_ok=True)
        if ogg_path.exists():
            import shutil
            shutil.copy2(ogg_path, saved_path)

        await status_msg.edit_text(
            "⚠️ Не удалось транскрибировать. Аудио сохранено, повторите позже.",
            reply_markup=recording_keyboard(project_id, section_id),
        )

    except Exception as e:
        logger.error("Неожиданная ошибка при обработке голосового: %s", e, exc_info=True)
        await status_msg.edit_text(
            "❌ Ошибка обработки. Попробуйте ещё раз.",
            reply_markup=recording_keyboard(project_id, section_id),
        )

    finally:
        # Очищаем временные файлы
        for path in [ogg_path, wav_path]:
            if path.exists():
                try:
                    path.unlink()
                except OSError:
                    pass


@router.message(BotStates.recording, F.text)
async def handle_text(message: Message, state: FSMContext) -> None:
    """Обработка текстового сообщения в режиме записи."""
    # Игнорируем команды
    if message.text and message.text.startswith("/"):
        return

    data = await state.get_data()
    project_id = data.get("project_id")
    section_id = data.get("section_id")

    if not project_id or not section_id:
        await message.answer("❌ Не выбран проект или раздел. Используйте /start")
        return

    text = message.text.strip()
    if not text:
        await message.answer("⚠️ Пустое сообщение. Отправьте текст или голосовое.")
        return

    try:
        # Сохраняем запись
        entry = storage.append_entry(project_id, section_id, text, source="text")

        section = storage.get_section(project_id, section_id)
        section_name = section.name if section else section_id
        preview = text[:200] + "..." if len(text) > 200 else text

        await message.answer(
            f"✅ Запись добавлена в <b>{section_name}</b> "
            f"({entry.word_count} слов) [текст]\n\n"
            f"<i>{preview}</i>",
            reply_markup=recording_keyboard(project_id, section_id),
            parse_mode="HTML",
        )

    except Exception as e:
        logger.error("Ошибка сохранения текстовой записи: %s", e, exc_info=True)
        await message.answer(
            "❌ Ошибка сохранения. Попробуйте ещё раз.",
            reply_markup=recording_keyboard(project_id, section_id),
        )
