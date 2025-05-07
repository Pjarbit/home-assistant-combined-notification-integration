"""Config flow for Combined Notifications integration."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN

class CombinedNotificationsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Combined Notifications."""
    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        errors = {}
        if user_input is not None:
            user_input["friendly_sensor_name"] = user_input.get("friendly_sensor_name", "") # Add this line
            return self.async_create_entry(title=user_input["name"], data=user_input)

        schema = vol.Schema({
            vol.Required("name"): str,
            vol.Optional("friendly_sensor_name", default=""): str,  # And this line
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return CombinedNotificationsOptionsFlow(config_entry)

    async def async_step_init(self, user_input=None):
        """Handle a flow initiated by the discovery of an already configured device."""
        return self.async_abort(reason="already_configured")

    async def async_step_import(self, user_input):
        """Handle import from config."""
        return await self.async_step_user(user_input)

class CombinedNotificationsOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow."""

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        return await self.async_step_appearance()

    async def async_step_appearance(self, user_input=None):
        """Handle the appearance options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        data_schema = vol.Schema({
            vol.Optional("background_color_all_clear", default="Use YOUR Current Theme Color"): vol.In(COLORS),
            vol.Optional("background_color_alert", default="Red"): vol.In(COLORS),
            vol.Optional("text_color_all_clear", default="Use YOUR Current Theme Color"): vol.In(COLORS),
            vol.Optional("text_color_alert", default="Use YOUR Current Theme Color"): vol.In(COLORS),
            vol.Optional("icon_all_clear", default="mdi:hand-okay"): str,
            vol.Optional("icon_alert", default="mdi:alert-circle"): str,
            vol.Optional("icon_color_all_clear", default="Use YOUR Current Theme Color"): vol.In(COLORS),
            vol.Optional("icon_color_alert", default="Use YOUR Current Theme Color"): vol.In(COLORS),
            vol.Optional("hide_title", default=False): bool,
        })

        return self.async_show_form(
            step_id="appearance",
            data_schema=data_schema,
        )

    async def async_step_conditions(self, user_input=None):
        """Handle the conditions options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(
            step_id="conditions",
            data_schema=vol.Schema({}),
        )

    async def async_step_list_conditions(self, user_input=None):
        """List existing conditions and allow adding new ones."""
        if user_input is not None:
            if user_input["add_another"]:
                return await self.async_step_add_condition()
            return await self.async_step_appearance()  # Go back to appearance

        self._conditions = self.config_entry.options.get("conditions", [])
        return self.async_show_form(
            step_id="list_conditions",
            data_schema=vol.Schema({
                vol.Required("add_another", default=False): bool,
            }),
            description_placeholders={"conditions": len(self._conditions)},
        )

    async def async_step_add_condition(self, user_input=None):
        """Handle adding a new condition."""
        errors = {}
        if user_input is not None:
            try:
                user_input = self._validate_condition_input(user_input)
                self._conditions.append(user_input)
                return await self.async_step_list_conditions()
            except vol.Invalid as err:
                errors["base"] = err.msg

        schema = vol.Schema({
            vol.Required("entity_id"): str,
            vol.Required("operator", default="=="): vol.In(OPERATORS),
            vol.Required("trigger_value"): str,
            vol.Optional("name"): str,
        })

        return self.async_show_form(
            step_id="add_condition",
            data_schema=schema,
            errors=errors,
        )

    async def async_step_edit_condition(self, user_input=None):
        """Handle editing an existing condition."""
        errors = {}
        condition_index = self._context.get("condition_index")
        if condition_index is None or not (0 <= condition_index < len(self._conditions)):
            return await self.async_step_list_conditions()

        if user_input is not None:
            try:
                user_input = self._validate_condition_input(user_input)
                self._conditions[condition_index].update(user_input)
                return await self.async_step_list_conditions()
            except vol.Invalid as err:
                errors["base"] = err.msg

        condition_to_edit = self._conditions[condition_index]
        schema = vol.Schema({
            vol.Required("entity_id", default=condition_to_edit["entity_id"]): str,
            vol.Required("operator", default=condition_to_edit.get("operator", "==")): vol.In(OPERATORS),
            vol.Required("trigger_value", default=condition_to_edit["trigger_value"]): str,
            vol.Optional("name", default=condition_to_edit.get("name", "")): str,
        })

        return self.async_show_form(
            step_id="edit_condition",
            data_schema=schema,
            errors=errors,
        )

    def _validate_condition_input(self, user_input):
        """Validate condition input."""
        return CONDITION_SCHEMA(user_input)
