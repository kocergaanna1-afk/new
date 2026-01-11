import asyncio
import logging
from ticker_utils import get_current_ticker
from finam_client import finam_client
from database import get_state, update_state, init_db

logger = logging.getLogger(__name__)

async def check_positions_and_rollover():
    """
    Фоновая задача, которая:
    1. Проверяет, изменился ли актуальный тикер (rollover).
    2. Проверяет, соответствует ли реальная позиция целевой (из БД).
    3. Если позиция закрылась (экспирация) или сменился тикер, восстанавливает позицию на новом тикере.
    """
    logger.info("Starting background check loop")
    
    # Инициализация БД при старте
    init_db()
    
    while True:
        try:
            # 1. Получаем текущее состояние стратегии
            state = get_state()
            if not state:
                # Если стратегии нет в БД, значит мы еще не торговали или не инициализировали
                # Можно попробовать прочитать из конфига или просто ждать первого сигнала
                await asyncio.sleep(60)
                continue
                
            saved_ticker = state['ticker']
            target_pos = state['target_pos']
            
            # 2. Определяем актуальный тикер (по дате)
            current_actual_ticker = get_current_ticker()
            
            # 3. Получаем реальную позицию у брокера
            # Сначала проверяем позицию по старому (сохраненному) тикеру
            real_pos_old = finam_client.get_position_for_ticker(saved_ticker)
            
            # Проверяем позицию по новому тикеру (если он отличается)
            real_pos_new = 0
            if current_actual_ticker != saved_ticker:
                real_pos_new = finam_client.get_position_for_ticker(current_actual_ticker)
            
            # ЛОГИКА РОЛЛОВЕРА И ВОССТАНОВЛЕНИЯ
            
            # Случай А: Тикер сменился (наступила дата экспирации/переката)
            if current_actual_ticker != saved_ticker:
                logger.info(f"Обнаружена смена тикера: {saved_ticker} -> {current_actual_ticker}")
                
                # Если у нас есть открытая позиция на старом тикере, закрываем её
                if real_pos_old != 0:
                    logger.info(f"Закрываем старую позицию на {saved_ticker}")
                    action = "sell" if real_pos_old > 0 else "buy"
                    finam_client.place_order(saved_ticker, abs(real_pos_old), action)
                
                # Если у нас есть целевая позиция (мы должны быть в рынке), открываем на новом тикере
                if target_pos != 0:
                    # Проверяем, может мы уже открыли (частично или полностью)
                    diff = target_pos - real_pos_new
                    if diff != 0:
                        logger.info(f"Открываем позицию на новом тикере {current_actual_ticker}: {diff}")
                        action = "buy" if diff > 0 else "sell"
                        finam_client.place_order(current_actual_ticker, abs(diff), action)
                
                # Обновляем состояние в БД
                update_state(current_actual_ticker, target_pos)
                
            # Случай Б: Тикер тот же, но позиция исчезла (принудительное закрытие биржей/брокером)
            elif target_pos != 0 and real_pos_old == 0:
                # Это именно тот кейс "принудительное закрытие, но сигнала не было"
                # ВАЖНО: Тут нужно быть аккуратным. Если мы сами закрыли руками, бот может переоткрыть.
                # Но по условию задачи: "если позиция закрывается по экспирации... на новом контракте открывалась"
                # Если экспирация прошла, get_current_ticker уже вернет НОВЫЙ тикер, и мы попадем в ветку А.
                # Если же это просто "выбило" внутри дня или клиринга (маловероятно для экспирации), 
                # то это восстановление позиции.
                
                logger.warning(f"Позиция на {saved_ticker} отсутствует, хотя целевая {target_pos}. Восстанавливаем.")
                finam_client.place_order(saved_ticker, abs(target_pos), "buy" if target_pos > 0 else "sell")
                
            # Случай В: Все ок, просто ждем
            else:
                # Можно добавить логику частичного исполнения, если real_pos != target_pos
                pass

        except Exception as e:
            logger.error(f"Ошибка в фоновом цикле: {e}")
        
        # Проверка раз в минуту или раз в час
        await asyncio.sleep(60) 
