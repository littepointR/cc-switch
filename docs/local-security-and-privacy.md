# Local Security and Privacy

CC Switch keeps operational state local unless you explicitly enable an export or sync feature.

## Local Storage

- Provider, MCP, prompt, skill, and usage records live in `~/.cc-switch/cc-switch.db`.
- Device settings live in `~/.cc-switch/settings.json`.
- Launch Profiles are device settings. They store profile name, app id, optional provider id, optional working directory, optional terminal preference, and timestamps.
- Managed authentication accounts are local. Dashboard and Auth Center summaries only count accounts and provider bindings.

## Secrets

- Launch Profiles do not store API keys, access tokens, environment variables, or generated terminal scripts.
- Starting a profile calls the existing Claude provider terminal launcher. The backend builds temporary provider-specific files from the selected provider configuration and attempts to remove them when the terminal flow exits. Cleanup is best-effort, so files can remain after launch failure or forced terminal termination.
- Auth Center binding counts validate managed auth provider ids before counting. Stale provider bindings are reported as orphan bindings instead of silently treating them as valid accounts.

## Local Routing and Failover

- The Ops Dashboard reads the same local proxy status, takeover status, usage summaries, and failover queues used elsewhere in the app.
- Proxy takeover and failover only change local client configuration and local routing behavior.
- Apps that do not support local proxy takeover are shown as direct/additive apps rather than routed apps.

## Sync and Export

- Database export, WebDAV sync, and S3 sync are explicit features.
- Device-level settings such as Launch Profiles are not part of the provider database. Treat exported settings files as local machine configuration, because they may include paths that are meaningful only on that device.
