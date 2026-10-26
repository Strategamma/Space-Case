Goal: show ballot participation live and flip individual choices only after every eligible voter submits.
Scope: server-filtered voter roster, completed per-person ballots/history, readable outcome messages and an elapsed voting clock; existing discussion/dark countdowns unchanged.
Approach: publish only IDs/status while voting; persist choices on the completed result; animate cards on live completion, not reconnect/re-render. Freeze elapsed time through pauses and stop at completion. No automatic ballot or timeout choice.
Risks: early leakage through nested projections/history; excluded voters; repeat animations; stale restored ballots; timer pause/restart behavior.
Verification: adversarial projections, frozen eligibility, tally outcomes, restoration/pause clocks, real six-client ballot and 320/390px browser animation/privacy checks; full Node 24 check/tests.

State: implemented locally. Node 24 check and full 268-test suite passed; added projection indistinguishability check plus final targeted checks. Real six-client browser test verified hidden choices before completion, all six individual cards after completion, ballot-flip animation, tally and no overflow at 320/390. Physical devices and deployment remain unverified.
