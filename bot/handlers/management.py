"""Обработчики CRUD операций с проектами и разделами."""

import logging

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.keyboards.inline import (
    add_more_sections_keyboard,
    confirm_delete_keyboard,
    main_menu_keyboard,
    project_management_keyboard,
    projects_keyboard,
    section_management_keyboard,
    sections_keyboard,
    settings_keyboard,
)
from bot.services.storage import storage
from bot.states import BotStates

logger = logging.getLogger(__name__)

router = Router(name="management")


# --- Настройки ---


@router.callback_query(lambda c: c.data == "action:settings")
async def show_settings(callback: CallbackQuery, state: FSMContext) -> None:
    """Показать меню настроек."""
    await state.set_state(BotStates.management)
    await callback.message.edit_text(
        "⚙️ <b>Настройки</b>\n\nУправление проектами и разделами:",
        reply_markup=settings_keyboard(),
        parse_mode="HTML",
    )
    await callback.answer()


# --- Список проектов для управления ---


@router.callback_query(lambda c: c.data == "mgmt:projects")
async def mgmt_show_projects(callback: CallbackQuery, state: FSMContext) -> None:
    """Показать список проектов для управления."""
    projects = storage.get_projects()

    if not projects:
        await callback.message.edit_text(
            "📂 Проектов пока нет. Создайте первый!",
            reply_markup=main_menu_keyboard(),
            parse_mode="HTML",
        )
        await callback.answer()
        return

    await state.set_state(BotStates.management_select_project)
    await callback.message.edit_text(
        "📂 <b>Управление проектами</b>\nВыберите проект:",
        reply_markup=projects_keyboard(projects, prefix="mgmt"),
        parse_mode="HTML",
    )
    await callback.answer()


# --- Управление конкретным проектом ---


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:project:"))
async def mgmt_select_project(callback: CallbackQuery, state: FSMContext) -> None:
    """Показать меню управления проектом."""
    project_id = callback.data.split(":", 2)[2]
    project = storage.get_project(project_id)

    if not project:
        await callback.answer("❌ Проект не найден", show_alert=True)
        return

    await state.set_state(BotStates.management_project_action)
    await state.update_data(mgmt_project_id=project_id)

    sections_count = len(project.sections)
    await callback.message.edit_text(
        f"📂 <b>{project.name}</b>\n"
        f"Разделов: {sections_count}\n\n"
        "Выберите действие:",
        reply_markup=project_management_keyboard(project_id),
        parse_mode="HTML",
    )
    await callback.answer()


# --- Создание проекта ---


