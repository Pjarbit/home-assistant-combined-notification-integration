"""Combined Notifications integration."""
# Integration version: 6.0.0
import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components import frontend, websocket_api
import voluptuous as vol
from .const import DOMAIN, COLOR_MAP
from .panel_api import async_register_views

_LOGGER = logging.getLogger(__name__)

VERSION_SLUG = "600"


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Migrate old v1 entries to v2 format."""
    _LOGGER.debug("Migrating config entry from version %s", config_entry.version)

    if config_entry.version == 1:
        data = dict(config_entry.data)
        conditions = data.get("conditions", [])

        for condition in conditions:
            if "disabled" in condition and "paused" not in condition:
                condition["paused"] = condition.pop("disabled")
            elif "paused" not in condition:
                condition["paused"] = False

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
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Combined Notifications from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Register REST API views (idempotent)
    if not hass.data[DOMAIN].get("_views_registered"):
        async_register_views(hass)
        hass.data[DOMAIN]["_views_registered"] = True

    # Register websocket commands per entry — guarantees they exist before panel loads
    websocket_api.async_register_command(hass, websocket_get_config)
    websocket_api.async_register_command(hass, websocket_get_states)
    websocket_api.async_register_command(hass, websocket_save_config)

    await hass.config_entries.async_forward_entry_setups(entry, ["sensor"])

    panel_url = f"combined-notifications-{entry.entry_id}"
    # Remove stale panel before re-registering
    try:
        frontend.async_remove_panel(hass, panel_url)
    except Exception:
        pass
    frontend.async_register_built_in_panel(
        hass,
        component_name="iframe",
        sidebar_title=None,
        sidebar_icon=None,
        frontend_url_path=panel_url,
        config={"url": f"/api/combined_notifications/panel?entry_id={entry.entry_id}&v={VERSION_SLUG}"},
        require_admin=True,
    )

    return True


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
# Websocket API
# ---------------------------------------------------------------------------

@websocket_api.websocket_command({
    vol.Required("type"): "combined_notifications/get_config",
    vol.Required("entry_id"): str,
})
@websocket_api.async_response
async def websocket_get_config(hass, connection, msg):
    """Return the current config for an entry. States loaded later."""
    entry_id = msg["entry_id"]
    entry = hass.config_entries.async_get_entry(entry_id)
    if not entry:
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    connection.send_result(msg["id"], {
        "config": dict(entry.data),
        "states": {}
    })


@websocket_api.websocket_command({
    vol.Required("type"): "combined_notifications/get_states",
    vol.Required("entry_id"): str,
})
@websocket_api.async_response
async def websocket_get_states(hass, connection, msg):
    """Return entity states - called by the panel after it loads."""
    entry_id = msg["entry_id"]
    entry = hass.config_entries.async_get_entry(entry_id)
    if not entry:
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    RELEVANT_DOMAINS = {
        "sensor", "binary_sensor", "input_boolean", "switch", "light", "lock",
        "cover", "climate", "person", "device_tracker", "media_player",
        "camera", "automation", "script", "scene", "button", "update",
        "number", "select", "input_number", "input_select", "input_text",
        "counter", "timer", "input_datetime", "valve",
    }

    states = {
        state.entity_id: {
            "state": state.state,
            "attributes": dict(state.attributes),
            "friendly_name": state.attributes.get("friendly_name", state.entity_id),
        }
        for state in hass.states.async_all()
        if state.domain in RELEVANT_DOMAINS
    }

    connection.send_result(msg["id"], {"states": states})


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

    try:
        new_data = {**entry.data, **msg["data"]}
        hass.config_entries.async_update_entry(entry, data=new_data)

        sensor = hass.data.get(DOMAIN, {}).get(entry_id)
        if sensor and hasattr(sensor, "async_update_settings"):
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
    except Exception as err:
        _LOGGER.exception("Failed to save config")
        connection.send_error(msg["id"], "save_failed", str(err))
