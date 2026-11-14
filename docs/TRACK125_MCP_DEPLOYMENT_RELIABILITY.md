# TRACK125 reliability decisions

The deployed Streamable HTTP MCP integration has no reliable server-to-client notification channel. `tools.list_changed` therefore cannot refresh a cached ChatGPT connector schema. The endpoint now advertises `listChanged: false` and `contractVersion: stable-1`; additive business-field evolution uses the existing catalog/record tools. A breaking contract change still requires a coordinated connector update. Authentication, Director authorization, approval, provenance, audit, idempotency, and server-side validation are unchanged.

`migration:preflight` parses every local migration, rejects invalid or duplicate versions and missing/forward dependencies, and can compare the ordered local set with actual linked Supabase migration history supplied by the deployment wrapper. TRACK123y now declares TRACK123c as a prerequisite, preventing the TRACK124 partial-order failure. Preflight must pass before dependent frontend or Edge Function deployment.

Routine Preview deployments do not require Director intervention when the preflight passes against the isolated Preview project. Production migration/function/deployment actions remain Director-controlled and are out of scope for TRACK125.
