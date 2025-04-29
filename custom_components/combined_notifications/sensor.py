"""Sensor platform for Combined Notifications."""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity import Entity, EntityCategory
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity_platform import AddEntitiesCallback
import logging

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the combined notification sensor from a config entry."""
    name = config_entry.data["name"]
    conditions = config_entry.data.get("conditions", [])
    settings = {
        "text_all_clear": config_entry.data.get("text_all_clear", "ALL CLEAR"),
        "icons": {
            "clear": config_entry.data.get("icon_all_clear", "mdi:hand-okay"),
            "alert": config_entry.data.get("icon_alert", "mdi:alert-circle"),
        },
        "colors": {
            "clear": config_entry.data.get("background_color_all_clear", "Green"),
            "alert": config_entry.data.get("background_color_alert", "Red"),
        },
        "text_colors": {
            "clear": config_entry.data.get("text_color_all_clear", "white"),
            "alert": config_entry.data.get("text_color_alert", "white"),
        },
        "icon_colors": {
            "clear": config_entry.data.get("icon_color_all_clear", "white"),
            "alert": config_entry.data.get("icon_color_alert", "white"),
        },
        "dimensions": {
            "card_height": config_entry.data.get("card_height", "100px"),
            "card_width": config_entry.data.get("card_width", "100%"),
            "icon_size": config_entry.data.get("icon_size", "80px"),
        },
        "hide_title": config_entry.data.get("hide_title", False),
    }

    sensor = CombinedNotificationSensor(hass, name, conditions, settings)
    async_add_entities([sensor], update_before_add=True)


class CombinedNotificationSensor(Entity):
    """Representation of a Combined Notification sensor."""

    def __init__(self, hass: HomeAssistant, name: str, conditions: list[dict], settings: dict[str, Any]):
        """Initialize the sensor."""
        self._hass = hass
        self._name = name

        # Validate conditions
        self._conditions = []
        for condition in conditions:
            if not self._validate_condition(condition):
                _LOGGER.warning(
                    "Skipping malformed condition in %s: %s", name, condition
                )
                continue
            self._conditions.append(condition)

        self._settings = settings
        self._state = settings["text_all_clear"]
        self._unmet = []
        self._unsubscribe_callbacks = []

        # Entity properties
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
        return f"combined_notifications_{self._name}"

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
            "card_height": self._settings["dimensions"]["card_height"],
            "card_width": self._settings["dimensions"]["card_width"],
            "icon_size": self._settings["dimensions"]["icon_size"],
            "is_clear": not bool(self._unmet)
        }

    async def async_added_to_hass(self) -> None:
        """Set up listeners when the sensor is added to Home Assistant."""
        @callback
        def _state_change_listener(event):
            """Handle entity state changes."""
            self.async_schedule_update_ha_state(True)

        # Set up a listener for each entity in the conditions
        for condition in self._conditions:
            entity_id = condition["entity_id"]
            unsub = async_track_state_change_event(
                self._hass, [entity_id], _state_change_listener
            )
            self._unsubscribe_callbacks.append(unsub)

    async def async_will_remove_from_hass(self) -> None:
        """Clean up listeners when the sensor is removed from Home Assistant."""
        for unsub in self._unsubscribe_callbacks:
            unsub()
        self._unsubscribe_callbacks.clear()

    async def async_update(self) -> None:
        """Update the sensor state by evaluating all conditions."""
        self._unmet = []

        for condition in self._conditions:
            entity_id = condition.get("entity_id")
            operator = condition.get("operator", "==")
            expected = condition.get("trigger_value")
            label = condition.get("name", entity_id)

            state_obj = self._hass.states.get(entity_id)
            if state_obj is None:
                _LOGGER.warning("Entity not found: %s", entity_id)
                self._unmet.append(f"{label} (not found)")
                continue

            actual = state_obj.state

            if self._evaluate_condition(actual, expected, operator):
                self._unmet.append(label)

        # Set state to either all clear or a list of unmet conditions
        self._state = self._settings["text_all_clear"] if not self._unmet else ", ".join(self._unmet)

        # Update the icon based on the current state
        self._attr_icon = self._settings["icons"]["clear"] if not self._unmet else self._settings["icons"]["alert"]

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
