import requests
import json
import logging
from config import FINAM_API_TOKEN, FINAM_CLIENT_ID, TRADING_ACCOUNT_ID, BOARD

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FinamClient:
    def __init__(self, token: str, client_id: str, account_id: str):
        self.token = token
        self.client_id = client_id
        self.account_id = account_id
        self.base_url = "https://trade-api.finam.ru"

    def _get_headers(self):
        return {
            "X-Api-Key": self.token,
            "Content-Type": "application/json"
        }

    def place_order(self, ticker: str, quantity: int, action: str, board: str = BOARD):
        """
        Размещение рыночной заявки.
        
        :param ticker: Тикер инструмента (например, 'NGH6')
        :param quantity: Количество лотов
        :param action: 'buy' или 'sell'
        :param board: Режим торгов (по умолчанию из конфига)
        """
        endpoint = f"{self.base_url}/v1/orders"
        
        # Финам API требует направления сделки: Buy=1, Sell=2
        direction = 1 if action.lower() == 'buy' else 2
        
        # Формируем тело запроса (упрощенно для рыночной заявки)
        # В реальном API Финам структура может быть сложнее, это примерная реализация
        # для REST API. Важно свериться с актуальной документацией.
        # Обычно для рыночной заявки price=0 или не указывается, 
        # но API может требовать property "price": 0.
        
        payload = {
            "clientId": self.client_id,
            "securityBoard": board,
            "securityCode": ticker,
            "buySell": direction,
            "quantity": quantity,
            "useCredit": True, # Использовать маржинальное кредитование если нужно
            "property": "PutInQueue", # Пример свойства, может отличаться
            # Для рыночной заявки цена обычно 0 или null, но зависит от реализации
            # "price": 0, 
        }

        # Примечание: У Финама API может быть gRPC или требовать специфических полей.
        # Для REST (http-gateway) примерная структура.
        # Если используется Transaq Connector или старый API, код будет другим.
        # Здесь мы предполагаем использование современного Trade API.

        try:
            logger.info(f"Отправка ордера: {action} {quantity} {ticker} на {board}")
            # В реальном API может потребоваться подтверждение или другой endpoint
            response = requests.post(endpoint, headers=self._get_headers(), json=payload)
            response.raise_for_status()
            logger.info(f"Ордер успешно отправлен: {response.json()}")
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка при отправке ордера: {e}")
            if e.response:
                logger.error(f"Ответ сервера: {e.response.text}")
            raise

    def get_portfolio(self):
        """Получение информации о портфеле"""
        endpoint = f"{self.base_url}/v1/portfolio"
        params = {"clientId": self.client_id}
        try:
            response = requests.get(endpoint, headers=self._get_headers(), params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка получения портфеля: {e}")
            return None

# Создаем экземпляр клиента
finam_client = FinamClient(FINAM_API_TOKEN, FINAM_CLIENT_ID, TRADING_ACCOUNT_ID)
