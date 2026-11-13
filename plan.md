Goal: restore saved seats after a transport reconnect so launch does not remain blocked.
Scope: client authentication guard, explicit offline crew labels, regression tests and PWA cache update.
Approach: associate authenticated state with its Socket.IO connection ID; retained UI state must not suppress resume on a new connection. Preserve seat authorization and retry behavior.
Risks: stale state masking failed resume; duplicate resume/takeover; installed clients retaining the old shell.
Verification: reproduce retained-state reconnect and retry with client tests; six-peer disconnect/resume/launch transport test; check, tests and PWA shell validation. Live session and physical devices remain separate.
State: implemented locally; Node 24 check and all 271 tests passed, including retained-state recovery/retry, offline labels, six-peer launch after reconnect, and versioned PWA imports. Diff check passed. Responsive browser check blocked by Chrome launch SIGABRT; physical-device and live-room recovery unverified. Live app.js contains the original guard. Deployment pending.
