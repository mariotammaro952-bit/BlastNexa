# BlastNexa v27 — automatic invitations

Native invitations are scheduled automatically at 09:00, 14:00 and 20:30 in the phone timezone. The invitation switch, slot button and invitation settings dialog have been removed. Only a read-only schedule note remains in settings. Android notification permission is requested by the native host. Native scheduling, recreation, clock/DST recovery, actual notification delivery, duplicate prevention and notification tapping are covered by the v27 Android validation job; results follow CI completion.

The v27 slot keeps the reviewed full-screen scene, neon launcher and compact control deck. It uses 100 daily coins and x1 wagers of 1, 5 or 10 colored lines, with a +100 rewarded video at zero balance. JavaScript wallet validation passes 13 scenarios. The earlier visual review below describes the v26 baseline.

# BlastNexa v26 — design QA

final result: passed

Reviewed 22 October 2026 using the supplied slot screenshot, the v25 screenshot showing the unwanted lower band, and the 29.75-second reference video. Comparison of reference, previous build and current implementation was performed in one combined input: `qa-internal/v26-reference-comparison.png` in the task workspace. User reference material remains outside the repository.

## Visual evidence and scope

Final browser evidence: `qa/evidence/v26-slot-800-final.jpg` and `qa/evidence/v26-slot-640-final.jpg`. Both captures were taken after the last spacing fix. The launcher artwork was inspected separately at 512×512, including its adaptive safe area. Original NEXA art, themes, Italian UI, five reels and three rows remain intentional game constraints; the requested composition is similar to the reference.

| Surface | Finding and verification |
| --- | --- |
| Scene and cabinet | Full-height warm panorama, dominant gold-framed reels, original character at right. No separate blue strip below the scene. |
| Lower controls | Coin balance, banner seat, VITE VINTE and round GIRA share one deck. Normal spin costs 100 virtual coins; bonus spins clearly show free. Prize count explicitly shows lives. |
| Sidebar | Lives total and AUTO precede secondary information. At 640×360 AUTO ends at y279 inside its sidebar ending at y283. Secondary controls scroll. |
| Banner | Native banner uses the measured center seat, stays separate from GIRA and is hidden during dialogs. No-ad fallback shows the life paytable. Real ad delivery requires a physical-device check. |
| Refill dialog | Coin wallet opens an Italian explanation with refill rules, optional rewarded video and return button. Compact display tested through rendered UI. |
| Typography and color | Existing offline fonts; short readable primary labels; warm gold controls and emerald symbols. No new remote fonts. |
| Icon | Original ImageGen lime/cyan block lightning with magenta accent on vivid violet; adaptive resources and legacy sizes. No text, launcher chrome or copied reference icon. |
| Interaction | Rendered GIRA immediately reduced 5,000 to 4,900 and disabled while spinning. Existing callbacks retained. Ten production-runtime wallet tests pass, including migration, insufficient balance, paid/free spins, rewarded completion and recreation. |
| Motion and accessibility | Existing light-effects and reduced-motion handling retained. Dialog keeps focus, background is inert and banner is hidden. Primary spin has an accessible name and busy state. |
| Console | No application error in browser logs for terminal.local. Extension metadata errors are excluded. |
| Android | Fourteen instrumentation cases configured on API31 compact, API36 compact and API36 wide/cutout. Their results are recorded in the release report after CI completion. |

## Iteration history

- P1: unwanted blue banner band and unused lower space. Embedded banner seat into the control deck and extended the scene to the bottom edge.
- P1: lives and AUTO initially fell below primary sidebar content. Moved them above feature metadata; removed tab padding and reduced sidebar gaps.
- P2: AUTO 10 wrapped on narrow phones. Short labels with no wrapping and unchanged accessible names.
- P2: previous icon lacked contrast. Replaced it with generated neon block artwork, packaged in adaptive and legacy launcher resources.

No open actionable P0, P1 or P2 in the browser-reviewed surfaces. P3: secondary sidebar metadata is intentionally compact and scrollable. Physical-device audio, real ads, battery and thermal behavior remain outside this visual review.
