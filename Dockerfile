FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Для бесплатной транскрипции (раскомментируйте нужное):
# faster-whisper (рекомендуется, ~2 ГБ RAM):
# RUN pip install --no-cache-dir faster-whisper
# Vosk (лёгкий, ~50 МБ RAM):
# RUN pip install --no-cache-dir vosk

COPY . .

CMD ["python", "-m", "bot.main"]
