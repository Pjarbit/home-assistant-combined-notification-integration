"""Config flow for Combined Notifications integration."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN
from homeassistant.helpers import selector

# Color options for the notification card
COLORS = [
    "Use YOUR Current Theme Color", "Red", "Green", "Blue", "Yellow", "Orange",
    "Purple", "Gray", "White", "Black", "Teal", "Transparent Background"
]

# Operators with friendly names
OPERATORS = [
    "equals (==)",
    "not equals (!=)",
    "greater than (>)",
    "less than (<)"
]

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
            # Store the basic settings
            self._data.update(user_input)

            # Basic validation of the name
            name = user_input.get("name")
            if any(entry.data.get("name") == name for entry in self._async_current_entries()):
                errors["name"] = "already_configured"
            else:
                # Proceed to next step if no errors
                return await self.async_step_appearance()

        # First step form - basic information
        schema = vol.Schema({
            vol.Required("name"): str,
            vol.Required("text_all_clear", default="ALL CLEAR"): str,
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors
        )

    async def async_step_appearance(self, user_input=None):
        """Handle appearance settings."""
        errors = {}

        if user_input is not None:
            # Store the appearance settings
            self._data.update(user_input)
            # Proceed to condition step
            return await self.async_step_add_condition()

        # Appearance form - colors and icons (without height and width)
        schema = vol.Schema({
            vol.Required("background_color_all_clear", default="Green"): vol.In(COLORS),
            vol.Required("background_color_alert", default="Red"): vol.In(COLORS),
            vol.Optional("text_color_all_clear", default=""): vol.In(COLORS),
            vol.Optional("text_color_alert", default=""): vol.In(COLORS),
            vol.Optional("icon_all_clear", default="mdi:hand-okay"): str,
            vol.Optional("icon_alert", default="mdi:alert-circle"): str,
            vol.Optional("icon_color_all_clear", default=""): vol.In(COLORS),
            vol.Optional("icon_color_alert", default=""): vol.In(COLORS),
            vol.Optional("hide_title", default=False): bool,
        })

        return self.async_show_form(
            step_id="appearance",
            data_schema=schema,
            errors=errors
        )

    async def async_step_add_condition(self, user_input=None):
        """Step to add a condition entity."""
        errors = {}

        if user_input is not None:
            # Process operator selection to get just the symbol
            operator = user_input["operator"]
            if operator == "equals (==)":
                operator = "=="
            elif operator == "not equals (!=)":
                operator = "!="
            elif operator == "greater than (>)":
                operator = ">"
            elif operator == "less than (<)":
                operator = "<"

            # Add the condition to our list
            condition = {
                "entity_id": user_input["entity_id"],
                "operator": operator,
                "trigger_value": user_input["trigger_value"],
                "name": user_input.get("name", user_input["entity_id"])
            }
            self._conditions.append(condition)

            # Move to confirmation step
            return await self.async_step_confirm_conditions()

        # Form for adding a condition
        schema = vol.Schema({
            vol.Required("entity_id"): selector.EntitySelector(),
            vol.Required("operator", default="equals (==)"): vol.In(OPERATORS),
            vol.Required("trigger_value"): str,
            vol.Optional("name"): str,
        })

        return self.async_show_form(
            step_id="add_condition",
            data_schema=schema,
            errors=errors
        )

    async def async_step_confirm_conditions(self, user_input=None):
        """Confirm conditions or add more."""
        if user_input is not None:
            if user_input.get("add_another"):
                # Go back to add another condition
                return await self.async_step_add_condition()
            else:
                # Finalize and create entry
                return self._create_entry()

        # Format conditions for display
        condition_list = "\n".join(
            f"- {c.get('name', c['entity_id'])} ({c['entity_id']} {c['operator']} {c['trigger_value']})"
            for c in self._conditions
        )

        if not condition_list:
            condition_list = "No conditions added yet. Add at least one condition."

        schema = vol.Schema({
            vol.Required("add_another", default=False): bool,
        })

        return self.async_show_form(
            step_id="confirm_conditions",
            data_schema=schema,
            description_placeholders={"conditions": condition_list}
        )

    @callback
    def _create_entry(self):
        """Create the config entry."""
        if not self._conditions:
            # Must have at least one condition
            return self.async_abort(reason="no_conditions")

        # Create the entry with all collected data
        return self.async_create_entry(
            title=self._data["name"],
            data={
                **self._data,
                "conditions": self._conditions
            }
        )


class CombinedNotificationsOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for Combined Notifications."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry
        self._data = dict(config_entry.data)
        self._conditions = list(config_entry.data.get("conditions", []))

    async def async_step_init(self, user_input=None):
        """Initial step for options flow."""
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
                return self._update_config_entry()

        schema = vol.Schema({
            vol.Required("menu_option", default="basic_settings"): vol.In({
                "basic_settings": "Edit Basic Settings",
                "appearance": "Edit Appearance",
                "manage_conditions": "Manage Conditions",
                "save_changes": "Save All Changes"
            })
        })

        return self.async_show_form(
            step_id="menu",
            data_schema=schema,
            description_placeholders={"name": self._data.get("name", "Unknown")}
        )

    async def async_step_basic_settings(self, user_input=None):
        """Handle the basic settings step."""
        errors = {}

        if user_input is not None:
            # Update basic settings (without changing the name)
            self._data.update({
                "text_all_clear": user_input.get("text_all_clear")
            })
            return await self.async_step_menu()

        # Basic settings form (without the name field)
        schema = vol.Schema({
            vol.Required("text_all_clear", default=self._data.get("text_all_clear", "ALL CLEAR")): str,
        })
        
        return self.async_show_form(
            step_id="basic_settings",
            data_schema=schema,
            errors=errors,
            description_placeholders={"name": self._data.get("name", "Unknown")}
        )

    async def async_step_appearance(self, user_input=None):
        """Handle appearance settings."""
        errors = {}

        if user_input is not None:
            # Update appearance settings
            self._data.update(user_input)
            return await self.async_step_menu()

        # Appearance form with current values (without height and width)
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
            action = user_input.get("action")
            if action == "add":
                return await self.async_step_add_condition()
            elif action == "list":
                return await self.async_step_list_conditions()
            else:
                return await self.async_step_menu()

        schema = vol.Schema({
            vol.Required("action", default="list"): vol.In({
                "list": "List and Edit Conditions",
                "add": "Add New Condition",
                "back": "Back to Main Menu"
            })
        })

        return self.async_show_form(
            step_id="manage_conditions",
            data_schema=schema
        )

    async def async_step_list_conditions(self, user_input=None):
        """List all conditions and allow selecting one to edit or delete."""
        if user_input is not None:
            if user_input.get("condition_action") == "back":
                return await self.async_step_manage_conditions()
            
            selected_index = user_input.get("condition_index")
            action = user_input.get("condition_action")
            
            if action == "edit" and selected_index is not None:
                return await self.async_step_edit_condition({"index": selected_index})
            elif action == "delete" and selected_index is not None:
                # Remove the condition
                self._conditions.pop(selected_index)
                return await self.async_step_list_conditions()

        # No conditions case
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

        # Build choices for conditions
        condition_choices = {}
        conditions_text = []
        
        for i, condition in enumerate(self._conditions):
            entity_id = condition.get("entity_id", "unknown")
            name = condition.get("name", entity_id)
            operator = condition.get("operator", "==")
            value = condition.get("trigger_value", "")
            
            condition_text = f"{name} ({entity_id} {operator} {value})"
            conditions_text.append(f"- {condition_text}")
            condition_choices[i] = condition_text
        
        conditions_display = "\n".join(conditions_text)

        schema = vol.Schema({
            vol.Optional("condition_index"): vol.In(condition_choices),
            vol.Required("condition_action", default="back"): vol.In({
                "edit": "Edit Selected Condition",
                "delete": "Delete Selected Condition",
                "back": "Back to Conditions Menu"
            })
        })

        return self.async_show_form(
            step_id="list_conditions",
            data_schema=schema,
            description_placeholders={"conditions": conditions_display}
        )

    async def async_step_add_condition(self, user_input=None):
        """Add a new condition."""
        errors = {}

        if user_input is not None:
            # Process operator selection to get just the symbol
            operator = user_input["operator"]
            if operator == "equals (==)":
                operator = "=="
            elif operator == "not equals (!=)":
                operator = "!="
            elif operator == "greater than (>)":
                operator = ">"
            elif operator == "less than (<)":
                operator = "<"

            # Add the condition to our list
            condition = {
                "entity_id": user_input["entity_id"],
                "operator": operator,
                "trigger_value": user_input["trigger_value"],
                "name": user_input.get("name", user_input["entity_id"])
            }
            self._conditions.append(condition)

            # Go back to condition management
            return await self.async_step_manage_conditions()

        # Form for adding a condition
        schema = vol.Schema({
            vol.Required("entity_id"): selector.EntitySelector(),
            vol.Required("operator", default="equals (==)"): vol.In(OPERATORS),
            vol.Required("trigger_value"): str,
            vol.Optional("name"): str,
        })

        return self.async_show_form(
            step_id="add_condition",
            data_schema=schema,
            errors=errors
        )

    async def async_step_edit_condition(self, user_input=None):
        """Edit an existing condition."""
        errors = {}
        index = user_input.get("index") if user_input else None

        if index is None:
            # If no index provided, go back to list
            return await self.async_step_list_conditions()

        condition = self._conditions[index]
        
        if user_input and "entity_id" in user_input:
            # Save the edited condition
            operator = user_input["operator"]
            if operator == "equals (==)":
                operator = "=="
            elif operator == "not equals (!=)":
                operator = "!="
            elif operator == "greater than (>)":
                operator = ">"
            elif operator == "less than (<)":
                operator = "<"
                
            # Update the condition
            self._conditions[index] = {
                "entity_id": user_input["entity_id"],
                "operator": operator,
                "trigger_value": user_input["trigger_value"],
                "name": user_input.get("name", user_input["entity_id"])
            }
            
            # Return to condition list
            return await self.async_step_list_conditions()

        # Get display version of operator
        operator_display = "equals (==)"
        if condition["operator"] == "!=":
            operator_display = "not equals (!=)"
        elif condition["operator"] == ">":
            operator_display = "greater than (>)"
        elif condition["operator"] == "<":
            operator_display = "less than (<)"
            
        # Form for editing a condition
        schema = vol.Schema({
            vol.Required("entity_id", default=condition.get("entity_id", "")): 
                selector.EntitySelector(),
            vol.Required("operator", default=operator_display): 
                vol.In(OPERATORS),
            vol.Required("trigger_value", default=condition.get("trigger_value", "")): 
                str,
            vol.Optional("name", default=condition.get("name", "")): 
                str,
        })

        return self.async_show_form(
            step_id="edit_condition",
            data_schema=schema,
            errors=errors
        )

    @callback
    def _update_config_entry(self):
        """Update the config entry with the new data."""
        try:
            # Update the config entry with all collected data
            data = {
                **self._data,
                "conditions": self._conditions
            }
            
            self.hass.config_entries.async_update_entry(
                self.config_entry, 
                data=data
            )
            
            # Reload the integration to apply changes
            self.hass.async_create_task(
                self.hass.config_entries.async_reload(self.config_entry.entry_id)
            )
            
            return self.async_create_entry(title="", data={})
            # REPLACE THE LINE ABOVE WITH THIS:
            # return self.async_exit(reason="options_saved")
        except Exception as err:
            import logging
            _LOGGER = logging.getLogger(__name__)
            _LOGGER.error("Error updating configuration: %s", err)
            return self.async_abort(reason="update_failed")
