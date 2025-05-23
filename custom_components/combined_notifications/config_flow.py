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
            # Default friendly_sensor_name to name if empty
            if not user_input["friendly_sensor_name"].strip():
                user_input["friendly_sensor_name"] = user_input["name"]
            self._data.update(user_input)
            name = user_input.get("name")
            if any(entry.data.get("name") == name for entry in self._async_current_entries()):
                errors["name"] = "already_configured"
            else:
                return await self.async_step_appearance()
        schema = vol.Schema({
            vol.Required("name"): str,
            vol.Required("friendly_sensor_name", default=""): str,
        })
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    async def async_step_appearance(self, user_input=None):
        """Handle appearance settings."""
        errors = {}
        if user_input is not None:
            try:
                for key in ["background_color_all_clear", "background_color_alert", "text_color_all_clear", "text_color_alert", "icon_color_all_clear", "icon_color_alert"]:
                    if key in user_input and user_input[key] and user_input[key] not in COLORS:
                        raise vol.Invalid(f"Invalid color for {key}: {user_input[key]}")
                self._data.update(user_input)
                _LOGGER.debug("Appearance settings updated: %s", user_input)
                return await self.async_step_add_condition()
            except vol.Invalid as e:
                _LOGGER.error("Validation error in appearance settings: %s", e)
                errors["base"] = "invalid_input"
            except Exception as e:
                _LOGGER.error("Error processing appearance settings: %s", e)
                errors["base"] = "unknown"
        schema = vol.Schema({
            vol.Required("text_all_clear", default=self._data.get("text_all_clear", "ALL CLEAR")): str,
            vol.Optional("icon_all_clear", default=self._data.get("icon_all_clear", "mdi:hand-okay")): str,
            vol.Required("background_color_all_clear", default=self._data.get("background_color_all_clear", "Bright Green")): vol.In(COLORS),
            vol.Optional("text_color_all_clear", default=self._data.get("text_color_all_clear", "")): vol.In(COLORS),
            vol.Optional("icon_color_all_clear", default=self._data.get("icon_color_all_clear", "")): vol.In(COLORS),
            vol.Optional("hide_title", default=self._data.get("hide_title", False)): bool,
            vol.Optional("icon_alert", default=self._data.get("icon_alert", "mdi:alert-circle")): str,
            vol.Required("background_color_alert", default=self._data.get("background_color_alert", "Red")): vol.In(COLORS),
            vol.Optional("text_color_alert", default=self._data.get("text_color_alert", "")): vol.In(COLORS),
            vol.Optional("icon_color_alert", default=self._data.get("icon_color_alert", "")): vol.In(COLORS),
            vol.Optional("hide_title_alert", default=self._data.get("hide_title_alert", False)): bool,
        })
        return self.async_show_form(step_id="appearance", data_schema=schema, errors=errors)

    async def async_step_add_condition(self, user_input=None):
        """Step to add a condition entity."""
        errors = {}
        if user_input is not None:
            try:
                operator = OPERATOR_MAP[user_input["operator"]]
                condition = {
                    "entity_id": user_input["entity_id"],
                    "operator": operator,
                    "trigger_value": user_input["trigger_value"],
                    "name": user_input.get("name", user_input["entity_id"]),
                    "disabled": False  # Default to enabled
                }
                self._conditions.append(condition)
                return await self.async_step_confirm_conditions()
            except Exception as e:
                _LOGGER.error("Error adding condition: %s", e)
                errors["base"] = "unknown"
        schema = vol.Schema({
            vol.Required("entity_id"): selector.EntitySelector(),
            vol.Required("operator", default="equals (==)"): vol.In(OPERATORS),
            vol.Required("trigger_value"): str,
            vol.Optional("name"): str,
        })
        return self.async_show_form(step_id="add_condition", data_schema=schema, errors=errors)

    async def async_step_confirm_conditions(self, user_input=None):
        """Confirm conditions or add more."""
        if user_input is not None:
            if user_input.get("add_another"):
                return await self.async_step_add_condition()
            else:
                return self._create_entry()
        condition_list = "\n".join(f"- {c.get('name', c['entity_id'])} ({c['entity_id']} {c['operator']} {c['trigger_value']})" for c in self._conditions)
        if not condition_list:
            condition_list = "No conditions added yet. Add at least one condition."
        schema = vol.Schema({
            vol.Required("add_another", default=False): bool,
        })
        return self.async_show_form(step_id="confirm_conditions", data_schema=schema, description_placeholders={"conditions": condition_list})

    @callback
    def _create_entry(self):
        """Create the config entry."""
        if not self._conditions:
            return self.async_abort(reason="no_conditions")
        return self.async_create_entry(title=self._data["name"], data={**self._data, "conditions": self._conditions})

class CombinedNotificationsOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for Combined Notifications."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self._data = dict(config_entry.data)
        self._conditions = list(config_entry.data.get("conditions", []))
        self.config_entry = config_entry
        # Ensure existing conditions have the disabled field
        for condition in self._conditions:
            if "disabled" not in condition:
                condition["disabled"] = False

    async def async_step_init(self, user_input=None):
        """Initial step for options flow."""
        entity_id = self.context.get("entity_id")
        if entity_id:
            index = next((i for i, cond in enumerate(self._conditions) if cond.get("entity_id") == entity_id), None)
            if index is not None:
                return await self.async_step_edit_condition({"index": str(index)})
            else:
                _LOGGER.warning("No condition found for entity_id: %s", entity_id)
        return await self.async_step_menu()

    async def async_step_menu(self, user_input=None):
        """Show menu for options flow."""
        if user_input is not None:
            try:
                menu_option = user_input.get("menu_option")
                _LOGGER.debug("Menu option selected: %s", menu_option)
                if menu_option == "basic_settings":
                    return await self.async_step_basic_settings()
                elif menu_option == "appearance":
                    return await self.async_step_appearance()
                elif menu_option == "manage_conditions":
                    return await self.async_step_manage_conditions()
                elif menu_option == "save_changes":
                    if not self.config_entry:
                        _LOGGER.error("Config entry is None, cannot save options")
                        return self.async_show_form(step_id="menu", data_schema=self._get_menu_schema(), errors={"base": "no_config_entry"})
                    sensor = self.hass.data.get(DOMAIN, {}).get(self.config_entry.entry_id)
                    settings = {
                        "text_all_clear": self._data.get("text_all_clear", "ALL CLEAR"),
                        "icons": {"clear": self._data.get("icon_all_clear", "mdi:hand-okay"), "alert": self._data.get("icon_alert", "mdi:alert-circle")},
                        "colors": {"clear": COLOR_MAP.get(self._data.get("background_color_all_clear", "Bright Green"), "Bright Green"), "alert": COLOR_MAP.get(self._data.get("background_color_alert", "Red"), "Red")},
                        "text_colors": {"clear": COLOR_MAP.get(self._data.get("text_color_all_clear", ""), ""), "alert": COLOR_MAP.get(self._data.get("text_color_alert", ""), "")},
                        "icon_colors": {"clear": COLOR_MAP.get(self._data.get("icon_color_all_clear", ""), ""), "alert": COLOR_MAP.get(self._data.get("icon_color_alert", ""), "")},
                        "hide_title": str(self._data.get("hide_title", False)).lower() == "true",
                        "hide_title_alert": str(self._data.get("hide_title_alert", False)).lower() == "true",
                    }
                    if sensor and hasattr(sensor, "async_update_settings"):
                        await sensor.async_update_settings(settings, self._conditions)  # ADDED AWAIT HERE
                    self.hass.config_entries.async_update_entry(self.config_entry, data={**self._data, "conditions": self._conditions})
                    await self.hass.config_entries.async_reload(self.config_entry.entry_id)
                    return self.async_create_entry(title="", data={})
            except Exception as e:
                _LOGGER.error("Unexpected error saving options: %s", e)
                return self.async_show_form(step_id="menu", data_schema=self._get_menu_schema(), errors={"base": "unknown"})
        return self.async_show_form(step_id="menu", data_schema=self._get_menu_schema(), description_placeholders={"name": self._data.get("name", "Unknown")})

    def _get_menu_schema(self):
        """Return the menu schema."""
        return vol.Schema({
            vol.Required("menu_option", default="basic_settings"): vol.In({
                "basic_settings": "Edit Basic Settings",
                "appearance": "Edit Appearance",
                "manage_conditions": "Manage Conditions",
                "save_changes": "Save All Changes"
            })
        })

    async def async_step_basic_settings(self, user_input=None):
        """Handle the basic settings step."""
        errors = {}
        if user_input is not None:
            try:
                self._data.update({
                    "text_all_clear": user_input.get("text_all_clear"),
                    "friendly_sensor_name": user_input.get("friendly_sensor_name", self._data.get("name", ""))  # ADDED THIS
                })
                _LOGGER.debug("Basic settings updated: %s", user_input)
                return await self.async_step_menu()
            except Exception as e:
                _LOGGER.error("Error processing basic settings: %s", e)
                errors["base"] = "unknown"
        schema = vol.Schema({
            vol.Required("text_all_clear", default=self._data.get("text_all_clear", "ALL CLEAR")): str,
            vol.Required("friendly_sensor_name", default=self._data.get("friendly_sensor_name", self._data.get("name", ""))): str,  # ADDED THIS
        })
        return self.async_show_form(step_id="basic_settings", data_schema=schema, errors=errors, description_placeholders={"name": self._data.get("name", "Unknown")})

    async def async_step_appearance(self, user_input=None):
        """Handle appearance settings."""
        errors = {}
        if user_input is not None:
            try:
                for key in ["background_color_all_clear", "background_color_alert", "text_color_all_clear", "text_color_alert", "icon_color_all_clear", "icon_color_alert"]:
                    if key in user_input and user_input[key] and user_input[key] not in COLORS:
                        raise vol.Invalid(f"Invalid color for {key}: {user_input[key]}")
                self._data.update(user_input)
                _LOGGER.debug("Appearance settings updated: %s", user_input)
                return await self.async_step_menu()
            except vol.Invalid as e:
                _LOGGER.error("Validation error in appearance settings: %s", e)
                errors["base"] = "invalid_input"
            except Exception as e:
                _LOGGER.error("Error processing appearance settings: %s", e)
                errors["base"] = "unknown"
        schema = vol.Schema({
            vol.Required("text_all_clear", default=self._data.get("text_all_clear", "ALL CLEAR")): str,
            vol.Optional("icon_all_clear", default=self._data.get("icon_all_clear", "mdi:hand-okay")): str,
            vol.Required("background_color_all_clear", default=self._data.get("background_color_all_clear", "Bright Green")): vol.In(COLORS),
            vol.Optional("text_color_all_clear", default=self._data.get("text_color_all_clear", "")): vol.In(COLORS),
            vol.Optional("icon_color_all_clear", default=self._data.get("icon_color_all_clear", "")): vol.In(COLORS),
            vol.Optional("hide_title", default=self._data.get("hide_title", False)): bool,
            vol.Optional("icon_alert", default=self._data.get("icon_alert", "mdi:alert-circle")): str,
            vol.Required("background_color_alert", default=self._data.get("background_color_alert", "Red")): vol.In(COLORS),
            vol.Optional("text_color_alert", default=self._data.get("text_color_alert", "")): vol.In(COLORS),
            vol.Optional("icon_color_alert", default=self._data.get("icon_color_alert", "")): vol.In(COLORS),
            vol.Optional("hide_title_alert", default=self._data.get("hide_title_alert", False)): bool,
        })
        return self.async_show_form(step_id="appearance", data_schema=schema, errors=errors)

    async def async_step_manage_conditions(self, user_input=None):
        """Manage conditions menu."""
        if user_input is not None:
            try:
                action = user_input.get("action")
                _LOGGER.debug("Condition action selected: %s", action)
                if action == "add":
                    return await self.async_step_add_condition()
                elif action == "list":
                    return await self.async_step_list_conditions()
                elif action == "back":
                    return await self.async_step_menu()
            except Exception as e:
                _LOGGER.error("Error processing condition action: %s", e)
                return self.async_show_form(step_id="manage_conditions", data_schema=self._get_conditions_schema(), errors={"base": "unknown"})
        return self.async_show_form(step_id="manage_conditions", data_schema=self._get_conditions_schema())

    def _get_conditions_schema(self):
        """Return the conditions schema."""
        return vol.Schema({
            vol.Required("action", default="list"): vol.In({
                "list": "List and Edit Conditions",
                "add": "Add New Condition",
                "back": "Back to Main Menu"
            })
        })

    async def async_step_list_conditions(self, user_input=None):
        """List all conditions and allow selecting one to edit, delete, or toggle enable/disable."""
        if user_input is not None:
            try:
                if user_input.get("condition_action") == "back":
                    return await self.async_step_manage_conditions()

                selected_index = user_input.get("condition_index")
                action = user_input.get("condition_action")
                _LOGGER.debug("Condition action: %s, index: %s", action, selected_index)

                if selected_index is None:
                    return self.async_show_form(
                        step_id="list_conditions",
                        data_schema=self._get_list_conditions_schema(),
                        description_placeholders={"conditions": "Please select a condition."},
                        errors={"base": "no_selection"}
                    )

                selected_index = int(selected_index)
                if not (0 <= selected_index < len(self._conditions)):
                    return self.async_show_form(
                        step_id="list_conditions",
                        data_schema=self._get_list_conditions_schema(),
                        description_placeholders={"conditions": "Invalid selection."},
                        errors={"base": "invalid_index"}
                    )

                if action == "edit":
                    return await self.async_step_edit_condition({"index": str(selected_index)})
                elif action == "delete":
                    self._conditions.pop(selected_index)
                    return await self.async_step_list_conditions()
                elif action == "toggle":
                    # Toggle the disabled state
                    self._conditions[selected_index]["disabled"] = not self._conditions[selected_index].get("disabled", False)
                    _LOGGER.debug("Toggled condition %s to disabled=%s", selected_index, self._conditions[selected_index]["disabled"])
                    return await self.async_step_list_conditions()
            except Exception as e:
                _LOGGER.error("Error processing list conditions: %s", e)
                return self.async_show_form(
                    step_id="list_conditions",
                    data_schema=self._get_list_conditions_schema(),
                    description_placeholders={"conditions": "Error occurred"},
                    errors={"base": "unknown"}
                )

        if not self._conditions:
            schema = vol.Schema({
                vol.Required("condition_action", default="back"): vol.In({
                    "back": "Back to Conditions Menu"
                })
            })
            return self.async_show_form(
                step_id="list_conditions",
                data_schema=schema,
                description_placeholders={"conditions": "No conditions have been added yet."}
            )

        condition_choices = {
            str(i): f"{condition.get('name', condition.get('entity_id', 'unknown'))} ({condition.get('entity_id', 'unknown')} {condition.get('operator', '==')} {condition.get('trigger_value', '')}) - {'Disabled' if condition.get('disabled', False) else 'Enabled'}"
            for i, condition in enumerate(self._conditions)
        }
        conditions_text = "\n".join(
            f"- {condition.get('name', condition.get('entity_id', 'unknown'))} ({condition.get('entity_id', 'unknown')} {condition.get('operator', '==')} {condition.get('trigger_value', '')}) - {'Disabled' if condition.get('disabled', False) else 'Enabled'}"
            for condition in self._conditions
        )

        return self.async_show_form(
            step_id="list_conditions",
            data_schema=self._get_list_conditions_schema(),
            description_placeholders={"conditions": conditions_text}
        )

    def _get_list_conditions_schema(self):
        """Return the list conditions schema."""
        condition_choices = {
            str(i): f"{condition.get('name', condition.get('entity_id', 'unknown'))} ({condition.get('entity_id', 'unknown')} {condition.get('operator', '==')} {condition.get('trigger_value', '')}) - {'Disabled' if condition.get('disabled', False) else 'Enabled'}"
            for i, condition in enumerate(self._conditions)
        }
        return vol.Schema({
            vol.Optional("condition_index"): vol.In(condition_choices),
            vol.Required("condition_action", default="back"): vol.In({
                "edit": "Edit Selected Condition",
                "delete": "Delete Selected Condition",
                "toggle": "Toggle Enable/Disable",
                "back": "Back to Conditions Menu"
            })
        })

    async def async_step_add_condition(self, user_input=None):
        """Add a new condition."""
        errors = {}
        if user_input is not None:
            try:
                operator = OPERATOR_MAP[user_input["operator"]]
                condition = {
                    "entity_id": user_input["entity_id"],
                    "operator": operator,
                    "trigger_value": user_input["trigger_value"],
                    "name": user_input.get("name", user_input["entity_id"]),
                    "disabled": False
                }
                self._conditions.append(condition)
                _LOGGER.debug("Condition added: %s", condition)
                return await self.async_step_manage_conditions()
            except Exception as e:
                _LOGGER.error("Error adding condition: %s", e)
                errors["base"] = "unknown"
        schema = vol.Schema({
            vol.Required("entity_id"): selector.EntitySelector(),
            vol.Required("operator", default="equals (==)"): vol.In(OPERATORS),
            vol.Required("trigger_value"): str,
            vol.Optional("name"): str,
        })
        return self.async_show_form(step_id="add_condition", data_schema=schema, errors=errors)

    async def async_step_edit_condition(self, user_input=None):
        """Edit an existing condition."""
        errors = {}
        index = user_input.get("index") if user_input and "index" in user_input else self.context.get("edit_index")

        if index is None:
            _LOGGER.warning("No index provided for editing condition, redirecting to menu")
            return await self.async_step_menu()

        try:
            index = int(index)
            if not (0 <= index < len(self._conditions)):
                raise IndexError("Index out of range")
            condition = self._conditions[index]
        except (ValueError, IndexError) as e:
            _LOGGER.error("Invalid index for editing: %s", e)
            return await self.async_step_menu()

        self.context["edit_index"] = str(index)

        if user_input and "entity_id" in user_input:
            try:
                operator = OPERATOR_MAP[user_input["operator"]]
                self._conditions[index] = {
                    "entity_id": user_input["entity_id"],
                    "operator": operator,
                    "trigger_value": user_input["trigger_value"],
                    "name": user_input.get("name", user_input["entity_id"]),
                    "disabled": condition.get("disabled", False)  # Preserve the disabled state
                }
                _LOGGER.debug("Condition edited: %s", self._conditions[index])
                return await self.async_step_menu()
            except Exception as e:
                _LOGGER.error("Error editing condition: %s", e)
                errors["base"] = "unknown"

        schema = vol.Schema({
            vol.Required("entity_id", default=condition["entity_id"]): selector.EntitySelector(),
            vol.Required("operator", default=[op for op in OPERATORS if OPERATOR_MAP[op] == condition["operator"]][0]): vol.In(OPERATORS),
            vol.Required("trigger_value", default=condition["trigger_value"]): str,
            vol.Optional("name", default=condition.get("name", condition["entity_id"])): str,
        })

        return self.async_show_form(step_id="edit_condition", data_schema=schema, errors=errors)
