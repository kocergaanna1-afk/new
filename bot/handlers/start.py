"""Обработчик команды /start и главного меню."""

import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.keyboards.inline import main_menu_keyboard
from bot.services.storage import storage
from bot.states import BotStates

logger = logging.getLogger(__name__)

router = Router(name="start")

WELCOME_MESSAGE = (
    "👋 Добро пожаловать в <b>Базу знаний Qubba</b>!\n\n"
    "Я помогу вам наполнять базу знаний голосовыми и текстовыми сообщениями.\n"
    "Выберите действие:"
)

WELCOME_NO_PROJECTS = (
    "👋 Добро пожаловать в <b>Базу знаний Qubba</b>!\n\n"
    "У вас пока нет проектов. Создайте первый проект, чтобы начать."
)


@router.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext) -> None:
    """Обработчик команды /start."""
    await state.clear()
    await state.set_state(BotStates.idle)

    projects = storage.get_projects()
    if projects:
        text = WELCOME_MESSAGE
    else:
        text = WELCOME_NO_PROJECTS

    await message.answer(text, reply_markup=main_menu_keyboard(), parse_mode="HTML")


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    """Обработчик команды /cancel — возврат в главное меню."""
    await state.clear()
    await state.set_state(BotStates.idle)
    await message.answer(
        "🏠 Главное меню",
        reply_markup=main_menu_keyboard(),
        parse_mode="HTML",
    )


@router.message(Command("status"))
async def cmd_status(message: Message, state: FSMContext) -> None:
    """Обработчик команды /status — показать текущий контекст."""
    data = await state.get_data()
    current_state = await state.get_state()

    project_id = data.get("project_id")
    section_id = data.get("section_id")

    if project_id and section_id:
        project = storage.get_project(project_id)
        section = storage.get_section(project_id, section_id)
        project_name = project.name if project else project_id
        section_name = section.name if section else section_id
        text = (
            f"📍 <b>Текущий контекст:</b>\n"
            f"Проект: {project_name}\n"
            f"Раздел: {section_name}\n"
            f"Состояние: {current_state or 'idle'}"
        )
    elif project_id:
        project = storage.get_project(project_id)
        project_name = project.name if project else project_id
        text = (
            f"📍 <b>Текущий контекст:</b>\n"
            f"Проект: {project_name}\n"
            f"Раздел: не выбран\n"
            f"Состояние: {current_state or 'idle'}"
        )
    else:
        text = (
            f"📍 <b>Текущий контекст:</b>\n"
            f"Проект: не выбран\n"
            f"Раздел: не выбран\n"
            f"Состояние: {current_state or 'idle'}"
        )

    await message.answer(text, parse_mode="HTML")


@router.callback_query(lambda c: c.data == "action:back_to_menu")
async def back_to_menu(callback: CallbackQuery, state: FSMContext) -> None:
    """Возврат в главное меню через callback."""
    await state.clear()
    await state.set_state(BotStates.idle)

    projects = storage.get_projects()
    if projects:
        text = "🏠 <b>Главное меню</b>\nВыберите действие:"
    else:
        text = WELCOME_NO_PROJECTS

    await callback.message.edit_text(
        text, reply_markup=main_menu_keyboard(), parse_mode="HTML"
    )
    await callback.answer()


@router.callback_query(lambda c: c.data == "action:statistics")
async def show_statistics(callback: CallbackQuery, state: FSMContext) -> None:
    """Показать статистику базы знаний."""
    stats = storage.get_statistics()
    text = (
        "📊 <b>Статистика базы знаний</b>\n\n"
        f"📂 Проектов: {stats['projects_count']}\n"
        f"📄 Разделов: {stats['sections_count']}\n"
        f"📝 Записей: {stats['entries_count']}\n"
        f"📖 Слов: {stats['total_words']}\n"
        f"💾 Размер: {stats['total_size_kb']} КБ"
    )
    await callback.message.edit_text(
        text, reply_markup=main_menu_keyboard(), parse_mode="HTML"
    )
    await callback.answer()
