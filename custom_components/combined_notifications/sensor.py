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
        },
        "hide_title": str(config_entry.data.get("hide_title", "False")).lower() == "true",
    }

    sensor = CombinedNotificationSensor(hass, name, conditions, settings, config_entry.entry_id)
    async_add_entities([sensor], update_before_add=True)
