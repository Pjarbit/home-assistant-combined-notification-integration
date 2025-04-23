"""Config flow for Combined Notifications integration."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN

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

        # Appearance form - colors and icons
        schema = vol.Schema({
            vol.Required("background_color_all_clear", default="Green"): vol.In(COLORS),
            vol.Required("background_color_alert", default="Red"): vol.In(COLORS),
            vol.Optional("text_color_all_clear", default=""): vol.In(COLORS),
            vol.Optional("text_color_alert", default=""): vol.In(COLORS),
            vol.Optional("icon_all_clear", default="mdi:hand-okay"): str,
            vol.Optional("icon_alert", default="mdi:alert-circle"): str,
            vol.Optional("icon_color_all_clear", default=""): vol.In(COLORS),
            vol.Optional("icon_color_alert", default=""): vol.In(COLORS),
            vol.Optional("card_height", default="100px"): str,
            vol.Optional("card_width", default="100%"): str,
            vol.Optional("icon_size", default="80px"): str,
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
            vol.Required("entity_id"): str,
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
        )