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

Compatibility mode (the iframe-based panel) has no authentication of its own as of v8.11.0. A shared-secret key option (`compat_mode_key`) was previously exposed in the settings UI, but it was found to be non-functional — the panel's own frontend never sent the key back to the server, so enabling it would have locked users out of their own panel rather than protecting it. The field has been hidden and the key is no longer enforced anywhere, pending a proper implementation in a future release.

Until then: compatibility mode's data endpoints (configuration and entity states) are accessible to anyone who knows the panel URL and can reach the Home Assistant instance's network. This is a deliberate, documented tradeoff for this release, not an oversight — **only use compatibility mode on a trusted, secured network.** It is not equivalent to Home Assistant's own authentication. The standard (Lit) panel is unaffected and always uses Home Assistant's real authentication.

Issues in Home Assistant itself, HACS, or third-party integrations are out of scope — please report those to their respective projects.

Thanks for helping keep Combined Notifications and its users safe! 🙏
