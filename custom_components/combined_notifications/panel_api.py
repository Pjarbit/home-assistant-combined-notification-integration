"""REST API endpoints for Combined Notifications panel."""
# Integration version: 8.10.10
from __future__ import annotations

import hmac
import logging
import json
import pathlib
from datetime import timedelta
from aiohttp import web
from homeassistant.core import HomeAssistant
from homeassistant.components.http import HomeAssistantView

from .const import DOMAIN, RELEVANT_DOMAINS, CONF_COMPAT_MODE_KEY

_LOGGER = logging.getLogger(__name__)


def _check_compat_key(request: web.Request, entry) -> bool:
    """Return True if the compat-mode key check passes (or no key is set)."""
    expected = entry.options.get(CONF_COMPAT_MODE_KEY, "") or ""
    if not expected:
        return True  # no key set = open, non-breaking for existing users
    provided = request.rel_url.query.get("key", "") or ""
    return hmac.compare_digest(provided, expected)


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

        if not _check_compat_key(request, entry):
            return self.json_message("Forbidden", 403)

        return self.json(
            {"config": dict(entry.data), "options": dict(entry.options)},
            headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
        )

    async def post(self, request: web.Request) -> web.Response:
        """Save config for an entry."""
        hass: HomeAssistant = request.app["hass"]
        entry_id = request.rel_url.query.get("entry_id")
        if not entry_id:
            return self.json_message("entry_id required", 400)

        entry = hass.config_entries.async_get_entry(entry_id)
        if not entry:
            return self.json_message("Entry not found", 404)

        # If a logged-in HA user is present (e.g. same-session request),
        # require admin. If there's no HA user at all (the normal
        # compatibility-mode case, requires_auth=False), fall through to
        # the existing compat_mode_key check below — that's the documented
        # trust boundary for this path, unchanged in this release.
        user = request.get("hass_user")
        if user is not None and not user.is_admin:
            return self.json_message("Forbidden", 403)

        if not _check_compat_key(request, entry):
            return self.json_message("Forbidden", 403)

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
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
        """Return filtered entity states."""
        hass: HomeAssistant = request.app["hass"]
        entry_id = request.rel_url.query.get("entry_id")
        if not entry_id:
            return self.json_message("entry_id required", 400)

        entry = hass.config_entries.async_get_entry(entry_id)
        if not entry:
            return self.json_message("Entry not found", 404)

        if not _check_compat_key(request, entry):
            return self.json_message("Forbidden", 403)

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


CN_CLIENT_ID = "https://combined-notifications.local"
CN_CLIENT_NAME = "Combined Notifications Panel"
TOKEN_LIFETIME = timedelta(minutes=45)


class CombinedNotificationsPanelView(HomeAssistantView):
    """Serve panel.html with a short-lived access token injected, when available."""

    url = "/api/combined_notifications/panel"
    name = "api:combined_notifications:panel"
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
        """Serve the panel HTML page with an injected access token and compat key."""
        hass: HomeAssistant = request.app["hass"]
        user = request.get("hass_user")
        access_token = None

        if user is not None:
            refresh_token = next(
                (
                    rt
                    for rt in user.refresh_tokens.values()
                    if rt.client_id == CN_CLIENT_ID
                ),
                None,
            )

            if refresh_token is None:
                refresh_token = await hass.auth.async_create_refresh_token(
                    user,
                    client_id=CN_CLIENT_ID,
                    client_name=CN_CLIENT_NAME,
                    access_token_expiration=TOKEN_LIFETIME,
                )

            access_token = hass.auth.async_create_access_token(
                refresh_token,
                remote_ip=request.remote,
            )

        try:
            html_path = pathlib.Path(__file__).parent / "panel.html"
            html = await hass.async_add_executor_job(html_path.read_text, "utf-8")
        except Exception as e:
            html = f"<h1 style='color:red;padding:40px'>panel.html failed to load:<br>{str(e)}</h1>"

        entry_id = request.rel_url.query.get("entry_id")
        compat_key = None
        if entry_id:
            entry = hass.config_entries.async_get_entry(entry_id)
            if entry:
                compat_key = entry.options.get(CONF_COMPAT_MODE_KEY, "") or None

        inject_parts = []
        if access_token:
            inject_parts.append(f'window.__CN_ACCESS_TOKEN="{access_token}";')
        if compat_key:
            inject_parts.append(f'window.__CN_COMPAT_KEY="{compat_key}";')

        if inject_parts:
            inject = "<script>" + " ".join(inject_parts) + "</script>"
            html = html.replace("</head>", inject + "</head>", 1)

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
