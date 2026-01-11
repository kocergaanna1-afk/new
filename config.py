import os
from dotenv import load_dotenv

load_dotenv()

FINAM_API_TOKEN = os.getenv("FINAM_API_TOKEN")
FINAM_CLIENT_ID = os.getenv("FINAM_CLIENT_ID")
TRADING_ACCOUNT_ID = os.getenv("TRADING_ACCOUNT_ID")
BOARD = os.getenv("BOARD", "FUT")
DEFAULT_TICKER = os.getenv("DEFAULT_TICKER", "NGH6")
