"""SQLite persistence for the Account Manager data model."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any


class FinanceDatabase:
    """Persist finance settings, scheduled templates, and payments in SQLite."""

    def __init__(self, hass: Any) -> None:
        self.hass = hass
        self.path = Path(hass.config.path("finances.db"))

    async def async_initialize(self) -> None:
        """Create the database schema if it does not exist."""
        await self.hass.async_add_executor_job(self._initialize)

    async def async_load(self) -> dict[str, Any]:
        """Load the full app state from SQLite."""
        return await self.hass.async_add_executor_job(self._load)

    async def async_save(self, data: dict[str, Any]) -> None:
        """Atomically replace the app state in SQLite."""
        await self.hass.async_add_executor_job(self._save, data)

    async def async_is_empty(self) -> bool:
        """Return whether the database has any templates or payments."""
        return await self.hass.async_add_executor_job(self._is_empty)

    async def async_legacy_migrated(self) -> bool:
        """Return whether legacy scaffold data was already considered."""
        return await self.hass.async_add_executor_job(self._legacy_migrated)

    async def async_mark_legacy_migrated(self) -> None:
        """Mark legacy scaffold data as migrated or absent."""
        await self.hass.async_add_executor_job(self._mark_legacy_migrated)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=30)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as connection, connection:
            connection.executescript(
                """
                PRAGMA journal_mode = WAL;
                CREATE TABLE IF NOT EXISTS app_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    selected_date TEXT NOT NULL,
                    locale TEXT NOT NULL,
                    currency TEXT NOT NULL,
                    excessive REAL NOT NULL,
                    benefactor TEXT
                );
                CREATE TABLE IF NOT EXISTS templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    benefactor TEXT,
                    amount REAL NOT NULL,
                    start_date TEXT,
                    end_date TEXT,
                    partial INTEGER NOT NULL,
                    recurrence INTEGER NOT NULL,
                    created TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS payments (
                    id TEXT PRIMARY KEY,
                    template_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    amount REAL NOT NULL,
                    payment_date TEXT NOT NULL,
                    close_partial INTEGER NOT NULL,
                    created TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS migration_state (
                    name TEXT PRIMARY KEY,
                    complete INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS payments_date_idx
                    ON payments(payment_date);
                CREATE INDEX IF NOT EXISTS payments_template_idx
                    ON payments(template_id);
                """
            )
            connection.execute(
                """INSERT OR IGNORE INTO app_settings
                   (id, selected_date, locale, currency, excessive, benefactor)
                   VALUES (1, date('now'), 'en-GB', 'EUR', 0, NULL)"""
            )

    def _load(self) -> dict[str, Any]:
        with closing(self._connect()) as connection, connection:
            settings = connection.execute(
                "SELECT * FROM app_settings WHERE id = 1"
            ).fetchone()
            templates = connection.execute(
                "SELECT * FROM templates ORDER BY name COLLATE NOCASE"
            ).fetchall()
            payments = connection.execute(
                "SELECT * FROM payments ORDER BY payment_date, created"
            ).fetchall()
        return {
            "date": settings["selected_date"],
            "locale": settings["locale"],
            "currency": settings["currency"],
            "excessive": settings["excessive"],
            "benefactor": settings["benefactor"],
            "templates": [
                {
                    "id": row["id"], "name": row["name"],
                    "benefactor": row["benefactor"], "amount": row["amount"],
                    "startDate": row["start_date"], "endDate": row["end_date"],
                    "partial": bool(row["partial"]),
                    "recurrence": row["recurrence"], "created": row["created"],
                }
                for row in templates
            ],
            "payments": [
                {
                    "id": row["id"], "templateId": row["template_id"],
                    "name": row["name"], "amount": row["amount"],
                    "date": row["payment_date"],
                    "closePartial": bool(row["close_partial"]),
                    "created": row["created"],
                }
                for row in payments
            ],
        }

    def _save(self, data: dict[str, Any]) -> None:
        with closing(self._connect()) as connection, connection:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """UPDATE app_settings SET selected_date = ?, locale = ?, currency = ?,
                   excessive = ?, benefactor = ? WHERE id = 1""",
                (data["date"], data["locale"], data["currency"],
                 data["excessive"], data["benefactor"]),
            )
            connection.execute("DELETE FROM templates")
            connection.execute("DELETE FROM payments")
            connection.executemany(
                """INSERT INTO templates
                   (id, name, benefactor, amount, start_date, end_date,
                    partial, recurrence, created)
                   VALUES (:id, :name, :benefactor, :amount, :startDate,
                           :endDate, :partial, :recurrence, :created)""",
                [{**item, "partial": int(item["partial"])} for item in data["templates"]],
            )
            connection.executemany(
                """INSERT INTO payments
                   (id, template_id, name, amount, payment_date, close_partial, created)
                   VALUES (:id, :templateId, :name, :amount, :date,
                           :closePartial, :created)""",
                [{**item, "closePartial": int(item["closePartial"])} for item in data["payments"]],
            )

    def _is_empty(self) -> bool:
        with closing(self._connect()) as connection, connection:
            templates = connection.execute("SELECT COUNT(*) FROM templates").fetchone()[0]
            payments = connection.execute("SELECT COUNT(*) FROM payments").fetchone()[0]
        return templates == 0 and payments == 0

    def _legacy_migrated(self) -> bool:
        with closing(self._connect()) as connection, connection:
            row = connection.execute(
                "SELECT complete FROM migration_state WHERE name = 'scaffold_transactions'"
            ).fetchone()
        return row is not None and bool(row["complete"])

    def _mark_legacy_migrated(self) -> None:
        with closing(self._connect()) as connection, connection:
            connection.execute(
                """INSERT INTO migration_state (name, complete)
                   VALUES ('scaffold_transactions', 1)
                   ON CONFLICT(name) DO UPDATE SET complete = 1"""
            )


def migrate_legacy_transactions(transactions: list[dict[str, Any]]) -> dict[str, Any]:
    """Convert transactions from the initial scaffold to Account Manager payments."""
    payments = []
    for item in transactions:
        amount = float(item["amount"])
        if item["category"] == "Salary":
            amount *= -1
        payments.append({
            "id": item["id"],
            "templateId": "00000000-0000-0000-0000-000000000000",
            "name": item["description"],
            "amount": amount,
            "date": f"{item['date']}T00:00:00.000Z",
            "closePartial": False,
            "created": f"{item['date']}T00:00:00.000Z",
        })
    return {
        "date": "", "locale": "en-GB", "currency": "EUR",
        "excessive": 0, "benefactor": None, "templates": [], "payments": payments,
    }
