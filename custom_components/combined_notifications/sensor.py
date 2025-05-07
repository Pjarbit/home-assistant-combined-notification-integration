"""Sensor platform for Combined Notifications."""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity import Entity, EntityCategory
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity_platform import AddEntitiesCallback
import logging
from .const import COLOR_MAP, DOMAIN

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the combined notification sensor from a config entry."""
    name = config_entry.data["name"]
    friendly_sensor_name = config_entry.data.get("friendly_sensor_name")
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
            "clear": COLOR_MAP.get(config_entry.data.get("text_color_all_clear", ""), ""),
            "alert": COLOR_MAP.get(config_entry.data.get("text_color_alert", ""), ""),
        },
        "icon_colors": {
            "clear": COLOR_MAP.get(config_entry.data.get("icon_color_all_clear", ""), ""),
            "alert": COLOR_MAP.get(config_entry.data.get("icon_color_alert", ""), ""),
        },
        "hide_title": str(config_entry.data.get("hide_title", False)).lower() == "true",
        "hide_title_alert": str(config_entry.data.get("hide_title_alert", False)).lower() == "true",
    }

    sensor = CombinedNotificationSensor(hass, name, friendly_sensor_name, conditions, settings, config_entry.entry_id)
    async_add_entities([sensor], update_before_add=True)
    hass.data.setdefault(DOMAIN, {})[config_entry.entry_id] = sensor

class CombinedNotificationSensor(Entity):
    """Representation of a Combined Notification sensor."""

    def __init__(self, hass: HomeAssistant, name: str, friendly_sensor_name: str | None, conditions: list[dict], settings: dict[str, Any], entry_id: str):
        """Initialize the sensor."""
        self._hass = hass
        self._name = name
        self._friendly_sensor_name = friendly_sensor_name
        self._entry_id = entry_id
        self._conditions = [
            condition for condition in conditions if self._validate_condition(condition)
        ]
        for condition in conditions:
            if not self._validate_condition(condition):
                _LOGGER.warning("Skipping malformed condition in %s: %s", name, condition)
        self._settings = settings
        self._state = settings["text_all_clear"]
        self._unmet = []
        self._unsubscribe_callbacks = []
        self._debounced_update_task = None

        self._attr_has_entity_name = True
        self._attr_should_poll = False
        self._attr_entity_category = EntityCategory.DIAGNOSTIC
        self._attr_icon = settings["icons"]["clear"]

    def _validate_condition(self, condition: dict) -> bool:
        """Validate that a condition has all required keys."""
        required_keys = ["entity_id", "operator", "trigger_value"]
        return all(key in condition for key in required_keys)

    @property
    def name(self) -> str:
        """Return the name of the sensor."""
        return self._name

    @property
    def unique_id(self) -> str:
        """Return a unique ID for this entity."""
        return f"combined_notifications_{self._entry_id}"

    @property
    def state(self) -> str:
        """Return the state of the sensor."""
        return self._state

    @property
    def icon(self) -> str:
        """Return the icon to use in the frontend."""
        return self._settings["icons"]["clear"] if not self._unmet else self._settings["icons"]["alert"]

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes for the sensor."""
        return {
            "unmet_conditions": self._unmet,
            "number_unmet": len(self._unmet),
            "number_total": len(self._conditions),
            "text_all_clear": self._settings["text_all_clear"],
            "icon_clear": self._settings["icons"]["clear"],
            "icon_alert": self._settings["icons"]["alert"],
            "color_clear": self._settings["colors"]["clear"],
            "color_alert": self._settings["colors"]["alert"],
            "text_color_clear": self._settings["text_colors"]["clear"],
            "text_color_alert": self._settings["text_colors"]["alert"],
            "icon_color_clear": self._settings["icon_colors"]["clear"],
            "icon_color_alert": self._settings["icon_colors"]["alert"],
            "is_clear": not bool(self._unmet),
            "hide_title": self._settings["hide_title"],
            "hide_title_alert": self._settings["hide_title_alert"],
            "friendly_sensor_name": self._friendly_sensor_name,
        }

    @callback
    def _state_change_listener(self, event):
        """Handle entity state changes with debouncing."""
        if self._debounced_update_task:
            self._debounced_update_task.cancel()
            self._debounced_update_task = None

        async def debounced_update():
            """Perform the actual update."""
            _LOGGER.debug(f"Debounced update triggered by: {event.data.get('entity_id')}")
            self.async_schedule_update_ha_state(True)
            self._debounced_update_task = None

        self._debounced_update_task = self._hass.async_create_task(debounced_update())

    async def async_added_to_hass(self) -> None:
        """Set up listeners when the sensor is added to Home Assistant."""
        for condition in self._conditions:
            entity_id = condition["entity_id"]
            unsub = async_track_state_change_event(
                self._hass, [entity_id], self._state_change_listener
            )
            self._unsubscribe_callbacks.append(unsub)

    async def async_will_remove_from_hass(self) -> None:
        """Clean up listeners when the sensor is removed from Home Assistant."""
        for unsub in self._unsubscribe_callbacks:
            unsub()
        self._unsubscribe_callbacks.clear()
        if self._debounced_update_task:
            self._debounced_update_task.cancel()
            self._debounced_update_task = None

    async def async_update(self) -> None:
        """Update the sensor state by evaluating all conditions."""
        self._unmet = []
        for condition in self._conditions:
            entity_id = condition.get("entity_id")
            operator = condition.get("operator", "==")
            expected = condition.get("trigger_value")
            label = condition.get("name", entity_id)

            state_obj = self._hass.states.get(entity_id)
            if state_obj is None or state_obj.state in ("unknown", "unavailable"):
                continue

            actual = state_obj.state
            if self._evaluate_condition(actual, expected, operator):
                self._unmet.append(label)

        state = self._settings["text_all_clear"] if not self._unmet else ", ".join(self._unmet)
        self._state = state[:255]
        if len(state) > 255:
            _LOGGER.warning("State truncated to 255 characters, original length: %s", len(state))
        self._attr_icon = self._settings["icons"]["clear"] if not self._unmet else self._settings["icons"]["alert"]

    async def async_update_conditions(self, new_conditions: list[dict]) -> None:
        """Update sensor conditions dynamically."""
        _LOGGER.debug("Updating conditions: %s", new_conditions)
        for unsub in self._unsubscribe_callbacks:
            unsub()
        self._unsubscribe_callbacks.clear()
        self._conditions = [c for c in new_conditions if self._validate_condition(c)]
        for condition in self._conditions:
            unsub = async_track_state_change_event(
                self._hass, [condition["entity_id"]], self._state_change_listener
            )
            self._unsubscribe_callbacks.append(unsub)
        await self.async_update()

    async def async_update_settings(self, new_settings: dict[str, Any], new_conditions: list[dict]) -> None:
        """Update sensor settings and conditions dynamically."""
        try:
            _LOGGER.debug("Received settings update: %s, conditions: %s", new_settings, new_conditions)
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
