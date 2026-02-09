"""Тесты для сервиса транскрипции."""

import io
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, mock_open, patch

import pytest

from bot.services.transcription import transcribe


class TestTranscription:
    """Тесты модуля транскрипции."""

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

    @pytest.mark.asyncio
    async def test_transcribe_unknown_provider(self):
        """Тест с неизвестным провайдером."""
        with patch("bot.services.transcription.config") as mock_config:
            mock_config.TRANSCRIPTION_PROVIDER = "unknown"

            with pytest.raises(ValueError, match="Неизвестный провайдер"):
                await transcribe(Path("/tmp/test.wav"))

    @pytest.mark.asyncio
    async def test_transcribe_local_not_implemented(self):
        """Тест что локальная транскрипция ещё не реализована."""
        with patch("bot.services.transcription.config") as mock_config:
            mock_config.TRANSCRIPTION_PROVIDER = "local"

            with pytest.raises(NotImplementedError):
                await transcribe(Path("/tmp/test.wav"))
