from datetime import datetime, timedelta

# Коды месяцев фьючерсов на Мосбирже
MONTH_CODES = {
    1: 'F', 2: 'G', 3: 'H', 4: 'J', 5: 'K', 6: 'M',
    7: 'N', 8: 'Q', 9: 'U', 10: 'V', 11: 'X', 12: 'Z'
}

# День месяца, когда мы переключаемся на следующий контракт
# Обычно экспирация NG происходит в последние дни месяца (25-28 число).
# Поставим переключение на 20-е число для безопасности, чтобы заранее торговать новый контракт,
# или можно поставить ближе к экспирации. Здесь настроим на 25-е число.
ROLLOVER_DAY = 25

def get_current_ticker(symbol="NG"):
    """
    Возвращает тикер текущего актуального фьючерса.
    Пример: NGH6 (для марта 2026)
    """
    now = datetime.now()
    year = now.year
    month = now.month
    day = now.day

    # Логика: если сегодня после дня ролловера, смотрим следующий месяц
    if day >= ROLLOVER_DAY:
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    # Формируем код года (последняя цифра)
    year_code = str(year)[-1]
    
    # Код месяца
    month_code = MONTH_CODES[month]
    
    return f"{symbol}{month_code}{year_code}"

def get_next_ticker(symbol="NG"):
    """
    Возвращает тикер следующего месяца (для ручного переката если нужно)
    """
    # Логика похожа, просто берем current + 1 месяц
    # Для простоты реализации можно просто сдвинуть дату на 30 дней вперед
    future_date = datetime.now() + timedelta(days=35)
    # И рекурсивно вызвать логику (упрощенно)
    # Но лучше явно:
    now = datetime.now()
    if now.day >= ROLLOVER_DAY:
        # Мы уже в "следующем", значит нам нужен "следующий за следующим"
        target_date = now + timedelta(days=60)
    else:
        target_date = now + timedelta(days=30)
        
    year = target_date.year
    month = target_date.month
    
    year_code = str(year)[-1]
    month_code = MONTH_CODES[month]
    
    return f"{symbol}{month_code}{year_code}"
