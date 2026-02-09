"""Тесты для сервиса транскрипции."""

import io
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, mock_open, patch

import pytest

from bot.services.transcription import transcribe


class TestTranscriptionOpenAI:
    """Тесты транскрипции через OpenAI."""

    @pytest.mark.asyncio
    async def test_transcribe_openai_success(self):
        """Тест успешной транскрипции через OpenAI."""
        mock_response = MagicMock()
        mock_response.text = "Тестовая транскрипция"

        mock_client = AsyncMock()
        mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_response)

        with patch("bot.services.transcription.config") as mock_config:
            mock_config.TRANSCRIPTION_PROVIDER = "openai"
            mock_config.OPENAI_API_KEY = "test-key"
            mock_config.WHISPER_MODEL = "whisper-1"
            mock_config.WHISPER_LANGUAGE = "ru"

            with patch("openai.AsyncOpenAI", return_value=mock_client):
                with patch("builtins.open", mock_open(read_data=b"fake audio")):
                    result = await transcribe(Path("/tmp/test.wav"))

        assert result == "Тестовая транскрипция"

    @pytest.mark.asyncio
    async def test_transcribe_openai_retry_on_failure(self):
        """Тест retry при ошибке API."""
        mock_response = MagicMock()
        mock_response.text = "Текст после retry"

        mock_client = AsyncMock()
        mock_client.audio.transcriptions.create = AsyncMock(
            side_effect=[Exception("API error"), mock_response]
        )

        with patch("bot.services.transcription.config") as mock_config:
            mock_config.TRANSCRIPTION_PROVIDER = "openai"
            mock_config.OPENAI_API_KEY = "test-key"
            mock_config.WHISPER_MODEL = "whisper-1"
            mock_config.WHISPER_LANGUAGE = "ru"

            with patch("openai.AsyncOpenAI", return_value=mock_client):
                with patch("builtins.open", mock_open(read_data=b"fake audio")):
                    result = await transcribe(Path("/tmp/test.wav"))

        assert result == "Текст после retry"
        assert mock_client.audio.transcriptions.create.call_count == 2

    @pytest.mark.asyncio
    async def test_transcribe_openai_all_retries_fail(self):
        """Тест когда все попытки транскрипции неудачны."""
        mock_client = AsyncMock()
        mock_client.audio.transcriptions.create = AsyncMock(
            side_effect=Exception("API error")
        )

        with patch("bot.services.transcription.config") as mock_config:
            mock_config.TRANSCRIPTION_PROVIDER = "openai"
            mock_config.OPENAI_API_KEY = "test-key"
            mock_config.WHISPER_MODEL = "whisper-1"
            mock_config.WHISPER_LANGUAGE = "ru"

            with patch("openai.AsyncOpenAI", return_value=mock_client):
                with patch("builtins.open", mock_open(read_data=b"fake audio")):
                    with pytest.raises(RuntimeError, match="Не удалось транскрибировать"):
                        await transcribe(Path("/tmp/test.wav"))


class TestTranscriptionLocal:
    """Тесты транскрипции через faster-whisper."""

    @pytest.mark.asyncio
    async def test_transcribe_local_missing_package(self):
        """Тест ошибки при отсутствии faster-whisper."""
        import bot.services.transcription as t_mod

        # Сбрасываем кеш модели
        t_mod._faster_whisper_model = None

        with patch("bot.services.transcription.config") as mock_config:
            mock_config.TRANSCRIPTION_PROVIDER = "local"
            mock_config.WHISPER_LANGUAGE = "ru"
            mock_config.LOCAL_WHISPER_MODEL = "tiny"
            mock_config.LOCAL_WHISPER_COMPUTE = "int8"

            with pytest.raises(RuntimeError, match="faster-whisper не установлен"):
                await transcribe(Path("/tmp/test.wav"))

    @pytest.mark.asyncio
    async def test_transcribe_local_success(self):
        """Тест успешной локальной транскрипции (мок)."""
        import sys
        import types

        import bot.services.transcription as t_mod

        # Создаём фейковый модуль faster_whisper
        fake_fw = types.ModuleType("faster_whisper")
        fake_fw.WhisperModel = MagicMock
        sys.modules["faster_whisper"] = fake_fw

        try:
            # Мокаем модель
            mock_info = MagicMock()
            mock_info.language = "ru"
            mock_info.language_probability = 0.98

            mock_segment = MagicMock()
            mock_segment.text = "Тестовая локальная транскрипция"

            mock_model = MagicMock()
            mock_model.transcribe.return_value = ([mock_segment], mock_info)

            # Подставляем мок-модель в кеш
            t_mod._faster_whisper_model = mock_model

            with patch("bot.services.transcription.config") as mock_config:
                mock_config.TRANSCRIPTION_PROVIDER = "local"
                mock_config.WHISPER_LANGUAGE = "ru"
                mock_config.LOCAL_WHISPER_MODEL = "tiny"
                mock_config.LOCAL_WHISPER_COMPUTE = "int8"

                result = await transcribe(Path("/tmp/test.wav"))

            assert result == "Тестовая локальная транскрипция"
        finally:
            # Очищаем
            t_mod._faster_whisper_model = None
            del sys.modules["faster_whisper"]


class TestTranscriptionVosk:
    """Тесты транскрипции через Vosk."""

    @pytest.mark.asyncio
    async def test_transcribe_vosk_missing_package(self):
        """Тест ошибки при отсутствии vosk."""
        import bot.services.transcription as t_mod

        t_mod._vosk_model = None

        with patch("bot.services.transcription.config") as mock_config:
            mock_config.TRANSCRIPTION_PROVIDER = "vosk"
            mock_config.VOSK_MODEL_PATH = "./vosk-model"

            with pytest.raises(RuntimeError, match="vosk не установлен"):
                await transcribe(Path("/tmp/test.wav"))


class TestTranscriptionGeneral:
    """Общие тесты транскрипции."""

    @pytest.mark.asyncio
    async def test_transcribe_unknown_provider(self):
        """Тест с неизвестным провайдером."""
        with patch("bot.services.transcription.config") as mock_config:
            mock_config.TRANSCRIPTION_PROVIDER = "unknown"

            with pytest.raises(ValueError, match="Неизвестный провайдер"):
                await transcribe(Path("/tmp/test.wav"))
