"""Combined Notifications integration."""
import logging
import os
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components import frontend, websocket_api
from homeassistant.components.http import StaticPathConfig
import voluptuous as vol
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

PANEL_URL = "/combined_notifications_panel"
PANEL_FILENAME = "combined_notifications_panel.js"


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Migrate old v1 entries to v2 format."""
    _LOGGER.debug("Migrating config entry from version %s", config_entry.version)

    if config_entry.version == 1:
        data = dict(config_entry.data)
        conditions = data.get("conditions", [])

        for condition in conditions:
            if "paused" in condition:
                condition["disabled"] = condition.pop("paused")
            if "disabled" not in condition:
                condition["disabled"] = False
            if "name" not in condition:
                if "entity_id" in condition:
                    condition["name"] = condition["entity_id"]
                elif "entity_filter" in condition:
                    condition["name"] = f"Smart group: {condition['entity_filter']}"
                else:
                    condition["name"] = "unknown"

        hass.config_entries.async_update_entry(
            config_entry, data=data, version=2,
        )
        _LOGGER.info("Migrated Combined Notifications entry %s from v1 → v2", config_entry.entry_id)
        return True

    return False


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Combined Notifications component."""
    hass.data.setdefault(DOMAIN, {})

    # Serve the panel JS file as a static resource
    panel_path = os.path.join(os.path.dirname(__file__), PANEL_FILENAME)
    await hass.http.async_register_static_paths([
        StaticPathConfig(PANEL_URL + ".js", panel_path, False)
    ])

    # Register websocket commands once at setup
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_save_config)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Combined Notifications from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    await hass.config_entries.async_forward_entry_setups(entry, ["sensor"])

    # Register the config panel for this entry
    panel_url = f"combined-notifications-{entry.entry_id}"
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=None,
        sidebar_icon=None,
        frontend_url_path=panel_url,
        config={
            "_panel_custom": {
                "name": "combined-notifications-panel",
                "js_url": PANEL_URL + ".js?v=3",
                "embed_iframe": False,
                "trust_external_script": False,
                "config": {"entry_id": entry.entry_id},
            }
        },
        require_admin=True,
    )

    return True
    _LOGGER.warning("CN Panel registered at: %s", panel_url)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    frontend.async_remove_panel(hass, f"combined-notifications-{entry.entry_id}")
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, ["sensor"]):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the config entry."""
    await async_unload_entry(hass, entry)
    await async_setup_entry(hass, entry)


# ---------------------------------------------------------------------------
# Websocket API — used by the panel to load and save configuration
# ---------------------------------------------------------------------------

@websocket_api.websocket_command({
    vol.Required("type"): "combined_notifications/get_config",
    vol.Required("entry_id"): str,
})
@websocket_api.async_response
async def websocket_get_config(hass, connection, msg):
    """Return the current config for an entry."""
    entry_id = msg["entry_id"]
    entry = hass.config_entries.async_get_entry(entry_id)
    if not entry:
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    # Also return live entity states for the entity picker and smart group preview
    states = {
        state.entity_id: {
            "state": state.state,
            "attributes": dict(state.attributes),
            "friendly_name": state.attributes.get("friendly_name", state.entity_id),
        }
        for state in hass.states.async_all()
    }

    connection.send_result(msg["id"], {
        "config": dict(entry.data),
        "states": states,
    })


@websocket_api.websocket_command({
    vol.Required("type"): "combined_notifications/save_config",
    vol.Required("entry_id"): str,
    vol.Required("data"): dict,
})
@websocket_api.async_response
async def websocket_save_config(hass, connection, msg):
    """Save updated config for an entry."""
    entry_id = msg["entry_id"]
    entry = hass.config_entries.async_get_entry(entry_id)
    if not entry:
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    new_data = {**entry.data, **msg["data"]}
    hass.config_entries.async_update_entry(entry, data=new_data)

    # Update the live sensor immediately
    sensor = hass.data.get(DOMAIN, {}).get(entry_id)
    if sensor and hasattr(sensor, "async_update_settings"):
        from .const import COLOR_MAP
        d = new_data
        settings = {
            "text_all_clear": d.get("text_all_clear", "ALL CLEAR"),
            "friendly_sensor_name": d.get("friendly_sensor_name", ""),
            "icons": {
                "clear": d.get("icon_all_clear", "mdi:hand-okay"),
                "alert": d.get("icon_alert", "mdi:alert-circle"),
            },
            "colors": {
                "clear": COLOR_MAP.get(d.get("background_color_all_clear"), ""),
                "alert": COLOR_MAP.get(d.get("background_color_alert"), ""),
            },
            "text_colors": {
                "clear": COLOR_MAP.get(d.get("text_color_all_clear", ""), ""),
                "alert": COLOR_MAP.get(d.get("text_color_alert", ""), ""),
            },
            "icon_colors": {
                "clear": COLOR_MAP.get(d.get("icon_color_all_clear", ""), ""),
                "alert": COLOR_MAP.get(d.get("icon_color_alert", ""), ""),
            },
            "hide_title": d.get("hide_title", False),
            "hide_title_alert": d.get("hide_title_alert", False),
        }
        await sensor.async_update_settings(settings, d.get("conditions", []))

    connection.send_result(msg["id"], {"success": True})
