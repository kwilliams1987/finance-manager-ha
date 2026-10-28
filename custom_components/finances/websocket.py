"""Authenticated WebSocket API for the finance database."""

from __future__ import annotations

from datetime import date
from math import isfinite
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv

from .compatibility import normalize_legacy_recurrences
from .const import DOMAIN

_DATE = vol.All(cv.string, vol.Length(min=10, max=40))
_TEMPLATE = vol.Schema({
    vol.Required("id"): cv.string,
    vol.Required("name"): vol.All(cv.string, vol.Length(min=1, max=200)),
    vol.Optional("benefactor"): vol.Any(cv.string, None),
    vol.Required("amount"): vol.Coerce(float),
    vol.Optional("startDate"): vol.Any(_DATE, None),
    vol.Optional("endDate"): vol.Any(_DATE, None),
    vol.Required("partial"): bool,
    vol.Required("recurrence"): vol.In(range(6)),
    vol.Required("created"): _DATE,
})
_PAYMENT = vol.Schema({
    vol.Required("id"): cv.string,
    vol.Required("templateId"): cv.string,
    vol.Required("name"): vol.All(cv.string, vol.Length(min=1, max=200)),
    vol.Required("amount"): vol.Coerce(float),
    vol.Required("date"): _DATE,
    vol.Required("closePartial"): bool,
    vol.Required("created"): _DATE,
})
_STATE = vol.Schema({
    vol.Required("date"): _DATE,
    vol.Required("locale"): vol.All(cv.string, vol.Length(min=2, max=30)),
    vol.Required("currency"): vol.All(cv.string, vol.Length(min=3, max=3)),
    vol.Required("excessive"): vol.All(vol.Coerce(float), vol.Range(min=0, max=10000)),
    vol.Optional("benefactor"): vol.Any(cv.string, None),
    vol.Required("templates"): [vol.Any(_TEMPLATE)],
    vol.Required("payments"): [vol.Any(_PAYMENT)],
})


def _validate_state(raw: dict[str, Any]) -> dict[str, Any]:
    raw = normalize_legacy_recurrences(raw)
    templates = raw.get("templates")
    if isinstance(templates, list):
        for index, template in enumerate(templates):
            if isinstance(template, dict):
                recurrence = template.get("recurrence")
                if type(recurrence) is not int or recurrence not in range(6):
                    raise vol.Invalid(
                        f"Invalid recurrence {recurrence!r} for template {index}; "
                        "expected an integer from 0 to 5"
                    )
    state = _STATE(raw)
    try:
        date.fromisoformat(state["date"][:10])
        for item in state["payments"]:
            date.fromisoformat(item["date"][:10])
        for item in state["templates"]:
            for key in ("startDate", "endDate"):
                if item.get(key):
                    date.fromisoformat(item[key][:10])
    except ValueError as err:
        raise vol.Invalid("Invalid date in finance data") from err
    if any(
        not isfinite(item["amount"])
        for item in state["payments"] + state["templates"]
    ):
        raise vol.Invalid("Amount must be finite")
    return state


def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register commands used by the embedded Account Manager app."""

    @websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/load"})
    @websocket_api.require_admin
    @websocket_api.async_response
    async def load_state(hass, connection, msg):
        async with hass.data[DOMAIN]["lock"]:
            result = await hass.data[DOMAIN]["database"].async_load()
        connection.send_result(msg["id"], result)

    @websocket_api.websocket_command({
        vol.Required("type"): f"{DOMAIN}/save",
        vol.Required("state"): dict,
    })
    @websocket_api.require_admin
    @websocket_api.async_response
    async def save_state(hass, connection, msg):
        try:
            state = _validate_state(msg["state"])
        except vol.Invalid as err:
            connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
            return
        async with hass.data[DOMAIN]["lock"]:
            await hass.data[DOMAIN]["database"].async_save(state)
            hass.data[DOMAIN]["coordinator"].async_set_updated_data(state)
        connection.send_result(msg["id"], {"success": True})

    websocket_api.async_register_command(hass, load_state)
    websocket_api.async_register_command(hass, save_state)
