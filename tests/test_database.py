"""Tests for finance SQLite persistence."""

from __future__ import annotations

import asyncio
from importlib.util import module_from_spec, spec_from_file_location
import tempfile
from pathlib import Path

_MODULE_PATH = Path(__file__).parents[1] / "custom_components" / "finances" / "database.py"
_SPEC = spec_from_file_location("finance_database", _MODULE_PATH)
_MODULE = module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)
FinanceDatabase = _MODULE.FinanceDatabase
migrate_legacy_transactions = _MODULE.migrate_legacy_transactions
_SUMMARY_PATH = Path(__file__).parents[1] / "custom_components" / "finances" / "summary.py"
_SUMMARY_SPEC = spec_from_file_location("finance_summary", _SUMMARY_PATH)
_SUMMARY_MODULE = module_from_spec(_SUMMARY_SPEC)
_SUMMARY_SPEC.loader.exec_module(_SUMMARY_MODULE)
monthly_summary = _SUMMARY_MODULE.monthly_summary


class FakeConfig:
    def __init__(self, path: Path) -> None:
        self.directory = path

    def path(self, filename: str) -> str:
        return str(self.directory / filename)


class FakeHomeAssistant:
    def __init__(self, path: Path) -> None:
        self.config = FakeConfig(path)

    async def async_add_executor_job(self, target, *args):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, target, *args)


def run(coroutine):
    return asyncio.run(coroutine)


def test_database_round_trip_preserves_account_manager_state() -> None:
    with tempfile.TemporaryDirectory() as directory:
        database = FinanceDatabase(FakeHomeAssistant(Path(directory)))
        state = {
            "date": "2026-10-01T00:00:00.000Z",
            "locale": "en-GB",
            "currency": "GBP",
            "excessive": 5,
            "benefactor": "Household",
            "templates": [{
                "id": "template-1", "name": "Rent", "benefactor": "Home",
                "amount": 1200, "startDate": "2026-01-01T00:00:00.000Z",
                "endDate": None, "partial": True, "recurrence": 1,
                "created": "2026-01-01T00:00:00.000Z",
            }],
            "payments": [{
                "id": "payment-1", "templateId": "template-1", "name": "Rent",
                "amount": 500, "date": "2026-10-03T00:00:00.000Z",
                "closePartial": False, "created": "2026-10-03T00:00:00.000Z",
            }],
        }
        run(database.async_initialize())
        assert not run(database.async_legacy_migrated())
        run(database.async_mark_legacy_migrated())
        assert run(database.async_legacy_migrated())
        run(database.async_save(state))

        loaded = run(database.async_load())

        assert loaded == state


def test_legacy_transactions_become_one_off_payments() -> None:
    result = migrate_legacy_transactions([
        {"id": "expense-1", "date": "2026-10-02", "description": "Food", "amount": 30, "category": "Groceries"},
        {"id": "income-1", "date": "2026-10-03", "description": "Pay", "amount": 100, "category": "Salary"},
    ])

    assert result["payments"][0]["templateId"] == "00000000-0000-0000-0000-000000000000"
    assert result["payments"][0]["amount"] == 30
    assert result["payments"][1]["amount"] == -100


def test_monthly_summary_counts_income_spending_and_partial_bills() -> None:
    state = {
        "date": "2026-10-01T00:00:00.000Z",
        "excessive": 10,
        "templates": [
            {"id": "rent", "amount": 1000, "partial": True, "recurrence": 1,
             "startDate": "2026-01-01T00:00:00.000Z", "endDate": None},
            {"id": "internet", "amount": 100, "partial": False, "recurrence": 1,
             "startDate": "2026-01-01T00:00:00.000Z", "endDate": None},
            {"id": "insurance", "amount": 100, "partial": False, "recurrence": 1,
             "startDate": "2026-01-01T00:00:00.000Z", "endDate": None},
        ],
        "payments": [
            {"templateId": "rent", "amount": 400, "date": "2026-10-02T00:00:00.000Z", "closePartial": False},
            {"templateId": "internet", "amount": 120, "date": "2026-10-04T00:00:00.000Z", "closePartial": False},
            {"templateId": "unexpected", "amount": 50, "date": "2026-10-05T00:00:00.000Z", "closePartial": False},
            {"templateId": "income", "amount": -2500, "date": "2026-10-06T00:00:00.000Z", "closePartial": False},
            {"templateId": "unexpected", "amount": 999, "date": "2026-09-30T00:00:00.000Z", "closePartial": False},
        ],
    }

    assert monthly_summary(state) == {
        "spending": 570,
        "income": 2500,
        "remaining": 700,
        "over_budget_count": 1,
    }


def test_recurring_bill_is_only_due_on_its_schedule() -> None:
    state = {
        "date": "2026-12-01T00:00:00.000Z",
        "excessive": 0,
        "templates": [{
            "id": "quarterly", "amount": 90, "partial": False,
            "recurrence": 3, "startDate": "2026-02-01T00:00:00.000Z",
            "endDate": None,
        }],
        "payments": [],
    }

    assert monthly_summary(state)["remaining"] == 0