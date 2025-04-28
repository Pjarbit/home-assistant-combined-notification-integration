# Combined Notifications Card

A custom Lovelace card for Home Assistant that works with the [Combined Notifications Integration](https://github.com/Pjarbit/home-assistant-combined-notifications) to display grouped entity notifications with dynamic styling.

![Combined Notifications Card Demo](media/demo.gif)

## 🚀 Features

- **Auto-styling**: Inherits colors, icons, and text from the integration
- **Dynamic states**: Shows alert or all-clear states based on entity conditions
- **Fully customizable**: Override any visual element directly in the card config
- **Compact & Clear**: Shows only what you need to know at a glance

## 📦 Installation

### HACS Installation (Recommended)

1. Go to the HACS dashboard in Home Assistant
2. Click the three dots menu in the upper right corner
3. Select "Custom repositories"
4. Add this repo:
   ```
   https://github.com/Pjarbit/home-assistant-combined-notifications-card-new
   ```
5. Select "Dashboard" as the repository type
6. Click "ADD"
7. Search for "Combined Notifications Card" in the Dashboard section
8. Click Install
9. Restart Home Assistant

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/Pjarbit/home-assistant-combined-notifications-card-new/releases)
2. Copy the `combined-notifications-card.js` file to your `www/` directory
3. Add the resource to your dashboard:
   ```yaml
   url: /local/combined-notifications-card.js
   type: module
   ```
4. Restart Home Assistant

## ⚙️ Basic Usage

Add the card to your dashboard with this minimal configuration:

```yaml
type: custom:combined-notifications-card
entity: sensor.car_alert_notifications
```

That's it! The card automatically inherits all styling and behavior from the sensor entity created by the Combined Notifications integration.

## 🎨 Customization Options

You can override any default display settings from the sensor using these attributes:

| Attribute | Description | Examples |
|-----------|-------------|----------|
| `header_name` | Custom card title | `Car Alerts`, `Lighting`, `Home Security` |
| `text_all_clear` | Message when all clear | `All OK`, `All Clear`, `Systems Normal` |
| `background_color_all_clear` | Background for normal state | `green`, `blue`, `teal` |
| `background_color_alert` | Background for alert state | `red`, `orange`, `yellow` |
| `icon_all_clear` | Icon for normal state | `mdi:hand-okay`, `mdi:check-circle` |
| `icon_alert` | Icon for alert state | `mdi:alert-circle`, `mdi:alert` |
| `icon_color_all_clear` | Icon color for normal state | `white`, `gray`, `var(--primary-color)` |
| `icon_color_alert` | Icon color for alert state | `yellow`, `red`, `white` |
| `show_details` | Show entity details | `true`, `false` |
| `hide_when_clear` | Hide card when all clear | `true`, `false` |

## 📋 Example Configuration

```yaml
type: custom:combined-notifications-card
entity: sensor.car_alert_notifications
header_name: Car Alerts
text_all_clear: All Systems Normal
background_color_all_clear: green
background_color_alert: red
icon_all_clear: mdi:check-circle
icon_alert: mdi:alert-circle
show_details: true
hide_when_clear: false
```

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

## ⚠️ Troubleshooting

**Common Issues:**
- If the card isn't appearing, check that you've added the JS file to your resources
- Verify that the integration is properly set up and creating sensor entities
- Ensure the entity name in your card configuration matches exactly with the sensor created by the integration
- Check your browser console for any JavaScript errors

## 📚 Related

This card is designed to work with the [Combined Notifications Integration](https://github.com/Pjarbit/home-assistant-combined-notifications). Please install the integration first to create notification group sensors.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Made with ❤️ for the Home Assistant Community

Made with ❤️ for the Home Assistant Community
