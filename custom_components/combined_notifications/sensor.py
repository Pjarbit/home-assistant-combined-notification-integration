"""Sensor platform for Combined Notifications."""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant, callback, Event
from homeassistant.helpers.entity import Entity, EntityCategory
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity_platform import AddEntitiesCallback
import logging
from .const import COLOR_MAP, DOMAIN, OPERATOR_MAP

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the combined notification sensor from a config entry."""
    name = config_entry.data["name"]
    friendly_sensor_name = config_entry.data.get("friendly_sensor_name")  # Retrieve the new field
    conditions = config_entry.data.get("conditions", [])
    settings = {
        "text_all_clear": config_entry.data.get("text_all_clear", "ALL CLEAR"),
        "icons": {
            "clear": config_entry.data.get("icon_all_clear", "mdi:hand-okay"),
            "alert": config_entry.data.get("icon_alert", "mdi:alert-circle"),
        },
        "colors": {
            "clear": COLOR_MAP.get(config_entry.data.get("background_color_all_clear"), "Green"),
            "alert": COLOR_MAP.get(config_entry.data.get("background_color_alert"), "Red"),
        },
        "text_colors": {
            "clear": COLOR_MAP.get(config_entry.data.get("text_color_all_clear", "")),
            "alert": COLOR_MAP.get(config_entry.data.get("text_color_alert", "")),
        },
        "icon_colors": {
            "clear": COLOR_MAP.get(config_entry.data.get("icon_color_all_clear", "")),
            "alert": COLOR_MAP.get(config_entry.data.get("icon_color_alert", "")),
        },
        "hide_title": str(config_entry.data.get("hide_title", False)).lower() == "true",
    }

    async_add_entities([
        CombinedNotificationSensor(hass, config_entry, name, friendly_sensor_name, conditions, settings)
    ])

    return None

class CombinedNotificationSensor(Entity):
    """Representation of a Combined Notification sensor."""

    _attr_has_entity_name = True
    _attr_icon = None
    _attr_native_value = None
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: ConfigEntry,
        name: str,
        friendly_sensor_name: str | None,
        conditions: list[dict],
        settings: dict[str, Any],
    ) -> None:
        """Initialize the Combined Notification sensor."""
        super().__init__()
        self._hass = hass
        self._config_entry = config_entry
        self._attr_unique_id = config_entry.entry_id
        self._attr_name = name
        self._friendly_sensor_name = friendly_sensor_name
        self._conditions = conditions
        self._settings = settings
        self._state = settings["text_all_clear"]
        self._alert_mode = False
        self._unsubscribe_callbacks = []

    async def async_added_to_hass(self) -> None:
        """When entity is added to hass."""
        await super().async_added_to_hass()
        self._unsubscribe_callbacks = []
        await self.async_update_conditions(self._conditions)

    async def async_will_remove_from_hass(self) -> None:
        """When entity will be removed from hass."""
        for unsub in self._unsubscribe_callbacks:
            unsub()
        self._unsubscribe_callbacks.clear()

    @property
    def name(self) -> str | None:
        """Return the name of the sensor."""
        return self._attr_name

    @property
    def native_value(self) -> str | None:
        """Return the state of the sensor."""
        return self._state

    @property
    def icon(self) -> str | None:
        """Return the icon of the sensor."""
        return self._attr_icon

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Return the state attributes."""
        attributes = {
            "conditions": self._conditions,
            "all_clear_text": self._settings["text_all_clear"],
            "alert_mode": self._alert_mode,
            "friendly_sensor_name": self._friendly_sensor_name,
        }
        return attributes

    async def async_update(self) -> None:
        """Update the sensor state based on conditions."""
        self._alert_mode = False
        new_state = self._settings["text_all_clear"]
        new_icon = self._settings["icons"]["clear"]
        new_color = self._settings["colors"]["clear"]
        new_text_color = self._settings["text_colors"]["clear"]
        new_icon_color = self._settings["icon_colors"]["clear"]

        for condition in self._conditions:
            entity_state = self._hass.states.get(condition["entity_id"])
            if entity_state:
                actual_value = entity_state.state
                expected_value = condition["trigger_value"]
                operator = condition["operator"]
                if self._evaluate_condition(actual_value, expected_value, operator):
                    self._alert_mode = True
                    new_state = f"{condition.get('name', condition['entity_id'])} {operator} {expected_value}"[:255]
                    new_icon = self._settings["icons"]["alert"]
                    new_color = self._settings["colors"]["alert"]
                    new_text_color = self._settings["text_colors"]["alert"]
                    new_icon_color = self._settings["icon_colors"]["alert"]
                    break  # Exit loop after the first alert condition
            else:
                _LOGGER.warning("Entity %s not found", condition["entity_id"])

        self._state = new_state
        self._attr_icon = new_icon
        self._attr_extra_state_attributes = {
            "conditions": self._conditions,
            "all_clear_text": self._settings["text_all_clear"],
            "alert_mode": self._alert_mode,
            "background_color": new_color,
            "text_color": new_text_color,
            "icon_color": new_icon_color,
            "hide_title": self._settings["hide_title"],
            "friendly_sensor_name": self._friendly_sensor_name, # Ensure it's in attributes
        }

    async def async_update_conditions(self, new_conditions: list[dict]) -> None:
        """Update the conditions that trigger the alert."""
        for unsub in self._unsubscribe_callbacks:
            unsub()
        self._unsubscribe_callbacks.clear()

        self._conditions = new_conditions
        for condition in new_conditions:
            unsub = async_track_state_change_event(
                self._hass, [condition["entity_id"]], self._state_change_listener
            )
            self._unsubscribe_callbacks.append(unsub)
        await self.async_update()

    async def _state_change_listener(self, event: Event) -> None:
        """Handle state change events."""
        await self.async_update()

    async def async_update_settings(self, new_settings: dict[str, Any], new_conditions: list[dict]) -> None:
        """Update sensor settings and conditions dynamically."""
        try:
            _LOGGER.debug("Updating settings: %s, conditions: %s", new_settings, new_conditions)
            self._settings = new_settings
            self._state = new_settings["text_all_clear"][:255]
            self._attr_icon = new_settings["icons"]["clear"]
            await self.async_update_conditions(new_conditions)
            await self.async_update()
            self.async_schedule_update_ha_state(True)
            _LOGGER.debug("Settings and conditions updated successfully")
        except Exception as e:
            _LOGGER.error("Error updating settings: %s", e)
            raise

    def _evaluate_condition(self, actual: str, expected: str, operator: str) -> bool:
        """Evaluate a condition using safe comparisons."""
        try:
            if operator == "==":
                return str(actual) == str(expected)
            if operator == "!=":
                return str(actual) != str(expected)
            if operator == ">":
                try:
                    return float(actual) > float(expected)
                except ValueError:
                    return str(actual) > str(expected)
            if operator == "<":
                try:
                    return float(actual) < float(expected)
                except ValueError:
                    return str(actual) < str(expected)
        except Exception as err:
            _LOGGER.warning(
                "Failed to compare %s %s %s: %s",
                actual, operator, expected, err
            )
            return False
        return False
