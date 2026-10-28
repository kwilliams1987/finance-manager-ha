"""Finance status binary sensors."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
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
    """Set up binary sensors from a config entry."""
    async_add_entities([FinanceOverBudgetBinarySensor(hass.data[DOMAIN]["coordinator"])])


async def async_setup_platform(
    hass: HomeAssistant,
    config: dict,
    async_add_entities: AddEntitiesCallback,
    discovery_info: dict | None = None,
) -> None:
    """Set up binary sensors for YAML-based integration configuration."""
    async_add_entities([FinanceOverBudgetBinarySensor(hass.data[DOMAIN]["coordinator"])])


class FinanceOverBudgetBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Indicate whether any scheduled bill exceeds its budget margin."""

    _attr_device_class = BinarySensorDeviceClass.PROBLEM
    _attr_icon = "mdi:cash-alert"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_name = "Over-budget Bill Exists"
        self._attr_unique_id = f"{DOMAIN}_over_budget_exists"

    @property
    def is_on(self) -> bool:
        return monthly_summary(self.coordinator.data)["over_budget_count"] > 0

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"month": self.coordinator.data.get("date", "")[:7]}