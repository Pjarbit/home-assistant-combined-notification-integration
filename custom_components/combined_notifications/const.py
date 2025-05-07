"""Constants for the Combined Notifications integration."""

DOMAIN = "combined_notifications"
NOTIFICATION_TEMPLATES_PATH = "notification_templates"

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

# Map friendly operator names to symbols
OPERATOR_MAP = {
    "equals (==)": "==",
    "not equals (!=)": "!=",
    "greater than (>)": ">",
    "less than (<)": "<"
}

# Color mapping for RGB values (or CSS color keywords)
COLOR_MAP = {
    "Red": "rgb(190, 11, 11)",
    "Green": "rgb(19, 161, 14)",
    "Blue": "rgb(2, 136, 209)",
    "Yellow": "rgb(255, 215, 0)",
    "Orange": "rgb(255, 140, 0)",
    "Purple": "rgb(156, 39, 176)",
    "Gray": "rgb(67, 73, 82)",
    "White": "rgb(255, 255, 255)",
    "Black": "rgb(0, 0, 0)",
    "Teal": "rgb(0, 128, 128)",
    "Transparent Background": "transparent"
}
