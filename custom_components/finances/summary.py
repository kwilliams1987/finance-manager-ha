"""Calculations for finance summary entities."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

EMPTY_TEMPLATE_ID = "00000000-0000-0000-0000-000000000000"


def _as_date(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def _is_due(template: dict[str, Any], year: int, month: int) -> bool:
    start = _as_date(template.get("startDate"))
    end = _as_date(template.get("endDate"))
    if start and (start.year, start.month) > (year, month):
        return False
    if end and (end.year, end.month) < (year, month):
        return False

    recurrence = template["recurrence"]
    if recurrence == 0:
        return bool(start and (start.year, start.month) == (year, month))
    if recurrence == 1:
        return True
    if start is None:
        return False
    if recurrence == 2:
        return month % 2 == start.month % 2
    if recurrence == 3:
        return month % 3 == start.month % 3
    if recurrence == 4:
        return month % 6 == start.month % 6
    return month == start.month


def monthly_summary(state: dict[str, Any]) -> dict[str, Any]:
    """Return monthly income, spending, remaining bills, and over-budget count."""
    selected = _as_date(state["date"])
    if selected is None:
        return {"spending": 0.0, "income": 0.0, "remaining": 0.0, "over_budget_count": 0}
    year, month = selected.year, selected.month
    payments = [
        payment for payment in state["payments"]
        if (payment_date := _as_date(payment["date"]))
        and (payment_date.year, payment_date.month) == (year, month)
    ]
    spending = sum(payment["amount"] for payment in payments if payment["amount"] > 0)
    income = -sum(payment["amount"] for payment in payments if payment["amount"] < 0)

    due_bills = [
        template for template in state["templates"]
        if template["amount"] > 0 and _is_due(template, year, month)
    ]
    remaining = 0.0
    over_budget_count = 0
    margin = state["excessive"] / 100
    for template in due_bills:
        related = [payment for payment in payments if payment["templateId"] == template["id"]]
        actual = sum(payment["amount"] for payment in related)
        if template["partial"]:
            if not any(payment["closePartial"] for payment in related):
                remaining += max(0.0, template["amount"] - actual)
        elif not related:
            remaining += template["amount"]
        if actual > template["amount"] * (1 + margin):
            over_budget_count += 1

    return {
        "spending": round(spending, 2),
        "income": round(income, 2),
        "remaining": round(remaining, 2),
        "over_budget_count": over_budget_count,
    }