"""Тесты для сервиса хранения данных."""

import json
import shutil
import tempfile
from pathlib import Path

import pytest

from bot.services.storage import StorageService


@pytest.fixture
def temp_dir():
    """Создаёт временную директорию для тестов."""
    d = Path(tempfile.mkdtemp())
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture
def storage(temp_dir):
    """Создаёт экземпляр StorageService с временной директорией."""
    return StorageService(base_path=temp_dir)


class TestSlugify:
    """Тесты транслитерации и генерации slug."""

    def test_english(self, storage):
        assert storage._slugify("Hello World") == "hello-world"

    def test_russian(self, storage):
        slug = storage._slugify("Привет Мир")
        assert slug == "privet-mir"

    def test_mixed(self, storage):
        slug = storage._slugify("Qubba Склад")
        assert slug == "qubba-sklad"

    def test_special_chars(self, storage):
        slug = storage._slugify("Test!@#$%^&*()")
        assert slug == "test"

    def test_multiple_spaces(self, storage):
        assert storage._slugify("hello   world") == "hello-world"

    def test_empty(self, storage):
        assert storage._slugify("") == "project"


class TestProjects:
    """Тесты операций с проектами."""

    def test_create_project(self, storage, temp_dir):
        project = storage.create_project("Тестовый проект")
        assert project.name == "Тестовый проект"
        assert project.id == "testovyy-proekt"
        assert (temp_dir / project.id).is_dir()

    def test_get_projects(self, storage):
        storage.create_project("Проект 1")
        storage.create_project("Проект 2")
        projects = storage.get_projects()
        assert len(projects) == 2
        assert projects[0].name == "Проект 1"
        assert projects[1].name == "Проект 2"

    def test_get_project(self, storage):
        created = storage.create_project("Тест")
        found = storage.get_project(created.id)
        assert found is not None
        assert found.name == "Тест"

    def test_get_nonexistent_project(self, storage):
        assert storage.get_project("nonexistent") is None

    def test_rename_project(self, storage):
        project = storage.create_project("Старое имя")
        renamed = storage.rename_project(project.id, "Новое имя")
        assert renamed is not None
        assert renamed.name == "Новое имя"

        found = storage.get_project(project.id)
        assert found.name == "Новое имя"

    def test_delete_project(self, storage, temp_dir):
        project = storage.create_project("Удаляемый")
        project_dir = temp_dir / project.id
        assert project_dir.exists()

        success = storage.delete_project(project.id)
        assert success
        assert not project_dir.exists()
        assert len(storage.get_projects()) == 0

    def test_delete_nonexistent_project(self, storage):
        assert not storage.delete_project("nonexistent")

    def test_unique_project_ids(self, storage):
        p1 = storage.create_project("Test")
        p2 = storage.create_project("Test")
        assert p1.id != p2.id
        assert p2.id == "test-1"


