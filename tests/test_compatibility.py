"""Tests for backward compatibility with standalone finance backups."""

from __future__ import annotations

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

_MODULE_PATH = (
    Path(__file__).parents[1]
    / "custom_components"
    / "finances"
    / "compatibility.py"
)
_SPEC = spec_from_file_location("finance_compatibility", _MODULE_PATH)
_MODULE = module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)
normalize_legacy_recurrences = _MODULE.normalize_legacy_recurrences


def test_normalizes_legacy_six_and_twelve_month_recurrences() -> None:
    state = {
        "templates": [
            {"id": "six-month", "recurrence": 6},
            {"id": "annual", "recurrence": "12"},
        ],
    }

    normalized = normalize_legacy_recurrences(state)

    assert [item["recurrence"] for item in normalized["templates"]] == [4, 5]
    assert state["templates"][0]["recurrence"] == 6


def test_normalizes_recurrence_at_failing_backup_template_index() -> None:
    state = {"templates": [{"recurrence": 1} for _ in range(17)] + [{"recurrence": 6}]}

    normalized = normalize_legacy_recurrences(state)

    assert normalized["templates"][17]["recurrence"] == 4


def test_preserves_current_and_unknown_recurrence_values() -> None:
    state = {
        "templates": [
            {"id": "current", "recurrence": 3},
            {"id": "unknown", "recurrence": 18},
        ],
    }

    normalized = normalize_legacy_recurrences(state)

    assert [item["recurrence"] for item in normalized["templates"]] == [3, 18]


def test_handles_non_template_entries_without_hiding_validation_errors() -> None:
    malformed = ["not a template"]
    state = {"templates": malformed}

    normalized = normalize_legacy_recurrences(state)

    assert normalized["templates"] == malformed
