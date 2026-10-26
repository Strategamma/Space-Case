# Reusable pitfalls

Role test fixtures that reassign production-dealt identities must reset both reports and reportKeys before seeding starting briefings. Keeping dedup keys from the random deal can suppress the deterministic fixture briefing and cause flaky tests. Runtime deals retain keys for idempotency.

An optional Update button in the phone header expanded a 390px layout to 425px and caused synthetic bottom-dock taps to hit the board. Keep optional update actions in Settings; verify document width and dock hit targets with an update waiting. This reproduces a local viewport failure, not a confirmed cause of the earlier physical Pixel/Samsung report.
