# Combined Notifications for Home Assistant

**Combined Notifications** is a custom Home Assistant integration that allows you to group multiple entities into visual notification cards with logic-based triggers. It's user-friendly, fully customizable, and works with your Lovelace dashboards to clearly show alert and all-clear states.

![Combined Notifications in action](https://raw.githubusercontent.com/Pjarbit/home-assistant-combined-notification-integration/main/media/demo.gif)

---

## 🚀 Features

- **Group Multiple Entities**: Monitor any number of entities with flexible trigger conditions
- **Visual Status**: Displays "All Clear" or triggered alerts automatically
- **Fully Customizable**: Color-coded backgrounds, icon colors, text colors, card and icon sizes
- **Entity Creation**: Each group creates its own sensor entity
- **User-Friendly**: Configure directly from the UI — no YAML editing required

## 📦 Installation

### Via HACS (Recommended)

1. Go to **HACS > Integrations > Custom Repositories**
2. Paste this URL:
   ```
   https://github.com/Pjarbit/home-assistant-combined-notification-integration
   ```
3. Choose **Integration** category and click **Add**
4. Find and install **Combined Notifications**
5. Restart Home Assistant

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/Pjarbit/home-assistant-combined-notification-integration/releases)
2. Unzip and copy the `combined_notifications` folder to your `custom_components` directory
3. Restart Home Assistant

## ⚙️ How to Use

### Step 1: Add the Integration in Home Assistant
1. Go to **Settings > Devices & Services > Add Integration**
2. Search for **"Combined Notifications"**
3. Click to launch the setup wizard

### Step 2: Use the Setup Wizard
The wizard walks you through creating a notification group:

1. **Name the group**
   - This becomes your sensor name (e.g., `sensor.car_alert_notifications`)
   - Sensor names use lowercase letters and underscores instead of spaces

2. **Add one or more entities**
   - Select any sensor, binary_sensor, lock, light, etc.

3. **Set a TRIGGERING condition for each entity**
   - Specify what state or value indicates an alert
   - Examples: `!= locked`, `< 65`, `== on`, `== motion_detected`

4. **Customize appearance**
   - Select background color, text color, icon, icon color, card height, card width, and icon size

5. **Set an All-Clear message (optional)**
   - Examples: "All OK", "All Clear", "System Normal"

Each group creates its own sensor entity, like: `sensor.windows_open_notifications`.

## 🖼️ Companion Card

This integration pairs with the [Combined Notifications Card](https://github.com/Pjarbit/combined-notifications-card) for displaying your notification groups on Lovelace dashboards.

```yaml
type: custom:combined-notifications-card
entity: sensor.car_alert_notifications
```

See the [card repository](https://github.com/Pjarbit/combined-notifications-card) for full card configuration details.

## 🧠 How It Works

### Behavior
When any condition is triggered:
- Card background changes to your alert color
- Displays your alert icon
- Shows a list of unmet conditions

When all conditions are normal:
- Card switches to your all-clear color
- Displays your custom "All Clear" message
- Shows your all-clear icon

### Usage Ideas
Create separate notification groups for different areas of your home:
- Security alerts (doors, windows, motion)
- Device status notifications (battery levels, connectivity)
- System warnings (updates needed, errors)
- Weather alerts (temperature, humidity, wind)

### Trigger Examples
You can set various conditions for when notifications should trigger:
- State-based: `!= locked`, `== open`, `== on`
- Numeric: `< 65`, `> 80`, `<= 20`
- Text: `== motion_detected`, `== unavailable`

## 🧼 Uninstallation

1. Go to **Settings > Devices & Services**
2. Remove the Combined Notifications integration
3. Restart Home Assistant

## 🤝 Contributing

Contributions welcome! Fork this repo and submit a PR.

## ⚠️ Troubleshooting

**Common Issues:**
- Restart HA if sensors don't appear after setup
- Check that sensor names follow HA conventions
- View logs under **Settings > System > Logs** for errors

## 📜 License

This project is licensed under the MIT License — see the LICENSE file for details.

---

Made with ❤️ for the Home Assistant Community
