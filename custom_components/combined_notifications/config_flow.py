"""Config flow for Combined Notifications."""
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.schema_config_entry import SchemaConfigEntryFlowHandler

from .const import COLOR_MAP, COLORS, DOMAIN, OPERATORS

CONFIG_SCHEMA = vol.Schema(
    {
        vol.Required("name"): str,
    }
)

CONDITION_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): str,
        vol.Required("operator"): vol.In(OPERATORS),
        vol.Required("trigger_value"): str,
        vol.Optional("name"): str,
    }
)

class CombinedNotificationsConfigFlow(SchemaConfigEntryFlowHandler, domain=DOMAIN):
    """Config flow for Combined Notifications."""

    config_schema = CONFIG_SCHEMA
    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        errors = {}
        if user_input is not None:
            return self.async_create_entry(title=user_input["name"], data=user_input)

        return self.async_show_form(
            step_id="user",
            data_schema=self.config_schema,
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return CombinedNotificationsOptionsFlow(config_entry)

class CombinedNotificationsOptionsFlow(config_entries.OptionsFlow):
    """Options flow for Combined Notifications."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry
        self._data = dict(config_entry.options)
        self._conditions = list(self._data.get("conditions", []))

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        return await self.async_step_menu()

    async def async_step_menu(self, user_input=None):
        """Show menu for options flow."""
        if user_input is not None:
            menu_option = user_input.get("menu_option")
            if menu_option == "basic_settings":
                return await self.async_step_basic_settings()
            elif menu_option == "appearance":
                return await self.async_step_appearance()
            elif menu_option == "manage_conditions":
                return await self.async_step_manage_conditions()
            elif menu_option == "save_changes":
                sensor = self.hass.data.get(DOMAIN, {}).get(self.config_entry.entry_id)
                if sensor:
                    # Prepare settings in the same format as sensor.py
                    settings = {
                        "text_all_clear": self._data.get("text_all_clear", "ALL CLEAR"),
                        "icons": self._data.get("icons", {
                            "clear": self._data.get("icon_all_clear", "mdi:hand-okay"),
                            "alert": self._data.get("icon_alert", "mdi:alert-circle"),
                        }),
                        "colors": self._data.get("colors", {
                            "clear": COLOR_MAP.get(self._data.get("background_color_all_clear", "Green"), "Green"),
                            "alert": COLOR_MAP.get(self._data.get("background_color_alert", "Red"), "Red"),
                        }),
                        "text_colors": self._data.get("text_colors", {
                            "clear": COLOR_MAP.get(self._data.get("text_color_all_clear", ""), ""),
                            "alert": COLOR_MAP.get(self._data.get("text_color_alert", ""), ""),
                        }),
                        "icon_colors": self._data.get("icon_colors", {
                            "clear": COLOR_MAP.get(self._data.get("icon_color_all_clear", ""), ""),
                            "alert": COLOR_MAP.get(self._data.get("icon_color_alert", ""), ""),
                        }),
                        "hide_title": self._data.get("hide_title", False),
                    }
                    # Update sensor dynamically
                    await sensor.async_update_settings(settings, self._conditions)
                    # Save config entry with all current data
                    return self.async_create_entry(
                        title=self.config_entry.title,
                        data={**self._data, "conditions": self._conditions}
                    )
                else:
                    # Fallback to full update
                    return self.async_create_entry(title=self.config_entry.title, data={
                        **self._data,
                        "conditions": self._conditions
                    })
        # Show the options menu
        return self.async_show_menu(
            step_id="menu",
            menu_options=["basic_settings", "appearance", "manage_conditions", "save_changes"],
        )

    async def async_step_basic_settings(self, user_input=None):
        """Handle basic settings."""
        errors = {}
        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_menu()

        schema = vol.Schema({
            vol.Optional("text_all_clear",
                         default=self._data.get("text_all_clear", "ALL CLEAR")): str,
        })

        return self.async_show_form(
            step_id="basic_settings",
            data_schema=schema,
            errors=errors
        )

    async def async_step_appearance(self, user_input=None):
        """Handle appearance settings."""
        errors = {}

        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_menu()

        schema = vol.Schema({
            vol.Required("background_color_all_clear",
                         default=self._data.get("background_color_all_clear", "Green")): vol.In(COLORS),
            vol.Required("background_color_alert",
                         default=self._data.get("background_color_alert", "Red")): vol.In(COLORS),
            vol.Optional("text_color_all_clear",
                         default=self._data.get("text_color_all_clear", "")): vol.In(COLORS),
            vol.Optional("text_color_alert",
                         default=self._data.get("text_color_alert", "")): vol.In(COLORS),
            vol.Optional("icon_all_clear",
                         default=self._data.get("icon_all_clear", "mdi:hand-okay")): str,
            vol.Optional("icon_alert",
                         default=self._data.get("icon_alert", "mdi:alert-circle")): str,
            vol.Optional("icon_color_all_clear",
                         default=self._data.get("icon_color_all_clear", "")): vol.In(COLORS),
            vol.Optional("icon_color_alert",
                         default=self._data.get("icon_color_alert", "")): vol.In(COLORS),
            vol.Optional("hide_title",
                         default=self._data.get("hide_title", False)): bool,
        })

        return self.async_show_form(
            step_id="appearance",
            data_schema=schema,
            errors=errors
        )

    async def async_step_manage_conditions(self, user_input=None):
        """Manage conditions menu."""
        if user_input is not None:
            if user_input["menu_option"] == "add":
                return await self.async_step_add_condition()
            elif user_input["menu_option"] == "list":
                return await self.async_step_list_conditions()
            return await self.async_step_menu()

        return self.async_show_menu(
            step_id="manage_conditions",
            menu_options={"add": "Add New Condition", "list": "List and Edit Conditions", "back": "Back to Options Menu"},
        )

    async def async_step_list_conditions(self, user_input=None):
        """List and handle deletion of conditions."""
        errors = {}
        if user_input is not None:
            if "delete" in user_input:
                condition_to_delete = int(user_input["delete"])
                if 0 <= condition_to_delete < len(self._conditions):
                    self._conditions.pop(condition_to_delete)
                    return await self.async_step_list_conditions()
            return await self.async_step_manage_conditions()

        condition_options = {}
        for i, condition in enumerate(self._conditions):
            label = condition.get("name", condition["entity_id"])
            condition_options[str(i)] = f"{label} ({condition['entity_id']})"

        schema = vol.Schema({
            vol.Optional("delete"): vol.In(condition_options),
        })

        return self.async_show_form(
            step_id="list_conditions",
            data_schema=schema,
            errors=errors,
            description_placeholders={"count": len(self._conditions)},
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
            vol.Required("operator"): vol.In(OPERATORS),
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
