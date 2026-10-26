Goal: make nominations feel like a game, remove dropdown menus, clarify Captain private orders.
Scope: two-step portrait nominations, explicit matchup confirmation, timer chips, updated interactive preview; retain server nomination/ballot rules.
Approach: implemented public crew-card selection with living/unused eligibility, self-nomination, draft persistence and explicit confirmation. My orders remains private to the playing Captain; overseers have no own character. Update action moved into Settings to prevent header overflow.
Risks: private data must remain server-filtered; no automatic execution from portrait taps; physical Android remains unverified.
Verification: Node 24 check and 16 targeted tests pass. Actual Chrome touch contexts at 320/390 verified portrait nomination → Captain ballot → continuation → dark cycle 2, rejoining, screen takeover and dock hit targets. Preview has no dropdowns and supports opening/concealing sample private orders; checked at 320px with no overflow/errors.
State: current changes uncommitted; no deployment performed in this turn. Physical Pixel/Samsung and hosted/PWA checks remain open.
