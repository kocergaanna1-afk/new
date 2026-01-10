-- ======================================
-- QUIK LUA СКРИПТ ДЛЯ ЭКСПОРТА СВЕЧЕЙ
-- ======================================
-- Этот скрипт автоматически экспортирует свечи в файл
-- для использования в Python стратегии

-- НАСТРОЙКИ (измените под ваш инструмент)
local CLASS_CODE = "SPBFUT"  -- Класс инструмента
local SEC_CODE = "SiH5"      -- Код инструмента (например, SiH5, BRH5, GAZP)
local INTERVAL = INTERVAL_H1 -- Таймфрейм: INTERVAL_M1, INTERVAL_M5, INTERVAL_H1, INTERVAL_D1
local EXPORT_FILE = "C:\\quik_export.txt"  -- Путь к файлу экспорта (измените на ваш путь!)
local UPDATE_SECONDS = 5     -- Обновлять каждые N секунд

-- Переменные
local is_running = true
local candles_count = 100    -- Сколько свечей экспортировать

-- Функция получения свечей
function getCandles()
    local candles = {}
    local t, n, l = getCandlesByIndex("", CLASS_CODE, SEC_CODE, 0, INTERVAL, 0, candles_count)
    
    if n == nil or n == 0 then
        message("Нет данных по инструменту: " .. CLASS_CODE .. ":" .. SEC_CODE, 2)
        return nil
    end
    
    for i = 0, n - 1 do
        local candle, _ = getCandlesByIndex("", CLASS_CODE, SEC_CODE, 0, INTERVAL, i, 1)
        if candle then
            table.insert(candles, candle)
        end
    end
    
    return candles
end

-- Функция экспорта в файл
function exportToFile(candles)
    if candles == nil or #candles == 0 then
        message("Нет данных для экспорта", 2)
        return false
    end
    
    local file = io.open(EXPORT_FILE, "w")
    if not file then
        message("Ошибка открытия файла: " .. EXPORT_FILE, 3)
        return false
    end
    
    -- Заголовок
    file:write("Date;Time;Open;High;Low;Close;Volume\n")
    
    -- Данные свечей
    for _, candle in ipairs(candles) do
        local date = candle.datetime.year .. "-" .. 
                     string.format("%02d", candle.datetime.month) .. "-" .. 
                     string.format("%02d", candle.datetime.day)
        
        local time = string.format("%02d", candle.datetime.hour) .. ":" .. 
                     string.format("%02d", candle.datetime.min)
        
        local line = string.format("%s;%s;%.2f;%.2f;%.2f;%.2f;%.0f\n",
            date, time, 
            candle.open, 
            candle.high, 
            candle.low, 
            candle.close, 
            candle.volume or 0
        )
        
        file:write(line)
    end
    
    file:close()
    return true
end

-- Главная функция
function main()
    message("========================================", 1)
    message("🚀 QUIK Экспорт свечей запущен", 1)
    message("========================================", 1)
    message("Инструмент: " .. CLASS_CODE .. ":" .. SEC_CODE, 1)
    message("Таймфрейм: " .. tostring(INTERVAL), 1)
    message("Файл экспорта: " .. EXPORT_FILE, 1)
    message("Обновление каждые " .. UPDATE_SECONDS .. " сек", 1)
    message("========================================", 1)
    message("", 1)
    message("💡 Для остановки скрипта:", 1)
    message("   Сервис -> Lua скрипты -> остановить скрипт", 1)
    message("", 1)
    
    while is_running do
        -- Получаем свечи
        local candles = getCandles()
        
        if candles then
            -- Экспортируем в файл
            local success = exportToFile(candles)
            
            if success then
                local last_candle = candles[#candles]
                message(string.format("✅ Экспортировано %d свечей. Последняя цена: %.2f", 
                    #candles, last_candle.close), 1)
            end
        end
        
        -- Ждём перед следующим обновлением
        sleep(UPDATE_SECONDS * 1000)
    end
end

-- Функция остановки скрипта
function OnStop()
    is_running = false
    message("⏸️ Скрипт остановлен", 1)
    return 1000
end

-- Запуск
main()
