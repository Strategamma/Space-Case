# Reusable pitfalls

Role test fixtures that reassign production-dealt identities must reset both reports and reportKeys before seeding starting briefings. Keeping dedup keys from the random deal can suppress the deterministic fixture briefing and cause flaky tests. Runtime deals retain keys for idempotency.
