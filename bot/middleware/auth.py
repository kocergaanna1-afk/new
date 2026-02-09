"""Middleware авторизации.

Проверяет Telegram ID пользователя перед обработкой любого сообщения.
Если ID отсутствует в ADMIN_IDS — отправляет «Доступ запрещён» и прекращает обработку.
"""

import logging
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject

from bot.config import config

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseMiddleware):
    """Middleware проверки авторизации пользователя."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Определяем user_id из разных типов событий
        user_id = None
        if isinstance(event, Message):
            user_id = event.from_user.id if event.from_user else None
        elif isinstance(event, CallbackQuery):
            user_id = event.from_user.id if event.from_user else None

        if user_id is None:
            logger.warning("Не удалось определить user_id для события %s", type(event))
            return None

        if user_id not in config.ADMIN_IDS:
            logger.warning("Неавторизованный доступ: user_id=%d", user_id)
            if isinstance(event, Message):
                await event.answer("🚫 Доступ запрещён")
            elif isinstance(event, CallbackQuery):
                await event.answer("🚫 Доступ запрещён", show_alert=True)
            return None

        return await handler(event, data)
