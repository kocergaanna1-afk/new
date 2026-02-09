"""Inline-клавиатуры для Telegram-бота."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot.services.storage import Project, Section


def main_menu_keyboard() -> InlineKeyboardMarkup:
    """Главное меню."""
    buttons = [
        [InlineKeyboardButton(text="📁 Выбрать проект", callback_data="nav:projects")],
        [InlineKeyboardButton(text="➕ Создать проект", callback_data="action:create_project")],
        [InlineKeyboardButton(text="📊 Статистика", callback_data="action:statistics")],
        [InlineKeyboardButton(text="⚙️ Настройки", callback_data="action:settings")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def projects_keyboard(projects: list[Project], prefix: str = "nav") -> InlineKeyboardMarkup:
    """Клавиатура списка проектов.

    Args:
        projects: список проектов
        prefix: префикс callback_data ('nav' для навигации, 'mgmt' для управления)
    """
    buttons = []
    for project in projects:
        buttons.append(
            [
                InlineKeyboardButton(
                    text=f"📂 {project.name}",
                    callback_data=f"{prefix}:project:{project.id}",
                )
            ]
        )
    buttons.append(
        [InlineKeyboardButton(text="🔙 Назад", callback_data="action:back_to_menu")]
    )
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def sections_keyboard(
    sections: list[Section], project_id: str, prefix: str = "nav"
) -> InlineKeyboardMarkup:
    """Клавиатура списка разделов.

    Args:
        sections: список разделов
        project_id: ID проекта
        prefix: префикс callback_data
    """
    buttons = []
    for section in sections:
        buttons.append(
            [
                InlineKeyboardButton(
                    text=f"📄 {section.name}",
                    callback_data=f"{prefix}:section:{project_id}:{section.id}",
                )
            ]
        )
    if prefix == "nav":
        buttons.append(
            [InlineKeyboardButton(text="🔙 К проектам", callback_data="nav:projects")]
        )
    else:
        buttons.append(
            [
                InlineKeyboardButton(
                    text="🔙 Назад",
                    callback_data=f"mgmt:project:{project_id}",
                )
            ]
        )
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def recording_keyboard(project_id: str, section_id: str) -> InlineKeyboardMarkup:
    """Клавиатура в режиме записи."""
    buttons = [
        [
            InlineKeyboardButton(
                text="📁 Сменить раздел",
                callback_data=f"nav:project:{project_id}",
            )
        ],
        [
            InlineKeyboardButton(
                text="🔙 Главное меню",
                callback_data="action:back_to_menu",
            )
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def settings_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура настроек."""
    buttons = [
        [InlineKeyboardButton(text="📂 Управление проектами", callback_data="mgmt:projects")],
        [InlineKeyboardButton(text="🔙 Главное меню", callback_data="action:back_to_menu")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def project_management_keyboard(project_id: str) -> InlineKeyboardMarkup:
    """Клавиатура управления проектом."""
    buttons = [
        [
            InlineKeyboardButton(
                text="📄 Управление разделами",
                callback_data=f"mgmt:sections:{project_id}",
            )
        ],
        [
            InlineKeyboardButton(
                text="➕ Добавить раздел",
                callback_data=f"mgmt:add_section:{project_id}",
            )
        ],
        [
            InlineKeyboardButton(
                text="✏️ Переименовать проект",
                callback_data=f"mgmt:rename_project:{project_id}",
            )
        ],
        [
            InlineKeyboardButton(
                text="🗑 Удалить проект",
                callback_data=f"mgmt:delete_project:{project_id}",
            )
        ],
        [
            InlineKeyboardButton(
                text="🔙 К проектам",
                callback_data="mgmt:projects",
            )
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def section_management_keyboard(
    project_id: str, section_id: str
) -> InlineKeyboardMarkup:
    """Клавиатура управления разделом."""
    buttons = [
        [
            InlineKeyboardButton(
                text="✏️ Переименовать",
                callback_data=f"mgmt:rename_section:{project_id}:{section_id}",
            )
        ],
        [
            InlineKeyboardButton(
                text="🗑 Удалить",
                callback_data=f"mgmt:delete_section:{project_id}:{section_id}",
            )
        ],
        [
            InlineKeyboardButton(
                text="🔙 К разделам",
                callback_data=f"mgmt:sections:{project_id}",
            )
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def confirm_delete_keyboard(
    entity_type: str, entity_id: str, project_id: str = ""
) -> InlineKeyboardMarkup:
    """Клавиатура подтверждения удаления."""
    if entity_type == "project":
        confirm_data = f"mgmt:confirm_delete_project:{entity_id}"
        cancel_data = f"mgmt:project:{entity_id}"
    else:
        confirm_data = f"mgmt:confirm_delete_section:{project_id}:{entity_id}"
        cancel_data = f"mgmt:sections:{project_id}"

    buttons = [
        [
            InlineKeyboardButton(text="✅ Да, удалить", callback_data=confirm_data),
            InlineKeyboardButton(text="❌ Отмена", callback_data=cancel_data),
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def add_more_sections_keyboard(project_id: str) -> InlineKeyboardMarkup:
    """Клавиатура для добавления ещё разделов после создания проекта."""
    buttons = [
        [
            InlineKeyboardButton(
                text="➕ Добавить раздел",
                callback_data=f"mgmt:add_section:{project_id}",
            )
        ],
        [
            InlineKeyboardButton(
                text="✅ Готово",
                callback_data="action:back_to_menu",
            )
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)
