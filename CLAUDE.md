# Rules for Claude

## manifest.json — DO NOT EDIT

Never edit `custom_components/combined_notifications/manifest.json` except the `"version"` value. Do not add, remove, rename, reorder or reformat anything else in that file. Home Assistant requires a specific key order (`domain`, `name`, then the rest alphabetically), and changes break the integration.
