"""Config flow for Combined Notifications integration."""
import logging
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class CombinedNotificationsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Combined Notifications."""
    VERSION = 2

    async def async_step_user(self, user_input=None):
        """Handle the initial step — just get the sensor name."""
        errors = {}

        if user_input is not None:
            name = user_input["name"].strip().lower().replace(" ", "_")
            name = "".join(c for c in name if c.isalnum() or c == "_")

            if not name:
                errors["name"] = "invalid_name"
            elif any(
                entry.data.get("name") == name
                for entry in self._async_current_entries()
            ):
                errors["name"] = "already_configured"
            elif self.hass.states.get(f"sensor.{name}") is not None:
                errors["name"] = "entity_already_exists"
            else:
                return self.async_create_entry(
                    title=user_input.get("friendly_sensor_name") or name,
                    data={
                        "name": name,
                        "friendly_sensor_name": user_input.get("friendly_sensor_name", "").strip(),
                        "text_all_clear": "ALL CLEAR",
                        "icon_all_clear": "mdi:hand-okay",
                        "icon_alert": "mdi:alert-circle",
                        "background_color_all_clear": "Gray",
                        "background_color_alert": "Red",
                        "text_color_all_clear": "Bright Green",
                        "text_color_alert": "White",
                        "icon_color_all_clear": "Bright Green",
                        "icon_color_alert": "White",
                        "hide_title": False,
                        "hide_title_alert": False,
                        "conditions": [],
                    },
                )

        schema = vol.Schema({
            vol.Required("name"): str,
            vol.Optional("friendly_sensor_name", default=""): str,
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
            description_placeholders={
                "example": "home_security",
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        """Create the options flow handler."""
        return CombinedNotificationsOptionsFlow()


class CombinedNotificationsOptionsFlow(config_entries.OptionsFlow):
    """Options flow — show compatibility toggle, save preference, link to panel."""

    async def async_step_init(self, user_input=None):
        """Show settings form with a link to the panel.

        Previously this used async_external_step() to auto-open the panel
        via window.open(). That stopped working reliably on HA Core 2026.8+
        (confirmed via version bisection: works on 2026.7.4, fails on
        2026.8.1/8.2/8.3) — the step-flow-external component renders an
        empty pane and never navigates, with no console error. The panel
        itself and its auth were never the problem; only the external-step
        hand-off was. This form-based approach is the supported options-flow
        pattern and isn't affected by that regression.
        """
        panel_url = f"/combined-notifications-{self.config_entry.entry_id}"

        if user_input is not None:
            compatibility_mode = user_input.get("compatibility_mode", False)
            use_attributes = user_input.get("use_attributes", False)
            compat_mode_key = user_input.get("compat_mode_key", "").strip()
            # Save preference directly to options
            self.hass.config_entries.async_update_entry(
                self.config_entry,
                options={
                    "compatibility_mode": compatibility_mode,
                    "use_attributes": use_attributes,
                    "compat_mode_key": compat_mode_key,
                },
            )
            # Update the sensor's use_attributes flag synchronously
            sensor = self.hass.data.get(DOMAIN, {}).get(self.config_entry.entry_id)
            if sensor and hasattr(sensor, "async_update_use_attributes"):
                await sensor.async_update_use_attributes(use_attributes)

            # Register the panel synchronously so the link in the form is
            # always valid, whether or not this is the first save.
            from . import async_register_cn_panel
            await async_register_cn_panel(self.hass, self.config_entry)

            return self.async_create_entry(title="", data={})

        current_mode = self.config_entry.options.get("compatibility_mode", False)
        current_use_attributes = self.config_entry.options.get("use_attributes", False)
        current_compat_key = self.config_entry.options.get("compat_mode_key", "")

        schema = vol.Schema({
            vol.Required("compatibility_mode", default=current_mode): bool,
            vol.Required("use_attributes", default=current_use_attributes): bool,
            vol.Optional("compat_mode_key", default=current_compat_key): selector.selector(
                {"text": {"type": "password"}}
            ),
        })

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            description_placeholders={"panel_url": panel_url},
        )
