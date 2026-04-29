/**
 * Combined Notifications Panel v5.0.8
 * Custom Lovelace panel for configuring Combined Notifications sensors.
 * Communicates with HA via websocket API.
 */

const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace") ||
  customElements.get("hui-view") ||
  HTMLElement
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

definePanel();

function definePanel() {

// ---------------------------------------------------------------------------
// Color map matching const.py
// ---------------------------------------------------------------------------
const COLORS = [
  { label: "Use YOUR Current Theme Color", value: "Use YOUR Current Theme Color", css: "var(--primary-background-color)" },
  { label: "Red",                value: "Red",               css: "rgb(190,11,11)" },
  { label: "Green",              value: "Green",             css: "rgb(38,141,53)" },
  { label: "Bright Green",       value: "Bright Green",      css: "rgb(47,207,118)" },
  { label: "Blue",               value: "Blue",              css: "rgb(2,136,209)" },
  { label: "Yellow",             value: "Yellow",            css: "rgb(255,215,0)" },
  { label: "Orange",             value: "Orange",            css: "rgb(255,140,0)" },
  { label: "Purple",             value: "Purple",            css: "rgb(156,39,176)" },
  { label: "Gray",               value: "Gray",              css: "rgb(67,73,82)" },
  { label: "White",              value: "White",             css: "rgb(255,255,255)" },
  { label: "Black",              value: "Black",             css: "rgb(0,0,0)" },
  { label: "Teal",               value: "Teal",              css: "rgb(0,128,128)" },
  { label: "Transparent Background", value: "Transparent Background", css: "transparent" },
];

const COLOR_CSS = Object.fromEntries(COLORS.map(c => [c.value, c.css]));

const OPERATORS = ["equals", "not equal to", "greater than", "less than"];

const OPERATOR_LABEL_TO_SYMBOL = {
  "equals":       "==",
  "not equal to": "!=",
  "greater than": ">",
  "less than":    "<",
};

const OPERATOR_SYMBOL_TO_LABEL = {
  "==": "equals",
  "!=": "not equal to",
  ">":  "greater than",
  "<":  "less than",
};

const DOMAIN_GROUPS = {
  "Sensors":    ["sensor", "binary_sensor", "input_boolean", "input_select", "input_number", "input_text", "input_datetime", "counter", "timer"],
  "Lights":     ["light"],
  "Switches":   ["switch"],
  "Locks":      ["lock"],
  "Covers":     ["cover"],
  "Climate":    ["climate"],
  "Presence":   ["person", "device_tracker"],
  "Media":      ["media_player"],
  "Cameras":    ["camera"],
  "Other":      ["automation", "script", "scene", "button", "event", "update", "number", "select", "text"]
};

// ---------------------------------------------------------------------------
// Main panel element
// ---------------------------------------------------------------------------
class CombinedNotificationsPanel extends LitElement {

  static get properties() {
    return {
      hass:        { type: Object },
      narrow:      { type: Boolean },
      panel:       { type: Object },
      _config:     { type: Object },
      _states:     { type: Object },
      _activeTab:  { type: String },
      _saving:     { type: Boolean },
      _saved:      { type: Boolean },
      _error:      { type: String },
      _expandedConditions: { type: Object },
      _totalPaused: { type: Number },
      _entitySearch: { type: Object },
    };
  }

  constructor() {
  super();
  this._config = null;
  this._states = {};
  this._activeTab = "general";
  this._saving = false;
  this._saved = false;
  this._error = "";
  this._loading = false;
  this._expandedConditions = new Set();
  this._entitySearch = {};
  this._allEntityList = [];
  this._debounceTimer = null;
}

set hass(hass) {
  this._hass = hass;
  this._maybeLoadConfig();
}

get hass() {
  return this._hass;
}

set panel(panel) {
  this._panel = panel;
  this._maybeLoadConfig();
}

  get panel() {
    return this._panel;
  }

  connectedCallback() {
    super.connectedCallback();
    this._maybeLoadConfig();
  }

  _maybeLoadConfig() {
    if (this._config || this._loading || !this._hass || !this._entryId) return;
    this._loading = true;
    this._loadConfig();
  }


  // ── Websocket helpers ──────────────────────────────────────────────────

  get _entryId() {
  return this.panel?.config?._panel_custom?.config?.entry_id || "";
}

  async _loadConfig() {
    try {
      const result = await this.hass.callWS({
        type: "combined_notifications/get_config",
        entry_id: this._entryId,
      });
      this._config = { ...result.config };
      this._states = result.states || {};
      this._allEntityList = Object.entries(this._states)
        .map(([id, s]) => {
          const normalized = {
            ...s,
            friendly_name: s.friendly_name || s.attributes?.friendly_name || id,
            state: s.state || s.attributes?.state || "",
          };
          return [id, normalized];
        })
        .sort((a, b) => {
          const da = a[0].split(".")[0];
          const db = b[0].split(".")[0];
          return da !== db ? da.localeCompare(db) : a[0].localeCompare(b[0]);
        });
      if (!this._config.conditions) this._config.conditions = [];
      this._totalPaused = this._config.conditions.filter(c => c.paused).length;

      // Convert operator symbols to labels for display
      this._config.conditions = this._config.conditions.map(c => ({
        ...c,
        operator: OPERATOR_SYMBOL_TO_LABEL[c.operator] || c.operator,
        and_conditions: (c.and_conditions || []).map(ac => ({
          ...ac,
          operator: OPERATOR_SYMBOL_TO_LABEL[ac.operator] || ac.operator,
        })),
      }));
    } catch (e) {
      console.log("CN Panel: error:", e);
      this._error = `Failed to load config: ${e.message}`;
    }
    this.requestUpdate();
  }

  async _saveConfig() {
    this._saving = true;
    this._saved = false;
    this._error = "";
    try {
      // Convert operator labels to symbols before saving
      const conditions = (this._config.conditions || []).map(c => ({
        ...c,
        operator: OPERATOR_LABEL_TO_SYMBOL[c.operator] || c.operator,
        and_conditions: (c.and_conditions || []).map(ac => ({
          ...ac,
          operator: OPERATOR_LABEL_TO_SYMBOL[ac.operator] || ac.operator,
        })),
      }));
      await this.hass.callWS({
        type: "combined_notifications/save_config",
        entry_id: this._entryId,
        data: { ...this._config, conditions },
      });
      this._saved = true;
    } catch (e) {
      this._error = `Failed to save: ${e.message}`;
    }
    this._saving = false;
    this.requestUpdate();
  }

  // ── Config mutation helpers ────────────────────────────────────────────

  _set(key, value) {
    this._config = { ...this._config, [key]: value };
    this.requestUpdate();
  }

  _setCondition(index, key, value) {
    const conditions = [...this._config.conditions];
    conditions[index] = { ...conditions[index], [key]: value };

    const cond = conditions[index];
    const isNew = cond.entity_filter_initialized === false || 
      (cond.entity_filter_initialized === undefined && (cond.entity_filter_exclude || []).length === 0);
    if (key === "entity_filter" && isNew) {
      const allMatched = this._matchedEntities(conditions[index]);
      conditions[index].entity_filter_exclude = allMatched.map(([id]) => id);
      conditions[index].entity_filter_initialized = true;
    }

    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }

  _setAndCondition(condIndex, andIndex, key, value) {
    const conditions = [...this._config.conditions];
    const andConditions = [...(conditions[condIndex].and_conditions || [])];
    andConditions[andIndex] = { ...andConditions[andIndex], [key]: value };
    conditions[condIndex] = { ...conditions[condIndex], and_conditions: andConditions };
    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }

  _addCondition(isFilter = false) {
    const conditions = [...this._config.conditions];
    const newIndex = conditions.length;
    if (isFilter) {
      conditions.push({
        entity_filter: "",
        entity_filter_name: "",
        operator: "equals",
        trigger_value: "",
        paused: false,
        and_conditions: [],
        entity_filter_exclude: [],
        entity_filter_domains: [...DOMAIN_GROUPS["Other"]],
        entity_label_overrides: {},
        entity_filter_initialized: false,
      });
    } else {
      conditions.push({
        entity_id: "",
        operator: "equals",
        trigger_value: "",
        name: "",
        paused: false,
        and_conditions: [],
      });
    }
    this._config = { ...this._config, conditions };
    // Auto-expand newly added condition
    this._expandedConditions = new Set([...this._expandedConditions, newIndex]);
    this.requestUpdate();
  }

  _deleteCondition(index) {
    const conditions = this._config.conditions.filter((_, i) => i !== index);
    this._config = { ...this._config, conditions };
    const expanded = new Set([...this._expandedConditions].filter(i => i !== index).map(i => i > index ? i - 1 : i));
    this._expandedConditions = expanded;
    this.requestUpdate();
  }

  _toggleConditionExpanded(index) {
    const expanded = new Set(this._expandedConditions);
    if (expanded.has(index)) expanded.delete(index);
    else expanded.add(index);
    this._expandedConditions = expanded;
    this.requestUpdate();
  }

  _togglePaused(index) {
    const conditions = [...this._config.conditions];
    conditions[index] = { ...conditions[index], paused: !conditions[index].paused };
    this._config = { ...this._config, conditions };
    this._totalPaused = conditions.filter(c => c.paused).length;
    this.requestUpdate();
  }

  _addAndCondition(condIndex) {
    const conditions = [...this._config.conditions];
    const andConditions = [...(conditions[condIndex].and_conditions || [])];
    andConditions.push({ entity_id: "", operator: "equals", trigger_value: "" });
    conditions[condIndex] = { ...conditions[condIndex], and_conditions: andConditions };
    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }

  _deleteAndCondition(condIndex, andIndex) {
    const conditions = [...this._config.conditions];
    const andConditions = (conditions[condIndex].and_conditions || []).filter((_, i) => i !== andIndex);
    conditions[condIndex] = { ...conditions[condIndex], and_conditions: andConditions };
    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }

  _toggleEntityExclude(condIndex, entityId) {
    const conditions = [...this._config.conditions];
    const excluded = new Set(conditions[condIndex].entity_filter_exclude || []);
    if (excluded.has(entityId)) excluded.delete(entityId);
    else excluded.add(entityId);
    conditions[condIndex] = { ...conditions[condIndex], entity_filter_exclude: [...excluded] };
    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }

  _excludeFromList(condIndex, matched) {
    const conditions = [...this._config.conditions];
    const excluded = new Set(conditions[condIndex].entity_filter_exclude || []);
    matched.forEach(([id]) => excluded.add(id));
    conditions[condIndex] = { ...conditions[condIndex], entity_filter_exclude: [...excluded] };
    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }

  _includeFromList(condIndex, matched) {
    const conditions = [...this._config.conditions];
    const excluded = new Set(conditions[condIndex].entity_filter_exclude || []);
    matched.forEach(([id]) => excluded.delete(id));
    conditions[condIndex] = { ...conditions[condIndex], entity_filter_exclude: [...excluded] };
    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }
  
  _renderEntityPicker(currentEntityId, onSelect, pickerId) {
    const searchVal = this._entitySearch[pickerId] ?? null;
    const isSearching = searchVal !== null;

    const filtered = isSearching && searchVal.length > 0
      ? this._allEntityList.filter(([id, s]) => {
          const fn = (s.friendly_name || "").toLowerCase();
          const q = searchVal.toLowerCase();
          return id.toLowerCase().includes(q) || fn.includes(q);
        }).slice(0, 50)
      : [];

    // Get display name for the input field
    let displayName = "";
    if (currentEntityId) {
      const found = this._allEntityList.find(([id]) => id === currentEntityId);
      displayName = found ? (found[1].friendly_name || currentEntityId) : currentEntityId;
    }

    return html`
      <div class="entity-picker" @click="${e => e.stopPropagation()}">
        <div class="entity-picker-input-wrap">
          <input
            type="text"
            class="entity-picker-input"
            placeholder="Search entities..."
            .value="${isSearching ? searchVal : displayName}"
            @focus="${() => {
              this._entitySearch = { ...this._entitySearch, [pickerId]: currentEntityId || "" };
              this.requestUpdate();
            }}"
            @input="${e => {
              const val = e.target.value;
              if (this._debounceTimer) clearTimeout(this._debounceTimer);
              this._debounceTimer = setTimeout(() => {
                this._entitySearch = { ...this._entitySearch, [pickerId]: val };
                this.requestUpdate();
              }, 180);
            }}"
            @blur="${() => {
              setTimeout(() => {
                this._entitySearch = { ...this._entitySearch, [pickerId]: null };
                this.requestUpdate();
              }, 220);
            }}"
          >
          ${currentEntityId ? html`
            <button class="entity-picker-clear" @click="${() => {
              onSelect("");
              this._entitySearch = { ...this._entitySearch, [pickerId]: null };
              this.requestUpdate();
            }}">✕</button>
          ` : ""}
        </div>
        ${isSearching && searchVal?.length > 0 ? html`
          <div class="entity-picker-dropdown">
            ${filtered.length === 0 ? html`
              <div class="entity-picker-empty">No entities found</div>
            ` : filtered.map(([id, s]) => {
              const fn = s.friendly_name || id;
              const domain = id.split(".")[0];
              const state = s.state || "";
              return html`
                <div class="entity-picker-item ${id === currentEntityId ? "selected" : ""}"
                  @mousedown="${() => {
                    onSelect(id);
                    this._entitySearch = { ...this._entitySearch, [pickerId]: null };
                    this.requestUpdate();
                  }}">
                  <div class="entity-picker-item-left">
                    <span class="entity-picker-domain">${domain}</span>
                    <div class="entity-picker-names">
                      <span class="entity-picker-friendly">${fn}</span>
                      <span class="entity-picker-id">${id}</span>
                    </div>
                  </div>
                  <span class="entity-picker-state">${state}</span>
                </div>
              `;
            })}
          </div>
        ` : ""}
      </div>
    `;
  }

  _renderOperatorSelect(currentOperator, onChange) {
    return html`
      <select class="op-select" @change="${e => onChange(e.target.value)}">
        ${OPERATORS.map(op => html`
          <option value="${op}" ?selected="${op === (currentOperator || "equals")}">${op}</option>
        `)}
      </select>
    `;
  }

  _getMatchedGroups(condition) {
    if (!condition?.entity_filter) return [];
    
    const matchedDomains = new Set(this._getMatchedDomains(condition));
    if (matchedDomains.size === 0) return [];

    return Object.keys(DOMAIN_GROUPS).filter(groupName => {
      return DOMAIN_GROUPS[groupName].some(domain => matchedDomains.has(domain));
    });
  }

  _isGroupExcluded(condition, groupName) {
    const excluded = new Set(condition.entity_filter_domains || []);
    const groupDomains = DOMAIN_GROUPS[groupName] || [];
    return groupDomains.every(d => excluded.has(d));
  }

  _toggleGroup(condIndex, groupName) {
    const conditions = [...this._config.conditions];
    const condition = conditions[condIndex];
    let excluded = new Set(condition.entity_filter_domains || []);
    const groupDomains = DOMAIN_GROUPS[groupName] || [];
    const isCurrentlyExcluded = this._isGroupExcluded(condition, groupName);
    if (isCurrentlyExcluded) {
      groupDomains.forEach(d => excluded.delete(d));
    } else {
      groupDomains.forEach(d => excluded.add(d));
    }
    conditions[condIndex] = { ...condition, entity_filter_domains: [...excluded] };
    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }

  _setEntityLabel(condIndex, entityId, label) {
    const conditions = [...this._config.conditions];
    const overrides = { ...(conditions[condIndex].entity_label_overrides || {}) };
    if (label) {
      overrides[entityId] = label;
    } else {
      delete overrides[entityId];
    }
    conditions[condIndex] = { ...conditions[condIndex], entity_label_overrides: overrides };
    this._config = { ...this._config, conditions };
    this.requestUpdate();
  }

  _sanitizeName(val) {
    return val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  // ── Computed helpers ───────────────────────────────────────────────────

  get _individualConditions() {
    return (this._config?.conditions || []).filter(c => !c.entity_filter && c.entity_filter !== "");
  }

  get _smartGroups() {
    return (this._config?.conditions || []).filter(c => "entity_filter" in c);
  }

  get _totalConditions() {
    return this._individualConditions.filter(c => !c.paused).length + 
           this._smartGroups.filter(c => !c.paused).length;
  }

  get _totalEntities() {
    let total = this._individualConditions.filter(c => !c.paused).length;
    for (const sg of this._smartGroups) {
      if (sg.paused) continue;
      const excluded = new Set(sg.entity_filter_exclude || []);
      total += this._matchedEntities(sg).filter(([id]) => !excluded.has(id)).length;
    }
    return total;
  }

  get _individualCount() {
    return this._individualConditions.filter(c => !c.paused).length;
  }

  get _individualPausedCount() {
    return this._individualConditions.filter(c => c.paused).length;
  }

  get _smartGroupCount() {
    return this._smartGroups.filter(c => !c.paused).length;
  }

  get _smartGroupEntityCount() {
    let total = 0;
    for (const sg of this._smartGroups) {
      if (sg.paused) continue;
      const excluded = new Set(sg.entity_filter_exclude || []);
      total += this._matchedEntities(sg).filter(([id]) => !excluded.has(id)).length;
    }
    return total;
  }

  get _smartGroupPausedCount() {
    return this._smartGroups.filter(c => c.paused).length;
  }

  get _overviewEntityCount() {
    // All individual conditions + all smart group entities (including paused, excluded)
    let total = this._individualConditions.length;
    for (const sg of this._smartGroups) {
      const excluded = new Set(sg.entity_filter_exclude || []);
      total += this._matchedEntities(sg).filter(([id]) => !excluded.has(id)).length;
    }
    return total;
  }

  _buildOverviewRows() {
    const rows = [];
    const conditions = this._config.conditions || [];

    // Individual conditions
    for (const [idx, cond] of conditions.entries()) {
      if ("entity_filter" in cond) continue;
      if (!cond.entity_id) continue;
      const state = this._currentState(cond.entity_id);
      const friendly = (() => {
        const found = this._allEntityList.find(([id]) => id === cond.entity_id);
        return found ? (found[1].friendly_name || cond.entity_id) : cond.entity_id;
      })();
      const isAlert = (() => {
        if (cond.paused) return false;
        return this._evalCondition(state, cond.operator, cond.trigger_value);
      })();
      rows.push({
        name: cond.name || friendly,
        entityId: cond.entity_id,
        domain: cond.entity_id.split(".")[0],
        state,
        operator: cond.operator,
        triggerValue: cond.trigger_value || "",
        sourceType: "Individual",
        sourceLabel: cond.name || friendly,
        paused: !!cond.paused,
        alert: isAlert,
      });
    }

    // Smart group entities
    for (const [idx, cond] of conditions.entries()) {
      if (!("entity_filter" in cond)) continue;
      const excluded = new Set(cond.entity_filter_exclude || []);
      const matched = this._matchedEntities(cond);
      const groupLabel = cond.entity_filter_name || (cond.entity_filter ? `Smart Group: ${cond.entity_filter}` : "Smart Group");
      for (const [entityId, s] of matched) {
        if (excluded.has(entityId)) continue;
        const state = this._currentState(entityId);
        const overrides = cond.entity_label_overrides || {};
        const displayName = overrides[entityId] || s.friendly_name || entityId;
        const isAlert = (() => {
          if (cond.paused) return false;
          return this._evalCondition(state, cond.operator, cond.trigger_value);
        })();
        rows.push({
          name: displayName,
          entityId,
          domain: entityId.split(".")[0],
          state,
          operator: cond.operator,
          triggerValue: cond.trigger_value || "",
          sourceType: "Group",
          sourceLabel: groupLabel,
          paused: !!cond.paused,
          alert: isAlert,
        });
      }
    }

    // Sort by domain then by name within domain
    rows.sort((a, b) => {
      if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
      return a.name.localeCompare(b.name);
    });

    return rows;
  }

  _evalCondition(state, operator, triggerValue) {
    const op = OPERATOR_LABEL_TO_SYMBOL[operator] || operator;
    const numState = parseFloat(state);
    const numTrigger = parseFloat(triggerValue);
    const hasNums = !isNaN(numState) && !isNaN(numTrigger);
    if (op === "==") return hasNums ? numState === numTrigger : state === triggerValue;
    if (op === "!=") return hasNums ? numState !== numTrigger : state !== triggerValue;
    if (op === ">")  return hasNums && numState > numTrigger;
    if (op === "<")  return hasNums && numState < numTrigger;
    return false;
  }

  _pluralizeDomain(domain) {
    const map = {
      "binary_sensor": "Binary Sensors",
      "sensor": "Sensors",
      "switch": "Switches",
      "lock": "Locks",
      "light": "Lights",
      "cover": "Covers",
      "climate": "Climate",
      "person": "People",
      "device_tracker": "Device Trackers",
      "media_player": "Media Players",
      "automation": "Automations",
      "script": "Scripts",
      "scene": "Scenes",
      "input_boolean": "Input Booleans",
      "input_select": "Input Selects",
      "input_number": "Input Numbers",
      "camera": "Cameras",
      "update": "Updates",
      "number": "Numbers",
      "select": "Selects",
      "button": "Buttons",
    };
    return map[domain] || domain;
  }

  _formatCondition(operator, triggerValue) {
    const op = OPERATOR_LABEL_TO_SYMBOL[operator] || operator;
    const symbol = op === "==" ? "=" : op === "!=" ? "≠" : op;
    return `${symbol} ${triggerValue}`;
  }

  _getMatchedDomains(condition) {
    const keyword = (condition.entity_filter || "").toLowerCase();
    if (!keyword) return [];
    const domains = new Set();
    this._allEntityList.forEach(([id, s]) => {
      const fn = (s.friendly_name || "").toLowerCase();
      if (id.toLowerCase().includes(keyword) || fn.includes(keyword)) {
        domains.add(id.split(".")[0]);
      }
    });
    return [...domains].sort();
  }

  _matchedEntities(condition) {
    // Returns ALL keyword-matched entities regardless of domain chips
    // Used for monitoring, counts, Overview tab
    const keyword = (condition.entity_filter || "").toLowerCase();
    if (!keyword) return [];
    return this._allEntityList.filter(([entityId, state]) => {
      const fn = (state.friendly_name || "").toLowerCase();
      return entityId.toLowerCase().includes(keyword) || fn.includes(keyword);
    });
  }

  _visibleEntities(condition) {
    // Returns keyword-matched entities filtered by domain chips
    // Used ONLY for rendering the entity list inside the smart group card
    const keyword = (condition.entity_filter || "").toLowerCase();
    if (!keyword) return [];
    const excludedDomains = new Set(condition.entity_filter_domains || []);
    const effectiveExcluded = excludedDomains.size > 0
      ? excludedDomains
      : new Set(DOMAIN_GROUPS["Other"]);
    return this._allEntityList.filter(([entityId, state]) => {
      const fn = (state.friendly_name || "").toLowerCase();
      const matches = entityId.toLowerCase().includes(keyword) || fn.includes(keyword);
      if (!matches) return false;
      if (effectiveExcluded.has(entityId.split(".")[0])) return false;
      return true;
    });
  }

  _currentState(entityId) {
    return this._hass?.states?.[entityId]?.state || this._states[entityId]?.state || "";
  }

  // ── Render ─────────────────────────────────────────────────────────────

  _renderHeaderStatus() {
    const entityId = `sensor.${(this._config?.name || "").toLowerCase().replace(/\s+/g, "_")}`;
    const stateObj = this._hass?.states?.[entityId] || this._states?.[entityId];
    if (!stateObj) return html``;
    const isClear = stateObj.attributes?.is_clear !== false;
    const numUnmet = stateObj.attributes?.number_unmet || 0;
    const state = stateObj.state || "";
    return html`
      <span class="header-state ${isClear ? "clear" : "alert"}">
        ${state}
        ${!isClear ? html`<span class="header-alert-count">${numUnmet}</span>` : ""}
      </span>
    `;
  }

  render() {
    if (!this._config) {
      return html`
        <div class="panel-root">
          <div class="dialog">
            ${this._error
              ? html`<div style="padding:40px;color:#fc8181;font-family:'DM Sans',sans-serif">${this._error}</div>`
              : html`<div class="loading">Loading configuration...</div>`}
          </div>
        </div>
      `;
    }

    return html`
      <div class="panel-root">
        <div class="dialog">

          <!-- Header -->
          <div class="dialog-header">
            <span class="dialog-title">⚙ COMBINED NOTIFICATIONS — CONFIGURATION</span>
            <div class="header-right">
              <span class="sensor-name">sensor.${this._config.name || ""}</span>
              ${this._renderHeaderStatus()}
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button class="tab ${this._activeTab === "general" ? "active" : ""}"
              @click="${() => { this._activeTab = "general"; this.requestUpdate(); }}">
              General
            </button>
            <button class="tab ${this._activeTab === "individual" ? "active" : ""}"
              @click="${() => { this._activeTab = "individual"; this.requestUpdate(); }}">
              Individual
              <span class="badge blue" title="${this._individualCount} Active">${this._individualCount}</span>
              ${this._individualPausedCount > 0 ? html`<span class="badge orange" title="${this._individualPausedCount} Paused">${this._individualPausedCount}</span>` : ""}
            </button>
            <button class="tab ${this._activeTab === "smartgroups" ? "active" : ""}"
              @click="${() => { this._activeTab = "smartgroups"; this.requestUpdate(); }}">
              Smart Groups
              <span class="badge blue" title="${this._smartGroupCount} Groups">${this._smartGroupCount}</span>
              <span class="badge teal" title="${this._smartGroupEntityCount} Entities">${this._smartGroupEntityCount}</span>
              ${this._smartGroupPausedCount > 0 ? html`<span class="badge orange" title="${this._smartGroupPausedCount} Paused">${this._smartGroupPausedCount}</span>` : ""}
            </button>
            <button class="tab ${this._activeTab === "overview" ? "active" : ""}"
              @click="${() => { this._activeTab = "overview"; this.requestUpdate(); }}">
              Overview
              <span class="badge blue" title="${this._overviewEntityCount} Monitored">${this._overviewEntityCount}</span>
            </button>
          </div>

          <!-- Badge legend -->
          <div class="badge-legend">
            <span><span class="legend-dot blue"></span> conditions</span>
            <span><span class="legend-dot teal"></span> entities</span>
            <span><span class="legend-dot orange"></span> paused</span>
            <span><span class="legend-dot yellow"></span> alert</span>
          </div>

          <!-- Panel body -->
          <div class="panel-body">
            ${this._activeTab === "general"     ? this._renderGeneral()     : ""}
            ${this._activeTab === "individual"  ? this._renderIndividual()  : ""}
            ${this._activeTab === "smartgroups" ? this._renderSmartGroups() : ""}
            ${this._activeTab === "overview"    ? this._renderOverview()    : ""}
          </div>

          <!-- Footer -->
          <div class="dialog-footer">
            <span class="version-stamp">pja 2.5</span>
            ${this._error ? html`<span class="error-msg">${this._error}</span>` : ""}
            ${this._saved ? html`<span class="saved-msg">✓ Saved</span>` : ""}
            <div class="footer-buttons">
              <button class="btn-cancel" @click="${() => document.referrer ? (window.location.href = document.referrer) : history.back()}">Cancel</button>
              ${this._saved ? html`<button class="btn-close" @click="${() => document.referrer ? (window.location.href = document.referrer) : history.back()}">Close Window</button>` : ""}
              <button class="btn-save" @click="${this._saveConfig}" ?disabled="${this._saving}">
                ${this._saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // ── General tab ────────────────────────────────────────────────────────

  _renderGeneral() {
    const c = this._config;
    return html`
      <!-- Sensor Identity -->
      <div class="group-card">
        <div class="group-header">Sensor Identity</div>
        <div class="group-body">
          <div class="field">
            <label>Your Sensor Name <span class="required">*</span></label>
            <input type="text" .value="${c.name || ""}"
              placeholder="e.g. combined_notifications_1"
              @input="${e => {
                const clean = this._sanitizeName(e.target.value);
                e.target.value = clean;
                this._set("name", clean);
              }}">
            <div class="hint"><em>Your sensor will be created as: <span class="mono accent">${"sensor." + (c.name || "")}</span></em></div>
          </div>
          <div class="field">
            <label>Friendly Display Name</label>
            <input type="text" .value="${c.friendly_sensor_name || ""}"
              placeholder="e.g. Home Security"
              @input="${e => this._set("friendly_sensor_name", e.target.value)}">
          </div>
        </div>
      </div>

      <!-- All Clear State -->
      <div class="group-card">
        <div class="group-header">All Clear State</div>
        <div class="group-body">
          <div class="field">
            <label>All Clear Text</label>
            <input type="text" .value="${c.text_all_clear || "ALL CLEAR"}"
              @input="${e => this._set("text_all_clear", e.target.value)}">
          </div>
          <div class="icon-row">
            <div class="icon-field">
              <label>All Clear Icon</label>
              <ha-icon-picker
                .value="${c.icon_all_clear || "mdi:hand-okay"}"
                @value-changed="${e => this._set("icon_all_clear", e.detail.value)}">
              </ha-icon-picker>
            </div>
            <div class="icon-field">
              <label>Alert Icon</label>
              <ha-icon-picker
                .value="${c.icon_alert || "mdi:alert-circle"}"
                @value-changed="${e => this._set("icon_alert", e.detail.value)}">
              </ha-icon-picker>
            </div>
          </div>
        </div>
      </div>

      <!-- Colors -->
      <div class="group-card">
        <div class="group-header">Colors</div>
        <div class="group-body">
          <div class="color-row">
            ${this._colorSelect("All Clear Background", "background_color_all_clear", c.background_color_all_clear)}
            ${this._colorSelect("Alert Background", "background_color_alert", c.background_color_alert)}
          </div>
          <div class="color-row">
            ${this._colorSelect("All Clear Text Color", "text_color_all_clear", c.text_color_all_clear, true)}
            ${this._colorSelect("Alert Text Color", "text_color_alert", c.text_color_alert, true)}
          </div>
          <div class="color-row">
            ${this._colorSelect("All Clear Icon Color", "icon_color_all_clear", c.icon_color_all_clear, true)}
            ${this._colorSelect("Alert Icon Color", "icon_color_alert", c.icon_color_alert, true)}
          </div>
        </div>
      </div>

      <!-- Display Options -->
      <div class="group-card">
        <div class="group-header">Display Options</div>
        <div class="group-body">
          ${this._toggle("Hide title in all-clear state", "Shows only the icon when everything is OK", "hide_title", c.hide_title)}
          ${this._toggle("Hide title in alert state", "Shows only the icon and condition list when alerting", "hide_title_alert", c.hide_title_alert)}
        </div>
      </div>
    `;
  }

  _colorSelect(label, key, value, optional = false) {
    const current = COLORS.find(c => c.value === value) || COLORS[0];
    return html`
      <div class="color-field">
        <label>${label}</label>
        <div class="color-wrap">
          <div class="color-dot" style="background:${COLOR_CSS[value] || "#888"}"></div>
          <select @change="${e => this._set(key, e.target.value)}">
            ${optional ? html`<option value="">— Default (Lt Gray) —</option>` : ""}
            ${COLORS.map(c => html`
              <option value="${c.value}" ?selected="${c.value === value}">${c.label}</option>
            `)}
          </select>
        </div>
      </div>
    `;
  }

  _toggle(label, sub, key, value) {
    return html`
      <div class="toggle-row">
        <div>
          <div class="toggle-label">${label}</div>
          <div class="toggle-sub">${sub}</div>
        </div>
        <div class="toggle ${value ? "on" : ""}" @click="${() => this._set(key, !value)}"></div>
      </div>
    `;
  }

  // ── Individual Conditions tab ──────────────────────────────────────────

  _renderIndividual() {
    const conditions = this._config.conditions || [];
    const individual = conditions.map((c, i) => ({ c, i })).filter(({ c }) => !("entity_filter" in c));

    return html`
      <div class="group-card">
        <div class="group-header" style="display:flex;align-items:center;justify-content:space-between">
          <span>Individual Conditions</span>
          <button class="expand-btn" @click="${() => this._toggleAllIndividual()}">
            ${individual.some(({ i }) => this._expandedConditions.has(i)) ? "Collapse All" : "Expand All"}
          </button>
        </div>
        <div class="group-body">
          <div class="hint" style="font-style:italic">
            Monitor a specific entity one at a time. Each condition watches a single device and alerts when it matches your defined value.
          </div>
          ${individual.length === 0 ? html`<div class="empty-hint">No individual conditions yet. Add one below.</div>` : ""}
          ${individual.map(({ c, i }) => this._renderConditionCard(c, i))}
          <button class="add-btn" @click="${() => { this._addCondition(false); this._activeTab = "individual"; }}">
            <span class="plus">+</span> Add Individual Monitored Device / Entity
          </button>
        </div>
      </div>
    `;
  }

  // ── Smart Groups tab ───────────────────────────────────────────────────

  _renderSmartGroups() {
    const conditions = this._config.conditions || [];
    const groups = conditions.map((c, i) => ({ c, i })).filter(({ c }) => "entity_filter" in c);

    return html`
      <div class="group-card">
        <div class="group-header" style="display:flex;align-items:center;justify-content:space-between">
          <span>Smart Groups</span>
          <button class="expand-btn" @click="${() => this._toggleAllSmart()}">
            ${groups.some(({ i }) => this._expandedConditions.has(i)) ? "Collapse All" : "Expand All"}
          </button>
        </div>
        <div class="group-body">
          <div class="hint" style="font-style:italic">
            Type a keyword to bulk add every matching entity (e.g. lights, doors, battery).
            All entities with that keyword in their name are included automatically.
            New devices are picked up without any changes. Individual devices can be excluded from the list below.
          </div>
          ${groups.length === 0 ? html`<div class="empty-hint">No smart groups yet. Add one below.</div>` : ""}
          ${groups.map(({ c, i }) => this._renderSmartGroupCard(c, i))}
          <button class="add-btn" @click="${() => { this._addCondition(true); this._activeTab = "smartgroups"; }}">
            <span class="plus">+</span> Add Smart Group — bulk add devices by keyword
          </button>
        </div>
      </div>
    `;
  }

  _renderConditionCard(condition, index) {
    const isOpen = this._expandedConditions.has(index);
    const isPaused = condition.paused || false;
    const label = condition.name || condition.entity_id || "New Condition";
    const sub = condition.entity_id
      ? `${condition.entity_id} — ${condition.operator || "equals"} — ${condition.trigger_value || ""}`
      : "Not configured yet";
    const currentState = this._currentState(condition.entity_id);
    const hasAnd = (condition.and_conditions || []).length > 0;

    return html`
      <div class="cond-card">
        <div class="cond-header" @click="${() => this._toggleConditionExpanded(index)}">
          <div class="cond-header-left">
            <div class="cond-dot ${condition.paused ? 'paused' : 'active'}"></div>
            <div class="cond-summary">
              <div class="cond-name">
                ${label}
                ${isPaused ? html`<span class="paused-pill">paused</span>` : ""}
                ${hasAnd ? html`<span class="and-badge">AND (${condition.and_conditions.length})</span>` : ""}
              </div>
              <div class="cond-sub">${sub}</div>
            </div>
          </div>
          <div class="cond-header-right">
            <div class="toggle-unit">
              <div class="mini-toggle ${isPaused ? "off" : ""}"
                @click="${e => { e.stopPropagation(); this._togglePaused(index); }}"></div>
              ${isPaused ? html`<span class="toggle-unit-label paused">paused</span>` : html`<span class="toggle-unit-label"></span>`}
            </div>
            <button class="delete-btn" @click="${e => { e.stopPropagation(); this._deleteCondition(index); }}">Delete</button>
            <span class="chevron">${isOpen ? "▴" : "▾"}</span>
          </div>
        </div>

        ${isOpen ? html`
          <div class="cond-body">
            <div class="field">
              <label>Entity</label>
              ${this._renderEntityPicker(
                condition.entity_id,
                (id) => {
                  this._setCondition(index, "entity_id", id);
                  if (!condition.name && id) {
                    const found = this._allEntityList.find(([eid]) => eid === id);
                    const friendly = found ? found[1].friendly_name : id;
                    this._setCondition(index, "name", friendly);
                  }
                },
                `cond-${index}`
              )}
            </div>
            ${condition.entity_id ? html`
              <div class="state-pill">
                <span class="state-label">Current state:</span>
                <span>${currentState}</span>
              </div>
            ` : ""}
            <div class="field">
              <label>Attribute <span class="optional">(optional)</span></label>
              <input type="text" .value="${condition.attribute || ""}"
                placeholder="Leave empty to use main state"
                @input="${e => this._setCondition(index, "attribute", e.target.value)}">
              <div class="hint"><em>e.g. battery_level — only needed if the value you want is stored in an attribute</em></div>
            </div>
            <div class="trigger-row">
              <div class="op-field">
                <label>Alert when</label>
                ${this._renderOperatorSelect(condition.operator, (val) => this._setCondition(index, "operator", val))}
              </div>
              <div class="field" style="flex:1">
                <label>Alert value</label>
                <input type="text" class="mono" .value="${condition.trigger_value || ""}"
                  @input="${e => this._setCondition(index, "trigger_value", e.target.value)}">
              </div>
            </div>
            <div class="exact-warning"><em>ⓘ Must match exactly — capitalization matters. Check Developer Tools → States for the exact value. Common values: on · off · open · closed · locked · unlocked · home · away</em></div>
            <div class="field">
              <label>Condition Label <span class="optional">— shown in sensor state when triggered</span></label>
              <input type="text" .value="${condition.name || ""}"
                @input="${e => this._setCondition(index, "name", e.target.value)}">
            </div>

            <!-- AND Condition -->
            ${this._renderAndSection(condition, index)}
          </div>
        ` : ""}
      </div>
    `;
  }

  _renderSmartGroupCard(condition, index) {
    const isOpen = this._expandedConditions.has(index);
    const isPaused = condition.paused || false;
    const allMatched = this._matchedEntities(condition);
    const visible = this._visibleEntities(condition);
    const excluded = new Set(condition.entity_filter_exclude || []);
    const activeCount = allMatched.filter(([id]) => !excluded.has(id)).length;
    const groupName = condition.entity_filter_name || (condition.entity_filter ? `Smart Group — ${condition.entity_filter}` : "Smart Group");
    const sub = condition.entity_filter
      ? `${activeCount} / ${allMatched.length} found · ${condition.operator || "equals"} ${condition.trigger_value || ""}`
      : "Not configured yet";

    return html`
      <div class="cond-card">
        <div class="cond-header" @click="${() => this._toggleConditionExpanded(index)}">
          <div class="cond-header-left">
            <div class="cond-dot ${condition.paused ? 'paused' : 'active'}"></div>
            <div class="cond-summary">
              <div class="cond-name">
                ${condition.entity_filter_name || (condition.entity_filter ? `Smart Group — ${condition.entity_filter}` : "Smart Group")}
                ${isPaused ? html`<span class="paused-pill">paused</span>` : ""}
              </div>
              <div class="cond-sub">${sub}</div>
            </div>
          </div>
          <div class="cond-header-right">
            <div class="toggle-unit">
              <div class="mini-toggle ${isPaused ? "off" : ""}"
                @click="${e => { e.stopPropagation(); this._togglePaused(index); }}"></div>
              ${isPaused ? html`<span class="toggle-unit-label paused">paused</span>` : html`<span class="toggle-unit-label"></span>`}
            </div>
            <button class="delete-btn" @click="${e => { e.stopPropagation(); this._deleteCondition(index); }}">Delete</button>
            <span class="chevron">${isOpen ? "▴" : "▾"}</span>
          </div>
        </div>

        ${isOpen ? html`
          <div class="cond-body">
            <div class="field">
              <label>Entity keyword</label>
              <input type="text" .value="${condition.entity_filter || ""}"
                placeholder="e.g. battery, door, light"
                @input="${e => this._setCondition(index, "entity_filter", e.target.value)}">
              <div class="hint"><em>Type any word in the entity ID or device name</em></div>
              ${condition.entity_filter ? html`
                <span class="keyword-count">${allMatched.length} / ${this._allEntityList.length} keyword search</span>
              ` : ""}
            </div>
            <div class="field">
              <label>Custom Group Name <span class="optional">(optional)</span></label>
              <input type="text" .value="${condition.entity_filter_name || ""}"
                placeholder="e.g. Doors Open"
                @input="${e => this._setCondition(index, "entity_filter_name", e.target.value)}">
            </div>

            ${condition.entity_filter ? html`
              <div class="domain-filter">
                <div class="domain-filter-label">Include entity types:</div>
                <div class="domain-chips">
                  ${this._getMatchedGroups(condition).map(groupName => {
                    const excluded = this._isGroupExcluded(condition, groupName);
                    const groupDomains = DOMAIN_GROUPS[groupName] || [];
                    const excludeList = new Set(condition.entity_filter_exclude || []);
const keyword = (condition.entity_filter || "").toLowerCase();
const hasIncluded = excluded && this._allEntityList
  .filter(([id, s]) => {
    const fn = (s.friendly_name || "").toLowerCase();
    return id.toLowerCase().includes(keyword) || fn.includes(keyword);
  })
  .some(([id]) => groupDomains.includes(id.split(".")[0]) && !excludeList.has(id));
                    const chipClass = !excluded ? "included" : "excluded";
                    const chipStyle = (!excluded) ? "" : hasIncluded ? "animation: chip-pulse 2s ease-in-out infinite;" : "";
                    return html`
                      <div class="domain-chip ${chipClass}" style="${chipStyle}"
                        @click="${() => this._toggleGroup(index, groupName)}">
                        ${groupName}
                      </div>
                    `;
                  })}
                </div>
              </div>
            ` : ""}

            ${condition.entity_filter ? html`
              <div class="mixed-warning">
                ⚠ All entities in this group must share the same alert value (e.g. on/off, open/closed). Entities with different values must be in separate groups.
              </div>
            ` : ""}

            ${condition.entity_filter ? html`
              <div class="entity-list">
                <div class="entity-list-header">
                  <span class="entity-list-title">Matching entities in your system</span>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span class="match-count">${activeCount} / ${allMatched.length} included</span>
                    <button class="list-action-btn include-all-btn" @click="${() => this._includeFromList(index, visible)}">Include All</button>
                    <button class="list-action-btn exclude-all-btn" @click="${() => this._excludeFromList(index, visible)}">Exclude All</button>
                  </div>
                </div>
                ${visible.map(([entityId, state]) => {
                  const overrides = condition.entity_label_overrides || {};
                  const customLabel = overrides[entityId] || "";
                  return html`
                    <div class="entity-item ${excluded.has(entityId) ? "excluded" : ""}">
                      <div class="entity-info">
                        <div class="entity-name">${state.friendly_name || entityId}</div>
                        <div class="entity-id">${entityId}</div>
                        ${!excluded.has(entityId) ? html`
                          <input
                            type="text"
                            class="entity-label-input"
                            placeholder="Custom alert label (optional)"
                            .value="${customLabel}"
                            @input="${e => this._setEntityLabel(index, entityId, e.target.value)}"
                            @click="${e => e.stopPropagation()}"
                          >
                        ` : ""}
                      </div>
                      <div class="entity-right">
                        <span class="state-val">${state.state}</span>
                        <div class="mini-toggle ${excluded.has(entityId) ? "off" : ""}"
                          @click="${() => this._toggleEntityExclude(index, entityId)}"></div>
                      </div>
                    </div>
                  `;
                })}
              </div>
            ` : ""}

            <div class="field">
              <label>Attribute <span class="optional">(optional)</span></label>
              <input type="text" .value="${condition.attribute || ""}"
                placeholder="Leave empty to use main state"
                @input="${e => this._setCondition(index, "attribute", e.target.value)}">
              <div class="hint"><em>e.g. battery_level — only needed if the value you want is stored in an attribute</em></div>
            </div>
            <div class="trigger-row">
              <div class="op-field">
                <label>Alert when</label>
                ${this._renderOperatorSelect(condition.operator, (val) => this._setCondition(index, "operator", val))}
              </div>
              <div class="field" style="flex:1">
                <label>Alert value</label>
                <input type="text" class="mono" .value="${condition.trigger_value || ""}"
                  @input="${e => this._setCondition(index, "trigger_value", e.target.value)}">
              </div>
            </div>
            <div class="exact-warning"><em>ⓘ Must match exactly — capitalization matters. Check Developer Tools → States for the exact value.</em></div>
          </div>
        ` : ""}
      </div>
    `;
  }

  // ── Overview tab ───────────────────────────────────────────────────────

  _renderOverview() {
    const rows = this._buildOverviewRows();

    const domainMap = new Map();
    for (const row of rows) {
      if (!domainMap.has(row.domain)) domainMap.set(row.domain, []);
      domainMap.get(row.domain).push(row);
    }
    const domains = [...domainMap.keys()].sort();

    return html`
      <!-- Color key -->
      <div class="overview-key">
        <span class="overview-key-item"><span class="overview-dot alert"></span> Alerting</span>
        <span class="overview-key-item"><span class="overview-dot paused"></span> Paused</span>
        <span class="overview-key-item"><span class="overview-dot ok"></span> OK</span>
      </div>

      ${rows.length === 0 ? html`
        <div class="empty-hint" style="padding:12px 4px;font-style:italic">No monitored entities yet. Add conditions in the Individual or Groups tabs.</div>
      ` : html`
        <div class="overview-scroll-wrap">
          <div class="overview-container">
            <div class="overview-thead">
              <span>Entity</span>
              <span>State</span>
              <span>Condition</span>
            </div>
            ${domains.map(domain => html`
              <div class="overview-domain-divider">${this._pluralizeDomain(domain)}</div>
              ${domainMap.get(domain).map(row => html`
                <div class="overview-row ${row.alert ? "row-alert" : row.paused ? "row-paused" : "row-ok"}">
                  <div class="overview-entity-cell">
                    <span class="overview-entity-name">${row.name}</span>
                    <span class="overview-source-pill">
                      <span class="overview-source-type">${row.sourceType} —</span>
                      <span class="overview-source-name">${row.sourceLabel}</span>
                    </span>
                  </div>
                  <span class="overview-state">${row.state}</span>
                  <span class="overview-condition">${this._formatCondition(row.operator, row.triggerValue)}</span>
                </div>
              `)}
            `)}
          </div>
        </div>
      `}
    `;
  }

  _renderAndSection(condition, condIndex) {
    const andConditions = condition.and_conditions || [];
    return html`
      <div class="and-section">
        <div class="and-title">AND Condition${andConditions.length > 1 ? "s" : ""}</div>
        <div class="and-body">
          ${andConditions.map((ac, ai) => html`
            <div class="field">
              <label>Entity</label>
              ${this._renderEntityPicker(
                ac.entity_id,
                (id) => this._setAndCondition(condIndex, ai, "entity_id", id),
                `and-${condIndex}-${ai}`
              )}
            </div>
            ${ac.entity_id ? html`
              <div class="state-pill">
                <span class="state-label">Current state:</span>
                <span>${this._currentState(ac.entity_id)}</span>
              </div>
            ` : ""}
            <div class="field">
              <label>Attribute <span class="optional">(optional)</span></label>
              <input type="text" .value="${ac.attribute || ""}"
                placeholder="Leave empty to use main state"
                @input="${e => this._setAndCondition(condIndex, ai, "attribute", e.target.value)}">
            </div>
            <div class="trigger-row">
              <div class="op-field">
                <label>Alert when</label>
                ${this._renderOperatorSelect(ac.operator, (val) => this._setAndCondition(condIndex, ai, "operator", val))}
              </div>
              <div class="field" style="flex:1">
                <label>Alert value</label>
                <input type="text" class="mono" .value="${ac.trigger_value || ""}"
                  @input="${e => this._setAndCondition(condIndex, ai, "trigger_value", e.target.value)}">
              </div>
            </div>
            <div class="exact-warning"><em>ⓘ Must match exactly — capitalization matters.</em></div>
            <div style="display:flex;justify-content:flex-end">
              <button class="delete-btn" @click="${() => this._deleteAndCondition(condIndex, ai)}">Remove AND Condition</button>
            </div>
          `)}
          <button class="add-and" @click="${() => this._addAndCondition(condIndex)}">+ Add AND Condition</button>
        </div>
      </div>
    `;
  }

  // ── Expand/collapse all helpers ────────────────────────────────────────

  _toggleAllIndividual() {
    const conditions = this._config.conditions || [];
    const individualIndices = conditions.map((c, i) => ({ c, i }))
      .filter(({ c }) => !("entity_filter" in c))
      .map(({ i }) => i);
    const anyOpen = individualIndices.some(i => this._expandedConditions.has(i));
    const expanded = new Set(this._expandedConditions);
    individualIndices.forEach(i => anyOpen ? expanded.delete(i) : expanded.add(i));
    this._expandedConditions = expanded;
    this.requestUpdate();
  }

  _toggleAllSmart() {
    const conditions = this._config.conditions || [];
    const smartIndices = conditions.map((c, i) => ({ c, i }))
      .filter(({ c }) => "entity_filter" in c)
      .map(({ i }) => i);
    const anyOpen = smartIndices.some(i => this._expandedConditions.has(i));
    const expanded = new Set(this._expandedConditions);
    smartIndices.forEach(i => anyOpen ? expanded.delete(i) : expanded.add(i));
    this._expandedConditions = expanded;
    this.requestUpdate();
  }

  // ── Styles ─────────────────────────────────────────────────────────────

  static get styles() {
    return css`
      :host { display: block; }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      .panel-root {
        min-height: 100vh;
        background: #080a0f;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 24px;
        font-family: 'DM Sans', 'Segoe UI', sans-serif;
        color: #e2e8f0;
      }

      .dialog {
        width: 560px;
        max-width: 100%;
        background: #0f1219;
        border-radius: 16px;
        box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .loading {
        padding: 40px;
        text-align: center;
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
      }

      /* Header */
      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 0;
      }
      .dialog-title {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
      }
      .sensor-name {
        font-size: 0.72rem;
        color: #63b3ed;
        font-family: monospace;
      }
      .header-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }
      .header-state {
        font-size: 0.72rem;
        font-family: monospace;
        font-style: italic;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .header-state.clear { color: rgb(47,207,118); }
      .header-state.alert { color: #ffd701; }
      .header-alert-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: 20px;
        background: rgba(255,215,1,0.7);
        border: 1px solid rgba(255,215,1,0.8);
        color: #080a0f;
        font-size: 0.62rem;
        font-weight: 700;
      }

      /* Tabs */
      .tabs {
        display: flex;
        gap: 4px;
        padding: 12px 20px 0;
        border-bottom: 2px solid rgba(255,255,255,0.08);
        margin-top: 4px;
        flex-wrap: wrap;
      }
      .tab {
        height: 40px;
        padding: 0 14px;
        border-radius: 8px 8px 0 0;
        border: 2px solid rgba(255,255,255,0.08);
        border-bottom: none;
        background: rgba(255,255,255,0.04);
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.88rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.18s;
        position: relative;
        bottom: -2px;
        display: flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
      }
      .tab:hover { color: #e2e8f0; background: rgba(255,255,255,0.07); }
      .tab.active {
        background: #0f1219;
        color: #63b3ed;
        border-color: rgba(99,179,237,0.35);
        border-bottom-color: #0f1219;
        font-weight: 600;
      }

      /* Badges */
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        border-radius: 20px;
        font-size: 0.62rem;
        font-weight: 700;
        color: #080a0f;
        cursor: help;
      }
      .badge.blue   { background: #63b3ed; }
      .badge.teal   { background: rgb(0,168,168); }
      .badge.orange { background: #f6ad55; }

      .badge-legend {
        display: flex;
        gap: 12px;
        padding: 4px 20px 8px;
        font-size: 0.7rem;
        color: #64748b;
        font-family: monospace;
        flex-wrap: wrap;
      }
      .legend-dot {
        display: inline-block;
        width: 8px; height: 8px;
        border-radius: 50%;
        margin-right: 3px;
        vertical-align: middle;
      }
      .legend-dot.blue { background: #63b3ed; }
      .legend-dot.teal { background: rgb(0,168,168); }
      .legend-dot.orange { background: #f6ad55; }
      .legend-dot.yellow { background: #ffd701; }

      /* Panel body */
      .panel-body {
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 68vh;
        overflow-y: auto;
        min-height: 0;
      }
      .panel-body::-webkit-scrollbar { width: 4px; }
      .panel-body::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }

      /* Group cards */
      .group-card {
        background: #161b26;
        border: 2px solid rgba(99,179,237,0.2);
        border-radius: 12px;
        overflow: visible;
      }
      .group-header {
        padding: 14px 16px 0;
        font-size: 1rem;
        font-weight: 700;
        color: #e2e8f0;
        font-family: 'DM Sans', sans-serif;
      }
      .group-body {
        padding: 14px 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* Fields */
      .field { display: flex; flex-direction: column; gap: 5px; }
      .field label { font-size: 0.9rem; font-weight: 500; color: #94a3b8; }
      .field input, .field select {
        width: 100%;
        padding: 9px 12px;
        background: #0d0f18;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: #e2e8f0;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        outline: none;
        transition: border-color 0.15s;
        appearance: none;
        -webkit-appearance: none;
      }
      .field input:focus, .field select:focus { border-color: rgba(99,179,237,0.5); }
      .field select {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 32px;
      }
      .field select option { background: #0d0f18; color: #e2e8f0; }
      .mono { font-family: monospace !important; color: #68d391 !important; }
      .required { color: #fc8181; }
      .optional { font-size: 0.78rem; font-weight: 400; color: #64748b; }

      /* Hint */
      .hint {
        font-size: 0.82rem;
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
        display: flex;
        align-items: flex-start;
        gap: 5px;
      }
      .hint::before { content: 'ⓘ'; color: #63b3ed; font-style: normal; flex-shrink: 0; }
      .accent { color: #63b3ed; }

      /* Icons */
      .icon-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .icon-field { display: flex; flex-direction: column; gap: 5px; }
      .icon-field label { font-size: 0.9rem; font-weight: 500; color: #94a3b8; }
      .icon-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: #0d0f18;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
      }
      .mdi-prefix { font-size: 0.75rem; color: #64748b; font-family: monospace; flex-shrink: 0; }
      .icon-wrap input {
        flex: 1;
        background: transparent;
        border: none;
        color: #e2e8f0;
        font-family: monospace;
        font-size: 0.85rem;
        outline: none;
        padding: 0;
        width: 100%;
      }

      /* Colors */
      .color-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .color-field { display: flex; flex-direction: column; gap: 5px; }
      .color-field label { font-size: 0.85rem; color: #94a3b8; }
      .color-wrap { position: relative; display: flex; align-items: center; }
      .color-dot {
        position: absolute;
        left: 10px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.1);
        pointer-events: none;
        z-index: 1;
      }
      .color-wrap select {
        width: 100%;
        padding: 8px 32px 8px 34px;
        background: #0d0f18;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: #e2e8f0;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.85rem;
        outline: none;
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
      }
      .color-wrap select option { background: #0d0f18; color: #e2e8f0; }

      /* Toggle */
      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #0d0f18;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
      }
      .toggle-label { font-size: 0.9rem; color: #e2e8f0; }
      .toggle-sub { font-size: 0.82rem; color: #94a3b8; margin-top: 2px; }
      .toggle {
        width: 40px; height: 22px;
        border-radius: 11px;
        background: #1e2535;
        border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer;
        position: relative;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .toggle.on { background: #68d391; border-color: #68d391; }
      .toggle::after {
        content: '';
        width: 16px; height: 16px;
        border-radius: 50%;
        background: white;
        position: absolute;
        top: 2px; left: 2px;
        transition: transform 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }
      .toggle.on::after { transform: translateX(18px); }

      /* Mini toggle */
      .mini-toggle {
        width: 32px; height: 18px;
        border-radius: 9px;
        background: #68d391;
        border: 1px solid #68d391;
        position: relative;
        transition: background 0.2s;
        flex-shrink: 0;
        cursor: pointer;
      }
      .mini-toggle.off { background: #1e2535; border-color: rgba(255,255,255,0.08); }
      .mini-toggle::after {
        content: '';
        width: 13px; height: 13px;
        border-radius: 50%;
        background: white;
        position: absolute;
        top: 2px;
        transition: left 0.2s, right 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }
      .mini-toggle:not(.off)::after { right: 2px; left: auto; }
      .mini-toggle.off::after { left: 2px; right: auto; }

      .toggle-unit { display: flex; flex-direction: column; align-items: center; gap: 2px; }
      .toggle-unit-label { font-size: 0.65rem; color: transparent; height: 10px; font-family: monospace; }
      .toggle-unit-label.paused { color: #f6ad55; }

      /* Condition cards */
      .cond-card {
        background: #1e2535;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        overflow: hidden;
      }
      .cond-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        cursor: pointer;
        gap: 8px;
      }
      .cond-header:hover { background: rgba(255,255,255,0.02); }
      .cond-header-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden; }
      .cond-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
      .cond-dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .cond-dot.active { background: rgb(47,207,118); }
      .cond-dot.paused { background: #f6ad55; }
      .cond-summary { flex: 1; min-width: 0; }
      .cond-name { font-size: 0.9rem; font-weight: 600; color: #e2e8f0; }
      .cond-sub { font-size: 0.75rem; color: #63b3ed; font-family: monospace; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

      .keyword-count {
        font-size: 0.78rem;
        color: #63b3ed;
        font-family: monospace;
        font-weight: 600;
        margin-top: 4px;
        display: block;
      }

      .entity-list-title {
        font-size: 0.78rem;
        color: #63b3ed;
        font-family: monospace;
        font-weight: 600;
      }
      .cond-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); }

      .paused-pill {
        display: inline-block;
        padding: 1px 7px; border-radius: 20px;
        background: rgba(246,173,85,0.1);
        border: 1px solid rgba(246,173,85,0.2);
        font-size: 0.62rem; color: #f6ad55;
        font-family: monospace; font-weight: 400;
        vertical-align: middle; margin-left: 5px;
      }
      .and-badge {
        display: inline-flex;
        padding: 1px 7px; border-radius: 20px;
        background: rgba(99,179,237,0.12);
        border: 1px solid rgba(99,179,237,0.25);
        font-size: 0.62rem; color: #63b3ed;
        font-family: monospace; font-weight: 700;
        vertical-align: middle; margin-left: 5px;
      }
      .chevron { color: #64748b; font-size: 10px; flex-shrink: 0; }
      .delete-btn {
        padding: 3px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.08);
        background: transparent;
        color: #64748b;
        font-size: 0.8rem;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        transition: all 0.15s;
      }
      .delete-btn:hover { color: #fc8181; border-color: #fc8181; }

      /* State pill */
      .state-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: #1e2535;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        font-size: 0.82rem;
        color: #68d391;
        font-family: monospace;
        align-self: flex-start;
      }
      .state-label { color: #64748b; }

      /* Trigger row */
      .trigger-row { display: flex; gap: 8px; align-items: flex-end; }
      .op-field { display: flex; flex-direction: column; gap: 5px; }
      .op-field label { font-size: 0.9rem; font-weight: 500; color: #94a3b8; }
      .op-select {
        padding: 9px 10px;
        background: #0d0f18;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: #63b3ed;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        outline: none;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        text-align: left;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2363b3ed' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        padding-right: 24px;
        white-space: nowrap;
      }
      .op-select option { background: #0d0f18; color: #e2e8f0; }

      /* Exact warning */
      .exact-warning {
        font-size: 0.82rem;
        color: #ffd701;
        font-family: 'DM Sans', sans-serif;
        display: flex;
        align-items: flex-start;
        gap: 5px;
      }

      /* AND section */
      .and-section {
        border: 1px solid rgba(99,179,237,0.15);
        border-radius: 8px;
        overflow: hidden;
        background: rgba(99,179,237,0.02);
      }
      .and-title {
        padding: 8px 12px;
        font-size: 0.9rem;
        font-weight: 700;
        color: #63b3ed;
        font-family: 'DM Sans', sans-serif;
      }
      .and-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }
      .add-and {
        background: transparent;
        border: none;
        color: #63b3ed;
        font-size: 0.85rem;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        text-decoration: underline;
        padding: 4px 0;
        text-align: left;
      }
      .add-and:hover { opacity: 0.75; }

      /* Entity list */
      .entity-list {
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        overflow: hidden;
      }
      .entity-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 7px 12px;
        background: #1e2535;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        font-size: 0.78rem;
        color: #64748b;
        font-family: monospace;
      }
      .match-count { color: #63b3ed; font-weight: 600; }
      .list-action-btn {
        border: none;
        border-radius: 6px;
        font-size: 0.78rem;
        font-family: 'DM Sans', sans-serif;
        font-weight: 600;
        padding: 4px 10px;
        cursor: pointer;
        transition: all 0.15s;
        text-align: center;
      }
      .include-all-btn { background: rgba(47,207,118,0.85); color: #080a0f; }
      .include-all-btn:hover { background: rgb(47,207,118); }
      .exclude-all-btn { background: rgba(246,173,85,0.85); color: #080a0f; }
      .exclude-all-btn:hover { background: #f6ad55; }
      .entity-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 12px 12px;
        cursor: pointer;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        transition: background 0.1s;
      }
      .entity-item:last-child { border-bottom: none; }
      .entity-item.excluded { opacity: 0.6; }
      .entity-info { flex: 1; min-width: 0; }
      .entity-name { font-size: 0.85rem; color: #e2e8f0; font-weight: 500; }
      .entity-id { font-size: 0.72rem; color: #64748b; font-family: monospace; margin-top: 1px; }
      .entity-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
      .state-val {
        font-size: 0.72rem;
        font-family: monospace;
        color: #68d391;
        padding: 2px 7px;
        background: rgba(104,211,145,0.08);
        border: 1px solid rgba(104,211,145,0.15);
        border-radius: 4px;
      }
      .entity-item.excluded .state-val {
        color: #f6ad55;
        background: rgba(246,173,85,0.35);
        border-color: rgba(246,173,85,0.5);
      }

      /* Add buttons */
      .add-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: transparent;
        border: 1px dashed rgba(255,255,255,0.12);
        border-radius: 8px;
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.15s;
        width: fit-content;
      }
      .add-btn:hover { border-color: #63b3ed; color: #63b3ed; background: rgba(99,179,237,0.04); }
      .plus {
        width: 20px; height: 20px;
        border-radius: 50%;
        background: #1e2535;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }

      .expand-btn {
        font-size: 0.85rem;
        color: #63b3ed;
        background: transparent;
        border: none;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        text-decoration: underline;
      }
      .expand-btn:hover { opacity: 0.75; }

      .empty-hint {
        font-size: 0.85rem;
        color: #64748b;
        font-style: italic;
        padding: 4px 0;
      }

      /* Footer */
      .dialog-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 20px;
        border-top: 1px solid rgba(255,255,255,0.06);
        flex-wrap: wrap;
      }
      .error-msg { font-size: 0.82rem; color: #fc8181; flex: 1; }
      .saved-msg { font-size: 0.82rem; color: #68d391; }
      .version-stamp { font-size: 0.65rem; color: #64748b; font-family: monospace; margin-right: auto; }
      .footer-buttons { display: flex; gap: 10px; margin-left: auto; }
      .btn-cancel {
        padding: 9px 18px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.1);
        background: transparent;
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-cancel:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
      .btn-save {
        padding: 9px 22px;
        border-radius: 8px;
        border: none;
        background: #63b3ed;
        color: #080a0f;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(99,179,237,0.3);
        transition: all 0.15s;
      }
      .btn-save:hover { background: #90cdf4; }
      .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

      /* Domain filter */
      .domain-filter {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .domain-filter-label {
        font-size: 0.82rem;
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
      }
      .domain-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .domain-chip {
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-family: monospace;
        cursor: pointer;
        transition: all 0.15s;
        border: 1px solid;
      }
      .domain-chip.included {
        background: rgba(47,207,118,0.1);
        border-color: rgba(47,207,118,0.3);
        color: rgb(47,207,118);
      }
      .domain-chip.excluded {
        background: rgba(246,173,85,0.08);
        border-color: rgba(246,173,85,0.2);
        color: #f6ad55;
      }
      @keyframes chip-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
     
      .domain-chip:hover { opacity: 0.75; }

      .btn-close {
        padding: 9px 18px;
        border-radius: 8px;
        border: 1px solid rgba(99,179,237,0.3);
        background: transparent;
        color: #63b3ed;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.15s;
      }

      .btn-close:hover { background: rgba(99,179,237,0.1); }

      /* Entity picker */
      .entity-picker { position: relative; width: 100%; }
      .entity-picker-input-wrap {
        display: flex; align-items: center;
        background: #0d0f18;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px; overflow: hidden;
        transition: border-color 0.15s;
      }
      .entity-picker-input-wrap:focus-within { border-color: rgba(99,179,237,0.5); }
      .entity-picker-input {
        flex: 1; padding: 9px 12px;
        background: transparent; border: none;
        color: #e2e8f0; font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem; outline: none; width: 100%;
      }
      .entity-picker-clear {
        padding: 0 10px; background: transparent;
        border: none; color: #64748b;
        cursor: pointer; font-size: 0.8rem; flex-shrink: 0;
      }
      .entity-picker-clear:hover { color: #fc8181; }
      .entity-picker-dropdown {
        position: absolute; top: calc(100% + 4px);
        left: 0; right: 0; background: #0f1219;
        border: 1px solid rgba(99,179,237,0.2);
        border-radius: 8px; max-height: 240px;
        overflow-y: auto; z-index: 100;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      }
      .entity-picker-dropdown::-webkit-scrollbar { width: 4px; }
      .entity-picker-dropdown::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }
      .entity-picker-empty {
        padding: 12px; color: #64748b;
        font-size: 0.85rem; font-family: 'DM Sans', sans-serif;
        text-align: center;
      }
      .entity-picker-item {
        display: flex; align-items: center;
        justify-content: space-between;
        padding: 8px 12px; cursor: pointer;
        border-bottom: 1px solid rgba(255,255,255,0.04);
        transition: background 0.1s;
      }
      .entity-picker-item:last-child { border-bottom: none; }
      .entity-picker-item:hover { background: rgba(99,179,237,0.06); }
      .entity-picker-item.selected { background: rgba(99,179,237,0.1); }
      .entity-picker-item-left {
        display: flex; align-items: center;
        gap: 8px; min-width: 0; flex: 1;
      }
      .entity-picker-domain {
        font-size: 0.65rem; font-family: monospace;
        color: #080a0f; background: rgb(0,168,168);
        padding: 1px 6px; border-radius: 4px;
        flex-shrink: 0; font-weight: 700;
      }
      .entity-picker-names { display: flex; flex-direction: column; min-width: 0; }
      .entity-picker-friendly {
        font-size: 0.85rem; color: #e2e8f0; font-weight: 500;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .entity-picker-id {
        font-size: 0.7rem; color: #64748b; font-family: monospace;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .entity-picker-state {
        font-size: 0.72rem; font-family: monospace; color: #68d391;
        padding: 2px 7px; background: rgba(104,211,145,0.08);
        border: 1px solid rgba(104,211,145,0.15);
        border-radius: 4px; flex-shrink: 0; margin-left: 8px;
      }
      .mixed-warning {
        font-size: 0.82rem;
         color: rgba(255, 215, 1, 0.6);
         font-style: italic;
        font-family: 'DM Sans', sans-serif;
        padding: 8px 12px;
        background: rgba(255,215,0,0.01);
        border: 1px solid rgba(255,215,0,0.2);
        border-radius: 8px;
      }
      .entity-label-input {
        margin-top: 4px;
        width: 100%;
        padding: 4px 8px;
        background: #0d0f18;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 6px;
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.75rem;
        outline: none;
        transition: border-color 0.15s;
      }
      .entity-label-input:focus {
        border-color: rgba(99,179,237,0.4);
        color: #e2e8f0;
      }
      .entity-label-input::placeholder { color: #475569; }

      /* Overview tab */
      .overview-key {
        display: flex;
        gap: 16px;
        padding: 10px 14px;
        background: #161b26;
        border: 2px solid rgba(99,179,237,0.2);
        border-radius: 10px;
        font-size: 0.8rem;
        font-family: 'DM Sans', sans-serif;
        color: #94a3b8;
        flex-wrap: wrap;
        flex-shrink: 0;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .overview-key-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .overview-dot {
        width: 10px; height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .overview-dot.alert  { background: rgba(252,129,129,0.9); }
      .overview-dot.paused { background: #f6ad55; }
      .overview-dot.ok     { background: rgb(47,207,118); }

      .overview-scroll-wrap {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        border-radius: 12px;
      }
      .overview-scroll-wrap::-webkit-scrollbar { width: 4px; }
      .overview-scroll-wrap::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }
      .overview-container {
        background: #161b26;
        border: 2px solid rgba(99,179,237,0.2);
        border-radius: 12px;
        overflow-y: auto;
        max-height: calc(68vh - 130px);
      }
      .overview-domain-divider {
        padding: 6px 14px;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #63b3ed;
        font-family: monospace;
        background: rgba(99,179,237,0.06);
        border-top: 1px solid rgba(99,179,237,0.12);
        border-bottom: 1px solid rgba(99,179,237,0.08);
      }
      .overview-container > .overview-domain-divider:first-of-type {
        border-top: none;
      }
      .overview-thead {
        display: grid;
        grid-template-columns: 1fr 100px 90px;
        padding: 6px 14px;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #475569;
        font-family: 'DM Sans', sans-serif;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .overview-row {
        display: grid;
        grid-template-columns: 1fr 100px 90px;
        align-items: center;
        padding: 9px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.04);
        gap: 8px;
      }
      .overview-row:last-child { border-bottom: none; }
      .overview-row.row-alert  { background: rgba(252,129,129,0.06); border-left: 3px solid rgba(252,129,129,0.6); padding-left: 11px; }
      .overview-row.row-paused { background: rgba(246,173,85,0.06);  border-left: 3px solid rgba(246,173,85,0.5);  padding-left: 11px; }
      .overview-row.row-ok     { background: transparent; }
      .overview-entity-cell {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }
      .overview-entity-name {
        font-size: 0.88rem;
        font-weight: 500;
        color: #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .overview-row.row-alert  .overview-entity-name { color: #fc8181; }
      .overview-row.row-paused .overview-entity-name { color: #f6ad55; }
      .overview-source-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 7px;
        border-radius: 20px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        font-size: 0.62rem;
        font-family: monospace;
        width: fit-content;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .overview-source-type {
        color: #63b3ed;
        font-weight: 700;
      }
      .overview-source-name {
        color: #94a3b8;
      }
      .overview-state {
        font-size: 0.78rem;
        font-family: monospace;
        color: #68d391;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .overview-row.row-alert  .overview-state { color: #fc8181; }
      .overview-row.row-paused .overview-state { color: #f6ad55; }
      .overview-condition {
        font-size: 0.78rem;
        font-family: monospace;
        color: #94a3b8;
        white-space: nowrap;
      }
    `;
  }
}

if (!customElements.get("combined-notifications-panel")) {
  customElements.define("combined-notifications-panel", CombinedNotificationsPanel);
}
} // end definePanel