class TestSections:
    """Тесты операций с разделами."""

    def test_create_section(self, storage, temp_dir):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "WMS")
        assert section is not None
        assert section.name == "WMS"
        assert (temp_dir / project.id / f"{section.id}.md").exists()

    def test_get_sections(self, storage):
        project = storage.create_project("Проект")
        storage.create_section(project.id, "Раздел 1")
        storage.create_section(project.id, "Раздел 2")
        sections = storage.get_sections(project.id)
        assert len(sections) == 2

    def test_get_section(self, storage):
        project = storage.create_project("Проект")
        created = storage.create_section(project.id, "Тест")
        found = storage.get_section(project.id, created.id)
        assert found is not None
        assert found.name == "Тест"

    def test_rename_section(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Старое")
        renamed = storage.rename_section(project.id, section.id, "Новое")
        assert renamed is not None
        assert renamed.name == "Новое"

    def test_delete_section(self, storage, temp_dir):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Удаляемый")
        md_path = temp_dir / project.id / f"{section.id}.md"
        assert md_path.exists()

        success = storage.delete_section(project.id, section.id)
        assert success
        assert not md_path.exists()
        assert len(storage.get_sections(project.id)) == 0

    def test_create_section_nonexistent_project(self, storage):
        section = storage.create_section("nonexistent", "Test")
        assert section is None

    def test_unique_section_ids(self, storage):
        project = storage.create_project("Проект")
        s1 = storage.create_section(project.id, "Test")
        s2 = storage.create_section(project.id, "Test")
        assert s1.id != s2.id


class TestEntries:
    """Тесты операций с записями."""

    def test_append_entry(self, storage, temp_dir):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")

        entry = storage.append_entry(
            project.id, section.id, "Тестовый текст записи", source="voice"
        )
        assert entry is not None
        assert entry.word_count == 3
        assert entry.source == "voice"

        md_path = temp_dir / project.id / f"{section.id}.md"
        content = md_path.read_text(encoding="utf-8")
        assert "Тестовый текст записи" in content
        assert "## Запись от" in content

    def test_append_text_entry(self, storage, temp_dir):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")

        entry = storage.append_entry(
            project.id, section.id, "Текстовая запись", source="text"
        )
        assert entry.source == "text"

        md_path = temp_dir / project.id / f"{section.id}.md"
        content = md_path.read_text(encoding="utf-8")
        assert "[текст]" in content

    def test_multiple_entries(self, storage, temp_dir):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")

        storage.append_entry(project.id, section.id, "Запись 1")
        storage.append_entry(project.id, section.id, "Запись 2")
        storage.append_entry(project.id, section.id, "Запись 3")

        md_path = temp_dir / project.id / f"{section.id}.md"
        content = md_path.read_text(encoding="utf-8")
        assert content.count("## Запись от") == 3

    def test_delete_last_entry(self, storage, temp_dir):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")

        storage.append_entry(project.id, section.id, "Запись 1")
        storage.append_entry(project.id, section.id, "Запись 2")

        success = storage.delete_last_entry(project.id, section.id)
        assert success

        md_path = temp_dir / project.id / f"{section.id}.md"
        content = md_path.read_text(encoding="utf-8")
        assert "Запись 1" in content
        assert "Запись 2" not in content

    def test_delete_last_entry_single(self, storage, temp_dir):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")

        storage.append_entry(project.id, section.id, "Единственная запись")
        success = storage.delete_last_entry(project.id, section.id)
        assert success

        md_path = temp_dir / project.id / f"{section.id}.md"
        content = md_path.read_text(encoding="utf-8")
        assert content.strip() == ""

    def test_delete_last_entry_empty(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")
        success = storage.delete_last_entry(project.id, section.id)
        assert not success


class TestSearch:
    """Тесты полнотекстового поиска."""

    def test_search_found(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "WMS")
        storage.append_entry(project.id, section.id, "Система управления складом")

        results = storage.search("склад")
        assert len(results) >= 1
        assert "склад" in results[0].snippet.lower()

    def test_search_not_found(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "WMS")
        storage.append_entry(project.id, section.id, "Тестовый текст")

        results = storage.search("несуществующий")
        assert len(results) == 0

    def test_search_case_insensitive(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "WMS")
        storage.append_entry(project.id, section.id, "Система WMS работает")

        results = storage.search("wms")
        assert len(results) >= 1

    def test_search_multiple_results(self, storage):
        project = storage.create_project("Проект")
        s1 = storage.create_section(project.id, "WMS")
        s2 = storage.create_section(project.id, "Тарифы")
        storage.append_entry(project.id, s1.id, "Ключевое слово здесь")
        storage.append_entry(project.id, s2.id, "И ключевое слово тут")

        results = storage.search("ключевое")
        assert len(results) == 2


class TestLastEntries:
    """Тесты получения последних записей."""

    def test_get_last_entries(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")

        for i in range(7):
            storage.append_entry(project.id, section.id, f"Запись номер {i}")

        entries = storage.get_last_entries(5)
        assert len(entries) == 5

    def test_get_last_entries_empty(self, storage):
        entries = storage.get_last_entries(5)
        assert len(entries) == 0


class TestStatistics:
    """Тесты статистики."""

    def test_statistics_empty(self, storage):
        stats = storage.get_statistics()
        assert stats["projects_count"] == 0
        assert stats["sections_count"] == 0
        assert stats["entries_count"] == 0

    def test_statistics_with_data(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")
        storage.append_entry(project.id, section.id, "Тестовая запись один два три")

        stats = storage.get_statistics()
        assert stats["projects_count"] == 1
        assert stats["sections_count"] == 1
        assert stats["entries_count"] == 1
        assert stats["total_words"] > 0


class TestExport:
    """Тесты экспорта."""

    def test_export_section(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")
        storage.append_entry(project.id, section.id, "Текст")

        path = storage.export_section(project.id, section.id)
        assert path is not None
        assert path.exists()

    def test_export_section_nonexistent(self, storage):
        path = storage.export_section("fake", "fake")
        assert path is None

    def test_export_all(self, storage):
        project = storage.create_project("Проект")
        section = storage.create_section(project.id, "Раздел")
        storage.append_entry(project.id, section.id, "Текст")

        zip_path = storage.export_all()
        assert zip_path is not None
        assert zip_path.exists()
        assert zip_path.suffix == ".zip"

    def test_export_all_empty(self, storage):
        zip_path = storage.export_all()
        assert zip_path is None


class TestMetaJson:
    """Тесты работы с meta.json."""

    def test_meta_created_on_init(self, temp_dir):
        storage = StorageService(base_path=temp_dir)
        meta_path = temp_dir / "meta.json"
        assert meta_path.exists()

        with open(meta_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "projects" in data
        assert data["projects"] == []

    def test_meta_persistence(self, temp_dir):
        s1 = StorageService(base_path=temp_dir)
        s1.create_project("Тест")

        # Создаём новый экземпляр — данные должны сохраниться
        s2 = StorageService(base_path=temp_dir)
        projects = s2.get_projects()
        assert len(projects) == 1
        assert projects[0].name == "Тест"
