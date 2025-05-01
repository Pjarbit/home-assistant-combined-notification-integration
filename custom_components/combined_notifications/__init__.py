"""Combined Notifications integration."""
import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Combined Notifications from a config entry."""
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = None  # Initialize entry in hass.data
    await hass.config_entries.async_forward_entry_setups(entry, ["sensor"])
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, ["sensor"]):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok

async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the config entry."""
    sensor = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if sensor and hasattr(sensor, "async_update_settings"):
        settings = {
            "text_all_clear": entry.data.get("text_all_clear", "ALL CLEAR"),
            "icons": {
                "clear": entry.data.get("icon_all_clear", "mdi:hand-okay"),
                "alert": entry.data.get("icon_alert", "mdi:alert-circle"),
            },
            "colors": {
                "clear": entry.data.get("background_color_all_clear", "Green"),
                "alert": entry.data.get("background_color_alert", "Red"),
            },
            "text_colors": {
                "clear": entry.data.get("text_color_all_clear", ""),
                "alert": entry.data.get("text_color_alert", ""),
            },
            "icon_colors": {
                "clear": entry.data.get("icon_color_all_clear", ""),
                "alert": entry.data.get("icon_color_alert", ""),
            },
            "hide_title": str(entry.data.get("hide_title", False)).lower() == "true",
        }
        await sensor.async_update_settings(settings, entry.data.get("conditions", []))
    else:
        await async_unload_entry(hass, entry)
        await async_setup_entry(hass, entry)
