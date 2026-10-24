# BlastNexa release checks

For every game update, run `node qa/slot_economy_v28.cjs` after preparing the assets. The user requires at least 10,000 committed production spins per slot (30,000 total across Tempio, Cristallo and Forgia). Keep this check in the build workflow. Verify the coin and life ledgers, wager costs, bonus spins, reloads and duplicate-action protection; do not replace it with a grid-only simulation.

Run the relevant native Android checks for UI or lifecycle changes. Report emulator failures and incomplete runs accurately. Do not describe JavaScript engine simulations as physical-device testing, and do not publish a release to Play Console unless that action is requested.
