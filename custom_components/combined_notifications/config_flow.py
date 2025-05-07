"""Config flow for Combined Notifications integration."""
import logging
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN, COLORS, OPERATORS, OPERATOR_MAP, COLOR_MAP
from homeassistant.helpers import selector

_LOGGER = logging.getLogger(__name__)

class CombinedNotificationsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Combined Notifications."""
    VERSION = 1

    def __init__(self):
        """Initialize the config flow."""
        self._data = {}
        self._conditions = []

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return CombinedNotificationsOptionsFlow(config_entry)

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            self._data.update(user_input)
            name = user_input.get("name")
            if any(entry.data.get("name") == name for entry in self._async_current_entries()):
                errors["name"] = "already_configured"
            else:
                # Store friendly_name separately if needed
                self._data["friendly_name"] = user_input.get("friendly_name", name)  
                return await self.async_step_appearance()

        schema = vol.Schema({
            vol.Required("name"): str,
            vol.Optional("friendly_name", default=""): str, # Make it optional here
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
        )

    async def async_step_appearance(self, user_input=None):
        """Handle the appearance settings step."""
        errors = {}
        if user_input is not None:
            self._data.update(user_input)
            return self.async_create_entry(title=self._data["name"], data=self._data)  # Use name for title

        schema = vol.Schema({
            vol.Optional("text_all_clear", default="ALL CLEAR"): str,
            vol.Optional("icon_all_clear", default="mdi:hand-okay"): str,
            vol.Optional("icon_alert", default="mdi:alert-circle"): str,
            vol.Optional("background_color_all_clear", default="Green"): vol.In(COLORS),
            vol.Optional("background_color_alert", default="Red"): vol.In(COLORS),
            vol.Optional("text_color_all_clear", default=""): vol.In(COLORS),
            vol.Optional("text_color_alert", default=""): vol.In(COLORS),
            vol.Optional("icon_color_all_clear", default=""): vol.In(COLORS),
            vol.Optional("icon_color_alert", default=""): vol.In(COLORS),
            vol.Optional("hide_title", default=False): bool,
        })
        return self.async_show_form(
            step_id="appearance",
            data_schema=schema,
            errors=errors,
        )

    async def async_step_add_condition(self, user_input=None):
        """Handle adding a condition."""
        errors = {}
        if user_input is not None:
            try:
                user_input = self._validate_condition_input(user_input)
                self._conditions.append(user_input)
                return await self.async_step_confirm_conditions()
            except vol.Invalid as err:
                errors["base"] = err.msg

        schema = vol.Schema({
            vol.Required("entity_id"): selector.EntitySelector(),
            vol.Required("operator", default="equals (==)"): vol.In(OPERATORS),
            vol.Required("trigger_value"): str,
            vol.Optional("name"): str,
        })

        return self.async_show_form(
            step_id="add_condition",
            data_schema=schema,
            errors=errors,
        )

    async def async_step_confirm_conditions(self, user_input=None):
        """Handle confirming the conditions."""
        if user_input is not None and user_input.get("add_another"):
            return await self.async_step_add_condition()
        if not self._conditions:
            return self.async_abort(reason="no_conditions")
        return self.async_create_entry(
            title=self._data["name"],
            data={**self._data, "conditions": self._conditions},
        )

    async def async_step_init(self, user_input=None):
        """Handle a flow initiated by the user."""
        return await self.async_step_user(user_input)

    async def async_step_reconfigure(self, user_input=None):
        """Handle a flow initiated by the user."""
        return await self.async_step_user(user_input)

    async def async_step_options(self, user_input=None):
        """Handle the options flow."""
        return self.async_create_entry(title=self._data["name"], data=self._data)

    async def async_step_list_conditions(self, user_input=None):
        """List current conditions and allow adding more."""
        if user_input is not None and user_input.get("add_another"):
            return await self.async_step_add_condition()

        return self.async_show_form(
            step_id="list_conditions",
            data_schema=vol.Schema({}),
            description_placeholders={"conditions": "\n".join(
                f"- {c.get('name', c['entity_id'])} {c['operator']} {c['trigger_value']}"
                for c in self._conditions
            )},
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
            vol.Required("entity_id", default=condition_to_edit["entity_id"]): selector.EntitySelector(),
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

    async def async_step_delete_condition(self, user_input=None):
        """Handle deleting a condition."""
        if user_input is not None and user_input.get("confirm_delete"):
            index = self._context.get("condition_index")
            if index is not None and 0 <= index < len(self._conditions):
                self._conditions.pop(index)
            return await self.async_step_list_conditions()

        return self.async_show_confirm(
            step_id="delete_condition",
            description_placeholders={"condition": self._context.get("condition_description", "")},
        )

class CombinedNotificationsOptionsFlow(config_entries.OptionsFlow):
    """Options flow for Combined Notifications."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry
        self._conditions = list(config_entry.data.get("conditions", []))

    async def async_step_init(self, user_input=None):
        """Handle the initial step."""
        return await self.async_step_options(user_input)

    async def async_step_options(self, user_input=None):
        """Manage the options."""
        errors = {}
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        data = self.config_entry.data
        schema = vol.Schema({
            vol.Optional("text_all_clear", default=data.get("text_all_clear", "ALL CLEAR")): str,
            vol.Optional("icon_all_clear", default=data.get("icon_all_clear", "mdi:hand-okay")): str,
            vol.Optional("icon_alert", default=data.get("icon_alert", "mdi:alert-circle")): str,
            vol.Optional("background_color_all_clear", default=data.get("background_color_all_clear", "Green")): vol.In(COLORS),
            vol.Optional("background_color_alert", default=data.get("background_color_alert", "Red")): vol.In(COLORS),
            vol.Optional("text_color_all_clear", default=data.get("text_color_all_clear", "")): vol.In(COLORS),
            vol.Optional("text_color_alert", default=data.get("text_color_alert", "")): vol.In(COLORS),
            vol.Optional("icon_color_all_clear", default=data.get("icon_color_all_clear", "")): vol.In(COLORS),
            vol.Optional("icon_color_alert", default=data.get("icon_color_alert", "")): vol.In(COLORS),
            vol.Optional("hide_title", default=data.get("hide_title", False)): bool,
        })
        return self.async_show_form(
            step_id="options",
            data_schema=schema,
            errors=errors,
        )
