# BlastNexa — HTML v4

This revision fixes the mismatch between the displayed objective and the end of the round. The previous HTML required spending every available move after meeting the target. It could also execute an old result or Next callback more than once. The supplementary core tests did not execute the actual result timing.

## Current behavior

War and Ocean occupy the two large menu buttons and open the level map. Classic remains accessible below the main buttons. Adventure shows a large remaining-move count next to the score.

A completed objective with a playable board wins immediately, including on the last allowed placement. A blocked board cannot win. An incomplete objective loses at the move limit. Pulse and Drill can offer a rescue before the limit. One valid placement consumes one move; invalid drops and power-ups do not. Undo restores its placement and move. Classic has no move limit.

When the result is determined, input freezes immediately and a completion/termination notice appears. One result dialog follows the final animation, after 85 ms with reduced effects or 650 ms with full effects. Old callbacks are invalidated by both session and animation identifiers. Next Level is an explicit, single-use action and cannot skip a level when double-clicked. Navigation and restart cancel pending effects. A restored completed save resolves immediately under the same rules.

War uses an olive grid, amber panels, original SVG jets, falling bombs, block impact effects, and synthesized jet/whistle/explosion audio. Ocean uses underwater colors and original shaded SVG sharks with articulated tails and body movement. Audio honors mute and stops on navigation.

## Verification

- `node tools/test_adventure.cjs`: replay every authored solution using production board/scoring functions, check all 2,000 levels fit their actual move budget, plus cutoff, invalid drops, undo, blocked boards, final-move wins, and infinite Classic.
- `node tools/test_ad_flow.cjs`: inline script syntax and existing ad reward/transition regressions.
- `node tools/test_pulse_audio.cjs`: audio synthesis, mute, AudioContext resume, and cancellation.
- `node tools/test_browser.cjs`: complete production HTML in Chromium, with real DOM, render functions, result dialogs, input guards, and callbacks. Only JavaScript timers are virtualized; the production fast-test bypass is not enabled. Replays all 2,000 levels in each environment, alternating full/reduced FX; checks expired-budget losses and blocked-board losses for every level; rejects double input and duplicate Next; checks restart cancellation; adds 2,000 seeded legal random-play rounds, resume/undo, Pulse, and a final-move win. Counts and screenshots are recorded in `qa-output` by the HTML-only workflow.

This is an existence/flow verification, not exhaustive enumeration of every possible player move sequence. The HTML-only workflow produces no APK or AAB. AdMob remains in TEST mode in the Android source.
