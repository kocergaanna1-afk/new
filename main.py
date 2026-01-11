from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import logging
from finam_client import finam_client
from config import DEFAULT_TICKER, BOARD

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

class Signal(BaseModel):
    # Поля, которые мы ожидаем от TradingView Alert Webhook
    # В TradingView в поле message нужно будет прописать JSON
    ticker: str = DEFAULT_TICKER # Например, "NGH6"
    action: str # "buy" или "sell"
    quantity: int = 1
    # Можно добавить пароль или токен для безопасности, 
    # чтобы никто другой не мог слать запросы
    passphrase: str | None = None 

@app.post("/webhook")
async def webhook(signal: Signal):
    """
    Эндпоинт для приема сигналов от TradingView.
    """
    logger.info(f"Получен сигнал: {signal}")

    # Проверка безопасности (опционально)
    # if signal.passphrase != "MY_SECRET_PASSWORD":
    #     raise HTTPException(status_code=403, detail="Invalid passphrase")

    try:
        # Отправляем ордер в Финам
        # ВАЖНО: Убедитесь, что тикер соответствует формату Финама (например, NGH6 для фьючерса)
        result = finam_client.place_order(
            ticker=signal.ticker,
            quantity=signal.quantity,
            action=signal.action
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Ошибка обработки сигнала: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
