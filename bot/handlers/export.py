"""Обработчики команд экспорта: /export, /export_all."""

import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import FSInputFile, Message

from bot.services.storage import storage

logger = logging.getLogger(__name__)

router = Router(name="export")


@router.message(Command("export"))
async def cmd_export(message: Message, state: FSMContext) -> None:
    """Отправить текущий .md файл как документ.

    Экспортирует файл текущего выбранного раздела.
    """
    data = await state.get_data()
    project_id = data.get("project_id")
    section_id = data.get("section_id")

    if not project_id or not section_id:
        await message.answer(
            "⚠️ Сначала выберите проект и раздел.\n"
            "Используйте /start для навигации."
        )
        return

    file_path = storage.export_section(project_id, section_id)

    if not file_path:
        await message.answer("⚠️ Файл раздела не найден.")
        return

    section = storage.get_section(project_id, section_id)
    project = storage.get_project(project_id)
    section_name = section.name if section else section_id
    project_name = project.name if project else project_id

    try:
        document = FSInputFile(file_path, filename=f"{section_id}.md")
        await message.answer_document(
            document,
            caption=f"📄 {section_name} (проект: {project_name})",
        )
    except Exception as e:
        logger.error("Ошибка экспорта: %s", e, exc_info=True)
        await message.answer("❌ Ошибка при экспорте файла.")


@router.message(Command("export_all"))
async def cmd_export_all(message: Message, state: FSMContext) -> None:
    """Отправить всю базу знаний как ZIP-архив."""
    status_msg = await message.answer("⏳ Формирую архив...")

    try:
        zip_path = storage.export_all()

        if not zip_path:
            await status_msg.edit_text("⚠️ База знаний пуста. Нечего экспортировать.")
            return

        document = FSInputFile(zip_path, filename="knowledge_base.zip")
        await message.answer_document(
            document,
            caption="📦 Полный экспорт базы знаний",
        )
        await status_msg.delete()

        # Удаляем временный архив
        if zip_path.exists():
            zip_path.unlink()

    except Exception as e:
        logger.error("Ошибка экспорта: %s", e, exc_info=True)
        await status_msg.edit_text("❌ Ошибка при создании архива.")
