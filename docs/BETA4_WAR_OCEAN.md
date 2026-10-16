# BlastNexa Beta 4 — War / Ocean

Android versionCode 14, versionName 1.0.0-beta4-war-ocean-test. AdMob remains TEST only.

Choose War or Ocean from the two environment cards in the main menu. The environment is remembered on the device, independently of the Nexa Studio block palette. War uses a military grid, olive panels, amber light and three original SVG fighter planes dropping bombs. Ocean uses rounded underwater tiles, turquoise light, bubbles and three original SVG sharks. Pulse clears the best legal 3×3 area, preserves locked cells, counts cleared tiles and collected objects, and does not consume a move. Both environments have identical gameplay balance.

Adventure now wins immediately upon completing the mission. Every valid piece placement consumes one move. Invalid drops and power-ups do not. Undo restores the move count. A completed mission wins even on the last move; otherwise reaching the limit ends the round. Classic and other endless modes remain unlimited. Move counts persist across restarts; older saves migrate using their placed-piece count.

The existing 2,000 authored boards and piece sequences are preserved. Existing difficulty tiers and obstacles remain; the spare placement allowance decreases from 4 (levels 1–500), to 3, to 2, to 1 (1501–2000), bounded by the original authored limit. A proof replay checks that every level still has a winning path within its actual runtime budget, without ads or power-ups. This is an existence guarantee, not a guarantee that every player choice can win. Puzzle complexity varies within each tier.

Validation:
- `node tools/test_adventure.cjs`: all 2,000 proofs through production placement/scoring logic; final-move victory, exhausted budget, invalid placements, undo, Classic.
- `node tools/test_ad_flow.cjs`: existing ad flow regressions and inline JavaScript syntax.
- `python tools/verify_release_inputs.py`: source/catalog/version consistency.
- `tools/test_browser.cjs` in GitHub Actions: phone viewports, actual game bootstrap, scene choice, restart persistence, undo, wins/losses, animated Pulse and callback cancellation. Screenshots are QA artifacts.

The APK is a test build. A release AAB requires the owner's existing Play upload signing key.
