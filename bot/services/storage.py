"""Сервис работы с файловой системой базы знаний.

Управляет meta.json, проектами, разделами и записями в .md файлах.
"""

import json
import os
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from pydantic import BaseModel

from bot.config import config


class Section(BaseModel):
    """Раздел проекта."""

    id: str
    name: str


class Project(BaseModel):
    """Проект базы знаний."""

    id: str
    name: str
    sections: list[Section] = []


class Meta(BaseModel):
    """Корневая структура meta.json."""

    projects: list[Project] = []


class Entry(BaseModel):
    """Запись в базе знаний."""

    project_id: str
    section_id: str
    text: str
    source: str  # "voice" или "text"
    timestamp: datetime
    word_count: int


class SearchResult(BaseModel):
    """Результат поиска."""

    project_id: str
    project_name: str
    section_id: str
    section_name: str
    snippet: str
    timestamp: Optional[str] = None


class StorageService:
    """Сервис работы с файловой системой базы знаний."""

    def __init__(self, base_path: Optional[Path] = None):
        self.base_path = base_path or config.KNOWLEDGE_BASE_PATH
        self._ensure_base_dir()

    def _ensure_base_dir(self) -> None:
        """Создаёт базовую директорию, если не существует."""
        self.base_path.mkdir(parents=True, exist_ok=True)
        meta_path = self.base_path / "meta.json"
        if not meta_path.exists():
            self._save_meta(Meta())

    def _load_meta(self) -> Meta:
        """Загружает meta.json."""
        meta_path = self.base_path / "meta.json"
        if not meta_path.exists():
            return Meta()
        with open(meta_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Meta(**data)

    def _save_meta(self, meta: Meta) -> None:
        """Сохраняет meta.json."""
        meta_path = self.base_path / "meta.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta.model_dump(), f, ensure_ascii=False, indent=2)

    @staticmethod
    def _slugify(name: str) -> str:
        """Генерирует slug из названия (транслитерация + нормализация).

        Поддерживает кириллицу через простую транслитерацию.
        """
        translit_map = {
            "а": "a", "б": "b", "в": "v", "г": "g", "д": "d",
            "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i",
            "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
            "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
            "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch",
            "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "",
            "э": "e", "ю": "yu", "я": "ya",
        }
        result = []
        for ch in name.lower():
            if ch in translit_map:
                result.append(translit_map[ch])
            elif ch.isascii() and (ch.isalnum() or ch in "-_ "):
                result.append(ch)
            else:
                result.append("")
        slug = "".join(result).strip()
        slug = re.sub(r"[\s_]+", "-", slug)
        slug = re.sub(r"-+", "-", slug)
        slug = slug.strip("-")
        return slug or "project"

    # --- Проекты ---

    def get_projects(self) -> list[Project]:
        """Возвращает список проектов из meta.json."""
        meta = self._load_meta()
        return meta.projects

    def get_project(self, project_id: str) -> Optional[Project]:
        """Возвращает проект по ID."""
        meta = self._load_meta()
        for project in meta.projects:
            if project.id == project_id:
                return project
        return None

    def create_project(self, name: str) -> Project:
        """Создаёт новый проект."""
        meta = self._load_meta()
        slug = self._slugify(name)

        # Проверяем уникальность ID
        existing_ids = {p.id for p in meta.projects}
        final_id = slug
        counter = 1
        while final_id in existing_ids:
            final_id = f"{slug}-{counter}"
            counter += 1

        project = Project(id=final_id, name=name, sections=[])
        meta.projects.append(project)

        # Создаём папку проекта
        project_dir = self.base_path / final_id
        project_dir.mkdir(parents=True, exist_ok=True)

        self._save_meta(meta)
        return project

    def rename_project(self, project_id: str, new_name: str) -> Optional[Project]:
        """Переименовывает проект."""
        meta = self._load_meta()
        for project in meta.projects:
            if project.id == project_id:
                project.name = new_name
                self._save_meta(meta)
                return project
        return None

    def delete_project(self, project_id: str) -> bool:
        """Удаляет проект и все его файлы."""
        meta = self._load_meta()
        project = None
        for p in meta.projects:
            if p.id == project_id:
                project = p
                break

        if not project:
            return False

        # Удаляем папку проекта
        project_dir = self.base_path / project_id
        if project_dir.exists():
            shutil.rmtree(project_dir)

        meta.projects = [p for p in meta.projects if p.id != project_id]
        self._save_meta(meta)
        return True

    # --- Разделы ---

    def get_sections(self, project_id: str) -> list[Section]:
        """Возвращает список разделов проекта."""
        project = self.get_project(project_id)
        if not project:
            return []
        return project.sections

    def get_section(self, project_id: str, section_id: str) -> Optional[Section]:
        """Возвращает раздел по ID."""
        sections = self.get_sections(project_id)
        for section in sections:
            if section.id == section_id:
                return section
        return None

    def create_section(self, project_id: str, name: str) -> Optional[Section]:
        """Создаёт новый раздел в проекте."""
        meta = self._load_meta()
        project = None
        for p in meta.projects:
            if p.id == project_id:
                project = p
                break

        if not project:
            return None

        slug = self._slugify(name)
        existing_ids = {s.id for s in project.sections}
        final_id = slug
        counter = 1
        while final_id in existing_ids:
            final_id = f"{slug}-{counter}"
            counter += 1

        section = Section(id=final_id, name=name)
        project.sections.append(section)

        # Создаём .md файл
        md_path = self.base_path / project_id / f"{final_id}.md"
        md_path.parent.mkdir(parents=True, exist_ok=True)
        if not md_path.exists():
            md_path.touch()

        self._save_meta(meta)
        return section

    def rename_section(
        self, project_id: str, section_id: str, new_name: str
    ) -> Optional[Section]:
        """Переименовывает раздел."""
        meta = self._load_meta()
        for project in meta.projects:
            if project.id == project_id:
                for section in project.sections:
                    if section.id == section_id:
                        section.name = new_name
                        self._save_meta(meta)
                        return section
        return None

    def delete_section(self, project_id: str, section_id: str) -> bool:
        """Удаляет раздел и его .md файл."""
        meta = self._load_meta()
        for project in meta.projects:
            if project.id == project_id:
                section = None
                for s in project.sections:
                    if s.id == section_id:
                        section = s
                        break

                if not section:
                    return False

                # Удаляем .md файл
                md_path = self.base_path / project_id / f"{section_id}.md"
                if md_path.exists():
                    md_path.unlink()

                project.sections = [
                    s for s in project.sections if s.id != section_id
                ]
                self._save_meta(meta)
                return True
        return False

    # --- Записи ---

    def append_entry(
        self,
        project_id: str,
        section_id: str,
        text: str,
        source: str = "voice",
    ) -> Optional[Entry]:
        """Добавляет запись в .md файл раздела."""
        md_path = self.base_path / project_id / f"{section_id}.md"
        md_path.parent.mkdir(parents=True, exist_ok=True)

        now = datetime.now()
        timestamp_str = now.strftime("%Y-%m-%d %H:%M")
        source_label = " [текст]" if source == "text" else ""

        entry_text = f"\n---\n## Запись от {timestamp_str}{source_label}\n\n{text.strip()}\n"

        with open(md_path, "a", encoding="utf-8") as f:
            f.write(entry_text)

        word_count = len(text.split())

        return Entry(
            project_id=project_id,
            section_id=section_id,
            text=text,
            source=source,
            timestamp=now,
            word_count=word_count,
        )

    def delete_last_entry(self, project_id: str, section_id: str) -> bool:
        """Удаляет последнюю запись из .md файла."""
        md_path = self.base_path / project_id / f"{section_id}.md"
        if not md_path.exists():
            return False

        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Разделяем по маркеру записи
        parts = content.split("\n---\n## Запись от ")
        if len(parts) <= 1:
            # Нет записей или только одна
            if len(parts) == 1 and parts[0].strip():
                # Есть одна запись — очищаем файл
                with open(md_path, "w", encoding="utf-8") as f:
                    f.write("")
                return True
            return False

        # Удаляем последнюю часть
        parts = parts[:-1]
        if len(parts) == 1 and not parts[0].strip():
            # Была единственная запись
            with open(md_path, "w", encoding="utf-8") as f:
                f.write("")
        else:
            new_content = parts[0]
            for part in parts[1:]:
                new_content += "\n---\n## Запись от " + part
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(new_content)

        return True

    def get_last_entries(self, count: int = 5) -> list[dict]:
        """Возвращает последние N записей из всей базы знаний."""
        entries = []
        meta = self._load_meta()

        for project in meta.projects:
            for section in project.sections:
                md_path = self.base_path / project.id / f"{section.id}.md"
                if not md_path.exists():
                    continue

                with open(md_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Парсим записи
                parts = re.split(r"\n---\n## Запись от ", content)
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue

                    # Извлекаем дату и текст
                    lines = part.split("\n", 1)
                    header = lines[0].strip()
                    text = lines[1].strip() if len(lines) > 1 else ""

                    # Пробуем парсить дату из заголовка
                    date_match = re.match(
                        r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2})", header
                    )
                    timestamp_str = date_match.group(1) if date_match else header

                    entries.append(
                        {
                            "project_id": project.id,
                            "project_name": project.name,
                            "section_id": section.id,
                            "section_name": section.name,
                            "timestamp": timestamp_str,
                            "text": text,
                            "preview": text[:200] + "..."
                            if len(text) > 200
                            else text,
                        }
                    )

        # Сортируем по дате (убывание)
        entries.sort(key=lambda e: e["timestamp"], reverse=True)
        return entries[:count]

    # --- Поиск ---

    def search(self, query: str) -> list[SearchResult]:
        """Полнотекстовый поиск по всей базе знаний."""
        results = []
        meta = self._load_meta()
        query_lower = query.lower()

        for project in meta.projects:
            for section in project.sections:
                md_path = self.base_path / project.id / f"{section.id}.md"
                if not md_path.exists():
                    continue

                with open(md_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Парсим записи и ищем совпадения
                parts = re.split(r"\n---\n## Запись от ", content)
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    if query_lower in part.lower():
                        lines = part.split("\n", 1)
                        header = lines[0].strip()
                        text = lines[1].strip() if len(lines) > 1 else ""

                        date_match = re.match(
                            r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2})", header
                        )
                        timestamp_str = (
                            date_match.group(1) if date_match else None
                        )

                        # Формируем сниппет с контекстом вокруг совпадения
                        idx = text.lower().find(query_lower)
                        if idx >= 0:
                            start = max(0, idx - 50)
                            end = min(len(text), idx + len(query) + 50)
                            snippet = text[start:end]
                            if start > 0:
                                snippet = "..." + snippet
                            if end < len(text):
                                snippet = snippet + "..."
                        else:
                            snippet = text[:200]

                        results.append(
                            SearchResult(
                                project_id=project.id,
                                project_name=project.name,
                                section_id=section.id,
                                section_name=section.name,
                                snippet=snippet,
                                timestamp=timestamp_str,
                            )
                        )

        return results

    # --- Экспорт ---

    def export_section(self, project_id: str, section_id: str) -> Optional[Path]:
        """Возвращает путь к .md файлу для отправки."""
        md_path = self.base_path / project_id / f"{section_id}.md"
        if md_path.exists():
            return md_path
        return None

    def export_all(self) -> Optional[Path]:
        """Создаёт ZIP-архив всей базы знаний и возвращает путь."""
        zip_path = self.base_path / "export_knowledge_base.zip"

        # Удаляем старый архив если есть
        if zip_path.exists():
            zip_path.unlink()

        meta = self._load_meta()
        if not meta.projects:
            return None

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for project in meta.projects:
                project_dir = self.base_path / project.id
                if not project_dir.exists():
                    continue
                for section in project.sections:
                    md_path = project_dir / f"{section.id}.md"
                    if md_path.exists():
                        arcname = f"{project.id}/{section.id}.md"
                        zf.write(md_path, arcname)

            # Добавляем meta.json
            meta_path = self.base_path / "meta.json"
            if meta_path.exists():
                zf.write(meta_path, "meta.json")

        return zip_path

    # --- Статистика ---

    def get_statistics(self) -> dict:
        """Возвращает статистику базы знаний."""
        meta = self._load_meta()
        total_entries = 0
        total_words = 0
        total_size = 0

        for project in meta.projects:
            for section in project.sections:
                md_path = self.base_path / project.id / f"{section.id}.md"
                if not md_path.exists():
                    continue

                total_size += md_path.stat().st_size

                with open(md_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Считаем записи
                parts = re.split(r"\n---\n## Запись от ", content)
                entries_count = sum(1 for p in parts if p.strip())
                total_entries += entries_count
                total_words += len(content.split())

        return {
            "projects_count": len(meta.projects),
            "sections_count": sum(
                len(p.sections) for p in meta.projects
            ),
            "entries_count": total_entries,
            "total_words": total_words,
            "total_size_kb": round(total_size / 1024, 1),
        }


# Глобальный экземпляр сервиса
storage = StorageService()
