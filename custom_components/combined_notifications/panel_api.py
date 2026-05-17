"""REST API endpoints for Combined Notifications panel."""
from __future__ import annotations

import logging
import json
import pathlib
from aiohttp import web
from homeassistant.core import HomeAssistant
from homeassistant.components.http import HomeAssistantView

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

RELEVANT_DOMAINS = {
    "sensor", "binary_sensor", "input_boolean", "switch", "light", "lock",
    "cover", "climate", "person", "device_tracker", "media_player",
    "camera", "automation", "script", "scene", "button", "update",
    "number", "select", "input_number", "input_select", "input_text",
    "counter", "timer", "input_datetime", "valve",
}


class CombinedNotificationsConfigView(HomeAssistantView):
    """Handle GET and POST for config."""

    url = "/api/combined_notifications/config"
    name = "api:combined_notifications:config"
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
        """Return config for an entry."""
        hass: HomeAssistant = request.app["hass"]
        entry_id = request.rel_url.query.get("entry_id")
        if not entry_id:
            return self.json_message("entry_id required", 400)

        entry = hass.config_entries.async_get_entry(entry_id)
        if not entry:
            return self.json_message("Entry not found", 404)

        return self.json({"config": dict(entry.data)}, headers={"Cache-Control": "no-store, no-cache, must-revalidate"})

    async def post(self, request: web.Request) -> web.Response:
        """Save config for an entry."""
        hass: HomeAssistant = request.app["hass"]
        entry_id = request.rel_url.query.get("entry_id")
        if not entry_id:
            return self.json_message("entry_id required", 400)

        entry = hass.config_entries.async_get_entry(entry_id)
        if not entry:
            return self.json_message("Entry not found", 404)

        try:
            body = await request.json()
        except Exception:
            return self.json_message("Invalid JSON", 400)

        try:
            new_data = {**entry.data, **body}
            hass.config_entries.async_update_entry(entry, data=new_data)

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

            return self.json({"success": True})
        except Exception as err:
            _LOGGER.exception("Failed to save config")
            return self.json_message(str(err), 500)


class CombinedNotificationsStatesView(HomeAssistantView):
    """Handle GET for entity states."""

    url = "/api/combined_notifications/states"
    name = "api:combined_notifications:states"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Return filtered entity states."""
        hass: HomeAssistant = request.app["hass"]

        states = {
            state.entity_id: {
                "state": state.state,
                "attributes": dict(state.attributes),
                "friendly_name": state.attributes.get("friendly_name", state.entity_id),
            }
            for state in hass.states.async_all()
            if state.domain in RELEVANT_DOMAINS
        }

        return self.json({"states": states}, headers={"Cache-Control": "no-store, no-cache, must-revalidate"})


class CombinedNotificationsPanelView(HomeAssistantView):
    """Serve panel.html."""

    url = "/api/combined_notifications/panel"
    name = "api:combined_notifications:panel"
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
            """Serve the panel HTML page."""
            hass: HomeAssistant = request.app["hass"]
            try:
                html_path = pathlib.Path(__file__).parent / "panel.html"
                html = await hass.async_add_executor_job(html_path.read_text, "utf-8")
            except Exception as e:
                html = f"<h1 style='color:red;padding:40px'>panel.html failed to load:<br>{str(e)}</h1>"
            return web.Response(
                content_type="text/html",
                text=html,
                headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
            )


class CombinedNotificationsPanelJSView(HomeAssistantView):
    """Serve panel JS file."""

    url = "/api/combined_notifications/panel.js"
    name = "api:combined_notifications:panel_js"
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
        """Serve the panel JavaScript file."""
        hass: HomeAssistant = request.app["hass"]
        js_path = pathlib.Path(__file__).parent / "panel_iframe.js"
        data = await hass.async_add_executor_job(js_path.read_bytes)
        return web.Response(
            body=data,
            content_type="application/javascript",
            headers={"Cache-Control": "no-cache"},
        )


def async_register_views(hass: HomeAssistant) -> None:
    """Register REST API views."""
    hass.http.register_view(CombinedNotificationsPanelView)
    hass.http.register_view(CombinedNotificationsPanelJSView)
    hass.http.register_view(CombinedNotificationsConfigView)
    hass.http.register_view(CombinedNotificationsStatesView)
    _LOGGER.debug("Combined Notifications API views registered")
