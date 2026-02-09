"""Обработчики команд поиска: /search, /last, /undo."""

import logging

from aiogram import Router
from aiogram.filters import Command, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot.keyboards.inline import recording_keyboard
from bot.services.storage import storage

logger = logging.getLogger(__name__)

router = Router(name="search")


@router.message(Command("search"))
async def cmd_search(message: Message, command: CommandObject) -> None:
    """Полнотекстовый поиск по базе знаний.

    Использование: /search <запрос>
    """
    query = command.args

    if not query or not query.strip():
        await message.answer(
            "⚠️ Укажите поисковый запрос.\n"
            "Использование: <code>/search запрос</code>",
            parse_mode="HTML",
        )
        return

    query = query.strip()
    results = storage.search(query)

    if not results:
        await message.answer(
            f"🔍 По запросу <b>«{query}»</b> ничего не найдено.",
            parse_mode="HTML",
        )
        return

    text_parts = [f"🔍 Результаты поиска <b>«{query}»</b>:\n"]

    for i, result in enumerate(results[:10], 1):
        timestamp = f" ({result.timestamp})" if result.timestamp else ""
        text_parts.append(
            f"<b>{i}.</b> 📂 {result.project_name} / 📄 {result.section_name}{timestamp}\n"
            f"<i>{result.snippet}</i>\n"
        )

    total = len(results)
    if total > 10:
        text_parts.append(f"\n... и ещё {total - 10} результатов")

    await message.answer("\n".join(text_parts), parse_mode="HTML")


@router.message(Command("last"))
async def cmd_last(message: Message) -> None:
    """Показать последние 5 записей."""
    entries = storage.get_last_entries(5)

    if not entries:
        await message.answer("📝 В базе знаний пока нет записей.")
        return

    text_parts = ["📝 <b>Последние записи:</b>\n"]

    for i, entry in enumerate(entries, 1):
        text_parts.append(
            f"<b>{i}.</b> 📂 {entry['project_name']} / 📄 {entry['section_name']}\n"
            f"🕐 {entry['timestamp']}\n"
            f"<i>{entry['preview']}</i>\n"
        )

    await message.answer("\n".join(text_parts), parse_mode="HTML")


@router.message(Command("undo"))
async def cmd_undo(message: Message, state: FSMContext) -> None:
    """Удалить последнюю добавленную запись в текущем разделе."""
    data = await state.get_data()
    project_id = data.get("project_id")
    section_id = data.get("section_id")

    if not project_id or not section_id:
        await message.answer(
            "⚠️ Сначала выберите проект и раздел.\n"
            "Команда /undo удаляет последнюю запись в текущем разделе."
        )
        return

    section = storage.get_section(project_id, section_id)
    section_name = section.name if section else section_id

    success = storage.delete_last_entry(project_id, section_id)

    if success:
        await message.answer(
            f"✅ Последняя запись в разделе <b>«{section_name}»</b> удалена.",
            reply_markup=recording_keyboard(project_id, section_id),
            parse_mode="HTML",
        )
    else:
        await message.answer(
            f"⚠️ В разделе <b>«{section_name}»</b> нет записей для удаления.",
            reply_markup=recording_keyboard(project_id, section_id),
            parse_mode="HTML",
        )
