# Combined Notifications Integration

A custom integration for Home Assistant that creates sensor entities which group together multiple notification conditions with customizable styling and alert states.

## 🚀 Features

- **Entity Grouping**: Monitor multiple entities with a single notification sensor
- **Condition-based Alerts**: Define custom conditions with operators (equals, not equals, greater than, less than)
- **Customizable Appearance**: Set colors, icons, and other visual elements
- **Works with Combined Notifications Card**: Provides a seamless visual display when paired with the custom card

## 📦 Installation

### HACS Installation (Recommended)

1. Go to the HACS dashboard in Home Assistant
2. Click the three dots menu in the upper right corner
3. Select "Custom repositories"
4. Add this repo URL:
   ```
   https://github.com/Pjarbit/home-assistant-combined-notifications
   ```
5. Select "Integration" as the repository type
6. Click "ADD"
7. Search for "Combined Notifications" in the Integrations section
8. Click Install
9. Restart Home Assistant
10. Go to **Settings > Devices & Services > Add Integration** and search for "Combined Notifications"

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/Pjarbit/home-assistant-combined-notifications/releases)
2. Create a folder named `combined_notifications` in your `config/custom_components/` directory
3. Extract the contents of the release into this folder
4. Restart Home Assistant
5. Go to **Settings > Devices & Services > Add Integration** and search for "Combined Notifications"

## ⚙️ Configuration

The integration is configured via a user-friendly UI:

1. After adding the integration, provide a name for your notification group
2. Configure appearance settings (colors, icons)
3. Add condition entities to monitor
4. For each entity, specify:
   - The entity ID to monitor
   - The condition operator (equals, not equals, greater than, less than)
   - The trigger value
   - A friendly name (optional)

## 🔄 Using with Combined Notifications Card

For the best experience, use this integration with the [Combined Notifications Card](https://github.com/Pjarbit/home-assistant-combined-notifications-card-new):

1. Install both the integration and the card via HACS
2. Create notification groups via the integration
3. Add the card to your dashboard with the sensor entity:

```yaml
type: custom:combined-notifications-card
entity: sensor.your_notification_group
```

## 📋 Example Use Cases

- **Home Security**: Monitor door/window sensors, motion detectors, and alarm states
- **Device Status**: Track battery levels, connectivity issues, and offline devices
- **System Alerts**: Monitor disk space, CPU usage, or temperature sensors
- **Home Maintenance**: Track filter replacements, water leaks, or other maintenance needs

## ⚠️ Troubleshooting

**Common Issues:**
- If entities aren't updating properly, check that they are providing state changes
- Verify that condition operators and trigger values match your expectations
- For numeric comparisons, ensure values are properly formatted
- Restart Home Assistant after making significant changes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Made with ❤️ for the Home Assistant Community
