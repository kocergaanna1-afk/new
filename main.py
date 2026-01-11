from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
import asyncio
from finam_client import finam_client
from config import DEFAULT_TICKER
from database import init_db, update_state, get_state
from ticker_utils import get_current_ticker
from background import check_positions_and_rollover

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

class Signal(BaseModel):
    # Теперь тикер в сигнале опционален, мы можем сами определять актуальный
    ticker: str | None = None 
    action: str  # "buy", "sell", "flat" (закрыть всё)
    quantity: int = 1
    passphrase: str | None = None

@app.on_event("startup")
async def startup_event():
    # Инициализация БД
    init_db()
    # Запуск фоновой задачи
    asyncio.create_task(check_positions_and_rollover())

@app.post("/webhook")
async def webhook(signal: Signal):
    logger.info(f"Получен сигнал: {signal}")

    try:
        # Определяем актуальный тикер, если не передан
        ticker = signal.ticker
        if not ticker:
            ticker = get_current_ticker() # Например NGH6

        # Логика определения целевой позиции
        # В простейшем случае: buy = +Q, sell = -Q, flat = 0
        # Но у нас может быть стратегия "переворот".
        # Допустим, сигнал приходит всегда с quantity=1.
        # Если action="buy", значит хотим +1. Если "sell" -> -1.
        
        target_pos = 0
        if signal.action.lower() == 'buy':
            target_pos = signal.quantity
        elif signal.action.lower() == 'sell':
            target_pos = -signal.quantity
        elif signal.action.lower() == 'flat':
            target_pos = 0

        # Получаем текущую реальную позицию
        current_pos = finam_client.get_position_for_ticker(ticker)
        
        # Считаем разницу, которую нужно исполнить
        diff = target_pos - current_pos
        
        if diff == 0:
            return {"status": "ok", "message": "Position matches target"}

        # Исполняем ордер
        action_type = "buy" if diff > 0 else "sell"
        result = finam_client.place_order(
            ticker=ticker,
            quantity=abs(diff),
            action=action_type
        )
        
        # Сохраняем новое состояние в БД
        update_state(ticker, target_pos)

        return {"status": "success", "data": result, "new_target": target_pos}
    except Exception as e:
        logger.error(f"Ошибка обработки сигнала: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
