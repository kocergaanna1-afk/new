"""Обработчики навигации по проектам и разделам."""

import logging

from aiogram import Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery

from bot.keyboards.inline import (
    main_menu_keyboard,
    projects_keyboard,
    recording_keyboard,
    sections_keyboard,
)
from bot.services.storage import storage
from bot.states import BotStates

logger = logging.getLogger(__name__)

router = Router(name="navigation")


@router.callback_query(lambda c: c.data == "nav:projects")
async def show_projects(callback: CallbackQuery, state: FSMContext) -> None:
    """Показать список проектов для навигации."""
    projects = storage.get_projects()

    if not projects:
        await callback.message.edit_text(
            "📂 У вас пока нет проектов. Создайте первый проект!",
            reply_markup=main_menu_keyboard(),
            parse_mode="HTML",
        )
        await callback.answer()
        return

    await state.set_state(BotStates.select_project)
    await callback.message.edit_text(
        "📂 <b>Выберите проект:</b>",
        reply_markup=projects_keyboard(projects, prefix="nav"),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(lambda c: c.data and c.data.startswith("nav:project:"))
async def select_project(callback: CallbackQuery, state: FSMContext) -> None:
    """Обработка выбора проекта — показать разделы."""
    project_id = callback.data.split(":", 2)[2]
    project = storage.get_project(project_id)

    if not project:
        await callback.answer("❌ Проект не найден", show_alert=True)
        return

    sections = storage.get_sections(project_id)

    if not sections:
        await callback.message.edit_text(
            f"📂 Проект: <b>{project.name}</b>\n\n"
            "В этом проекте пока нет разделов. Добавьте разделы через ⚙️ Настройки.",
            reply_markup=main_menu_keyboard(),
            parse_mode="HTML",
        )
        await callback.answer()
        return

    await state.set_state(BotStates.select_section)
    await state.update_data(project_id=project_id)

    await callback.message.edit_text(
        f"📂 Проект: <b>{project.name}</b>\n"
        "Выберите раздел:",
        reply_markup=sections_keyboard(sections, project_id, prefix="nav"),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(lambda c: c.data and c.data.startswith("nav:section:"))
async def select_section(callback: CallbackQuery, state: FSMContext) -> None:
    """Обработка выбора раздела — переход в режим записи."""
    parts = callback.data.split(":")
    project_id = parts[2]
    section_id = parts[3]

    project = storage.get_project(project_id)
    section = storage.get_section(project_id, section_id)

    if not project or not section:
        await callback.answer("❌ Раздел не найден", show_alert=True)
        return

    await state.set_state(BotStates.recording)
    await state.update_data(project_id=project_id, section_id=section_id)

    await callback.message.edit_text(
        f"📝 <b>Раздел: {section.name}</b> (проект: {project.name})\n\n"
        "Отправьте голосовое сообщение, и я добавлю его в базу знаний.\n"
        "Также можно отправить текстовое сообщение.",
        reply_markup=recording_keyboard(project_id, section_id),
        parse_mode="HTML",
    )
    await callback.answer()
