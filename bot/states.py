"""FSM-состояния бота."""

from aiogram.fsm.state import State, StatesGroup


class BotStates(StatesGroup):
    """Состояния Finite State Machine бота."""

    # Главное меню, ожидание действия
    idle = State()

    # Навигация: ожидание выбора проекта
    select_project = State()

    # Навигация: ожидание выбора раздела
    select_section = State()

    # Режим записи: приём голосовых/текстовых сообщений
    recording = State()

    # Управление проектами и разделами
    management = State()

    # Создание проекта: ожидание ввода названия
    create_project = State()

    # Создание раздела: ожидание ввода названия
    create_section = State()

    # Добавление разделов после создания проекта
    adding_sections = State()

    # Переименование проекта: ожидание нового имени
    rename_project = State()

    # Переименование раздела: ожидание нового имени
    rename_section = State()

    # Подтверждение удаления проекта
    confirm_delete_project = State()

    # Подтверждение удаления раздела
    confirm_delete_section = State()

    # Выбор проекта для управления
    management_select_project = State()

    # Выбор раздела для управления
    management_select_section = State()

    # Выбор действия с проектом
    management_project_action = State()

    # Выбор действия с разделом
    management_section_action = State()