@router.callback_query(lambda c: c.data == "action:create_project")
async def start_create_project(callback: CallbackQuery, state: FSMContext) -> None:
    """Начать создание проекта."""
    await state.set_state(BotStates.create_project)
    await callback.message.edit_text(
        "📂 <b>Создание проекта</b>\n\nВведите название проекта:",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(BotStates.create_project, F.text)
async def process_create_project(message: Message, state: FSMContext) -> None:
    """Обработка ввода названия нового проекта."""
    if message.text.startswith("/"):
        return

    name = message.text.strip()
    if not name:
        await message.answer("⚠️ Название не может быть пустым. Введите название:")
        return

    if len(name) > 100:
        await message.answer("⚠️ Слишком длинное название (макс. 100 символов). Попробуйте короче:")
        return

    project = storage.create_project(name)
    await state.set_state(BotStates.adding_sections)
    await state.update_data(new_project_id=project.id)

    await message.answer(
        f"✅ Проект <b>«{project.name}»</b> создан!\n\n"
        "Добавьте разделы в проект:",
        reply_markup=add_more_sections_keyboard(project.id),
        parse_mode="HTML",
    )


# --- Добавление раздела ---


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:add_section:"))
async def start_add_section(callback: CallbackQuery, state: FSMContext) -> None:
    """Начать добавление раздела."""
    project_id = callback.data.split(":", 2)[2]
    project = storage.get_project(project_id)

    if not project:
        await callback.answer("❌ Проект не найден", show_alert=True)
        return

    await state.set_state(BotStates.create_section)
    await state.update_data(mgmt_project_id=project_id)

    await callback.message.edit_text(
        f"📄 <b>Добавление раздела</b>\n"
        f"Проект: {project.name}\n\n"
        "Введите название раздела:",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(BotStates.create_section, F.text)
async def process_create_section(message: Message, state: FSMContext) -> None:
    """Обработка ввода названия нового раздела."""
    if message.text.startswith("/"):
        return

    data = await state.get_data()
    project_id = data.get("mgmt_project_id")

    if not project_id:
        await message.answer("❌ Ошибка. Используйте /start")
        return

    name = message.text.strip()
    if not name:
        await message.answer("⚠️ Название не может быть пустым. Введите название:")
        return

    if len(name) > 100:
        await message.answer("⚠️ Слишком длинное название (макс. 100 символов). Попробуйте короче:")
        return

    section = storage.create_section(project_id, name)

    if not section:
        await message.answer("❌ Не удалось создать раздел. Проект не найден.")
        return

    project = storage.get_project(project_id)
    project_name = project.name if project else project_id

    await state.set_state(BotStates.adding_sections)
    await state.update_data(new_project_id=project_id)

    await message.answer(
        f"✅ Раздел <b>«{section.name}»</b> добавлен в проект «{project_name}»\n\n"
        "Можете добавить ещё разделы или нажмите «Готово»:",
        reply_markup=add_more_sections_keyboard(project_id),
        parse_mode="HTML",
    )


@router.message(BotStates.adding_sections, F.text)
async def process_adding_sections_text(message: Message, state: FSMContext) -> None:
    """Если пользователь вводит текст в состоянии добавления разделов — создаём раздел."""
    if message.text.startswith("/"):
        return

    data = await state.get_data()
    project_id = data.get("new_project_id") or data.get("mgmt_project_id")

    if not project_id:
        await message.answer("❌ Ошибка. Используйте /start")
        return

    name = message.text.strip()
    if not name:
        await message.answer("⚠️ Введите название раздела или нажмите «Готово»:")
        return

    section = storage.create_section(project_id, name)

    if not section:
        await message.answer("❌ Не удалось создать раздел.")
        return

    project = storage.get_project(project_id)
    project_name = project.name if project else project_id

    await message.answer(
        f"✅ Раздел <b>«{section.name}»</b> добавлен в проект «{project_name}»\n\n"
        "Можете добавить ещё разделы или нажмите «Готово»:",
        reply_markup=add_more_sections_keyboard(project_id),
        parse_mode="HTML",
    )


# --- Управление разделами ---


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:sections:"))
async def mgmt_show_sections(callback: CallbackQuery, state: FSMContext) -> None:
    """Показать разделы проекта для управления."""
    project_id = callback.data.split(":", 2)[2]
    project = storage.get_project(project_id)

    if not project:
        await callback.answer("❌ Проект не найден", show_alert=True)
        return

    sections = storage.get_sections(project_id)

    if not sections:
        await callback.message.edit_text(
            f"📂 <b>{project.name}</b>\n\nВ проекте нет разделов.",
            reply_markup=project_management_keyboard(project_id),
            parse_mode="HTML",
        )
        await callback.answer()
        return

    await state.set_state(BotStates.management_select_section)
    await state.update_data(mgmt_project_id=project_id)

    await callback.message.edit_text(
        f"📄 <b>Разделы проекта «{project.name}»</b>\nВыберите раздел:",
        reply_markup=sections_keyboard(sections, project_id, prefix="mgmt"),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:section:"))
async def mgmt_select_section(callback: CallbackQuery, state: FSMContext) -> None:
    """Показать меню управления разделом."""
    parts = callback.data.split(":")
    project_id = parts[2]
    section_id = parts[3]

    project = storage.get_project(project_id)
    section = storage.get_section(project_id, section_id)

    if not project or not section:
        await callback.answer("❌ Раздел не найден", show_alert=True)
        return

    await state.set_state(BotStates.management_section_action)
    await state.update_data(mgmt_project_id=project_id, mgmt_section_id=section_id)

    await callback.message.edit_text(
        f"📄 <b>{section.name}</b>\n"
        f"Проект: {project.name}\n\n"
        "Выберите действие:",
        reply_markup=section_management_keyboard(project_id, section_id),
        parse_mode="HTML",
    )
    await callback.answer()


# --- Переименование проекта ---


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:rename_project:"))
async def start_rename_project(callback: CallbackQuery, state: FSMContext) -> None:
    """Начать переименование проекта."""
    project_id = callback.data.split(":", 2)[2]
    project = storage.get_project(project_id)

    if not project:
        await callback.answer("❌ Проект не найден", show_alert=True)
        return

    await state.set_state(BotStates.rename_project)
    await state.update_data(mgmt_project_id=project_id)

    await callback.message.edit_text(
        f"✏️ <b>Переименование проекта</b>\n"
        f"Текущее название: {project.name}\n\n"
        "Введите новое название:",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(BotStates.rename_project, F.text)
async def process_rename_project(message: Message, state: FSMContext) -> None:
    """Обработка переименования проекта."""
    if message.text.startswith("/"):
        return

    data = await state.get_data()
    project_id = data.get("mgmt_project_id")

    if not project_id:
        await message.answer("❌ Ошибка. Используйте /start")
        return

    new_name = message.text.strip()
    if not new_name:
        await message.answer("⚠️ Название не может быть пустым.")
        return

    project = storage.rename_project(project_id, new_name)

    if not project:
        await message.answer("❌ Проект не найден.")
        return

    await state.set_state(BotStates.management_project_action)
    await message.answer(
        f"✅ Проект переименован в <b>«{project.name}»</b>",
        reply_markup=project_management_keyboard(project_id),
        parse_mode="HTML",
    )


# --- Удаление проекта ---


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:delete_project:"))
async def start_delete_project(callback: CallbackQuery, state: FSMContext) -> None:
    """Запрос подтверждения удаления проекта."""
    project_id = callback.data.split(":", 2)[2]
    project = storage.get_project(project_id)

    if not project:
        await callback.answer("❌ Проект не найден", show_alert=True)
        return

    await state.set_state(BotStates.confirm_delete_project)
    await state.update_data(mgmt_project_id=project_id)

    await callback.message.edit_text(
        f"🗑 <b>Удаление проекта</b>\n\n"
        f"Вы уверены, что хотите удалить проект <b>«{project.name}»</b>?\n"
        f"Это действие удалит все разделы и записи проекта!",
        reply_markup=confirm_delete_keyboard("project", project_id),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:confirm_delete_project:"))
async def confirm_delete_project(callback: CallbackQuery, state: FSMContext) -> None:
    """Подтверждение удаления проекта."""
    project_id = callback.data.split(":", 2)[2]
    project = storage.get_project(project_id)
    project_name = project.name if project else project_id

    success = storage.delete_project(project_id)

    if success:
        await state.set_state(BotStates.management)
        await callback.message.edit_text(
            f"✅ Проект <b>«{project_name}»</b> удалён.",
            reply_markup=main_menu_keyboard(),
            parse_mode="HTML",
        )
    else:
        await callback.answer("❌ Не удалось удалить проект", show_alert=True)

    await callback.answer()


# --- Переименование раздела ---


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:rename_section:"))
async def start_rename_section(callback: CallbackQuery, state: FSMContext) -> None:
    """Начать переименование раздела."""
    parts = callback.data.split(":")
    project_id = parts[2]
    section_id = parts[3]

    section = storage.get_section(project_id, section_id)

    if not section:
        await callback.answer("❌ Раздел не найден", show_alert=True)
        return

    await state.set_state(BotStates.rename_section)
    await state.update_data(mgmt_project_id=project_id, mgmt_section_id=section_id)

    await callback.message.edit_text(
        f"✏️ <b>Переименование раздела</b>\n"
        f"Текущее название: {section.name}\n\n"
        "Введите новое название:",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(BotStates.rename_section, F.text)
async def process_rename_section(message: Message, state: FSMContext) -> None:
    """Обработка переименования раздела."""
    if message.text.startswith("/"):
        return

    data = await state.get_data()
    project_id = data.get("mgmt_project_id")
    section_id = data.get("mgmt_section_id")

    if not project_id or not section_id:
        await message.answer("❌ Ошибка. Используйте /start")
        return

    new_name = message.text.strip()
    if not new_name:
        await message.answer("⚠️ Название не может быть пустым.")
        return

    section = storage.rename_section(project_id, section_id, new_name)

    if not section:
        await message.answer("❌ Раздел не найден.")
        return

    await state.set_state(BotStates.management_section_action)
    await message.answer(
        f"✅ Раздел переименован в <b>«{section.name}»</b>",
        reply_markup=section_management_keyboard(project_id, section_id),
        parse_mode="HTML",
    )


# --- Удаление раздела ---


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:delete_section:"))
async def start_delete_section(callback: CallbackQuery, state: FSMContext) -> None:
    """Запрос подтверждения удаления раздела."""
    parts = callback.data.split(":")
    project_id = parts[2]
    section_id = parts[3]

    project = storage.get_project(project_id)
    section = storage.get_section(project_id, section_id)

    if not project or not section:
        await callback.answer("❌ Раздел не найден", show_alert=True)
        return

    await state.set_state(BotStates.confirm_delete_section)
    await state.update_data(mgmt_project_id=project_id, mgmt_section_id=section_id)

    await callback.message.edit_text(
        f"🗑 <b>Удаление раздела</b>\n\n"
        f"Вы уверены, что хотите удалить раздел <b>«{section.name}»</b> "
        f"из проекта «{project.name}»?\n"
        "Все записи раздела будут удалены!",
        reply_markup=confirm_delete_keyboard("section", section_id, project_id),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(lambda c: c.data and c.data.startswith("mgmt:confirm_delete_section:"))
async def confirm_delete_section(callback: CallbackQuery, state: FSMContext) -> None:
    """Подтверждение удаления раздела."""
    parts = callback.data.split(":")
    project_id = parts[2]
    section_id = parts[3]

    section = storage.get_section(project_id, section_id)
    section_name = section.name if section else section_id

    success = storage.delete_section(project_id, section_id)

    if success:
        await state.set_state(BotStates.management_project_action)
        await callback.message.edit_text(
            f"✅ Раздел <b>«{section_name}»</b> удалён.",
            reply_markup=project_management_keyboard(project_id),
            parse_mode="HTML",
        )
    else:
        await callback.answer("❌ Не удалось удалить раздел", show_alert=True)

    await callback.answer()
