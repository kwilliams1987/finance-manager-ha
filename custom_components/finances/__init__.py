"""Home Assistant Finances integration."""

from __future__ import annotations

import logging
from asyncio import Lock
from datetime import timedelta
from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_panel_exists
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.discovery import async_load_platform
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import DOMAIN, PANEL_ICON, PANEL_TITLE, PANEL_URL, STORAGE_VERSION
from .database import FinanceDatabase, migrate_legacy_transactions
from .websocket import async_register_websocket_commands

URL_BASE = "/finances_static"
CONFIG_SCHEMA = cv.empty_config_schema(DOMAIN)
LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the finances integration."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["lock"] = Lock()
    database = hass.data[DOMAIN]["database"] = FinanceDatabase(hass)
    legacy_store = Store(hass, STORAGE_VERSION, f"{DOMAIN}.transactions")
    legacy_data = await legacy_store.async_load()
    await database.async_initialize()
    if not await database.async_legacy_migrated():
        if (
            legacy_data
            and legacy_data.get("transactions")
            and await database.async_is_empty()
        ):
            migrated = migrate_legacy_transactions(legacy_data["transactions"])
            current = await database.async_load()
            migrated["date"] = current["date"]
            await database.async_save(migrated)
        await database.async_mark_legacy_migrated()

    coordinator = DataUpdateCoordinator(
        hass,
        LOGGER,
        name=DOMAIN,
        update_method=database.async_load,
        update_interval=timedelta(minutes=5),
    )
    hass.data[DOMAIN]["coordinator"] = coordinator
    await coordinator.async_refresh()
    async_register_websocket_commands(hass)
    hass.async_create_task(
        async_load_platform(hass, Platform.SENSOR, DOMAIN, {}, config)
    )
    hass.async_create_task(
        async_load_platform(hass, Platform.BINARY_SENSOR, DOMAIN, {}, config)
    )

    if not async_panel_exists(hass, PANEL_URL):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    URL_BASE, str(Path(__file__).parent / "www"), cache_headers=False
                )
            ]
        )
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_URL,
            webcomponent_name="finances-shell",
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            module_url=f"{URL_BASE}/finances-shell.js",
            require_admin=True,
        )
    return True