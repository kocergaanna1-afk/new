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
        
        payload = {
            "clientId": self.client_id,
            "securityBoard": board,
            "securityCode": ticker,
            "buySell": direction,
            "quantity": quantity,
            "useCredit": True, 
            "property": "PutInQueue", 
        }

        try:
            logger.info(f"Отправка ордера: {action} {quantity} {ticker} на {board}")
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

    def get_positions(self, board=BOARD):
        """Получение текущих открытых позиций"""
        # У Финама нет отдельного простого эндпоинта "positions", 
        # позиции обычно приходят внутри портфеля или в stops/orders
        # В v1/portfolio есть раздел positions
        # ВНИМАНИЕ: Это зависит от версии API, нужно парсить ответ portfolio
        portfolio = self.get_portfolio()
        if not portfolio:
            return []
            
        # Упрощенный парсинг. Структура может отличаться.
        # Обычно это list внутри data['positions']
        # Нам нужно найти позиции по нашему инструменту
        # Предположим структуру { "positions": [ { "securityCode": "NGH6", "balance": 1, ... } ] }
        try:
            # В реальном ответе может быть вложенность data -> portfolio -> positions
            # Или просто positions
            # Проверим структуру (в реальности нужно смотреть доку)
            if 'data' in portfolio and 'positions' in portfolio['data']:
                return portfolio['data']['positions']
            elif 'positions' in portfolio:
                return portfolio['positions']
            return []
        except Exception as e:
            logger.error(f"Ошибка парсинга позиций: {e}")
            return []

    def get_position_for_ticker(self, ticker: str):
        positions = self.get_positions()
        for pos in positions:
            if pos.get('securityCode') == ticker:
                # balance - это текущее кол-во лотов
                return pos.get('balance', 0)
        return 0

# Создаем экземпляр клиента
finam_client = FinamClient(FINAM_API_TOKEN, FINAM_CLIENT_ID, TRADING_ACCOUNT_ID)
