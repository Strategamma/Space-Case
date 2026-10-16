Goal: make voting and results clear on every player's screen.
Scope: pinned ballot, nominator/nominee and block minimum, Spare/Execute, automatic final tally and persistent result.
Approach: tally idempotently after final eligible vote; keep ballot phase until Captain continues; retain secret choices, thresholds and execution rules.
Risks: early disclosure, duplicate tally/ties, hidden ballots on other tabs or private dialogs, persistence/reconnect.
Verification: multi-recipient engine tests, tally/privacy/threshold/tie tests, UI checks and full release suite.

State: implemented; 250-test full regression suite plus 13 final UI/PWA/ballot checks pass. Real six-client local game verified ballot over Script, final Spare submission, automatic 3/3 reveal and block with 3 votes; phone layout/reconnect and no browser errors checked. Not deployed.
