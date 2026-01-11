import sqlite3
import json
from typing import Optional

DB_NAME = "bot_state.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Таблица для хранения целевого состояния
    # ticker: текущий тикер, на котором мы должны стоять
    # target_pos: желаемая позиция (0 = нет, >0 лонг, <0 шорт)
    # last_updated: время обновления
    c.execute('''CREATE TABLE IF NOT EXISTS state
                 (id INTEGER PRIMARY KEY, 
                  ticker TEXT, 
                  target_pos INTEGER, 
                  strategy_name TEXT UNIQUE)''')
    conn.commit()
    conn.close()

def get_state(strategy_name="main"):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT ticker, target_pos FROM state WHERE strategy_name=?", (strategy_name,))
    row = c.fetchone()
    conn.close()
    if row:
        return {"ticker": row[0], "target_pos": row[1]}
    return None

def update_state(ticker: str, target_pos: int, strategy_name="main"):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Upsert logic
    c.execute("INSERT OR REPLACE INTO state (id, ticker, target_pos, strategy_name) VALUES ((SELECT id FROM state WHERE strategy_name = ?), ?, ?, ?)", 
              (strategy_name, ticker, target_pos, strategy_name))
    conn.commit()
    conn.close()
