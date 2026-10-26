# Seat recovery audit — 26 October 2026

Evidence: source trace unless labelled reproduced. Explicit Leave → code-entry failure and saved-token restoration were reproduced with six local Socket.IO clients. Physical-device/hosted failure branches below still need verification after implementation.

Room code locates a voyage; only a private boarding pass authorizes the seat. A recovery must restore the existing player ID, role, reports, vote, spent powers and score rather than adding a player or replaying actions.

| Scenario | Pre-change behavior / gap | Planned handling |
| --- | --- | --- |
| Explicit Leave during play, then enter same code | Reproduced: pass retained, but inspect/new join reject launched room | Resume with matching saved pass before inspect; explicit Return control |
| Reload/close/reopen same browser | Auto-resume on socket connect; works when storage/room survive | Show restoring state and an actionable retry on failure |
| Background, screen lock, Wi-Fi/mobile switch, server cold start | Socket reconnect resumes; timeout only says trying again, with no bounded application retry | Retry transient failures with backoff, preserve pass; cancel obsolete attempts; show offline/wait/retry states |
| Resume rejected by transient storage/save/rate-limit error | Any non-ok resume currently clears local pass; server response has only prose | Typed transient/terminal errors; never erase a valid pass for transient rejection; retry after save recovers |
| Resume succeeds but acknowledgement times out | Server may already bind socket; repeated resume currently rejects already aboard | Idempotent same-seat resume; reconcile authoritative state; do not clear pass on ambiguous outcomes |
| Boarding another voyage after leaving | Single spacecase.session overwritten, losing previous recovery entry | Store passes by room plus separate active room; migrate existing single pass; retain recoverable voyages |
| Two tabs or browser and PWA share same stored pass | Resume disconnects earlier socket; old screen can look like broken connection | One active connection per seat; explicit moved-session event, stop retry war, allow deliberate Take over |
| Different browser/device or separate storage partition | No saved pass; same code/name cannot restore role | Explicit private pass transfer/export/import, including short-lived UI exposure; avoid URLs/logs; missing-pass guidance |
| Cleared storage/private mode/blocked localStorage | Pass can be absent; save errors silently ignored | Detect inability to persist, explain recovery limit, offer private pass backup; import an existing backup |
| Missing pass and no backup | Room code/callsign insufficient to identify rightful player | Cannot safely auto-recover; explain limitation. Captain must not be able to read another playing player's secrets; any replacement flow requires a separate rule decision |
| Lobby Leave/removal | Seat is deliberately deleted when multiple players remain; stale pass invalid | Distinguish released berth from temporary disconnect; allow fresh lobby join; remove only confirmed invalid room entry |
| Last Captain leaves lobby | Seat retained offline; saved pass currently cleared by client because phase is lobby | Preserve pass whenever seat remains; return server recovery disposition instead of inferring it solely from phase |
| Captain returns after succession | Existing pass resumes seat; current host ID governs authority | Preserve successor; clearly show returning player's current permissions |
| Dead player / overseer / orders / voting / victory / rematch | Recovery should work across phases and roles, but code-entry path blocks them | Phase-independent authenticated resume; preserve ballot/ack/powers; do not replay; handle reset/rematch correctly |
| Join/inspect races with launch or removal | Inspect can succeed before launch and join then fails | Reconcile launch/released-seat response; retry resume only if matching valid pass; no duplicate avatar/seat |
| Restored server with snapshot intact | All seats start offline and room pauses | Resume same seats, restore clock after appropriate reconnections/consent; test across phases |
| Render restart/deploy loses ephemeral file | Room missing despite valid pass | Clear missing-room explanation and new-voyage path; recovery requires durable storage, not a UI retry. Preserve chosen file mode; document persistent-disk requirement |
| All offline beyond room retention (~24h) | Room expires during load/cleanup | Explain expiration; remove only confirmed expired room entry, preserve other rooms |
| Stale installed PWA / old open tab | Old client can keep old re-entry flow | Version shell consistently, offer safe update/reload with pass retained; server compatibility checks |
| Malformed/wrong/expired token or unknown code | Resume fails; current pass clearing is indiscriminate | Distinct errors, no secret seat information; invalidate only conclusively rejected matching pass |
| Storage failure during takeover | Server disconnects old socket before persistence succeeds; rollback cannot undo that disconnect | Persist authorized resume before evicting old socket; maintain single-seat authority after success; failure must preserve recoverability |

Test success means the original seat and secrets survive, no extra player appears, only one socket controls the seat, and a failed recovery cannot silently destroy a valid local pass. Exercise timeout/save-failure races and transient rejection, not only ordinary reconnect.

## Implementation result

Implemented: per-room pass retention and legacy migration; matching-code recovery; explicit Return; automatic transient retry without discarding credentials; terminal error codes scoped to one pass; idempotent resume; persist-before-takeover and moved-screen feedback; private backup/import accessible to every player through Settings; last-Captain lobby retention; released-seat invalidation; consistent PWA versions and an explicit waiting-update control. Credentials still authorize exactly the original seat and never grant a former Captain renewed authority.

Transport tests cover active Leave/rejoin, repeated normalized-code resume, takeover, invalid/missing passes, retained versus released lobby seats, and failed-save takeover/retry. Client tests cover transient rejection, ambiguous acknowledgement, terminal invalidation and visible-only report reads. Browser checks cover code-entry return, deliberate takeover and private-pass import across isolated storage. Restart recovery remains covered by existing file-storage transport tests. Physical network switching, Android background/lock behavior and installed-phone PWA updating remain unverified.
