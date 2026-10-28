"""Compatibility helpers for imported finance data."""

from __future__ import annotations

from typing import Any


_LEGACY_RECURRENCES = {6: 4, "6": 4, 12: 5, "12": 5}


def normalize_legacy_recurrences(state: dict[str, Any]) -> dict[str, Any]:
    """Convert legacy month-interval recurrence values to current enum values."""
    templates = state.get("templates")
    if not isinstance(templates, list):
        return state

    normalized = dict(state)
    normalized["templates"] = [
        {
            **template,
            "recurrence": _LEGACY_RECURRENCES.get(
                template.get("recurrence"), template.get("recurrence")
            ),
        }
        if isinstance(template, dict)
        else template
        for template in templates
    ]
    return normalized
