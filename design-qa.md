# BlastNexa v24 — design QA

final result: passed

Reviewed 22 October 2026 against the user-supplied landscape slot screenshot and 29.75-second reference video. The requested relationship is “simile”: preserve BlastNexa’s original game and adopt the reference composition. This is an implementation in the existing Android game, not a new prototype.

## Grounding and comparison

Reference: `01-1000103997.jpg` (1536 × 691). The idle slot reference was normalized to 1280 × 576 and compared together with the actual game capture in one stacked comparison image. Internal review files remain outside the repository: `reference-review/slot-reference-comparison.jpg`, `slot-v24-1280.jpg` and `slot-layout-checks.json` in the task workspace. The user’s screenshots and video were not copied into the public repository.

The original NEXA Temple, Crystal and Forge backgrounds and symbol atlases are reused. A new, original ImageGen guardian is integrated as an optimized transparent WebP. There are no replacement CSS drawings or placeholder illustrations. UI remains in Italian.

## Results

| Area | Result |
| --- | --- |
| Composition | Dominant central cabinet, gold frames, left options, full-body character at right, balance/result/auto and round GIRA in the bottom deck. |
| Responsive slot | Verified at 1280×576, 800×360, 640×360, 960×432 and 1024×600. Spin button stays within the viewport and above the banner at all five sizes. Reel height is 281, 131, 131, 144 and 310 CSS pixels respectively. |
| Puzzle | Large square board at left; goals and score at right; pieces and tools remain visible. Placement and undo were exercised through the rendered UI. On 640×360, the board is 229×229; tray, Pulse and lives stay above the banner. |
| Crosswords | Explicit measured square size and a scrollable right column for rack/actions/clues. On 640×360, board 242×242 and cell 24.875×24.875. Entering RICCIO and submitting changed progress to 1/6 without consuming an attempt. All 400 geometries also pass on both Android targets. |
| Banner | Separate 50-pixel frame in a reserved bottom rail. Confirmed in menu, slot, words and player profile; hidden while the pause overlay is open. |
| Navigation | Slot worlds, missions, return to menu, profile, crossword resume, puzzle resume, pause and undo exercised. Primary slot controls preserve original callbacks. |
| Motion | Guardian idle motion, spin and winning-cell emphasis respect system reduced motion and the existing light-effects preference. |
| Console | No application error observed. Browser extension metadata errors were excluded because their URL is the installed extension, not the game. |
| Native Android | API 31 and 36 each pass 8/8 instrumentation tests for the final game commit 4e0258c, including all crosswords, 50-spin persistence, Home/Back, online bridge, landscape/banner geometry, treasure selection renderer recovery and visible colored tile surfaces. |

## Iteration history

Fixed missing asset links in packaging, an initially visible unstarted board, featured menu text clipping, compact-screen reel height, the crossword display/width cascade, bottom Pulse clipping, and the information-page wallet width. The Android test harness acknowledges Android’s own first-run full-screen education before testing touch, Back and recovery.

Intentional differences: original NEXA themes and character; existing 5×3 reel engine and free spins for game lives; no copied Cinderella assets, real-money bets or invented controls. The separate ad rail is an additional user requirement. The three original bonus systems and 50-spin ad-break cadence remain in place.

No open P0, P1 or P2 issue in the reviewed flows. P3: secondary metadata and side options remain small on compact landscape phones; side options and clue lists scroll independently. Physical-device audio, ad delivery, battery and thermal behavior are not established by browser or emulator tests.

Final compatibility check: the original color-mix-only tile material was invisible in WebView 91 screenshots. The final build includes an @supports fallback that retains each tile’s --tile color. Both targets pass the added computed-paint assertions. One Android 12 startup timeout under emulator memory pressure was retained in the evidence; a complete fresh-emulator retry passes all eight tests.
