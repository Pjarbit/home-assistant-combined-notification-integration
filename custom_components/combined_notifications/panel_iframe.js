/**
 * Combined Notifications Panel v7.2.2
 * Vanilla JS — iframe REST API approach
 * pja 7.2.2
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VERSION = "7.2.2";

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
const OPERATOR_LABEL_TO_SYMBOL = { "equals": "==", "not equal to": "!=", "greater than": ">", "less than": "<" };
const OPERATOR_SYMBOL_TO_LABEL = { "==": "equals", "!=": "not equal to", ">": "greater than", "<": "less than" };

const DOMAIN_GROUPS = {
  "Sensors":  ["sensor", "binary_sensor", "input_boolean", "input_select", "input_number", "input_text", "input_datetime", "counter", "timer"],
  "Lights":   ["light"],
  "Switches": ["switch"],
  "Locks":    ["lock"],
  "Covers":   ["cover"],
  "Climate":  ["climate"],
  "Presence": ["person", "device_tracker"],
  "Media":    ["media_player"],
  "Cameras":  ["camera"],
  "Other":    ["automation", "script", "scene", "button", "event", "update", "number", "select", "text"]
};
const ICON_GROUPS = {
  "All Clear": [
    "mdi:hand-okay", "mdi:check-circle", "mdi:check-all", "mdi:bell-off",
    "mdi:thumb-up", "mdi:shield-check", "mdi:shield-home-outline",
    "mdi:emoticon-happy", "mdi:emoticon-excited",
    "mdi:music", "mdi:music-note-sixteenth-dotted"
  ],
  "General Alert": [
    "mdi:alert-circle", "mdi:alert", "mdi:bell-ring", "mdi:bell-alert",
    "mdi:exclamation-thick", "mdi:exclamation", "mdi:alert-octagon",
    "mdi:information"
  ],
  "Security & Doors": [
    "mdi:door-open", "mdi:door-closed", "mdi:lock-open", "mdi:lock",
    "mdi:window-open", "mdi:window-closed-variant", "mdi:garage-open", "mdi:garage",
    "mdi:shield-alert", "mdi:shield-check", "mdi:home-alert", "mdi:home-check"
  ],
  "Lights": [
    "mdi:lightbulb-on", "mdi:lightbulb-off", "mdi:lightbulb-alert"
  ],
  "Motion & Presence": [
    "mdi:motion-sensor", "mdi:eye", "mdi:walk", "mdi:home-account"
  ],
  "Climate & Environment": [
    "mdi:thermometer-alert", "mdi:water-alert", "mdi:smoke-detector-alert",
    "mdi:weather-windy", "mdi:snowflake-alert", "mdi:flower-pollen"
  ],
  "Weather": [
    "mdi:weather-lightning", "mdi:weather-hurricane", "mdi:weather-tornado",
    "mdi:weather-snowy-heavy", "mdi:weather-pouring", "mdi:weather-windy",
    "mdi:weather-fog", "mdi:weather-partly-cloudy", "mdi:snowflake-alert",
    "mdi:thermometer-alert"
  ],
  "Vehicles": [
    "mdi:car", "mdi:car-emergency", "mdi:garage", "mdi:garage-open", "mdi:car-door"
  ],
  "Batteries": [
    "mdi:battery-alert", "mdi:battery-low", "mdi:battery-off"
  ],
  "Appliances": [
    "mdi:washing-machine-alert", "mdi:dishwasher-alert", "mdi:fridge-alert"
  ],
  "Hazard & Safety": [
    "mdi:radioactive", "mdi:biohazard", "mdi:skull-crossbones",
    "mdi:chemical-weapon", "mdi:gas-cylinder", "mdi:air-filter"
  ],
  "Animals": [
    "mdi:dog", "mdi:cat", "mdi:deer", "mdi:raccoon"
  ]
};

const ALL_ICONS = Object.values(ICON_GROUPS).flat();

function mdiIconUrl(iconName) {
  const name = iconName.replace("mdi:", "");
  return `https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/${name}.svg`;
}

function buildIconPicker(id, label, value) {
  const safeVal = value || "";
  return `
    <div style="display:flex;flex-direction:column;gap:5px;">
      <label style="font-size:0.9rem;font-weight:500;color:#94a3b8;">${label}</label>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;flex-shrink:0;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${safeVal ? `<img src="${mdiIconUrl(safeVal)}" style="width:22px;height:22px;filter:invert(1);opacity:0.8;" onerror="this.style.display='none'">` : ""}
        </div>
        <select id="${id}" style="flex:1;padding:8px 12px;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-family:'DM Sans',sans-serif;font-size:0.85rem;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;">
          ${Object.entries(ICON_GROUPS).map(([group, icons]) => `
            <optgroup label="${group}">
              ${icons.map(icon => `<option value="${icon}" ${icon === safeVal ? "selected" : ""}>${icon.replace("mdi:", "")}</option>`).join("")}
            </optgroup>
          `).join("")}
        </select>
      </div>

      <input id="${id}-custom" type="text" placeholder="or type custom: mdi:icon-name" value="${safeVal && !ALL_ICONS.includes(safeVal) ? safeVal : ""}" style="font-size:0.82rem;padding:6px 10px;background:#0d0f18;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#94a3b8;font-family:monospace;outline:none;box-sizing:border-box;width:100%;">
    </div>
  `;
}


// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _config = null;
let _options = {};
let _states = {};
let _allEntityList = [];
let _activeTab = "general";
let _expandedConditions = new Set();
let _entitySearch = {};
let _backupMsg = "";
let _saving = false;
let _saved = false;
let _error = "";
let _lastUpdated = null;
let _statesLoading = false;
let _pollTimer = null;
let _debounceTimer = null;
let _entryId = "";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function getToken() {
  try {
    const raw = localStorage.getItem("hassTokens");
    if (!raw) return "";
    const tokens = JSON.parse(raw);
    return tokens.access_token || "";
  } catch (e) {
    console.warn("CN Panel: Token retrieval failed", e);
    return "";
  }
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function loadConfig() {
  try {
    console.log('%cCN Panel: Loading config via REST', 'color:#63b3ed', _entryId);
    const resp = await fetch(`/api/combined_notifications/config?entry_id=${_entryId}`, {
      headers: { "Authorization": `Bearer ${getToken()}` }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const result = await resp.json();
    console.log('%cCN Panel: Config loaded successfully', 'color:#39FF14');

    _config = { ...result.config };
    _options = { ...(result.options || {}) };
    if (!_config.conditions) _config.conditions = [];

    _config.conditions = _config.conditions.map(c => ({
      ...c,
      operator: OPERATOR_SYMBOL_TO_LABEL[c.operator] || c.operator,
      and_conditions: (c.and_conditions || []).map(ac => ({
        ...ac,
        operator: OPERATOR_SYMBOL_TO_LABEL[ac.operator] || ac.operator,
      })),
    }));

    await loadStates();
    render();
  } catch (e) {
    console.error("CN Panel: config load error:", e);
    _error = `Failed to load config: ${e.message}`;
    render();
  }
}

async function loadStates() {
  if (_statesLoading) return;
  _statesLoading = true;
  try {
    const resp = await fetch(`/api/combined_notifications/states`, {
      headers: { "Authorization": `Bearer ${getToken()}` }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const result = await resp.json();

    _states = result.states || {};
    _allEntityList = Object.entries(_states)
      .map(([id, s]) => [id, {
        ...s,
        friendly_name: s.friendly_name || s.attributes?.friendly_name || id,
        state: s.state || "",
      }])
      .sort((a, b) => {
        const da = a[0].split(".")[0], db = b[0].split(".")[0];
        return da !== db ? da.localeCompare(db) : a[0].localeCompare(b[0]);
      });

    _lastUpdated = Date.now();
    if (_config) render();
  } catch (e) {
    console.error("CN Panel: states load error:", e);
    _states = {};
    _allEntityList = [];
  }
  _statesLoading = false;
}

async function saveConfig() {
  _saving = true;
  _saved = false;
  _error = "";
  render();
  try {
    const conditions = (_config.conditions || []).map(c => ({
      ...c,
      operator: OPERATOR_LABEL_TO_SYMBOL[c.operator] || c.operator,
      and_conditions: (c.and_conditions || []).map(ac => ({
        ...ac,
        operator: OPERATOR_LABEL_TO_SYMBOL[ac.operator] || ac.operator,
      })),
    }));
    const resp = await fetch(`/api/combined_notifications/config?entry_id=${_entryId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ..._config, conditions }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _saved = true;
  } catch (e) {
    _error = `Failed to save: ${e.message}`;
  }
  _saving = false;
  render();
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

function startPolling() {
  // No auto-polling — user refreshes browser to get latest states
}

function stopPolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  _statesLoading = false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentState(entityId) { return _states[entityId]?.state || ""; }

function evalCondition(state, operator, triggerValue) {
  const op = OPERATOR_LABEL_TO_SYMBOL[operator] || operator;
  const ns = parseFloat(state), nt = parseFloat(triggerValue);
  const hasNums = !isNaN(ns) && !isNaN(nt);
  if (op === "==") return hasNums ? ns === nt : state === triggerValue;
  if (op === "!=") return hasNums ? ns !== nt : state !== triggerValue;
  if (op === ">")  return hasNums && ns > nt;
  if (op === "<")  return hasNums && ns < nt;
  return false;
}

function matchedEntities(condition) {
  const keyword = (condition.entity_filter || "").toLowerCase();
  if (!keyword) return [];
  return _allEntityList.filter(([id, s]) => {
    const fn = (s.friendly_name || "").toLowerCase();
    return id.toLowerCase().includes(keyword) || fn.includes(keyword);
  });
}

function sanitizeName(val) {
  return val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function pluralizeDomain(domain) {
  const map = {
    "binary_sensor": "Binary Sensors", "sensor": "Sensors", "switch": "Switches",
    "lock": "Locks", "light": "Lights", "cover": "Covers", "climate": "Climate",
    "person": "People", "device_tracker": "Device Trackers", "media_player": "Media Players",
    "automation": "Automations", "script": "Scripts", "scene": "Scenes",
    "input_boolean": "Input Booleans", "input_select": "Input Selects",
    "input_number": "Input Numbers", "camera": "Cameras", "update": "Updates",
    "number": "Numbers", "select": "Selects", "button": "Buttons",
  };
  return map[domain] || domain;
}

function getIndividual() {
  return (_config?.conditions || []).map((c, i) => ({ c, i })).filter(({ c }) => !("entity_filter" in c));
}

function getSmartGroups() {
  return (_config?.conditions || []).map((c, i) => ({ c, i })).filter(({ c }) => "entity_filter" in c);
}

function timeAgo() {
  if (!_lastUpdated) return "";
  return `${Math.round((Date.now() - _lastUpdated) / 1000)}s ago`;
}

function esc(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inputStyle() {
  return "width:100%;padding:9px 12px;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-family:'DM Sans',sans-serif;font-size:0.9rem;outline:none;box-sizing:border-box;";
}

function hintStyle() {
  return "font-size:0.82rem;color:#94a3b8;font-family:'DM Sans',sans-serif;display:flex;align-items:flex-start;gap:5px;";
}

function addBtnStyle() {
  return "display:flex;align-items:center;gap:8px;padding:10px 14px;background:transparent;border:1px dashed rgba(255,255,255,0.12);border-radius:8px;color:#94a3b8;font-family:'DM Sans',sans-serif;font-size:0.9rem;cursor:pointer;width:fit-content;";
}

function plusStyle() {
  return "width:20px;height:20px;border-radius:50%;background:#1e2535;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;";
}

function miniToggle(on, paused = false) {
  const bg = paused ? "#f6ad55" : on ? "#68d391" : "#1e2535";
  const border = paused ? "#f6ad55" : on ? "#68d391" : "rgba(255,255,255,0.08)";
  const dotPos = (on && !paused) ? "right:2px;" : "left:2px;";
  return `style="width:32px;height:18px;border-radius:9px;background:${bg};border:1px solid ${border};position:relative;cursor:pointer;flex-shrink:0;display:inline-block;"><div style="width:13px;height:13px;border-radius:50%;background:#1a1a1a;position:absolute;top:2px;${dotPos}box-shadow:0 1px 3px rgba(0,0,0,0.4);pointer-events:none;"></div`;
}

function miniToggleStyle(on, paused = false) {
  const bg = paused ? "#f6ad55" : on ? "#68d391" : "#1e2535";
  const border = paused ? "#f6ad55" : on ? "#68d391" : "rgba(255,255,255,0.08)";
  return `width:32px;height:18px;border-radius:9px;background:${bg};border:1px solid ${border};position:relative;cursor:pointer;flex-shrink:0;display:inline-block;`;
}

function bigToggleStyle(on) {
  return `width:40px;height:22px;border-radius:11px;background:${on ? "#68d391" : "#1e2535"};border:1px solid ${on ? "#68d391" : "rgba(255,255,255,0.08)"};cursor:pointer;position:relative;flex-shrink:0;`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render() {
  const app = document.getElementById("cn-app");
  if (!app) return;
  console.log('%cCN Panel: render() called', 'color:#63b3ed');

  if (!_config) {
    app.innerHTML = `
      <div style="min-height:100vh;background:#080a0f;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;color:#94a3b8;">
        ${_error
          ? `<div style="color:#fc8181;padding:40px;text-align:center">${_error}</div>`
          : `<div style="padding:40px;text-align:center">Loading configuration...</div>`}
      </div>`;
    return;
  }

  app.innerHTML = buildPanel();
  attachEvents();
}

// ---------------------------------------------------------------------------
// Panel Builder
// ---------------------------------------------------------------------------

function buildPanel() {
  const individual = getIndividual();
  const groups = getSmartGroups();
  const indivActive = individual.filter(({ c }) => !c.paused).length;
  const indivPaused = individual.filter(({ c }) => c.paused).length;
  const groupActive = groups.filter(({ c }) => !c.paused).length;
  const groupEntityCount = groups.reduce((n, { c }) => {
    if (c.paused) return n;
    const excl = new Set(c.entity_filter_exclude || []);
    return n + matchedEntities(c).filter(([id]) => !excl.has(id)).length;
  }, 0);
  const groupPaused = groups.filter(({ c }) => c.paused).length;
  const overviewCount = individual.length + groups.reduce((n, { c }) => {
    const excl = new Set(c.entity_filter_exclude || []);
    return n + matchedEntities(c).filter(([id]) => !excl.has(id)).length;
  }, 0);

  const sensorId = `sensor.${(_config.name || "").toLowerCase().replace(/\s+/g, "_")}`;
  const sensorObj = _states[sensorId];
  const isClear = sensorObj ? (sensorObj.attributes?.is_clear !== false) : true;
  const numUnmet = sensorObj?.attributes?.number_unmet || 0;
  const sensorState = sensorObj?.state || "";

  return `
<div style="min-height:100vh;background:#080a0f;display:flex;align-items:flex-start;justify-content:center;padding:24px;font-family:'DM Sans','Segoe UI',sans-serif;color:#e2e8f0;box-sizing:border-box;">
  <div style="width:560px;max-width:100%;background:#0f1219;border-radius:16px;box-shadow:0 32px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.05);overflow:visible;display:flex;flex-direction:column;">

    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 0;">
      <span style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;">⚙ COMBINED NOTIFICATIONS — CONFIGURATION</span>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
        <span style="font-size:0.72rem;color:#63b3ed;font-family:monospace;">sensor.${esc(_config.name || "")}</span>
        ${sensorObj ? `<span style="font-size:0.72rem;font-family:monospace;font-style:italic;color:${isClear ? "rgb(47,207,118)" : "#ffd701"};">${esc(sensorState)}${!isClear ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;border-radius:20px;background:rgba(255,215,1,0.7);color:#080a0f;font-size:0.62rem;font-weight:700;margin-left:4px;">${numUnmet}</span>` : ""}</span>` : ""}
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
          <span style="font-size:0.62rem;color:rgba(255,215,1,0.45);font-family:'DM Sans',sans-serif;font-style:italic;">Your sensor updates instantly. Refresh your browser to see current states in this panel.</span>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:4px;padding:12px 20px 0;border-bottom:2px solid rgba(255,255,255,0.08);margin-top:4px;flex-wrap:wrap;">
      ${buildTab("general", "General")}
      ${buildTab("individual", `Individual ${badge(indivActive, "#63b3ed")}${indivPaused > 0 ? badge(indivPaused, "#f6ad55") : ""}`)}
      ${buildTab("smartgroups", `Smart Groups ${badge(groupActive, "#63b3ed")}${badge(groupEntityCount, "rgb(0,168,168)")}${groupPaused > 0 ? badge(groupPaused, "#f6ad55") : ""}`)}
      ${buildTab("overview", `Overview ${badge(overviewCount, "#63b3ed")}`)}
    </div>

    <div style="display:flex;gap:12px;padding:4px 20px 8px;font-size:0.7rem;color:#64748b;font-family:monospace;flex-wrap:wrap;">
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#63b3ed;margin-right:3px;vertical-align:middle;"></span>conditions</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgb(0,168,168);margin-right:3px;vertical-align:middle;"></span>entities</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f6ad55;margin-right:3px;vertical-align:middle;"></span>paused</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffd701;margin-right:3px;vertical-align:middle;"></span>alert</span>
    </div>

    <div style="padding:18px 20px;display:flex;flex-direction:column;gap:16px;height:calc(100vh - 200px);overflow-y:auto;">
      ${_activeTab === "general"     ? buildGeneral()     : ""}
      ${_activeTab === "individual"  ? buildIndividual()  : ""}
      ${_activeTab === "smartgroups" ? buildSmartGroups() : ""}
      ${_activeTab === "overview"    ? buildOverview()    : ""}
    </div>

    <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid rgba(255,255,255,0.06);flex-wrap:wrap;">
      <span style="font-size:0.65rem;color:#64748b;font-family:monospace;margin-right:auto;">pja 7.2.2</span>
      ${_error ? `<span style="font-size:0.82rem;color:#fc8181;flex:1;">${esc(_error)}</span>` : ""}
      ${_saved ? `<span style="font-size:0.82rem;color:#68d391;">✓ Saved — this window can safely be closed.</span>` : ""}
      <div style="display:flex;gap:10px;">
        <button id="cancel-btn" style="padding:9px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#94a3b8;font-family:'DM Sans',sans-serif;font-size:0.9rem;cursor:pointer;">Cancel</button>
        ${_saved ? `<button id="close-btn" style="padding:9px 18px;border-radius:8px;border:1px solid rgba(99,179,237,0.3);background:transparent;color:#63b3ed;font-family:'DM Sans',sans-serif;font-size:0.9rem;cursor:pointer;">Close Window</button>` : ""}
        <button id="save-btn" ${_saving ? "disabled" : ""} style="padding:9px 22px;border-radius:8px;border:none;background:#63b3ed;color:#080a0f;font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:700;cursor:pointer;box-shadow:0 2px 12px rgba(99,179,237,0.3);opacity:${_saving ? "0.5" : "1"};">${_saving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  </div>
</div>`;
}

function badge(count, color) {
  return `<span style="background:${color};color:#080a0f;min-width:20px;height:20px;padding:0 5px;border-radius:20px;font-size:0.62rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;">${count}</span>`;
}

function buildTab(id, label) {
  const active = _activeTab === id;
  return `<button class="tab-btn" data-tab="${id}" style="height:40px;padding:0 14px;border-radius:8px 8px 0 0;border:2px solid ${active ? "rgba(99,179,237,0.35)" : "rgba(255,255,255,0.08)"};border-bottom:${active ? "2px solid #0f1219" : "none"};background:${active ? "#0f1219" : "rgba(255,255,255,0.04)"};color:${active ? "#63b3ed" : "#94a3b8"};font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:${active ? "600" : "500"};cursor:pointer;position:relative;bottom:-2px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;">${label}</button>`;
}

function buildCard(title, content) {
  return `<div style="background:#161b26;border:2px solid rgba(99,179,237,0.2);border-radius:12px;">
    <div style="padding:14px 16px 0;font-size:1rem;font-weight:700;color:#e2e8f0;font-family:'DM Sans',sans-serif;">${title}</div>
    <div style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px;">${content}</div>
  </div>`;
}

function buildField(label, input) {
  return `<div style="display:flex;flex-direction:column;gap:5px;">
    <label style="font-size:0.9rem;font-weight:500;color:#94a3b8;">${label}</label>
    ${input}
  </div>`;
}

function buildColorSelect(id, label, value, optional = false) {
  return `<div style="display:flex;flex-direction:column;gap:5px;">
    <label style="font-size:0.85rem;color:#94a3b8;">${label}</label>
    <div style="position:relative;display:flex;align-items:center;">
      <div style="position:absolute;left:10px;width:14px;height:14px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);background:${COLOR_CSS[value] || "#888"};pointer-events:none;z-index:1;"></div>
      <select id="${id}" style="width:100%;padding:8px 32px 8px 34px;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-family:'DM Sans',sans-serif;font-size:0.85rem;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;">
        ${optional ? `<option value="">— Default —</option>` : ""}
        ${COLORS.map(c => `<option value="${c.value}" ${c.value === value ? "selected" : ""}>${esc(c.label)}</option>`).join("")}
      </select>
    </div>
  </div>`;
}

function buildToggle(id, label, sub, value) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;">
    <div>
      <div style="font-size:0.9rem;color:#e2e8f0;">${label}</div>
      <div style="font-size:0.82rem;color:#94a3b8;margin-top:2px;">${sub}</div>
    </div>
    <div id="${id}" class="big-toggle" style="${bigToggleStyle(value)}"></div>
  </div>`;
}

function buildOperatorSelect(id, value) {
  return `<select id="${id}" class="op-select" style="padding:9px 10px;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#63b3ed;font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:600;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;">
    ${OPERATORS.map(op => `<option value="${op}" ${op === (value || "equals") ? "selected" : ""}>${op}</option>`).join("")}
  </select>`;
}

// ---------------------------------------------------------------------------
// General Tab
// ---------------------------------------------------------------------------

function buildGeneral() {
  const c = _config;
  return `
    ${buildCard("Sensor Identity", `
      ${buildField("Your Sensor Name", `<input id="f-name" type="text" value="${esc(c.name || "")}" placeholder="e.g. combined_notifications_1" style="${inputStyle()}">
      <div style="${hintStyle()}"><em>Your sensor will be created as: <span style="font-family:monospace;color:#63b3ed;">sensor.${esc(c.name || "")}</span></em></div>`)}
      ${buildField("Friendly Display Name", `<input id="f-friendly" type="text" value="${esc(c.friendly_sensor_name || "")}" placeholder="e.g. Home Security" style="${inputStyle()}">`)}
    `)}
    ${buildCard("All Clear State", `
      ${buildField("All Clear Text", `
        <input id="f-allclear" type="text" value="${esc(c.text_all_clear || "ALL CLEAR")}" style="${inputStyle()}">
        ${_options.use_attributes ? `<div style="color:#63b3ed;font-size:0.8rem;margin-top:4px;">In Attribute Mode the sensor state is on/off. These values (text, colors, and icons) are still available as attributes so you can use them in cards when the fault count is 0.</div>` : ""}
      `)}      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>${buildIconPicker("f-icon-clear", "All Clear Icon", c.icon_all_clear || "mdi:hand-okay")}</div>
        <div>${buildIconPicker("f-icon-alert", "Alert Icon", c.icon_alert || "mdi:alert-circle")}</div>
      </div>
    `)}
    ${buildCard("Colors", `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${buildColorSelect("f-bg-clear", "All Clear Background", c.background_color_all_clear)}
        ${buildColorSelect("f-bg-alert", "Alert Background", c.background_color_alert)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
        ${buildColorSelect("f-text-clear", "All Clear Text Color", c.text_color_all_clear, true)}
        ${buildColorSelect("f-text-alert", "Alert Text Color", c.text_color_alert, true)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
        ${buildColorSelect("f-icon-color-clear", "All Clear Icon Color", c.icon_color_all_clear, true)}
        ${buildColorSelect("f-icon-color-alert", "Alert Icon Color", c.icon_color_alert, true)}
      </div>
    `)}
    ${buildCard("Display Options", `
      ${buildToggle("f-hide-title", "Hide title in all-clear state", "Shows only the icon when everything is OK", c.hide_title)}
      ${buildToggle("f-hide-title-alert", "Hide title in alert state", "Shows only the icon and condition list when alerting", c.hide_title_alert)}
    `)}
    ${buildCard("Backup & Restore", `
      <div style="${hintStyle()}"><em>Export saves all conditions, groups, and settings to a JSON file.</em></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
        <button id="export-btn" style="padding:9px 18px;border-radius:8px;background:rgba(99,179,237,0.15);border:1px solid rgba(99,179,237,0.35);color:#63b3ed;font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:600;cursor:pointer;">⬇ Export Sensor</button>
        <button id="import-btn" style="padding:9px 18px;border-radius:8px;background:rgba(104,211,145,0.15);border:1px solid rgba(104,211,145,0.35);color:#68d391;font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:600;cursor:pointer;">⬆ Import Sensor</button>
        <input type="file" id="backup-file-input" accept=".json" style="display:none">
      </div>
      ${_backupMsg ? `<div style="font-size:0.82rem;color:#68d391;font-family:monospace;margin-top:4px;">${esc(_backupMsg)}</div>` : ""}
    `)}
  `;
}

// ---------------------------------------------------------------------------
// Individual Tab
// ---------------------------------------------------------------------------

function buildIndividual() {
  const individual = getIndividual().sort((a, b) => {
    const na = (a.c.name || a.c.entity_id || "").toLowerCase();
    const nb = (b.c.name || b.c.entity_id || "").toLowerCase();
    return na.localeCompare(nb);
  });

  return buildCard("Individual Conditions", `
    <div style="${hintStyle()}font-style:italic;">Monitor a specific entity one at a time.</div>
    <button id="add-individual-btn" style="${addBtnStyle()}"><span style="${plusStyle()}">+</span> Add Individual Monitored Device / Entity</button>
    ${individual.length === 0 ? `<div style="font-size:0.85rem;color:#64748b;font-style:italic;padding:4px 0;">No individual conditions yet.</div>` : ""}
    ${individual.map(({ c, i }) => buildConditionCard(c, i)).join("")}
  `);
}

// ---------------------------------------------------------------------------
// Smart Groups Tab
// ---------------------------------------------------------------------------

function buildSmartGroups() {
  const groups = getSmartGroups();
  return buildCard("Smart Groups", `
    <div style="${hintStyle()}font-style:italic;">Type a keyword to bulk add every matching entity.</div>
    ${groups.length === 0 ? `<div style="font-size:0.85rem;color:#64748b;font-style:italic;padding:4px 0;">No smart groups yet.</div>` : ""}
    ${groups.map(({ c, i }) => buildSmartGroupCard(c, i)).join("")}
    <button id="add-group-btn" style="${addBtnStyle()}"><span style="${plusStyle()}">+</span> Add Smart Group — bulk add devices by keyword</button>
  `);
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function buildOverview() {
  const rows = [];
  for (const cond of (_config.conditions || [])) {
    if ("entity_filter" in cond) continue;
    if (!cond.entity_id) continue;
    const state = currentState(cond.entity_id);
    const found = _allEntityList.find(([id]) => id === cond.entity_id);
    const friendly = found ? (found[1].friendly_name || cond.entity_id) : cond.entity_id;
    const isAlert = !cond.paused && evalCondition(state, cond.operator, cond.trigger_value);
    rows.push({ name: cond.name || friendly, entityId: cond.entity_id, domain: cond.entity_id.split(".")[0], state, operator: cond.operator, triggerValue: cond.trigger_value || "", sourceType: "Individual", sourceLabel: cond.name || friendly, paused: !!cond.paused, alert: isAlert });
  }
  for (const cond of (_config.conditions || [])) {
    if (!("entity_filter" in cond)) continue;
    const excl = new Set(cond.entity_filter_exclude || []);
    const groupLabel = cond.entity_filter_name || `Smart Group: ${cond.entity_filter}`;
    for (const [entityId, s] of matchedEntities(cond)) {
      if (excl.has(entityId)) continue;
      const state = currentState(entityId);
      const overrides = cond.entity_label_overrides || {};
      const displayName = overrides[entityId] || s.friendly_name || entityId;
      const isAlert = !cond.paused && evalCondition(state, cond.operator, cond.trigger_value);
      rows.push({ name: displayName, entityId, domain: entityId.split(".")[0], state, operator: cond.operator, triggerValue: cond.trigger_value || "", sourceType: "Group", sourceLabel: groupLabel, paused: !!cond.paused, alert: isAlert });
    }
  }
  rows.sort((a, b) => a.domain !== b.domain ? a.domain.localeCompare(b.domain) : a.name.localeCompare(b.name));

  const domainMap = new Map();
  for (const row of rows) {
    if (!domainMap.has(row.domain)) domainMap.set(row.domain, []);
    domainMap.get(row.domain).push(row);
  }

  if (rows.length === 0) return `<div style="font-size:0.85rem;color:#64748b;font-style:italic;padding:12px 4px;">No monitored entities yet.</div>`;

  return `
    <div style="display:flex;gap:16px;padding:10px 14px;background:#161b26;border:2px solid rgba(99,179,237,0.2);border-radius:10px;font-size:0.8rem;font-family:'DM Sans',sans-serif;color:#94a3b8;flex-wrap:wrap;">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:rgba(252,129,129,0.9);margin-right:6px;vertical-align:middle;"></span>Alerting</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f6ad55;margin-right:6px;vertical-align:middle;"></span>Paused</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:rgb(47,207,118);margin-right:6px;vertical-align:middle;"></span>OK</span>
    </div>
    <div style="background:#161b26;border:2px solid rgba(99,179,237,0.2);border-radius:12px;overflow-y:auto;max-height:50vh;">
      <div style="display:grid;grid-template-columns:1fr 100px 90px;padding:6px 14px;font-size:0.7rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#475569;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span>Entity</span><span>State</span><span>Condition</span>
      </div>
      ${[...domainMap.keys()].sort().map(domain => `
        <div style="padding:6px 14px;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#63b3ed;font-family:monospace;background:rgba(99,179,237,0.06);border-top:1px solid rgba(99,179,237,0.12);">${pluralizeDomain(domain)}</div>
        ${domainMap.get(domain).map(row => `
          <div style="display:grid;grid-template-columns:1fr 100px 90px;align-items:center;padding:9px 14px;border-bottom:1px solid rgba(255,255,255,0.04);gap:8px;background:${row.alert ? "rgba(252,129,129,0.06)" : row.paused ? "rgba(246,173,85,0.06)" : "transparent"};${row.alert ? "border-left:3px solid rgba(252,129,129,0.6);padding-left:11px;" : row.paused ? "border-left:3px solid rgba(246,173,85,0.5);padding-left:11px;" : ""}">
            <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
              <span style="font-size:0.88rem;font-weight:500;color:${row.alert ? "#fc8181" : row.paused ? "#f6ad55" : "#e2e8f0"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(row.name)}</span>
              <span style="font-size:0.62rem;font-family:monospace;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><span style="color:#63b3ed;font-weight:700;">${row.sourceType} —</span> ${esc(row.sourceLabel)}</span>
            </div>
            <span style="font-size:0.78rem;font-family:monospace;color:${row.alert ? "#fc8181" : row.paused ? "#f6ad55" : "#68d391"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(row.state)}</span>
            <span style="font-size:0.78rem;font-family:monospace;color:#94a3b8;white-space:nowrap;">${formatCondition(row.operator, row.triggerValue)}</span>
          </div>
        `).join("")}
      `).join("")}
    </div>
  `;
}

function formatCondition(operator, triggerValue) {
  const op = OPERATOR_LABEL_TO_SYMBOL[operator] || operator;
  const symbol = op === "==" ? "=" : op === "!=" ? "≠" : op;
  return `${symbol} ${esc(triggerValue)}`;
}

// ---------------------------------------------------------------------------
// Condition Card
// ---------------------------------------------------------------------------

function buildConditionCard(condition, index) {
  const isOpen = _expandedConditions.has(index);
  const isPaused = condition.paused || false;
  const label = condition.name || condition.entity_id || "New Condition";
  const sub = condition.entity_id
    ? `${condition.entity_id} — ${condition.operator || "equals"} — ${condition.trigger_value || ""}`
    : "Not configured yet";
  const state = currentState(condition.entity_id);
  const hasAnd = (condition.and_conditions || []).length > 0;
  const isAlert = !isPaused && condition.entity_id && evalCondition(state, condition.operator, condition.trigger_value);
  const cardBg = isAlert ? "rgba(252,129,129,0.06)" : isPaused ? "rgba(246,173,85,0.06)" : "#1e2535";
  const cardBorder = isAlert ? "rgba(252,129,129,0.6)" : isPaused ? "rgba(246,173,85,0.5)" : "rgba(255,255,255,0.08)";
  const dotColor = isAlert ? "#fc8181" : isPaused ? "#f6ad55" : "rgb(47,207,118)";

  return `
    <div style="background:${cardBg};border:1px solid ${cardBorder};${isAlert || isPaused ? `border-left:3px solid ${cardBorder};` : ""}border-radius:8px;overflow:hidden;">
      <div class="cond-toggle" data-index="${index}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;overflow:hidden;">
          <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${dotColor};"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.9rem;font-weight:600;color:${isAlert ? "#fc8181" : "#e2e8f0"};">${esc(label)}${isPaused ? `<span style="display:inline-block;padding:1px 7px;border-radius:20px;background:rgba(246,173,85,0.1);border:1px solid rgba(246,173,85,0.2);font-size:0.62rem;color:#f6ad55;font-family:monospace;vertical-align:middle;margin-left:5px;">paused</span>` : ""}${hasAnd ? `<span style="display:inline-flex;padding:1px 7px;border-radius:20px;background:rgba(99,179,237,0.12);border:1px solid rgba(99,179,237,0.25);font-size:0.62rem;color:#63b3ed;font-family:monospace;font-weight:700;vertical-align:middle;margin-left:5px;">AND (${condition.and_conditions.length})</span>` : ""}</div>
            <div style="font-size:0.75rem;color:#63b3ed;font-family:monospace;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(sub)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <div class="pause-toggle" data-index="${index}" ${miniToggle(!isPaused, isPaused)}></div>
          <button class="delete-cond-btn" data-index="${index}" style="padding:3px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#64748b;font-size:0.8rem;cursor:pointer;">Delete</button>
          <span style="color:#64748b;font-size:10px;">${isOpen ? "▴" : "▾"}</span>
        </div>
      </div>
      ${isOpen ? `
        <div style="padding:14px;display:flex;flex-direction:column;gap:10px;border-top:1px solid rgba(255,255,255,0.05);">
          ${buildField("Entity", buildEntityPicker(condition.entity_id, `ep-${index}`))}
          ${condition.entity_id ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#1e2535;border:1px solid rgba(255,255,255,0.08);border-radius:20px;font-size:0.82rem;color:#68d391;font-family:monospace;align-self:flex-start;"><span style="color:#64748b;">Current state:</span> ${esc(state)}</div>` : ""}
          ${buildField("Attribute <span style='font-size:0.78rem;font-weight:400;color:#64748b;'>(optional)</span>", `<input class="cond-attr" data-index="${index}" type="text" value="${esc(condition.attribute || "")}" placeholder="Leave empty to use main state" style="${inputStyle()}">`)}
          <div style="display:flex;gap:8px;align-items:flex-end;">
            <div style="display:flex;flex-direction:column;gap:5px;">
              <label style="font-size:0.9rem;font-weight:500;color:#94a3b8;">Alert when</label>
              ${buildOperatorSelect(`op-${index}`, condition.operator)}
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
              <label style="font-size:0.9rem;font-weight:500;color:#94a3b8;">Alert value</label>
              <input class="cond-val" data-index="${index}" type="text" value="${esc(condition.trigger_value || "")}" style="${inputStyle()}font-family:monospace;color:#68d391;">
            </div>
          </div>
          <div style="font-size:0.82rem;color:#ffd701;"><em>ⓘ Must match exactly. Common values: on · off · open · closed · locked · unlocked · home · away</em></div>
          ${buildField("Condition Label <span style='font-size:0.78rem;font-weight:400;color:#64748b;'>— shown in sensor state when triggered</span>", `<input class="cond-name" data-index="${index}" type="text" value="${esc(condition.name || "")}" ${condition.use_label_template ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : `style="${inputStyle()}"` }>`)}
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;margin-top:4px;">
            <div>
              <div style="font-size:0.85rem;color:#e2e8f0;font-weight:500;">Use Jinja2 template for label</div>
              <div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">Dynamically include live sensor values — e.g. Lightning detected — 5 miles away</div>
            </div>
            <div class="mini-toggle ${condition.use_label_template ? '' : 'off'}" data-action="toggle-label-template" data-index="${index}"></div>
          </div>
          ${condition.use_label_template ? `
            ${buildField("Jinja2 Template", `<textarea class="cond-label-template" data-index="${index}" rows="4" placeholder="e.g. multi-line:&#10;{% set d = states('sensor.lightning_distance') %}&#10;Lightning {{ d }} miles away" style="width:100%;padding:9px 12px;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-family:monospace;font-size:0.85rem;outline:none;resize:vertical;line-height:1.5;">${esc(condition.label_template || '')}</textarea>
              <div style="font-size:0.78rem;color:#94a3b8;margin-top:4px;">ⓘ Use {{ states('sensor.entity_id') }} to insert live values. Full Jinja2 supported — multiple lines allowed. Example: Lightning {{ states('sensor.lightning_distance') }} miles away</div>`)}
            ${buildField("Fallback Label <span style='font-size:0.78rem;font-weight:400;color:#64748b;'>— shown if template fails</span>", `<input class="cond-label-fallback" data-index="${index}" type="text" value="${esc(condition.label_fallback || '')}" placeholder="e.g. Lightning Detected" style="${inputStyle()}">
              <div style="font-size:0.78rem;color:#94a3b8;margin-top:4px;">ⓘ Displayed if the template renders an error or sensor is unavailable.</div>`)}
          ` : ""}
          ${buildAndSection(condition, index)}
        </div>
      ` : ""}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Smart Group Card
// ---------------------------------------------------------------------------

function buildSmartGroupCard(condition, index) {
  const isOpen = _expandedConditions.has(index);
  const isPaused = condition.paused || false;
  const allMatched = matchedEntities(condition);
  const excl = new Set(condition.entity_filter_exclude || []);
  const activeCount = allMatched.filter(([id]) => !excl.has(id)).length;
  const sub = condition.entity_filter
    ? `${activeCount} / ${allMatched.length} found · ${condition.operator || "equals"} ${condition.trigger_value || ""}`
    : "Not configured yet";
  const groupLabel = condition.entity_filter_name || (condition.entity_filter ? `Smart Group — ${condition.entity_filter}` : "Smart Group");

  const matchedDomains = new Set();
  allMatched.forEach(([id]) => matchedDomains.add(id.split(".")[0]));
  const matchedGroupNames = Object.keys(DOMAIN_GROUPS).filter(g => DOMAIN_GROUPS[g].some(d => matchedDomains.has(d)));

  // Check if any entity in group is alerting
  const isGroupAlert = !isPaused && allMatched.some(([id]) => {
    if (excl.has(id)) return false;
    return evalCondition(currentState(id), condition.operator, condition.trigger_value);
  });
  const sgCardBg = isGroupAlert ? "rgba(252,129,129,0.06)" : isPaused ? "rgba(246,173,85,0.06)" : "#1e2535";
  const sgCardBorder = isGroupAlert ? "rgba(252,129,129,0.6)" : isPaused ? "rgba(246,173,85,0.5)" : "rgba(255,255,255,0.08)";
  const sgDotColor = isGroupAlert ? "#fc8181" : isPaused ? "#f6ad55" : "rgb(47,207,118)";

  return `
    <div style="background:${sgCardBg};border:1px solid ${sgCardBorder};${isGroupAlert || isPaused ? `border-left:3px solid ${sgCardBorder};` : ""}border-radius:8px;overflow:hidden;opacity:${isPaused ? '0.6' : '1'};">
      <div class="cond-toggle" data-index="${index}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;overflow:hidden;">
          <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${sgDotColor};"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.9rem;font-weight:600;color:${isGroupAlert ? "#fc8181" : "#e2e8f0"};">${esc(groupLabel)}${isPaused ? `<span style="display:inline-block;padding:1px 7px;border-radius:20px;background:rgba(246,173,85,0.1);border:1px solid rgba(246,173,85,0.2);font-size:0.62rem;color:#f6ad55;font-family:monospace;vertical-align:middle;margin-left:5px;">paused</span>` : ""}</div>
            <div style="font-size:0.75rem;color:#63b3ed;font-family:monospace;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(sub)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <div class="pause-toggle" data-index="${index}" ${miniToggle(!isPaused, isPaused)}></div>
          <button class="delete-cond-btn" data-index="${index}" style="padding:3px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#64748b;font-size:0.8rem;cursor:pointer;">Delete</button>
          <span style="color:#64748b;font-size:10px;">${isOpen ? "▴" : "▾"}</span>
        </div>
      </div>
      ${isOpen ? `
        <div style="padding:14px;display:flex;flex-direction:column;gap:10px;border-top:1px solid rgba(255,255,255,0.05);">
          ${buildField("Entity keyword", `<input class="sg-keyword" data-index="${index}" type="text" value="${esc(condition.entity_filter || "")}" placeholder="e.g. battery, door, light" style="${inputStyle()}">
          <div style="${hintStyle()}"><em>Type any word in the entity ID or device name</em></div>
          ${condition.entity_filter ? `<span style="font-size:0.78rem;color:#63b3ed;font-family:monospace;font-weight:600;margin-top:4px;display:block;">${allMatched.length} / ${_allEntityList.length} keyword search</span>` : ""}`)}
          ${buildField("Custom Group Name <span style='font-size:0.78rem;font-weight:400;color:#64748b;'>(optional)</span>", `<input class="sg-name" data-index="${index}" type="text" value="${esc(condition.entity_filter_name || "")}" placeholder="e.g. Doors Open" style="${inputStyle()}">`)}
          ${condition.entity_filter && matchedGroupNames.length > 0 ? `
            <div style="display:flex;flex-direction:column;gap:6px;">
              <div style="font-size:0.82rem;color:#94a3b8;">Include entity types:</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${matchedGroupNames.map(gn => {
                  const groupDomains = DOMAIN_GROUPS[gn] || [];
                  const isExcluded = groupDomains.every(d => (condition.entity_filter_domains || []).includes(d));
                  return `<div class="domain-chip" data-index="${index}" data-group="${gn}" style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-family:monospace;cursor:pointer;border:1px solid ${isExcluded ? "rgba(246,173,85,0.2)" : "rgba(47,207,118,0.3)"};background:${isExcluded ? "rgba(246,173,85,0.08)" : "rgba(47,207,118,0.1)"};color:${isExcluded ? "#f6ad55" : "rgb(47,207,118)"};">${gn}</div>`;
                }).join("")}
              </div>
            </div>
          ` : ""}
          ${condition.entity_filter ? `<div style="font-size:0.82rem;color:rgba(255,215,1,0.6);font-style:italic;padding:8px 12px;border:1px solid rgba(255,215,0,0.2);border-radius:8px;">⚠ All entities in this group must share the same alert value.</div>` : ""}
          ${condition.entity_filter ? buildEntityList(condition, index, allMatched.filter(([id]) => {
            const excludedDomains = new Set(condition.entity_filter_domains || []);
            return excludedDomains.size === 0 || !excludedDomains.has(id.split(".")[0]);
          }), excl) : ""}
          ${buildField("Attribute <span style='font-size:0.78rem;font-weight:400;color:#64748b;'>(optional)</span>", `<input class="sg-attr" data-index="${index}" type="text" value="${esc(condition.attribute || "")}" placeholder="Leave empty to use main state" style="${inputStyle()}">`)}
          <div style="display:flex;gap:8px;align-items:flex-end;">
            <div style="display:flex;flex-direction:column;gap:5px;">
              <label style="font-size:0.9rem;font-weight:500;color:#94a3b8;">Alert when</label>
              ${buildOperatorSelect(`sg-op-${index}`, condition.operator)}
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
              <label style="font-size:0.9rem;font-weight:500;color:#94a3b8;">Alert value</label>
              <input class="sg-val" data-index="${index}" type="text" value="${esc(condition.trigger_value || "")}" style="${inputStyle()}font-family:monospace;color:#68d391;">
            </div>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function buildEntityList(condition, index, allMatched, excl) {
  const activeCount = allMatched.filter(([id]) => !excl.has(id)).length;
  return `
    <div style="border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 12px;background:#1e2535;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.78rem;color:#64748b;font-family:monospace;">
        <span style="color:#63b3ed;font-weight:600;">Matching entities</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#63b3ed;font-weight:600;">${activeCount} / ${allMatched.length} included</span>
          <button class="include-all-btn" data-index="${index}" style="border:none;border-radius:6px;font-size:0.78rem;font-family:'DM Sans',sans-serif;font-weight:600;padding:4px 10px;cursor:pointer;background:rgba(47,207,118,0.85);color:#080a0f;">Include All</button>
          <button class="exclude-all-btn" data-index="${index}" style="border:none;border-radius:6px;font-size:0.78rem;font-family:'DM Sans',sans-serif;font-weight:600;padding:4px 10px;cursor:pointer;background:rgba(246,173,85,0.85);color:#080a0f;">Exclude All</button>
        </div>
      </div>
      ${allMatched.map(([entityId, s]) => {
        const isExcluded = excl.has(entityId);
        const overrides = condition.entity_label_overrides || {};
        const customLabel = overrides[entityId] || "";
        const entityState = currentState(entityId);
        const isAlerting = !isExcluded && !condition.paused && evalCondition(entityState, condition.operator, condition.trigger_value);
        const rowBg = isAlerting ? "rgba(252,129,129,0.06)" : "transparent";
        const rowBorder = isAlerting ? "border-left:3px solid rgba(252,129,129,0.6);padding-left:9px;" : "";
        return `<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:12px;border-bottom:1px solid rgba(255,255,255,0.06);opacity:${isExcluded ? "0.6" : "1"};background:${rowBg};${rowBorder}">
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.85rem;color:${isAlerting ? "#fc8181" : "#e2e8f0"};font-weight:500;">${esc(s.friendly_name || entityId)}</div>
            <div style="font-size:0.72rem;color:#64748b;font-family:monospace;margin-top:1px;">${esc(entityId)}</div>
            ${!isExcluded ? `<input class="entity-label" data-cond-index="${index}" data-entity-id="${entityId}" type="text" value="${esc(customLabel)}" placeholder="Custom alert label (optional)" style="margin-top:4px;width:100%;padding:4px 8px;background:#0d0f18;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#94a3b8;font-family:'DM Sans',sans-serif;font-size:0.75rem;outline:none;box-sizing:border-box;">` : ""}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
            <span style="font-size:0.72rem;font-family:monospace;color:${isExcluded ? "#f6ad55" : "#68d391"};padding:2px 7px;background:${isExcluded ? "rgba(246,173,85,0.35)" : "rgba(104,211,145,0.08)"};border:1px solid ${isExcluded ? "rgba(246,173,85,0.5)" : "rgba(104,211,145,0.15)"};border-radius:4px;">${esc(s.state)}</span>
            <div class="entity-toggle" data-cond-index="${index}" data-entity-id="${entityId}" ${miniToggle(!isExcluded)}></div>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// AND Section
// ---------------------------------------------------------------------------

function buildAndSection(condition, condIndex) {
  const andConditions = condition.and_conditions || [];
  return `
    <div style="border:1px solid rgba(99,179,237,0.15);border-radius:8px;overflow:hidden;background:rgba(99,179,237,0.02);">
      <div style="padding:8px 12px;font-size:0.9rem;font-weight:700;color:#63b3ed;font-family:'DM Sans',sans-serif;">AND Condition${andConditions.length > 1 ? "s" : ""}</div>
      <div style="padding:10px 12px;display:flex;flex-direction:column;gap:10px;">
        ${andConditions.map((ac, ai) => `
          ${buildField("Entity", buildEntityPicker(ac.entity_id, `and-ep-${condIndex}-${ai}`))}
          ${ac.entity_id ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#1e2535;border:1px solid rgba(255,255,255,0.08);border-radius:20px;font-size:0.82rem;color:#68d391;font-family:monospace;align-self:flex-start;"><span style="color:#64748b;">Current state:</span> ${esc(currentState(ac.entity_id))}</div>` : ""}
          <div style="display:flex;gap:8px;align-items:flex-end;">
            <div style="display:flex;flex-direction:column;gap:5px;">
              <label style="font-size:0.9rem;font-weight:500;color:#94a3b8;">Alert when</label>
              ${buildOperatorSelect(`and-op-${condIndex}-${ai}`, ac.operator)}
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
              <label style="font-size:0.9rem;font-weight:500;color:#94a3b8;">Alert value</label>
              <input class="and-val" data-cond-index="${condIndex}" data-and-index="${ai}" type="text" value="${esc(ac.trigger_value || "")}" style="${inputStyle()}font-family:monospace;color:#68d391;">
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button class="delete-and-btn" data-cond-index="${condIndex}" data-and-index="${ai}" style="padding:3px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#64748b;font-size:0.8rem;cursor:pointer;">Remove AND Condition</button>
          </div>
        `).join("")}
        <button class="add-and-btn" data-cond-index="${condIndex}" style="background:transparent;border:none;color:#63b3ed;font-size:0.85rem;font-family:'DM Sans',sans-serif;cursor:pointer;text-decoration:underline;padding:4px 0;text-align:left;">+ Add AND Condition</button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Entity Picker
// ---------------------------------------------------------------------------

function buildEntityPicker(currentEntityId, pickerId) {
  const searchVal = _entitySearch[pickerId] ?? null;
  const isSearching = searchVal !== null;

  let displayName = "";
  if (currentEntityId) {
    const found = _allEntityList.find(([id]) => id === currentEntityId);
    displayName = found ? (found[1].friendly_name || currentEntityId) : currentEntityId;
  }

  const filtered = isSearching && searchVal && searchVal.length > 0
    ? _allEntityList.filter(([id, s]) => {
        const fn = (s.friendly_name || "").toLowerCase();
        const q = (searchVal || "").toLowerCase();
        return id.toLowerCase().includes(q) || fn.includes(q);
      }).slice(0, 50)
    : [];

  return `
    <div style="position:relative;width:100%;" data-picker-id="${pickerId}">
      <div style="display:flex;align-items:center;background:#0d0f18;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;">
        <input class="entity-picker-input" data-picker-id="${pickerId}" data-current="${esc(currentEntityId || "")}" type="text" placeholder="Search entities..." value="${esc(isSearching ? searchVal : displayName)}" style="flex:1;padding:9px 12px;background:transparent;border:none;color:#e2e8f0;font-family:'DM Sans',sans-serif;font-size:0.9rem;outline:none;width:100%;">
        ${currentEntityId ? `<button class="entity-picker-clear" data-picker-id="${pickerId}" style="padding:0 10px;background:transparent;border:none;color:#64748b;cursor:pointer;font-size:0.8rem;">✕</button>` : ""}
      </div>
      ${isSearching && searchVal.length > 0 ? `
        <div style="position:absolute;top:calc(100% + 4px);left:0;right:0;background:#0f1219;border:1px solid rgba(99,179,237,0.2);border-radius:8px;max-height:240px;overflow-y:auto;z-index:100;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
          ${filtered.length === 0 ? `<div style="padding:12px;color:#64748b;font-size:0.85rem;text-align:center;">No entities found</div>` :
            filtered.map(([id, s]) => {
              const fn = s.friendly_name || id;
              const domain = id.split(".")[0];
              return `<div class="entity-picker-item" data-picker-id="${pickerId}" data-entity-id="${id}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
                  <span style="font-size:0.65rem;font-family:monospace;color:#080a0f;background:rgb(0,168,168);padding:1px 6px;border-radius:4px;flex-shrink:0;font-weight:700;">${domain}</span>
                  <div style="min-width:0;">
                    <div style="font-size:0.85rem;color:#e2e8f0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(fn)}</div>
                    <div style="font-size:0.7rem;color:#64748b;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(id)}</div>
                  </div>
                </div>
                <span style="font-size:0.72rem;font-family:monospace;color:#68d391;padding:2px 7px;background:rgba(104,211,145,0.08);border:1px solid rgba(104,211,145,0.15);border-radius:4px;flex-shrink:0;margin-left:8px;">${esc(s.state)}</span>
              </div>`;
            }).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Event Attachment
// ---------------------------------------------------------------------------

function attachEvents() {
  const app = document.getElementById("cn-app");
  if (!app) return;

  app.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => { _activeTab = btn.dataset.tab; render(); });
  });



  const saveBtn = app.querySelector("#save-btn");
  if (saveBtn) saveBtn.addEventListener("click", collectAndSave);

  const cancelBtn = app.querySelector("#cancel-btn");
  if (cancelBtn) cancelBtn.addEventListener("click", () => window.close());
  const closeBtn = app.querySelector("#close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => window.close());

  const exportBtn = app.querySelector("#export-btn");
  if (exportBtn) exportBtn.addEventListener("click", exportBackup);
  const importBtn = app.querySelector("#import-btn");
  if (importBtn) importBtn.addEventListener("click", () => document.getElementById("backup-file-input")?.click());
  const fileInput = app.querySelector("#backup-file-input");
  if (fileInput) fileInput.addEventListener("change", importBackup);

  app.querySelectorAll(".big-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const key = toggle.id === "f-hide-title" ? "hide_title" : "hide_title_alert";
      _config[key] = !_config[key];
      render();
    });
  });

  app.querySelectorAll(".cond-toggle").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.closest(".pause-toggle") || e.target.closest(".delete-cond-btn")) return;
      const index = parseInt(el.dataset.index);
      if (_expandedConditions.has(index)) _expandedConditions.delete(index);
      else _expandedConditions.add(index);
      render();
    });
  });

  app.querySelectorAll("[data-action='toggle-label-template']").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(el.dataset.index);
      const conditions = [..._config.conditions];
      conditions[index] = { ...conditions[index], use_label_template: !conditions[index].use_label_template };
      _config = { ..._config, conditions };
      render();
    });
  });

  app.querySelectorAll(".pause-toggle").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(el.dataset.index);
      const conditions = [..._config.conditions];
      conditions[index] = { ...conditions[index], paused: !conditions[index].paused };
      _config = { ..._config, conditions };
      render();
    });
  });

  app.querySelectorAll(".delete-cond-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const conditions = _config.conditions.filter((_, i) => i !== index);
      _config = { ..._config, conditions };
      const expanded = new Set([..._expandedConditions].filter(i => i !== index).map(i => i > index ? i - 1 : i));
      _expandedConditions = expanded;
      render();
    });
  });

  const addIndividual = app.querySelector("#add-individual-btn");
  if (addIndividual) addIndividual.addEventListener("click", () => {
    const conditions = [..._config.conditions];
    const newIndex = conditions.length;
    conditions.push({ entity_id: "", operator: "equals", trigger_value: "", name: "", paused: false, and_conditions: [], use_label_template: false, label_template: "", label_fallback: "" });
    _config = { ..._config, conditions };
    _expandedConditions.add(newIndex);
    render();
  });

  const addGroup = app.querySelector("#add-group-btn");
  if (addGroup) addGroup.addEventListener("click", () => {
    const conditions = [..._config.conditions];
    const newIndex = conditions.length;
    conditions.push({ entity_filter: "", entity_filter_name: "", operator: "equals", trigger_value: "", paused: false, and_conditions: [], entity_filter_exclude: [], entity_filter_domains: [...DOMAIN_GROUPS["Other"]], entity_label_overrides: {}, entity_filter_initialized: false });
    _config = { ..._config, conditions };
    _expandedConditions.add(newIndex);
    _activeTab = "smartgroups";
    render();
  });

  app.querySelectorAll(".entity-picker-input").forEach(input => {
    input.addEventListener("focus", () => {
      const pickerId = input.dataset.pickerId;
      _entitySearch = { ..._entitySearch, [pickerId]: input.dataset.current || "" };
      render();
    });
    input.addEventListener("input", () => {
      const pickerId = input.dataset.pickerId;
      if (_debounceTimer) clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => {
        _entitySearch = { ..._entitySearch, [pickerId]: input.value };
        render();
      }, 180);
    });
    input.addEventListener("blur", () => {
      const pickerId = input.dataset.pickerId;
      setTimeout(() => {
        _entitySearch = { ..._entitySearch, [pickerId]: null };
        render();
      }, 220);
    });
  });

  app.querySelectorAll(".entity-picker-clear").forEach(btn => {
    btn.addEventListener("click", () => applyPickerSelection(btn.dataset.pickerId, ""));
  });

  app.querySelectorAll(".entity-picker-item").forEach(item => {
    item.addEventListener("mousedown", () => applyPickerSelection(item.dataset.pickerId, item.dataset.entityId));
  });

  app.querySelectorAll(".entity-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const condIndex = parseInt(toggle.dataset.condIndex);
      const entityId = toggle.dataset.entityId;
      const conditions = [..._config.conditions];
      const excl = new Set(conditions[condIndex].entity_filter_exclude || []);
      if (excl.has(entityId)) excl.delete(entityId);
      else excl.add(entityId);
      conditions[condIndex] = { ...conditions[condIndex], entity_filter_exclude: [...excl] };
      _config = { ..._config, conditions };
      render();
    });
  });

  app.querySelectorAll(".include-all-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const condIndex = parseInt(btn.dataset.index);
      const conditions = [..._config.conditions];
      const matched = matchedEntities(conditions[condIndex]);
      const excl = new Set(conditions[condIndex].entity_filter_exclude || []);
      matched.forEach(([id]) => excl.delete(id));
      conditions[condIndex] = { ...conditions[condIndex], entity_filter_exclude: [...excl] };
      _config = { ..._config, conditions };
      render();
    });
  });

  app.querySelectorAll(".exclude-all-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const condIndex = parseInt(btn.dataset.index);
      const conditions = [..._config.conditions];
      const matched = matchedEntities(conditions[condIndex]);
      const excl = new Set(conditions[condIndex].entity_filter_exclude || []);
      matched.forEach(([id]) => excl.add(id));
      conditions[condIndex] = { ...conditions[condIndex], entity_filter_exclude: [...excl] };
      _config = { ..._config, conditions };
      render();
    });
  });

  app.querySelectorAll(".domain-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const condIndex = parseInt(chip.dataset.index);
      const groupName = chip.dataset.group;
      const conditions = [..._config.conditions];
      const condition = conditions[condIndex];
      let excl = new Set(condition.entity_filter_domains || []);
      const groupDomains = DOMAIN_GROUPS[groupName] || [];
      const isExcluded = groupDomains.every(d => excl.has(d));
      if (isExcluded) groupDomains.forEach(d => excl.delete(d));
      else groupDomains.forEach(d => excl.add(d));
      conditions[condIndex] = { ...condition, entity_filter_domains: [...excl] };
      _config = { ..._config, conditions };
      render();
    });
  });

  app.querySelectorAll(".entity-label").forEach(input => {
    input.addEventListener("input", () => {
      const condIndex = parseInt(input.dataset.condIndex);
      const entityId = input.dataset.entityId;
      const conditions = [..._config.conditions];
      const overrides = { ...(conditions[condIndex].entity_label_overrides || {}) };
      if (input.value) overrides[entityId] = input.value;
      else delete overrides[entityId];
      conditions[condIndex] = { ...conditions[condIndex], entity_label_overrides: overrides };
      _config = { ..._config, conditions };
    });
  });

  app.querySelectorAll(".add-and-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const condIndex = parseInt(btn.dataset.condIndex);
      const conditions = [..._config.conditions];
      const andConditions = [...(conditions[condIndex].and_conditions || [])];
      andConditions.push({ entity_id: "", operator: "equals", trigger_value: "" });
      conditions[condIndex] = { ...conditions[condIndex], and_conditions: andConditions };
      _config = { ..._config, conditions };
      render();
    });
  });

  app.querySelectorAll(".delete-and-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const condIndex = parseInt(btn.dataset.condIndex);
      const andIndex = parseInt(btn.dataset.andIndex);
      const conditions = [..._config.conditions];
      const andConditions = (conditions[condIndex].and_conditions || []).filter((_, i) => i !== andIndex);
      conditions[condIndex] = { ...conditions[condIndex], and_conditions: andConditions };
      _config = { ..._config, conditions };
      render();
    });
  });

  // Smart group keyword — live update so entity list updates as you type
  app.querySelectorAll(".sg-keyword").forEach(input => {
    input.addEventListener("input", (e) => {
      const index = parseInt(input.dataset.index);
      const val = e.target.value;
      const cursorPos = e.target.selectionStart;
      const conditions = [..._config.conditions];
      if (conditions[index]) {
        conditions[index] = { ...conditions[index], entity_filter: val };
        _config = { ..._config, conditions };
        if (_debounceTimer) clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
          render();
          // Restore focus and cursor after render
          const newInput = document.querySelector(`.sg-keyword[data-index="${index}"]`);
          if (newInput) {
            newInput.focus();
            try { newInput.setSelectionRange(cursorPos, cursorPos); } catch(e) {}
          }
        }, 300);
      }
    });
  });

  // Smart group name — live update
  app.querySelectorAll(".sg-name").forEach(input => {
    input.addEventListener("input", (e) => {
      const index = parseInt(input.dataset.index);
      const conditions = [..._config.conditions];
      if (conditions[index]) {
        conditions[index] = { ...conditions[index], entity_filter_name: e.target.value };
        _config = { ..._config, conditions };
      }
    });
  });

  // General inputs
  const nameInput = app.querySelector("#f-name");
  if (nameInput) nameInput.addEventListener("input", (e) => {
    const clean = sanitizeName(e.target.value);
    e.target.value = clean;
    _config.name = clean;
  });
  const friendlyInput = app.querySelector("#f-friendly");
  if (friendlyInput) friendlyInput.addEventListener("input", (e) => { _config.friendly_sensor_name = e.target.value; });
  const allClearInput = app.querySelector("#f-allclear");
  if (allClearInput) allClearInput.addEventListener("input", (e) => { _config.text_all_clear = e.target.value; });
  // Icon pickers — dropdown select + custom text input
  const iconClearSelect = app.querySelector("#f-icon-clear");
  const iconClearCustom = app.querySelector("#f-icon-clear-custom");
  const iconAlertSelect = app.querySelector("#f-icon-alert");
  const iconAlertCustom = app.querySelector("#f-icon-alert-custom");

  if (iconClearSelect) iconClearSelect.addEventListener("change", (e) => {
    _config.icon_all_clear = e.target.value;
    if (iconClearCustom) iconClearCustom.value = "";
    render();
  });
  if (iconClearCustom) iconClearCustom.addEventListener("input", (e) => {
    if (e.target.value) {
      _config.icon_all_clear = e.target.value;
      render();
    }
  });
  if (iconAlertSelect) iconAlertSelect.addEventListener("change", (e) => {
    _config.icon_alert = e.target.value;
    if (iconAlertCustom) iconAlertCustom.value = "";
    render();
  });
  if (iconAlertCustom) iconAlertCustom.addEventListener("input", (e) => {
    if (e.target.value) {
      _config.icon_alert = e.target.value;
      render();
    }
  });
}

// ---------------------------------------------------------------------------
// Picker selection
// ---------------------------------------------------------------------------

function applyPickerSelection(pickerId, entityId) {
  const parts = pickerId.split("-");
  if (parts[0] === "ep") {
    const index = parseInt(parts[1]);
    const conditions = [..._config.conditions];
    conditions[index] = { ...conditions[index], entity_id: entityId };
    if (!conditions[index].name && entityId) {
      const found = _allEntityList.find(([id]) => id === entityId);
      conditions[index].name = found ? (found[1].friendly_name || entityId) : entityId;
    }
    _config = { ..._config, conditions };
  } else if (parts[0] === "and" && parts[1] === "ep") {
    const condIndex = parseInt(parts[2]);
    const andIndex = parseInt(parts[3]);
    const conditions = [..._config.conditions];
    const andConditions = [...(conditions[condIndex].and_conditions || [])];
    andConditions[andIndex] = { ...andConditions[andIndex], entity_id: entityId };
    conditions[condIndex] = { ...conditions[condIndex], and_conditions: andConditions };
    _config = { ..._config, conditions };
  }
  _entitySearch = { ..._entitySearch, [pickerId]: null };
  render();
}

// ---------------------------------------------------------------------------
// Collect and Save
// ---------------------------------------------------------------------------

function collectAndSave() {
  const app = document.getElementById("cn-app");
  if (!app) return;

  const conditions = [..._config.conditions];

  app.querySelectorAll(".cond-attr").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], attribute: input.value };
  });
  app.querySelectorAll(".cond-val").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], trigger_value: input.value };
  });
  app.querySelectorAll(".cond-name").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], name: input.value };
  });
  app.querySelectorAll(".cond-label-template").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], label_template: input.value };
  });
  app.querySelectorAll(".cond-label-fallback").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], label_fallback: input.value };
  });
  app.querySelectorAll(".sg-keyword").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], entity_filter: input.value };
  });
  app.querySelectorAll(".sg-name").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], entity_filter_name: input.value };
  });
  app.querySelectorAll(".sg-attr").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], attribute: input.value };
  });
  app.querySelectorAll(".sg-val").forEach(input => {
    const index = parseInt(input.dataset.index);
    if (conditions[index]) conditions[index] = { ...conditions[index], trigger_value: input.value };
  });
  app.querySelectorAll(".and-val").forEach(input => {
    const condIndex = parseInt(input.dataset.condIndex);
    const andIndex = parseInt(input.dataset.andIndex);
    if (conditions[condIndex]?.and_conditions?.[andIndex]) {
      conditions[condIndex].and_conditions[andIndex] = { ...conditions[condIndex].and_conditions[andIndex], trigger_value: input.value };
    }
  });

  // Operators
  app.querySelectorAll(".op-select").forEach(select => {
    const id = select.id;
    if (id.startsWith("op-")) {
      const index = parseInt(id.replace("op-", ""));
      if (conditions[index]) conditions[index] = { ...conditions[index], operator: select.value };
    } else if (id.startsWith("sg-op-")) {
      const index = parseInt(id.replace("sg-op-", ""));
      if (conditions[index]) conditions[index] = { ...conditions[index], operator: select.value };
    } else if (id.startsWith("and-op-")) {
      const parts = id.replace("and-op-", "").split("-");
      const condIndex = parseInt(parts[0]);
      const andIndex = parseInt(parts[1]);
      if (conditions[condIndex]?.and_conditions?.[andIndex]) {
        conditions[condIndex].and_conditions[andIndex] = { ...conditions[condIndex].and_conditions[andIndex], operator: select.value };
      }
    }
  });

  // Colors
  const colorMap = {
    "f-bg-clear": "background_color_all_clear", "f-bg-alert": "background_color_alert",
    "f-text-clear": "text_color_all_clear", "f-text-alert": "text_color_alert",
    "f-icon-color-clear": "icon_color_all_clear", "f-icon-color-alert": "icon_color_alert",
  };
  Object.entries(colorMap).forEach(([id, key]) => {
    const el = app.querySelector(`#${id}`);
    if (el) _config[key] = el.value;
  });

  _config = { ..._config, conditions };
  saveConfig();
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

async function exportBackup() {
  const name = _config.name || "sensor";
  const filename = `${name}_backup.json`;
  const json = JSON.stringify(_config, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  if (window.showSaveFilePicker) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "JSON Files", accept: { "application/json": [".json"] } }],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      _backupMsg = `✓ Exported ${filename}`;
    } catch (e) {
      if (e.name !== "AbortError") {
        _backupMsg = `✗ Export failed: ${e.message}`;
      }
    }
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    _backupMsg = `✓ Exported to Downloads: ${filename}`;
  }
  render();
  setTimeout(() => { _backupMsg = ""; render(); }, 4000);
}

async function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!confirm(`Replace ALL current settings with backup from "${file.name}"?`)) { e.target.value = ""; return; }
    _config = { ...data };
    await saveConfig();
    _backupMsg = `✓ Restored from ${file.name}`;
    render();
    setTimeout(() => { _backupMsg = ""; render(); }, 4000);
  } catch (err) {
    _backupMsg = `✗ Failed: ${err.message}`;
    render();
  }
  e.target.value = "";
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

console.log('%cCombined Notifications v7.2.2 — Vanilla JS panel initializing', 'color:#39FF14; font-weight:bold');

const params = new URLSearchParams(window.location.search);
_entryId = params.get("entry_id") || "";

if (!_entryId) {
  document.getElementById("cn-app").innerHTML = `<div style="padding:40px;color:#fc8181;font-family:'DM Sans',sans-serif;text-align:center;">No entry_id provided</div>`;
} else {
  loadConfig().then(() => startPolling());
}
