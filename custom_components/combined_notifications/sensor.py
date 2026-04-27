"""Sensor platform for Combined Notifications."""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity import Entity, EntityCategory
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity_platform import AddEntitiesCallback
import logging
from .const import COLOR_MAP, DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the combined notification sensor from a config entry."""
    name = config_entry.data["name"]
    friendly_sensor_name = config_entry.data.get("friendly_sensor_name", name)
    conditions = config_entry.data.get("conditions", [])
    settings = _build_settings(config_entry.data)

    sensor = CombinedNotificationSensor(
        hass, name, friendly_sensor_name, conditions, settings, config_entry.entry_id
    )
    count_sensor = CombinedNotificationCountSensor(
        hass, name, sensor, config_entry.entry_id
    )
    async_add_entities([sensor, count_sensor], update_before_add=True)
    hass.data.setdefault(DOMAIN, {})[config_entry.entry_id] = sensor


def _build_settings(data: dict) -> dict:
    """Build settings dict from config entry data."""
    return {
        "text_all_clear": data.get("text_all_clear", "ALL CLEAR"),
        "icons": {
            "clear": data.get("icon_all_clear", "mdi:hand-okay"),
            "alert": data.get("icon_alert", "mdi:alert-circle"),
        },
        "colors": {
            "clear": COLOR_MAP.get(data.get("background_color_all_clear"), "rgb(67, 73, 82)"),
            "alert": COLOR_MAP.get(data.get("background_color_alert"), "rgb(190, 11, 11)"),
        },
        "text_colors": {
            "clear": COLOR_MAP.get(data.get("text_color_all_clear", ""), "rgb(47, 207, 118)"),
            "alert": COLOR_MAP.get(data.get("text_color_alert", ""), "rgb(255, 255, 255)"),
        },
        "icon_colors": {
            "clear": COLOR_MAP.get(data.get("icon_color_all_clear", ""), "rgb(47, 207, 118)"),
            "alert": COLOR_MAP.get(data.get("icon_color_alert", ""), "rgb(255, 255, 255)"),
        },
        "hide_title": str(data.get("hide_title", False)).lower() == "true",
        "hide_title_alert": str(data.get("hide_title_alert", False)).lower() == "true",
    }


class CombinedNotificationSensor(Entity):
    """Representation of a Combined Notification sensor."""

    def __init__(
        self,
        hass: HomeAssistant,
        name: str,
        friendly_sensor_name: str,
        conditions: list[dict],
        settings: dict[str, Any],
        entry_id: str,
    ):
        """Initialize the sensor."""
        self._hass = hass
        self._name = name
        self._friendly_sensor_name = friendly_sensor_name
        self._entry_id = entry_id
        self._attr_name = (
            friendly_sensor_name
            if friendly_sensor_name and friendly_sensor_name.strip()
            else name
        )
        self._raw_conditions = conditions
        self._conditions = self._validate_conditions(conditions)
        self._settings = settings
        self._state = settings["text_all_clear"]
        self._unmet = []
        self._unsubscribe_callbacks = []
        self._debounced_update_task = None

        self._attr_has_entity_name = False
        self._attr_should_poll = False
        self._attr_entity_category = EntityCategory.DIAGNOSTIC
        self._attr_icon = settings["icons"]["clear"]

    # ── Condition validation ──────────────────────────────────────────────

    def _validate_conditions(self, conditions: list[dict]) -> list[dict]:
        """Return only conditions with required keys (skip entity_filter — handled at runtime)."""
        valid = []
        for c in conditions:
            if c.get("disabled", False) or c.get("paused", False):
                continue
            if "entity_filter" in c:
                # Smart group — always valid, expanded at runtime
                valid.append(c)
            elif all(k in c for k in ("entity_id", "operator", "trigger_value")):
                valid.append(c)
            else:
                _LOGGER.warning("Skipping malformed condition in %s: %s", self._name, c)
        return valid

    # ── Entity expansion for smart groups ────────────────────────────────

    def _expand_conditions(self) -> list[dict]:
        """
        Expand entity_filter conditions into individual concrete conditions
        by scanning hass.states at runtime. Called on every async_update.
        Individual conditions are returned as-is.
        """
        expanded = []
        for condition in self._conditions:
            if "entity_filter" not in condition:
                # Regular individual condition
                expanded.append(condition)
                continue

            keyword = condition["entity_filter"].lower()
            excluded = set(condition.get("entity_filter_exclude", []))
            operator = condition.get("operator", "==")
            trigger_value = condition.get("trigger_value", "")
            attribute = condition.get("attribute", "")
            and_conditions = condition.get("and_conditions", [])

            for state_obj in self._hass.states.async_all():
                entity_id = state_obj.entity_id
                if entity_id in excluded:
                    continue
                friendly_name = state_obj.attributes.get("friendly_name", entity_id)
                if (
                    keyword in entity_id.lower()
                    or keyword in friendly_name.lower()
                ):
                    label_overrides = condition.get("entity_label_overrides", {})
                    label = label_overrides.get(entity_id) or friendly_name
                    expanded.append({
                        "entity_id": entity_id,
                        "operator": operator,
                        "trigger_value": trigger_value,
                        "attribute": attribute,
                        "name": label,
                        "and_conditions": and_conditions,
                        "_from_filter": True,
                    })

        return expanded

    # ── Properties ───────────────────────────────────────────────────────

    @property
    def name(self) -> str:
        return self._name

    @property
    def unique_id(self) -> str:
        return f"combined_notifications_{self._entry_id}"

    @property
    def state(self) -> str:
        return self._state

    @property
    def icon(self) -> str:
        return (
            self._settings["icons"]["clear"]
            if not self._unmet
            else self._settings["icons"]["alert"]
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "unmet_conditions": self._unmet,
            "number_unmet": len(self._unmet),
            "number_total": len(self._conditions),
            "text_all_clear": self._settings["text_all_clear"],
            "icon_clear": self._settings["icons"]["clear"],
            "icon_alert": self._settings["icons"]["alert"],
            "color_clear": self._settings["colors"]["clear"],
            "color_alert": self._settings["colors"]["alert"],
            "text_color_clear": self._settings["text_colors"]["clear"],
            "text_color_alert": self._settings["text_colors"]["alert"],
            "icon_color_clear": self._settings["icon_colors"]["clear"],
            "icon_color_alert": self._settings["icon_colors"]["alert"],
            "is_clear": not bool(self._unmet),
            "hide_title": self._settings["hide_title"],
            "hide_title_alert": self._settings["hide_title_alert"],
        }

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, self._entry_id)},
            "name": self._name,
            "manufacturer": "Combined Notifications",
            "model": "Virtual Sensor",
        }

    # ── State change listener ─────────────────────────────────────────────

    @callback
    def _state_change_listener(self, event):
        """Handle entity state changes with debouncing."""
        if self._debounced_update_task:
            self._debounced_update_task.cancel()

        async def debounced_update():
            self.async_schedule_update_ha_state(True)
            self._debounced_update_task = None

        self._debounced_update_task = self._hass.async_create_task(
            debounced_update()
        )

    # ── Lifecycle ─────────────────────────────────────────────────────────

    async def async_added_to_hass(self) -> None:
        """Set up listeners when added to HA."""
        await self._subscribe_listeners()

    async def async_will_remove_from_hass(self) -> None:
        """Clean up listeners."""
        self._unsubscribe_all()
        if self._debounced_update_task:
            self._debounced_update_task.cancel()

    async def _subscribe_listeners(self) -> None:
        """Subscribe state change listeners for all tracked entities."""
        self._unsubscribe_all()
        # For individual conditions track directly
        entity_ids = set()
        for c in self._conditions:
            if "entity_id" in c:
                entity_ids.add(c["entity_id"])
            # AND conditions
            for and_cond in c.get("and_conditions", []):
                if "entity_id" in and_cond:
                    entity_ids.add(and_cond["entity_id"])

        for entity_id in entity_ids:
            unsub = async_track_state_change_event(
                self._hass, [entity_id], self._state_change_listener
            )
            self._unsubscribe_callbacks.append(unsub)

        # Smart groups: listen to all state changes so entity_filter conditions update live
        if any("entity_filter" in c for c in self._conditions):
            unsub = async_track_state_change_event(
                self._hass, "*", self._state_change_listener
            )
            self._unsubscribe_callbacks.append(unsub)

        # Smart groups: listen to all state changes so entity_filter conditions update live
        if any("entity_filter" in c for c in self._conditions):
            unsub = async_track_state_change_event(
                self._hass, "*", self._state_change_listener
            )
            self._unsubscribe_callbacks.append(unsub)

    def _unsubscribe_all(self) -> None:
        for unsub in self._unsubscribe_callbacks:
            unsub()
        self._unsubscribe_callbacks.clear()

    # ── Update ────────────────────────────────────────────────────────────

    async def async_update(self) -> None:
        """Evaluate all conditions and update sensor state."""
        self._unmet = []

        # Expand smart groups at runtime
        expanded = self._expand_conditions()

        for condition in expanded:
            entity_id = condition.get("entity_id")
            if not entity_id:
                continue

            state_obj = self._hass.states.get(entity_id)
            if state_obj is None or state_obj.state in ("unknown", "unavailable"):
                continue

            # Use attribute if specified, otherwise entity state
            attribute = condition.get("attribute", "")
            if attribute:
                actual = str(state_obj.attributes.get(attribute, ""))
            else:
                actual = state_obj.state

            operator = condition.get("operator", "==")
            trigger_value = condition.get("trigger_value", "")
            label = condition.get("name", "").strip()
            if not label:
                state_obj2 = self._hass.states.get(entity_id)
                label = state_obj2.attributes.get("friendly_name", entity_id) if state_obj2 else entity_id

            # Check main condition
            if not self._evaluate(actual, trigger_value, operator):
                continue

            # Check AND conditions — all must be true for alert to fire
            and_conditions = condition.get("and_conditions", [])
            if and_conditions:
                and_passed = True
                for and_cond in and_conditions:
                    and_entity_id = and_cond.get("entity_id")
                    if not and_entity_id:
                        continue
                    and_state_obj = self._hass.states.get(and_entity_id)
                    if and_state_obj is None or and_state_obj.state in (
                        "unknown", "unavailable"
                    ):
                        and_passed = False
                        break
                    and_attr = and_cond.get("attribute", "")
                    if and_attr:
                        and_actual = str(
                            and_state_obj.attributes.get(and_attr, "")
                        )
                    else:
                        and_actual = and_state_obj.state
                    if not self._evaluate(
                        and_actual,
                        and_cond.get("trigger_value", ""),
                        and_cond.get("operator", "=="),
                    ):
                        and_passed = False
                        break
                if not and_passed:
                    continue

            if label and label.strip():
                self._unmet.append(label)

        state = (
            self._settings["text_all_clear"]
            if not self._unmet
            else ", ".join(self._unmet)
        )
        self._state = state[:255]
        if len(state) > 255:
            _LOGGER.warning(
                "State truncated to 255 characters for sensor %s", self._name
            )
        self._attr_icon = (
            self._settings["icons"]["clear"]
            if not self._unmet
            else self._settings["icons"]["alert"]
        )
        if hasattr(self, "_count_sensor"):
            self._count_sensor.async_schedule_update_ha_state()

    # ── Condition evaluator ───────────────────────────────────────────────

    def _evaluate(self, actual: str, expected: str, operator: str) -> bool:
        """Evaluate a single condition."""
        # Fix v4 format where operator symbol was baked into trigger_value
        for sym in (">=", "<=", "!=", ">", "<", "==", "="):
            if isinstance(expected, str) and expected.startswith(sym):
                operator = sym
                expected = expected[len(sym):].strip()
                break
        # Convert friendly labels to symbols if needed
        label_map = {
            "equals": "==",
            "not equal to": "!=",
            "greater than": ">",
            "less than": "<",
        }
        operator = label_map.get(operator, operator)
        try:
            if operator in ("==", "="):
                return str(actual) == str(expected)
            if operator == "!=":
                return str(actual) != str(expected)
            # Numeric comparisons
            a, e = float(actual), float(expected)
            if operator == ">":  return a > e
            if operator == "<":  return a < e
            if operator == ">=": return a >= e
            if operator == "<=": return a <= e
        except (ValueError, TypeError) as err:
            _LOGGER.warning(
                "Condition evaluation failed (%s %s %s): %s",
                actual, operator, expected, err,
            )
        return False

    # ── Dynamic updates from panel ────────────────────────────────────────

    async def async_update_conditions(self, new_conditions: list[dict]) -> None:
        """Update conditions and re-subscribe listeners."""
        self._raw_conditions = new_conditions
        self._conditions = self._validate_conditions(new_conditions)
        await self._subscribe_listeners()
        await self.async_update()

    async def async_update_settings(
        self, new_settings: dict[str, Any], new_conditions: list[dict]
    ) -> None:
        """Update settings and conditions from the panel save."""
        try:
            self._settings = new_settings
            if "friendly_sensor_name" in new_settings and new_settings["friendly_sensor_name"]:
                self._attr_name = new_settings["friendly_sensor_name"]
                self._friendly_sensor_name = new_settings["friendly_sensor_name"]
            self._state = new_settings["text_all_clear"][:255]
            self._attr_icon = new_settings["icons"]["clear"]
            await self.async_update_conditions(new_conditions)
            self.async_write_ha_state()
        except Exception as err:
            _LOGGER.error("Error updating settings: %s", err)
            raise


# ── Count sensor ──────────────────────────────────────────────────────────────

class CombinedNotificationCountSensor(Entity):
    """Sensor that shows count of unmet conditions."""

    def __init__(
        self,
        hass: HomeAssistant,
        name: str,
        parent_sensor: CombinedNotificationSensor,
        entry_id: str,
    ):
        self._hass = hass
        self._parent = parent_sensor
        self._attr_name = f"{name} Fault Count"
        self._attr_unique_id = f"combined_notifications_{entry_id}_count"
        self._attr_has_entity_name = False
        self._attr_should_poll = False
        self._attr_icon = "mdi:counter"
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

    @property
    def state(self) -> int:
        return len(self._parent._unmet)

    @property
    def device_info(self):
        return self._parent.device_info

    async def async_added_to_hass(self) -> None:
        self._parent._count_sensor = self
