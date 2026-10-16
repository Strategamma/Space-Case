# Adding characters safely

New characters belong in the **main character list**. No experimental section or opt-in switch. The release gate is metadata validation, automated regression checks and playtesting. The Martyr is the first expansion.

1. Copy `TEMPLATE.md` to `<stable_id>.md`. Decide interactions before implementing. A new power must not silently change existing rules.
2. Add a unique stable ID to `public/roles.js`. Define team, symbol, description, timing and action metadata. Set copy limits in `public/setup.js` when different from the normal one-copy rule. Existing catalogue-based lists/defaults include new IDs automatically.
3. Register `CHARACTER_BALANCE` in `public/setup.js`, even if the reviewed contribution is `{}`. Weights are provisional strength estimates, not win-rate guarantees. Preserve existing weights; changes to old characters need their own justification. The Captain selects only non-Hollow candidates; new Hollow characters are automatically eligible for server selection. Keep `crewPoolError`/`dealAutomaticHollow` and the automatic-deal matrix covered.
4. Add explicit first/later-cycle entries in `public/script.js` and interaction paragraphs in `public/wiki.js`. Update the moderator contract/master schedule if rules or stages change.
5. Implement server validation and resolution in `server/abilities.js`, starting information in `server/moderator.js`, and any phase/victory rules in `server/game.js`. Reuse recipient-filtered `project()` and report delivery. Never trust a client to enforce legality or hide a secret.
6. Copy `character.test.js.example` to `tests/characters/<stable_id>.test.js`. Replace the placeholders and add the contract's applicable interaction assertions. The shared scenario helper drives actual `act()`/`tick()` calls. Root tests cover existing cards; `tests/characters/*.test.js` is automatically included in CI. Generic gates do not prove a new power works: character-specific assertions and review are mandatory.
7. Run `npm run validate:characters`, `npm run test:characters`, then `npm run check` and `npm test`. CI runs the same gates plus PostgreSQL storage checks. Metadata omissions, orphan entries, bad schedules, invalid targeting and missing guides fail validation.
8. Version every changed browser module and update the service-worker shell/import URLs. The release test checks that the served import graph is precached. Use `docs/RELEASE.md` for hosted multiplayer, phone and installed-PWA acceptance; retain a known-good release for rollback.

## State compatibility

New fields require safe defaults when loading older rooms. Do not redeal active rooms, add powers to existing assignments, reset spent charges, or rename role IDs. Existing rooms keep their saved candidate pool and assigned characters; new characters can be selected when preparing a new voyage. New generic tests exercise JSON restoration and secret clearing on rematch, but a character with new state must add explicit old-snapshot and non-default resource tests.

## What the gates cover

- Validator: catalogue completeness and shape across definitions, defaults, guides, target metadata, schedules, copy limits and balance.
- Existing ability suite: per-character off-phase/dead/paused/hidden rejection, targeting and detailed established interactions.
- Shared lifecycle suite: report privacy, dead-recipient withholding, snapshot round-trip and rematch for every catalogue entry.
- Balance regression: original 30 characters retain their previous strength contributions, including conditional Engineer/Officer effects.
- Transport/release suite: multiplayer privacy/reconnect, room recovery, HTTP/PWA import graph and error handling.

These checks cannot infer the intended meaning of a new power. Complete the interaction matrix and test its actual effects; balance and table comprehension still need human playtests.
