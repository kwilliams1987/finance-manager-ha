"""Finance summary sensors."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.config_entries import ConfigEntry

from .const import DOMAIN
from .summary import monthly_summary


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensors from a config entry."""
    coordinator = hass.data[DOMAIN]["coordinator"]
    async_add_entities(_build_sensors(coordinator), update_before_add=True)


async def async_setup_platform(
    hass: HomeAssistant,
    config: dict[str, Any],
    async_add_entities: AddEntitiesCallback,
    discovery_info: dict[str, Any] | None = None,
) -> None:
    """Set up sensors for YAML-based integration configuration."""
    coordinator = hass.data[DOMAIN]["coordinator"]
    async_add_entities(_build_sensors(coordinator), update_before_add=True)


def _build_sensors(coordinator):
    return [
        FinanceAmountSensor(coordinator, "spending", "Monthly Spending"),
        FinanceAmountSensor(coordinator, "income", "Monthly Income"),
        FinanceAmountSensor(coordinator, "remaining", "Remaining Scheduled Bills"),
    ]


class FinanceAmountSensor(CoordinatorEntity, SensorEntity):
    """A monthly monetary summary sensor."""

    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, key: str, name: str) -> None:
        super().__init__(coordinator)
        self._key = key
        self._attr_name = name
        self._attr_unique_id = f"{DOMAIN}_{key}"

    @property
    def native_unit_of_measurement(self) -> str:
        return self.coordinator.data.get("currency", "EUR")

    @property
    def native_value(self) -> float:
        return monthly_summary(self.coordinator.data)[self._key]

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"month": self.coordinator.data.get("date", "")[:7]}

