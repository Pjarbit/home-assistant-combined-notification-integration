# Combined Notifications Integration

![Combined Notifications Demo](https://raw.githubusercontent.com/Pjarbit/home-assistant-combined-notifications-card-new/main/media/demo.gif)

The **Combined Notifications Integration** for Home Assistant allows you to monitor and group multiple entity conditions into a single backend sensor. This sensor can be used in Lovelace dashboards, automations, or paired with the [Combined Notifications Card](https://github.com/Pjarbit/home-assistant-combined-notifications-card-new) for visual display.

---

## 📦 Installation

### HACS (Recommended)

1. Open **HACS** in Home Assistant
2. Click the three-dot menu (top right) → **Custom Repositories**
3. Add this repository:

   ```
   https://github.com/Pjarbit/home-assistant-combined-notification-integration
   ```
4. Set category to: **Integration**
5. Click **Add**
6. Search for **Combined Notifications Integration** in HACS Integrations
7. Click **Install**
8. Restart Home Assistant if prompted
9. Go to **Settings → Devices & Services → Add Integration** and search for **Combined Notifications**

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/Pjarbit/home-assistant-combined-notification-integration/releases)
2. Copy the `combined_notifications` folder into `config/custom_components/`
3. Restart Home Assistant
4. Add the integration via **Settings → Devices & Services**

---

## ⚙️ Configuration

After installation:

1. Go to **Settings → Devices & Services → Combined Notifications → Configure**
2. Define your sensor name
3. Add any number of conditions
4. Customize appearance and behavior
5. Save and use the created sensor entity in dashboards or automations

To modify sensor settings (delete an entity, add a new entity, change triggers, or update colors/icons), simply go to **Settings → Devices & Services → Combined Notifications → Configure**, select your sensor, and make changes directly from the built-in editor. No YAML or restart required.

---

## 🖼️ UI Screenshots

### Main Menu

Navigate sections for conditions and visual settings:

![Main Menu](https://raw.githubusercontent.com/Pjarbit/home-assistant-combined-notification-integration/main/media/optionsmain.jpg)

### Appearance Settings

Customize text, icons, and colors:

![Appearance Settings](https://raw.githubusercontent.com/Pjarbit/home-assistant-combined-notification-integration/main/media/Configurationattributes.jpg)

### Conditions Editor

List, edit, or add monitored entity conditions:

![Conditions Editor](https://raw.githubusercontent.com/Pjarbit/home-assistant-combined-notification-integration/main/media/conditionmenu.jpg)

---

## 🔍 Sensor Behavior

The integration creates a sensor (e.g., `sensor.home_status`) that reports:

* **"ALL CLEAR"** (or custom message) if all conditions are met
* **Comma-separated list** of unmet condition labels otherwise

It also exposes additional styling data for use in frontend cards.

### Example: All Clear

```yaml
state: "ALL CLEAR"
attributes:
  icon: mdi:check-circle
  color: green
  text_color: white
  icon_color: gray
```

### Example: Alert

```yaml
state: "Garage Open, Door Unlocked"
attributes:
  icon: mdi:alert-circle
  color: red
  text_color: black
  icon_color: yellow
```

---

## 🔧 Sensor Appearance Attributes (Modifiable via YAML or UI)

These attributes are configurable in the integration's UI and exposed in the sensor entity for use in dashboards and frontend cards.

### ✅ All-Clear State Attributes

| Attribute Key                | Description                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| `text_all_clear`             | Text shown when all conditions are met                        |
| `icon_all_clear`             | Icon used when in all-clear state (`mdi:*`)                   |
| `background_color_all_clear` | Background color when all is clear (e.g., `green`, `#00ff00`) |
| `text_color_all_clear`       | Text color in all-clear state                                 |
| `icon_color_all_clear`       | Icon color in all-clear state                                 |
| `hide_title`                 | If `true`, hides the title/header in clear state              |

### ⚠️ Alert State Attributes

| Attribute Key            | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `icon_alert`             | Icon used when one or more conditions are unmet (`mdi:*`) |
| `background_color_alert` | Background color in alert state                           |
| `text_color_alert`       | Text color in alert state                                 |
| `icon_color_alert`       | Icon color in alert state                                 |
| `hide_title_alert`       | If `true`, hides the title/header in alert state          |

These values are stored in the sensor’s attributes and can be used in custom cards or templates via `state_attr()`.

---

## ✨ Version 3.0 Highlights

* Live UI editing (no restart required)
* Restructured settings layout for clarity
* New: optional hidden alert titles for minimal displays

---

## 🔗 Related Projects

* [Combined Notifications Card](https://github.com/Pjarbit/home-assistant-combined-notifications-card-new) — Lovelace frontend card designed to visualize this sensor

---

## 📄 License

MIT License
See `LICENSE` file for details
