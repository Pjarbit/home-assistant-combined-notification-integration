# Security Policy

## Supported Versions

Only the latest release of Combined Notifications receives security updates. Please make sure you are running the most recent version before reporting a vulnerability.

| Version        | Supported |
|----------------|-----------|
| Latest release | ✅        |
| Older versions | ❌        |

## Reporting a Vulnerability

If you discover a security vulnerability in Combined Notifications, **please do not open a public GitHub issue**. Instead, report it privately using one of these channels:

- 🔒 [GitHub Security Advisories](https://github.com/Pjarbit/home-assistant-combined-notification-integration/security/advisories/new) — preferred, private disclosure with a coordinated fix
- 📧 Email: pjarbit@gmail.com

Please include:
- A clear description of the vulnerability and its potential impact
- Steps to reproduce (or a proof-of-concept)
- The version of Combined Notifications affected
- Any suggested mitigation or patch

## Response Timeline

You can expect an acknowledgement within a few days. A fix will be prepared and released as soon as reasonably possible depending on severity.

## Scope

Combined Notifications is a Home Assistant custom integration with a REST API panel (iframe/compatibility mode) and a WebSocket-based panel (standard/Lit mode). Security-relevant issues typically include:

- Unauthenticated access to configuration or entity-state data
- Cross-site scripting (XSS) via panel input or rendering
- Authentication or authorization bypass on any panel endpoint
- Any behaviour that leaks Home Assistant state or credentials outside the browser session

### Known, documented tradeoff

Compatibility mode (the iframe-based panel) supports an optional shared-secret key (`compat_mode_key`), set by the user in the integration's options. If left blank, the compatibility-mode panel and its data endpoints are accessible to anyone who knows the panel URL and can reach the Home Assistant instance's network — this is a deliberate, documented design tradeoff (see the field's description in the integration's config UI), not an oversight. It is not equivalent to Home Assistant's own authentication: no hashing, no rate-limiting. Users on networks exposed beyond a trusted LAN should set a key or avoid compatibility mode. The standard (Lit) panel is unaffected and always uses Home Assistant's real authentication.

Issues in Home Assistant itself, HACS, or third-party integrations are out of scope — please report those to their respective projects.

Thanks for helping keep Combined Notifications and its users safe! 🙏
