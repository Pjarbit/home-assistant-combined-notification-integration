"""Constants for the Combined Notifications integration."""
# Integration version: 8.10.2

DOMAIN = "combined_notifications"

# Single source of truth for which entity domains the integration handles.
# The panel is sent states only for these domains, AND the backend smart-group
# sweep only counts entities in these domains. Keeping both sides bound to this
# one list guarantees the invariant: anything the sensor counts is visible in
# the panel (no counted-but-hidden entities). Add a domain here to support it
# in BOTH places at once.
RELEVANT_DOMAINS = {
    "sensor", "binary_sensor", "input_boolean", "switch", "light", "lock",
    "cover", "climate", "person", "device_tracker", "media_player",
    "camera", "automation", "script", "scene", "button", "update",
    "number", "select", "input_number", "input_select", "input_text",
    "counter", "timer", "input_datetime", "valve",
    "alarm_control_panel", "fan", "vacuum", "water_heater", "humidifier",
}

# Color options
COLORS = [
    "Use YOUR Current Theme Color", "Red", "Green", "Bright Green", "Blue",
    "Yellow", "Orange", "Purple", "Gray", "White", "Black", "Teal",
    "Transparent Background"
]

# Operators
OPERATORS = [
    "equals",
    "not equal to",
    "greater than",
    "less than",
]

OPERATOR_MAP = {
    "equals":       "==",
    "not equal to": "!=",
    "greater than": ">",
    "less than":    "<",
}

# Color mapping to CSS values
COLOR_MAP = {
    "Default":                      "rgb(241, 241, 241)",
    "Red":                          "rgb(190, 11, 11)",
    "Green":                        "rgb(38, 141, 53)",
    "Bright Green":                 "rgb(47, 207, 118)",
    "Blue":                         "rgb(2, 136, 209)",
    "Yellow":                       "rgb(255, 215, 0)",
    "Orange":                       "rgb(255, 140, 0)",
    "Purple":                       "rgb(156, 39, 176)",
    "Gray":                         "rgb(67, 73, 82)",
    "White":                        "rgb(255, 255, 255)",
    "Black":                        "rgb(0, 0, 0)",
    "Teal":                         "rgb(0, 173, 181)",
    "Transparent Background":       "transparent",
    "Use YOUR Current Theme Color": "var(--primary-background-color)",
}
