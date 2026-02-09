"""Точка входа приложения — запуск Telegram-бота."""

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from bot.config import config
from bot.handlers import export, management, navigation, recording, search, start
from bot.middleware.auth import AuthMiddleware

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def create_bot() -> Bot:
    """Создаёт экземпляр бота."""
    if not config.BOT_TOKEN:
        logger.error("BOT_TOKEN не задан в .env")
        sys.exit(1)

    return Bot(
        token=config.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


def create_dispatcher() -> Dispatcher:
    """Создаёт и настраивает диспетчер."""
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)

    # Регистрация middleware авторизации
    dp.message.middleware(AuthMiddleware())
    dp.callback_query.middleware(AuthMiddleware())

    # Регистрация роутеров (порядок важен!)
    dp.include_router(start.router)
    dp.include_router(navigation.router)
    dp.include_router(recording.router)
    dp.include_router(management.router)
    dp.include_router(export.router)
    dp.include_router(search.router)

    return dp


async def main() -> None:
    """Основная функция запуска бота."""
    logger.info("Запуск бота «База знаний Qubba»...")

    bot = create_bot()
    dp = create_dispatcher()

    # Удаляем вебхук и запускаем polling
    await bot.delete_webhook(drop_pending_updates=True)

    logger.info("Бот запущен и готов к работе!")
    logger.info("Авторизованные пользователи: %s", config.ADMIN_IDS)

    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
