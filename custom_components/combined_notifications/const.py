"""Constants for the Combined Notifications integration."""

DOMAIN = "combined_notifications"

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
    "Teal":                         "rgb(0, 128, 128)",
    "Transparent Background":       "transparent",
    "Use YOUR Current Theme Color": "var(--primary-background-color)",
}
