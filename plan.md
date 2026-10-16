# Dark cycle order completeness
Goal: make the public cycle reference complete and its filtering explicit.
Scope: reference metadata/filter, Script controls, regression coverage and cache refresh; no engine changes.
Approach: retain shared resolution stages, identify unscheduled cards, offer saved/all-character views.
Risks: never use actual assignments or live choices; preserve first-cycle no-kill timing.
Verification: targeted reference tests passed; desktop and 320px browser views show all 30 cards in each cycle with no first-cycle attack or overflow. Syntax/full suite and PWA shell checks recorded in final handoff.
