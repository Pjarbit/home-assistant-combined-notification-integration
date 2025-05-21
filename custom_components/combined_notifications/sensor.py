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
    friendly_sensor_name = config_entry.data["friendly_sensor_name"]
    conditions = config_entry.data.get("conditions", [])
    settings = {
        "text_all_clear": config_entry.data.get("text_all_clear", "ALL CLEAR"),
        "icons": {
            "clear": config_entry.data.get("icon_all_clear", "mdi:hand-okay"),
            "alert": config_entry.data.get("icon_alert", "mdi:alert-circle"),
        },
        "colors": {
            "clear": COLOR_MAP.get(config_entry.data.get("background_color_all_clear", "Green"), "rgb(19, 161, 14)"),
            "alert": COLOR_MAP.get(config_entry.data.get("background_color_alert", "Red"), "rgb(190, 11, 11)"),
        },
        "text_colors": {
            "clear": COLOR_MAP.get(config_entry.data.get("text_color_all_clear", "Use YOUR Current Theme Color"), ""),
            "alert": COLOR_MAP.get(config_entry.data.get("text_color_alert", "Use YOUR Current Theme Color"), ""),
        },
        "icon_colors": {
            "clear": COLOR_MAP.get(config_entry.data.get("icon_color_all_clear", "Use YOUR Current Theme Color"), ""),
            "alert": COLOR_MAP.get(config_entry.data.get("icon_color_alert", "Use YOUR Current Theme Color"), ""),
        },
        "hide_title": str(config_entry.data.get("hide_title", False)).lower() == "true",
        "hide_title_alert": str(config_entry.data.get("hide_title_alert", False)).lower() == "true",
    }

    sensor = CombinedNotificationSensor(hass, name, friendly_sensor_name, conditions, settings, config_entry.entry_id)
    async_add_entities([sensor], update_before_add=True)
    hass.data.setdefault(DOMAIN, {})[config_entry.entry_id] = sensor

class CombinedNotificationSensor(Entity):
    """Representation of a Combined Notification sensor."""

    def __init__(self, hass: HomeAssistant, name: str, friendly_sensor_name: str, conditions: list[dict], settings: dict[str, Any], entry_id: str):
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
            "hide_title_alert": self._settings["hide_title_alert"]
        }

    async def async_added_to_hass(self) -> None:
        """Register callbacks when entity is added to Home Assistant."""
        # Set up state tracking for all conditions
        entity_ids = [condition["entity_id"] for condition in self._conditions]
        
        self._unsubscribe_callbacks.append(
            async_track_state_change_event(
                self.hass, entity_ids, self._async_state_change_callback
            )
        )
        
        # Update initial state
        await self._async_update_state()

    async def async_will_remove_from_hass(self) -> None:
        """Clean up when entity is removed from Home Assistant."""
        # Unsubscribe from all state change events
        for unsubscribe in self._unsubscribe_callbacks:
            unsubscribe()
        self._unsubscribe_callbacks = []

    @callback
    async def _async_state_change_callback(self, event) -> None:
        """Handle entity state changes."""
        await self._async_update_state()

    async def _async_update_state(self) -> None:
        """Update sensor state based on condition states."""
        unmet = []
        
        for condition in self._conditions:
            entity_id = condition["entity_id"]
            operator = condition["operator"]
            trigger_value = condition["trigger_value"]
            name = condition.get("name", entity_id)
            
            # Skip if entity doesn't exist
            if not self.hass.states.get(entity_id):
                _LOGGER.warning("Entity %s not found, skipping condition check", entity_id)
                continue
                
            # Get current state of entity
            state = self.hass.states.get(entity_id).state
            
            # Check if condition is met based on operator
            condition_met = False
            
            try:
                # Convert values for numeric comparison if possible
                if state.replace(".", "", 1).isdigit() and trigger_value.replace(".", "", 1).isdigit():
                    state_val = float(state)
                    trigger_val = float(trigger_value)
                    
                    if operator == "equals":
                        condition_met = state_val == trigger_val
                    elif operator == "not equals":
                        condition_met = state_val != trigger_val
                    elif operator == "greater than":
                        condition_met = state_val > trigger_val
                    elif operator == "less than":
                        condition_met = state_val < trigger_val
                else:
                    # String comparison
                    if operator == "equals":
                        condition_met = state == trigger_value
                    elif operator == "not equals":
                        condition_met = state != trigger_value
                    # String greater/less than comparison not supported
                    elif operator in ["greater than", "less than"]:
                        condition_met = False
                        _LOGGER.warning("String comparison with %s not supported for %s", operator, entity_id)
            except (ValueError, TypeError) as e:
                _LOGGER.error("Error comparing values for %s: %s", entity_id, e)
                condition_met = False
            
            # If condition is not met, add to unmet list
            if not condition_met:
                unmet.append(name)
        
        # Update state based on unmet conditions
        if unmet:
            self._state = ", ".join(unmet)
            self._attr_icon = self._settings["icons"]["alert"]
        else:
            self._state = self._settings["text_all_clear"]
            self._attr_icon = self._settings["icons"]["clear"]
        
        self._unmet = unmet
        self.async_write_ha_state()

    async def async_update_settings(self, settings: dict[str, Any], conditions: list[dict]) -> None:
        """Update settings and conditions dynamically."""
        _LOGGER.debug("Updating settings: %s", settings)
        self._settings = settings
        
        # Validate conditions
        self._conditions = [
            condition for condition in conditions if self._validate_condition(condition)
        ]
        for condition in conditions:
            if not self._validate_condition(condition):
                _LOGGER.warning("Skipping malformed condition: %s", condition)
        
        # Update state based on new settings
        await self._async_update_state()
        _LOGGER.debug("Settings updated, new state: %s", self._state)
