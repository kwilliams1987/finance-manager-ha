# Home Assistant Finances

The Account Manager finance app embedded in Home Assistant as an admin-only sidebar panel. It keeps the original recurring schedules, partial payments, unexpected income and bills, benefactor filters, statistics, settings, and encrypted backup workflows.

## Install

1. Copy `custom_components/finances` into the `custom_components` directory inside your Home Assistant configuration directory. Keep the accompanying `custom_components/__init__.py` if installing this repository as-is.
2. Add `finances:` to `configuration.yaml`.
3. Restart Home Assistant. The **Finances** panel will appear in the sidebar for administrators.

Finance data is stored in `finances.db` in the Home Assistant configuration directory, in separate SQLite tables for settings, recurring templates, and payments. This database is independent of Home Assistant Recorder's configured database. SQLite reads and writes run in Home Assistant's executor, and saves are transactional.

This integration has no external Python dependencies. The app's statistics view loads Chart.js from its original CDN URL when opened.

## Use

The selected month shows scheduled bills and income, pending and paid items, partial payments, and unexpected entries. Settings include locale, currency, and excess-payment margin. Backup files are encrypted in the browser; restore replaces the finance data in SQLite.

## Home Assistant entities

The integration exposes three monetary sensors for the app's selected month: `sensor.finances_monthly_spending`, `sensor.finances_monthly_income`, and `sensor.finances_remaining`. Their unit follows the configured currency. `binary_sensor.finances_over_budget_exists` turns on when any scheduled bill exceeds its expected amount by the configured excess-payment margin. Entities refresh immediately after app saves and periodically as a fallback.

When upgrading from the initial scaffold, existing transactions in Home Assistant's `.storage/finances.transactions` are migrated once into one-off payments. Expenses retain their positive amount and `Salary` entries are converted to the original app's negative-income convention.

To move data from the original standalone app, create an encrypted backup there, open the Home Assistant panel, then use **Settings → Restore Backup**. The restored data is written to SQLite; the browser's localStorage is no longer read or used.

## Development checks

Run `pytest -q tests` for SQLite persistence and migration tests. Run `python -m compileall custom_components/finances tests` for Python syntax validation.