Goal: acknowledgement must not block the first dark cycle.
Scope: Captain start control, server readiness validation, related guidance and regression tests.
Approach: let the Captain begin from sealed orders without any acknowledgement; keep private reveal, connection safety, and existing automatic start when everyone acknowledges.
Risks: exposing unread roles, starting with offline crew, stale open private dialogs, mixed cached assets.
Verification: start with zero acknowledgements, Captain authorization and offline guard, private roles remain sealed until reveal; targeted UI/engine tests, full check/tests and PWA import validation.
State: implemented locally. Node 24 check and all 272 tests passed; six-client transport test additionally confirms Captain starts with zero acknowledgements and unread roles remain sealed. PWA module graph and diff checks passed. PROJECT.md is 491 words. Deployment and physical-device verification remain pending.
