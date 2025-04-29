class CombinedNotificationsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._createCard();
  }

  _createCard() {
    const style = document.createElement('style');
    style.textContent = `
      .card-container {
        padding: 10px;
        border-radius: 10px;
        background: inherit;
        color: white;
        text-align: center;
        box-sizing: border-box;
        overflow: hidden;
        width: 315px !important; /* Hard-coded width */
        height: 100px !important; /* Hard-coded height */
      }

      .card-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
      }

      .card-header {
        font-weight: bold;
        font-size: 20px;
        margin: 0;
        text-transform: uppercase;
      }

      .card-label {
        font-size: 18px;
        font-weight: 500;
        margin: 0;
        white-space: normal;
        display: block;
        max-width: 100%;
      }
      
      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 80px !important; /* Hard-coded icon size */
        height: 80px !important; /* Hard-coded icon size */
      }

      ha-icon {
        width: 80px !important; /* Hard-coded icon size */
        height: 80px !important; /* Hard-coded icon size */
        display: block;
      }
    `;

    const card = document.createElement('ha-card');
    card.className = 'card-container';

    const cardInner = document.createElement('div');
    cardInner.className = 'card-inner';
    
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'icon-wrapper';

    const icon = document.createElement('ha-icon');

    const header = document.createElement('div');
    header.className = 'card-header';

    const label = document.createElement('div');
    label.className = 'card-label';

    iconWrapper.appendChild(icon);
    cardInner.appendChild(iconWrapper);
    cardInner.appendChild(header);
    cardInner.appendChild(label);
    card.appendChild(cardInner);

    this.cardElements = {
      icon,
      iconWrapper,
      header,
      label,
      cardInner
    };

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);
    this.card = card;
  }

  set hass(hass) {
    if (!hass || !this.config) return;

    const config = this.config;
    const entityId = config.entity && config.entity.startsWith('sensor.') ? config.entity : `sensor.${config.entity}`;
    const stateObj = hass.states[entityId];
    const { icon, iconWrapper, header, label } = this.cardElements;

    if (!stateObj) {
      iconWrapper.style.display = 'none';
      header.textContent = "Entity not found";
      label.textContent = entityId;
      return;
    }

    iconWrapper.style.display = 'flex';

    const attrs = stateObj.attributes || {};
    const clearText = attrs.text_all_clear || config.text_all_clear || "ALL CLEAR";
    const isClear = stateObj.state === "" || stateObj.state === clearText;

    if (config.hide_when_clear && isClear) {
      this.card.style.display = 'none';
      return;
    } else {
      this.card.style.display = '';
    }

    const iconName = isClear
      ? (config.icon_all_clear || attrs.icon_clear || "mdi:hand-okay") // Prioritize card config
      : (config.icon_alert || attrs.icon_alert || "mdi:alert-circle"); // Prioritize card config

    const bgColor = isClear
      ? this._resolveColor(config.background_color_all_clear || attrs.color_clear || "rgba(67, 73, 82, 1)") // Prioritize card config
      : this._resolveColor(config.background_color_alert || attrs.color_alert || "rgba(190, 11, 11, 0.9)"); // Prioritize card config

    const iconColor = isClear
      ? this._resolveColor(config.icon_color_all_clear || attrs.icon_color_clear || "white") // Prioritize card config
      : this._resolveColor(config.icon_color_alert || attrs.icon_color_alert || "white"); // Prioritize card config

    const textColor = isClear
      ? this._resolveColor(config.text_color_all_clear || attrs.text_color_clear || "white") // Prioritize card config
      : this._resolveColor(config.text_color_alert || attrs.text_color_alert || "white"); // Prioritize card config

    const labelText = isClear ? clearText : stateObj.state;
    const name = attrs.friendly_name || "NOTIFICATIONS"; // Use sensor friendly_name or default

    icon.setAttribute('icon', iconName);
    icon.style.color = iconColor;

    header.style.color = textColor;
    header.textContent = name;
    header.style.display = config.hide_title ? 'none' : '';

    label.style.color = textColor;
    label.textContent = labelText || '\u00A0';

    this.card.style.background = bgColor;
    this.card.style.color = textColor;
  }

  _resolveColor(color) {
    if (!color) return "inherit";
    if (color === "Use YOUR Current Theme Color") return "var(--primary-color)";
    if (color === "Transparent Background") return "transparent";
    if (color === "Red") return "rgba(190, 11, 11, 0.9)";
    return color;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }

    this.config = {
      ...config,
      hide_when_clear: config.hide_when_clear === true,
      hide_title: config.hide_title === true
    };
  }

  getCardSize() {
    return this.config?.hide_when_clear ? 0 : 2;
  }

  static getStubConfig() {
    return {
      entity: "",
      text_all_clear: "ALL CLEAR",
      icon_all_clear: "mdi:hand-okay",
      icon_alert: "mdi:alert-circle",
      background_color_all_clear: "rgba(67, 73, 82, 1)",
      background_color_alert: "rgba(190, 11, 11, 0.9)",
      icon_color_all_clear: "white",
      icon_color_alert: "white",
      text_color_all_clear: "white",
      text_color_alert: "white",
      hide_when_clear: false,
      hide_title: false
    };
  }
}

customElements.define("combined-notifications-card", CombinedNotificationsCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "combined-notifications-card",
  name: "Combined Notifications Card",
  description: "Card that displays alert states from notifications"
});
