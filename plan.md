Goal: remove shipped interactive visual previews.
Scope: preview entry points, fake state/actions/capabilities, preview styles; retain live guides and production controls.
Approach: delete demo branches, keep server-authoritative capability fallbacks; version changed PWA assets.
Risks: shared live handlers, reconnect logic and cached assets.
Verification: full engine/release tests, syntax, production landing and create/join browser checks.

State: removed; syntax passes. Old preview URL opens normal boarding; live room creation checked.
