# Combined Notifications for Home Assistant — v8.x.x

![Combined Notifications](media/logonew.png)

[![Demo](media/demo.gif)](media/demo.gif)

**Monitor and group multiple entity conditions — all on ONE SENSOR & ONE CARD. No YAML editing required.**

Hundreds of conditions can be monitored with no slowdown or lagging in your frontend dashboard.

Combined Notifications monitors the entities you choose and alerts you when something needs attention — with a count of exactly how many are at fault.

- 3 lights left on: **Bathroom Light, Kitchen Light, Garage Light** — count: 3
- Door left unlocked: **Kitchen Doorwall Unlocked** — count: 1
- Battery critical: **Back Door Sensor 12%** — count: 1

No entity IDs. Just the **custom names you** gave your devices. All on **one sensor, and one card**.

*⚠️ Card-mod users — see below.*

---

## 📋 Table of Contents

- [Features and What's New in Version 8.x.x](#-features-and-whats-new-in-version-8xx)
- [What's New in Version 8.x.x](#-features-and-whats-new-in-version-8xx)
- [Upgrading from v4](#️-upgrading-from-v4)
- [Installation](#-installation)
- [Setup](#️-setup)
- [Configuration Panel](#️-configuration-panel)
  - [General Tab](#general-tab)
  - [Conditions Tab](#conditions-tab--overview)
  - [Individual Conditions](#individual-conditions--expanded)
  - [Dynamic Labels — Live Values in Your Alerts](#-dynamic-labels--live-values-in-your-alerts)
  - [Smart Groups](#smart-groups--expanded)
  - [Attributes Sensor Option](#-attributes-sensor-option)
- [Sensor Behavior](#-sensor-behavior)
- [Alert Count](#-alert-count)
- [Automations — One Sensor, One Trigger, Unlimited Actions](#-automations--one-sensor-one-trigger-unlimited-actions)
  - [Automation 1 — First Alert](#automation-1--first-alert)
  - [Automation 2 — Additional Alerts (Increasing Number)](#automation-2--additional-alerts-increasing-number)
  - [Automation 3 — All Clear](#automation-3--all-clear-count-drops-to-0)
- [Dashboard Cards](#️-dashboard-cards)
  - [1. Basic — Hardcoded Colors](#1-basic-card--hardcoded-colors-overrides-the-integrated-sensor-styling)
  - [2. Basic — Integration Colors](#2-basic--card-that-uses-the-integration-colors-and-icons)
  - [3. Advanced — Integration Colors with card-mod](#3-advanced--card-with-integration-colors-with-card-mod-and-advanced-styling)
- [Alert Ticker Card Pairing](#-alert-ticker-card-pairing)
- [Combined Notifications vs Alert Ticker](#-combined-notifications-vs-alert-ticker)
- [Troubleshooting](#-troubleshooting)
  - [Card-Mod Compatibility — Blank Screen Conflict](#card-mod-compatibility--blank-screen-conflict)
- [A Note from the Developer](#-a-note-from-the-developer)
- [Removal](#️-removal)
- [License](#-license)
- [Addendum — Attribute Mode Card & Automation Examples](#️-attribute-mode-users-only--dashboard-cards--automations)

---

## ✅ Features and What's New in Version 8.x.x

**Version 8.x.x — Dynamic Labels.** Condition labels can now pull live sensor data into your alerts using Jinja2 templates — show the actual lightning distance, battery percentage, or package count right in the alert text. See **[Dynamic Labels](#-dynamic-labels--live-values-in-your-alerts)** below.

**Version 7.x.x — Rebuilt from the ground up with all new features and functions**

- Monitor unlimited entities with flexible alert conditions
- Individual conditions — monitor specific entities one at a time
- Smart Groups — bulk-add entities by keyword (e.g. all `door`, all `battery`, all `light`)
- "AND" conditions — alert only when multiple requirements are met simultaneously
- Pause conditions without deleting them
- Automatic Alert COUNT sensor created alongside each notification sensor
- Fully configured from the UI — no YAML required
- Each sensor outputs a live list of active alert names, or blank when all clear
- All new configuration UI — everything is visual, **no YAML required** 🆕
- **Live Sensor State** shown right in the panel — no more hunting Developer Tools to figure out if your sensor says `open`, `Open`, `true`, or `1` 🆕
- Smart Groups — type a keyword and bulk add every matching entity 🆕
- "AND" conditions — is the car unlocked AND not in the garage? Is the back door open AND nobody is home? Now you can get an alert when both conditions meet your alert needs 🆕
- Pause conditions without deleting them 🆕
- **Dynamic Labels** — custom alert status lines that pull in live sensor data using Jinja2 templates. Instead of a static "Lightning Detected," show **"Lightning 5 Miles North"** with the real distance and direction 🆕
- **Alert Count** sensor created automatically alongside every sensor you make 🆕
- Still ONE sensor, ONE card 🆕

### 🔢 Attributes Sensor Option

There is a subset of users who have a lot of entities that will push the limits of Home Assistant's 255 character limit on sensor data. For those outlier cases, we now have a toggle that will move all sensor data to attributes that don't have the 255 character limit.

If you are a standard user, do not select it. If you are a power user with many entities that are in alert status and need to get around Home Assistant's character limit, this is for you. You will have to change your cards and automations to reference the attribute and not the sensor state directly.

**When enabled:**
- Sensor state becomes `on` (alerting) or `off` (clear)
- Full alert list is available as `alert_list` attribute — a Python list with no character limit
- To enable: Settings → Integrations → Combined Notifications → gear icon → check **Enable attribute mode**

**Template example for cards and automations:**
```yaml
# Get the full alert list from attributes
{{ state_attr('sensor.YOUR_SENSOR_NAME', 'alert_list') | join(', ') }}
```

> ⚠️ **BREAKING CHANGE:** If you enable Attribute Mode, your existing dashboard cards and automations **will break**. You must update them to reference `alert_list` attribute instead of the sensor state directly. Complete card and automation examples are provided in the **[Addendum — Attribute Mode Examples](#️-attribute-mode-users-only--dashboard-cards--automations)** at the bottom of this README. **Changing an existing sensor from standard to attribute mode or back will take effect immediately after saving — no Home Assistant restart required.**

---

## ⬆️ Upgrading from v4

Moving from v4 should be seamless. Your existing sensors should carry over to the new version without any issues.

Use caution before upgrading. Going back to v4 will not be easy. This upgrade is not downgradable without rebuilding all your sensors from scratch. Make a backup of your Home Assistant configuration before updating, just in case you want to go back.

---

## 📦 Installation

1. Open **HACS** in Home Assistant
2. Go to **Integrations**
3. Search for **Combined Notifications**
4. Click **Download**
5. Restart Home Assistant
6. Go to **Settings → Devices & Services → Add Integration** and search for **Combined Notifications**

---

## ⚙️ Setup

1. Go to **Settings → Devices & Services → Combined Notifications → Configure**
2. Define your sensor name
3. Add conditions
4. Customize appearance and behavior
5. Save

To modify settings later — add/delete entities, change triggers, update colors/icons — go to **Settings → Devices & Services → Combined Notifications → Configure**. No YAML or restart required.

> Sensor names must use lowercase letters and underscores only — no spaces, no capitals.
> Example: `sensor.YOUR_SENSOR_NAME`

### Make Your Dashboard Card

a. Go to your dashboard and add a manual card

b. Copy the YAML of the card type you like from below

c. Paste it into the manual card box

d. Change the sensor name. That's it — Enjoy!

---

## 🖥️ Configuration Panel

### General Tab

![General Tab](media/01_general_tab.png)

See the image above for all settings. If the panel does not display after selecting Configure, refresh your browser:
**PC:** `Ctrl+Shift+R` · **Tablet:** Pull down from top · **Mac:** `Cmd+R` or `Cmd+Shift+R`

If the window does not close after saving, close the browser window.

---

### Conditions Tab — Overview

The Conditions tab shows all monitored conditions at a glance. Badge colors indicate conditions, entities, paused, and alert counts — see image below.

![Conditions Overview](media/02_conditions_overview.png)

---

### Individual Conditions — Expanded

Click any condition to expand it and configure the entity, alert rule, label, and optional AND condition.

![Individual Condition Expanded](media/03_individual_condition.png)

Look at the configuration panel — it shows the current state of your entity right there. That should give you a strong indication of exactly what value to use.

Alert Value: `""` = blank. Other values do NOT use quotes.

---

### ⚡ Dynamic Labels — Live Values in Your Alerts

Normally a condition's label is fixed text — "Lightning Detected," "Front Door Open." **Dynamic Labels** let that label pull in live data from your sensors at the moment the alert fires, using Jinja2 templates.

Expand any individual condition and toggle on **Use Jinja2 template for label**. Two fields appear:

- **Jinja2 Template** — the template that renders your live alert text. Multiple lines are supported.
- **Fallback Label** — plain text shown if the template hits an error or a sensor is unavailable.

When the toggle is on, the plain label field is disabled — the template takes over.

#### Example — Lightning distance and direction

Using the Blitzortung integration, this condition alerts when lightning strikes within 10 miles and shows exactly how far and which direction:

**Condition:** `sensor.home_lightning_distance` · less than · `10`

**Template:**

```jinja2
{% set dirs = ['North','Northeast','East','Southeast','South','Southwest','West','Northwest'] %}
{% set mi = states('sensor.home_lightning_distance') | float | round(0, 'ceil') | int %}
Lightning {{ mi }} Mile{{ 's' if mi != 1 else '' }} {{ dirs[(((states('sensor.home_lightning_azimuth') | float) + 22.5) // 45) | int % 8] }}
```

The template field accepts multiple lines, so you can format it like this for readability — or paste it all on one line. Both render identically.

**Fallback:** `Lightning Detected`

This renders **"Lightning 5 Miles North"**, handles the singular "1 Mile," rounds up so it never shows "0 Miles," and converts the azimuth degrees into a compass direction. When the storm passes and the distance sensor returns to `unknown`, the alert clears on its own.

#### Other ideas

- Battery: `Phone battery low: {{ states('sensor.phone_battery') }}%`
- Packages: `{{ states('input_number.package_count_front') | int }} packages at the front door`
- Any numeric sensor can contribute its real value to the alert text.

> ⚠️ **Heads up on the 255-character limit:** Dynamic Labels produce longer alert text than static labels. If you use several at once, the combined sensor state can hit Home Assistant's 255-character limit. Pair Dynamic Labels with **[Attribute Mode](#-attributes-sensor-option)** to move the full alert list into an attribute with no length limit.

---

### Smart Groups — Expanded

Smart Groups bulk-add every entity matching a keyword. Run the configuration panel after adding new devices to include them in an existing group.

![Smart Group Expanded](media/04_smart_group.png)

Each entity in a Smart Group has a **Custom Label** field. Use this to give each entity a friendly name that displays on your card when it alerts. Instead of seeing `binary_sensor.garage_door_contact`, your card will show **Garage Door Open** — whatever you type in the label field.

All entities in a Smart Group must share the same alert value (e.g. all `on/off` or all `open/closed`). Entities with different value types must be in separate groups.

Use **Exclude All** as a starting point, then toggle on only the entities you want monitored.

---

## 🔍 Sensor Behavior

The sensor reports a comma-separated list of unmet condition labels when alerting, or your all-clear text when everything is fine. It also exposes styling attributes that cards can read directly.

#### All Clear

```yaml
state: "ALL CLEAR"
attributes:
  icon: mdi:check-circle
  color: green
  text_color: white
  icon_color: gray
```

#### Alert

```yaml
state: "Garage Open, Door Unlocked"
attributes:
  icon: mdi:alert-circle
  color: red
  text_color: black
  icon_color: yellow
```

---

## 🔢 Alert Count

For each sensor you create (e.g. `sensor.YOUR_SENSOR_NAME`), an **Alert Count** sensor is automatically generated (e.g. `sensor.YOUR_SENSOR_FAULT_COUNT`) that displays the number of active alerts as a simple number. Perfect for badges on light and entity cards.

#### Example Card with Count Badge

```yaml
type: custom:mushroom-light-card
entity: light.YOUR_LIGHT_GROUP
name: Office Lights
icon: mdi:lightbulb
icon_color: yellow
badge_icon: |
  {% if states('sensor.YOUR_SENSOR_FAULT_COUNT')|int > 0 %}
  mdi:numeric-{{ states('sensor.YOUR_SENSOR_FAULT_COUNT') }}
  {% endif %}
```

#### Example Card with All Off When Count is Zero

```yaml
type: custom:mushroom-light-card
entity: light.YOUR_LIGHT_GROUP
name: Office Lights
secondary_info: |
  {% if states('sensor.YOUR_SENSOR_FAULT_COUNT')|int == 0 %}
  All Off
  {% endif %}
icon: mdi:lightbulb
```

#### Example Card with Badge and List of Active Lights

```yaml
type: custom:mushroom-light-card
entity: light.YOUR_LIGHT_GROUP
name: Office Lights
secondary_info: |
  {{ state_attr('sensor.YOUR_SENSOR_NAME', 'unmet_conditions')|join(', ') if state_attr('sensor.YOUR_SENSOR_NAME', 'unmet_conditions') }}
icon: mdi:lightbulb
icon_color: yellow
badge_icon: |
  {% if states('sensor.YOUR_SENSOR_FAULT_COUNT')|int > 0 %}
  mdi:numeric-{{ states('sensor.YOUR_SENSOR_FAULT_COUNT') }}
  {% endif %}
```

---

## 🤖 Automations — One Sensor, One Trigger, Unlimited Actions

Combined Notifications is a real Home Assistant sensor. That means one automation can handle everything — send a text, flash a light, trigger an alarm, make an announcement. Not 50 automations. One.

Use `sensor.YOUR_SENSOR_FAULT_COUNT` as your trigger. When the count goes up, something new is alerting. When it hits zero, everything is clear.

### Automation 1 — First Alert

```yaml
alias: Household Sensors — First Alert
trigger:
  - platform: state
    entity_id: sensor.YOUR_SENSOR_FAULT_COUNT
    from: "0"
condition: []
action:
  # Fill in your action — examples: notify.mobile_app_your_phone, light.turn_on, alarm_control_panel.alarm_trigger
  - action: notify.mobile_app_your_phone
    data:
      title: "Combined Notifications Alert"
      message: "{{ states('sensor.YOUR_SENSOR_NAME') }}"
```

### Automation 2 — Additional Alerts (Increasing Number)

```yaml
alias: Household Sensors — Additional Alerts
trigger:
  - platform: state
    entity_id: sensor.YOUR_SENSOR_FAULT_COUNT
condition:
  - condition: template
    value_template: >
      {{ trigger.to_state.state | int > trigger.from_state.state | int
         and trigger.from_state.state | int > 0 }}
action:
  # Fill in your action — examples: notify.mobile_app_your_phone, light.turn_on, alarm_control_panel.alarm_trigger
  - action: notify.mobile_app_your_phone
    data:
      title: "Combined Notifications Alert"
      message: "{{ states('sensor.YOUR_SENSOR_NAME') }}"
```

### Automation 3 — All Clear (Count drops to 0)

```yaml
alias: Household Sensors — All Clear
trigger:
  - platform: state
    entity_id: sensor.YOUR_SENSOR_FAULT_COUNT
    to: "0"
condition: []
action:
  # Fill in your action — examples: notify.mobile_app_your_phone, light.turn_on, alarm_control_panel.alarm_trigger
  - action: notify.mobile_app_your_phone
    data:
      title: "Combined Notifications All Clear"
      message: "Everything is back to normal."
```

Replace `sensor.YOUR_SENSOR_FAULT_COUNT` and `sensor.YOUR_SENSOR_NAME` with your actual sensor names. Replace `notify.mobile_app_your_phone` with your notify service. The automation or dashboard card is on you. The monitoring and single sensor with all entities is on the integration.

## 🖼️ Dashboard Cards

There is a Combined Notifications Card available in HACS, but unfortunately I can't recommend it. There are other cards that are better (listed below) or you can simply use the Alert Ticker Cards if you like the styling.

Personally, I use the cards listed below. For my use, the alert ticker cards are too distracting and don't fit with the look of my dashboards. Styling is a personal decision. Pick what you like, the decision is yours.

To add any of these cards to your dashboard:

1. Edit your dashboard
2. Click **Add Card**
3. Select **Manual**
4. Paste the code
5. Change `sensor.YOUR_SENSOR_NAME` to your Combined Notifications sensor
6. Click **Save**

---

### 1. Basic Card — Hardcoded Colors (Overrides the integrated sensor styling)

Simple card with colors hardcoded directly in the YAML. Change the colors to match your dashboard. The only lines that need to change — replace `sensor.YOUR_SENSOR_NAME` with your sensor and change the color values in the yaml code to match your preferences.

```yaml
type: custom:button-card
entity: sensor.YOUR_SENSOR_NAME
name: NOTIFICATIONS
show_name: true
show_icon: true
show_state: false
styles:
  card:
    - background-color: >
        [[[ if (entity.state !== "") { return "#c80404"; } else { return
        "rgba(67, 73, 82, 1)"; } ]]]
    - border-radius: 10px
    - padding: 6px 10px 10px 10px
    - color: rgb(255, 255, 255)
    - white-space: normal
    - font-size: 20px
  name:
    - font-weight: bold
    - text-align: center
    - font-size: 23px
    - margin-top: 0
  label:
    - white-space: normal
    - display: block
    - max-width: 100%
    - padding-top: 5px
    - text-align: center
  icon:
    - color: >
        [[[ if (entity.state === "") { return "rgb(38, 141, 53)"; } else {
        return "rgb(255, 255, 255)"; } ]]]
    - width: 70px
    - height: 70px
    - margin: 5px 0
icon: >
  [[[ if (entity.state !== "") { return "mdi:alert-circle"; } else { return
  "mdi:hand-okay"; } ]]]
show_label: true
label: >
  [[[ if (entity.state !== "") { return entity.state; } else { return "All
  CLEAR"; } ]]]
tap_action:
  action: none
hold_action:
  action: none
```

---

### 2. Basic — Card that uses the Integration Colors and Icons

Pulls colors and icons directly from your Combined Notifications sensor — no hardcoded values needed. Change your colors and icons in the integration and the card updates automatically. Only one line needs to change — replace `sensor.YOUR_SENSOR_NAME` with your sensor.

```yaml
type: custom:button-card
entity: sensor.YOUR_SENSOR_NAME
name: NOTIFICATIONS
show_name: true
show_icon: true
show_state: false
styles:
  card:
    - background-color: >
        [[[ if (entity.state !== "") { return entity.attributes.color_alert; }
        else { return entity.attributes.color_clear; } ]]]
    - border-radius: 10px
    - padding: 6px 10px 10px 10px
    - color: >
        [[[ if (entity.state === "") { return entity.attributes.text_color_clear; }
        else { return entity.attributes.text_color_alert; } ]]]
    - white-space: normal
    - font-size: 20px
  name:
    - font-weight: bold
    - text-align: center
    - font-size: 23px
    - margin-top: 0
  label:
    - white-space: normal
    - display: block
    - max-width: 100%
    - padding-top: 5px
    - text-align: center
  icon:
    - color: >
        [[[ if (entity.state === "") { return entity.attributes.icon_color_clear; }
        else { return entity.attributes.icon_color_alert; } ]]]
    - width: 70px
    - height: 70px
    - margin: 5px 0
icon: >
  [[[ if (entity.state !== "") { return entity.attributes.icon_alert; } else {
  return entity.attributes.icon_clear; } ]]]
show_label: true
label: >
  [[[ if (entity.state !== "") { return entity.state; } else { return
  entity.attributes.text_all_clear; } ]]]
tap_action:
  action: none
hold_action:
  action: none
```

---

### 3. Advanced — Card with Integration Colors with card-mod and advanced styling

![All Clear](media/card_all_clear.png)
![Alert](media/card_alert.png)

This is the version I use. Requires [button-card](https://github.com/custom-cards/button-card) and [card-mod](https://github.com/thomasloven/lovelace-card-mod). The card-mod section adds a light reflection effect for a polished appearance.

Only one line needs to change — replace `sensor.YOUR_SENSOR_NAME` with your sensor. Paste into a Manual card in your dashboard.

```yaml
type: custom:button-card
entity: sensor.YOUR_SENSOR_NAME
name: NOTIFICATIONS
show_name: true
show_icon: true
show_state: false
styles:
  card:
    - background-color: >
        [[[ if (!entity.attributes.is_clear) { return
        entity.attributes.color_alert; } else { return
        entity.attributes.color_clear; } ]]]
    - border-radius: 16px !important
    - box-shadow: >
        12px 12px 24px rgba(0, 0, 0, 0.5), -4px -4px 8px rgba(255, 255, 255,
        0.1), inset -4px -4px 8px rgba(0, 0, 0, 0.2), inset 4px 4px 8px
        rgba(255, 255, 255, 0.2) !important
    - overflow: hidden !important
    - padding: 6px 10px 10px 10px !important
    - color: >
        [[[ if (!entity.attributes.is_clear) { return
        entity.attributes.text_color_alert; } else { return
        entity.attributes.text_color_clear; } ]]]
    - white-space: normal
    - position: relative !important
    - font-size: 20px
  name:
    - font-weight: bold
    - text-align: center
    - font-size: 23px
    - margin-top: 0
  label:
    - white-space: normal
    - display: block
    - max-width: 100%
    - padding-top: 5px
    - text-align: center
  icon:
    - color: >
        [[[ if (!entity.attributes.is_clear) { return
        entity.attributes.icon_color_alert; } else { return
        entity.attributes.icon_color_clear; } ]]]
    - width: 70px
    - height: 70px
    - margin: 5px 0
icon: >
  [[[ if (!entity.attributes.is_clear) { return entity.attributes.icon_alert; }
  else { return entity.attributes.icon_clear; } ]]]
show_label: true
label: >
  [[[ if (!entity.attributes.is_clear) { return entity.state; } else { return
  entity.attributes.text_all_clear; } ]]]
tap_action:
  action: none
hold_action:
  action: none
card_mod:
  style: |
    ha-card::after {
      content: '' !important;
      position: absolute !important;
      width: 100px !important;
      height: 100% !important;
      background: linear-gradient(
        to right,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.15) 50%,
        rgba(255, 255, 255, 0) 100%
      ) !important;
      transform: skewX(-15deg) translateX(50px) !important;
      top: 0 !important;
      left: -20px !important;
      z-index: 1 !important;
    }
```

---

## 🔔 Alert Ticker Card Pairing

The [Alert Ticker Card](https://github.com/djdevil/AlertTicker-Card) is a complete alert design card system with unique dashboard card styling and functions.

If you have just a few alerts to watch you can avoid Combined Notifications completely and use Alert Ticker alone. It will work well. If you have many alerts and like the Alert Ticker styling, pairing this integration with Alert Ticker cards is your best option. A marriage of Combined Notifications backend processing and sensor entities with the frontend of Alert Ticker Cards.

```yaml
type: custom:alert-ticker-card
cycle_interval: 5
show_when_clear: false
alerts:
  - entity: sensor.YOUR_SENSOR_NAME
    operator: "!="
    state: ""
    message: Active Alerts
    secondary_entity: sensor.YOUR_SENSOR_NAME
    priority: 1
    theme: emergency
    icon: 🚨
```

The `secondary_entity` field displays the live sensor state — your active condition list — as a second line below the message.

---

## ⚡ Combined Notifications vs Alert Ticker

This integration creates actual Home Assistant sensors that keep track of which of your entities are alerting and what they are. Because it's a sensor, you can do anything with it:

1. Send a text when the garage is left open
2. Flash a light when a door is unlocked
3. Make an announcement when a window is open
4. Show it on any dashboard card styled exactly how you want

Alert Ticker is a great addition to HA. It has a ton of card styles. Because Combined Notifications is a sensor, you can easily use it with Alert Ticker cards if you wish. But here's why Combined Notifications is different and has a real advantage:

1. All calculations happen in the background, not in your Lovelace frontend
2. Monitor 100+ entities with zero performance hit. Try that with Alert Ticker!
3. Too many dashboard cards doing this frontend work can make your dashboard nearly unusable. I know, I had over 100 conditional cards before building this. My dashboard was almost unusably slow. That was the reason this integration exists
4. Sensor state survives browser refreshes and dashboard reloads without a performance hit
5. Home Assistant history and logging are handled automatically

---

## 🔧 Troubleshooting

### Blank Screen — Compatibility Mode

If your configuration panel appears blank after clicking Configure, this is usually caused by a conflict with the **card-mod** frontend extension. Close the blank panel, go to **Settings → Integrations**, find **Combined Notifications**, and click the **gear icon** on the integration card. You'll see a checkbox labeled **"Enable compatibility mode (HTML panel)"** — check it and click **Open Configuration Panel**. Home Assistant will automatically reload the integration and switch to an alternate panel that works on all systems.

Note: Compatibility mode disables real-time entity status in the panel view only. The integration itself still runs in real time, and a refresh button is available to see live status. All other configuration and functions remain available and unchanged.


### Panel Version Does Not Match After Update

If the version shown in the panel does not match the version you just installed, your browser has cached the old panel. A normal refresh may not fix this — you need to unregister the service worker.

1. Press **F12** to open DevTools
2. Go to **Application → Service Workers**
3. Click **Unregister** next to your Home Assistant URL
4. **Close the browser completely**
5. Reopen the browser and navigate to Home Assistant

> **Note:** Unregistering the service worker and closing the browser completely is the only method confirmed to work consistently. Simply hitting refresh or Shift+Ctrl+R may not work.

> **Cloudflare users:** You may also need to purge the cache from your Cloudflare dashboard under **Caching → Configuration → Purge Everything** after updating.

---

### Sensor State Truncated at 255 Characters

Home Assistant has a hard limit of 255 characters on sensor states. If you monitor a large number of entities with long names, the sensor state may be truncated in the log. The integration continues to function correctly regardless — this is a display limitation only. A workaround is included as of version 7.1.2. It's called the Attribute Display Sensor and a full explanation is above in this readme file with coding examples below in the addendum. Be careful not to confuse the coding of "normal" cards and "attribute coding" cards and automations. The coding is almost the same although one looks for the sensor, the other looks for the attributes of the sensor.

---

### Card-Mod Compatibility — Blank Screen Conflict

Combined Notifications may work with card-mod installed, it may not. Some users will experience a blank screen when opening the configuration panel. Combined Notifications may not be compatible with card-mod's older deprecated code on your system. Card-mod does not play well with current Home Assistant LitElements (design features) that were brought into HA as recent coding protocols.

This is a known conflict between newer integrations and card-mod.

If your configuration panel appears blank after clicking Configure,
  Close the blank panel,
  Go to **Settings → Integrations**,
  find **Combined Notifications**,
  Click the **gear icon** on the integration card.
  You'll see a checkbox labeled **"Enable compatibility mode (HTML panel)"** — check it
  **Hit Save.** Home Assistant will automatically reload the integration and switch to an alternate panel that works on these affected (blank screen) systems.

  **Note:** Compatibility mode disables real time entity status IN THE PANEL VIEW ONLY (The integration is still in real time and there is a new refresh button to see the live status) Every other configuration and function remain available and unchanged.

---

*Special thanks to David Wallis, Kaibob2(github) and Jason Bogart for their hard work, documentation of errors, and beta testing.*

---

## 💬 A Note from the Developer

This integration is free and will always be free. If you find it useful, skip the coffee and give $5 to someone who needs it.

---

## 🗑️ Removal

- Go to **Settings → Devices & Services**
- Find **Combined Notifications** and click **Delete**
- The created sensors will be removed automatically

---

## 📄 License

MIT — see [LICENSE](LICENSE.md) for details.

---

---

## ⚠️ ATTRIBUTE MODE USERS ONLY — Dashboard Cards & Automations

**The following cards and automations are for users who have enabled Attribute Mode only. If you are not using Attribute Mode, use the cards and automations listed above.**

---

---

### Card 1 — Basic — Hardcoded Colors (Attribute Mode)

```yaml
type: custom:button-card
entity: sensor.YOUR_SENSOR_NAME
name: NOTIFICATIONS
show_name: true
show_icon: true
show_state: false
styles:
  card:
    - background-color: >
        [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return "#c80404"; } else { return
        "rgba(67, 73, 82, 1)"; } ]]]
    - border-radius: 10px
    - padding: 6px 10px 10px 10px
    - color: rgb(255, 255, 255)
    - white-space: normal
    - font-size: 20px
  name:
    - font-weight: bold
    - text-align: center
    - font-size: 23px
    - margin-top: 0
  label:
    - white-space: normal
    - display: block
    - max-width: 100%
    - padding-top: 5px
    - text-align: center
  icon:
    - color: >
        [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') === '0') { return "rgb(38, 141, 53)"; } else {
        return "rgb(255, 255, 255)"; } ]]]
    - width: 70px
    - height: 70px
    - margin: 5px 0
icon: >
  [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return "mdi:alert-circle"; } else { return
  "mdi:hand-okay"; } ]]]
show_label: true
label: >
  [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return entity.attributes.alert_list.join(', '); } else { return entity.attributes.text_all_clear; } ]]]
tap_action:
  action: none
hold_action:
  action: none
```

---

### Card 2 — Integration Colors (Attribute Mode)

```yaml
type: custom:button-card
entity: sensor.YOUR_SENSOR_NAME
name: NOTIFICATIONS
show_name: true
show_icon: true
show_state: false
styles:
  card:
    - background-color: >
        [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return entity.attributes.color_alert; }
        else { return entity.attributes.color_clear; } ]]]
    - border-radius: 10px
    - padding: 6px 10px 10px 10px
    - color: >
        [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') === '0') { return entity.attributes.text_color_clear; }
        else { return entity.attributes.text_color_alert; } ]]]
    - white-space: normal
    - font-size: 20px
  name:
    - font-weight: bold
    - text-align: center
    - font-size: 23px
    - margin-top: 0
  label:
    - white-space: normal
    - display: block
    - max-width: 100%
    - padding-top: 5px
    - text-align: center
  icon:
    - color: >
        [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') === '0') { return entity.attributes.icon_color_clear; }
        else { return entity.attributes.icon_color_alert; } ]]]
    - width: 70px
    - height: 70px
    - margin: 5px 0
icon: >
  [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return entity.attributes.icon_alert; } else {
  return entity.attributes.icon_clear; } ]]]
show_label: true
label: >
  [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return entity.attributes.alert_list.join(', '); } else { return entity.attributes.text_all_clear; } ]]]
tap_action:
  action: none
hold_action:
  action: none
```

---

### Card 3 — Advanced Integration Colors with card-mod (Attribute Mode)

```yaml
type: custom:button-card
entity: sensor.YOUR_SENSOR_NAME
name: NOTIFICATIONS
show_name: true
show_icon: true
show_state: false
styles:
  card:
    - background-color: >
        [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return
        entity.attributes.color_alert; } else { return
        entity.attributes.color_clear; } ]]]
    - border-radius: 16px !important
    - box-shadow: >
        12px 12px 24px rgba(0, 0, 0, 0.5), -4px -4px 8px rgba(255, 255, 255,
        0.1), inset -4px -4px 8px rgba(0, 0, 0, 0.2), inset 4px 4px 8px
        rgba(255, 255, 255, 0.2) !important
    - overflow: hidden !important
    - padding: 6px 10px 10px 10px !important
    - color: >
        [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return
        entity.attributes.text_color_alert; } else { return
        entity.attributes.text_color_clear; } ]]]
    - white-space: normal
    - position: relative !important
    - font-size: 20px
  name:
    - font-weight: bold
    - text-align: center
    - font-size: 23px
    - margin-top: 0
  label:
    - white-space: normal
    - display: block
    - max-width: 100%
    - padding-top: 5px
    - text-align: center
  icon:
    - color: >
        [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return
        entity.attributes.icon_color_alert; } else { return
        entity.attributes.icon_color_clear; } ]]]
    - width: 70px
    - height: 70px
    - margin: 5px 0
icon: >
  [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return entity.attributes.icon_alert; }
  else { return entity.attributes.icon_clear; } ]]]
show_label: true
label: >
  [[[ if (states('sensor.YOUR_SENSOR_FAULT_COUNT') !== '0') { return entity.attributes.alert_list.join(', '); } else { return entity.attributes.text_all_clear; } ]]]
tap_action:
  action: none
hold_action:
  action: none
card_mod:
  style: |
    ha-card::after {
      content: '' !important;
      position: absolute !important;
      width: 100px !important;
      height: 100% !important;
      background: linear-gradient(
        to right,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.15) 50%,
        rgba(255, 255, 255, 0) 100%
      ) !important;
      transform: skewX(-15deg) translateX(50px) !important;
      top: 0 !important;
      left: -20px !important;
      z-index: 1 !important;
    }
```

---

## Attribute Mode — Automations

### Automation 1 — First Alert (Attribute Mode)

```yaml
alias: Household Sensors — First Alert (Attribute Mode)
trigger:
  - platform: state
    entity_id: sensor.YOUR_SENSOR_FAULT_COUNT
    from: "0"
condition: []
action:
  # Fill in your action — examples: notify.mobile_app_your_phone, light.turn_on, alarm_control_panel.alarm_trigger
  - action: notify.mobile_app_your_phone
    data:
      title: "Combined Notifications Alert"
      message: "{{ state_attr('sensor.YOUR_SENSOR_NAME', 'alert_list') | join(', ') }}"
```

### Automation 2 — Additional Alerts (Increasing Number) (Attribute Mode)

```yaml
alias: Household Sensors — Additional Alerts (Attribute Mode)
trigger:
  - platform: state
    entity_id: sensor.YOUR_SENSOR_FAULT_COUNT
condition:
  - condition: template
    value_template: >
      {{ trigger.to_state.state | int > trigger.from_state.state | int
         and trigger.from_state.state | int > 0 }}
action:
  # Fill in your action — examples: notify.mobile_app_your_phone, light.turn_on, alarm_control_panel.alarm_trigger
  - action: notify.mobile_app_your_phone
    data:
      title: "Combined Notifications Alert"
      message: "{{ state_attr('sensor.YOUR_SENSOR_NAME', 'alert_list') | join(', ') }}"
```

### Automation 3 — All Clear (Attribute Mode)

```yaml
alias: Household Sensors — All Clear (Attribute Mode)
trigger:
  - platform: state
    entity_id: sensor.YOUR_SENSOR_FAULT_COUNT
    to: "0"
condition: []
action:
  # Fill in your action — examples: notify.mobile_app_your_phone, light.turn_on, alarm_control_panel.alarm_trigger
  - action: notify.mobile_app_your_phone
    data:
      title: "Combined Notifications All Clear"
      message: "{{ state_attr('sensor.YOUR_SENSOR_NAME', 'text_all_clear') }}"
```

---

---
