"""Config flow for Combined Notifications integration."""
import logging
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
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
    """Options flow — compatibility toggle then redirect to panel."""

    async def async_step_init(self, user_input=None):
        """Show compatibility mode toggle first, then open the panel."""
        if user_input is not None:
            compatibility_mode = user_input.get("compatibility_mode", False)
            # Save the option and trigger an entry reload so the correct panel registers
            return self.async_create_entry(
                title="",
                data={"compatibility_mode": compatibility_mode},
            )

        current_mode = self.config_entry.options.get("compatibility_mode", False)

        schema = vol.Schema({
            vol.Required("compatibility_mode", default=current_mode): bool,
        })

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
        )
