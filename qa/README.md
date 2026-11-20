# Three new species verification

Local feature branch only; no push/deploy/PR.

## Changes
- `src/animals3d.ts`: primitive-only zebra, hippo, flamingo builders, authored facing +Z. Radial mesh clearance below 0.9 units fits the existing 1-unit fence margin.
- `src/config.ts`: exact pinned species definitions; all-species now requires 12. Reward stays 400: already the largest reward (next is 200); no economy tuning was requested or justified. Existing claimed milestone persistence unchanged.
- `qa/species_qa.py`: repeatable headed Chrome production-preview pump regression and screenshots.
- `qa/evidence/*`: results and reviewed desktop/mobile-emulation screenshots.

## Gates
`npm run build -- --outDir qa/build`: PASS, tsc zero errors; Vite 7.3.7, 17 modules, built in 1.23s. JS 614.63 kB / gzip 156.98 kB. Non-fatal >500 kB chunk warning. Alternate output directory deliberately preserves forbidden `dist/`; no dependency installation or node_modules changes.

`npm run preview -- --outDir qa/build --host 127.0.0.1 --port 4183 --strictPort`

`python qa/species_qa.py`: **39/39 PASS**, zero runtime exceptions. Tests actual pointer feed/double-tap, happiness, six heart sprites, spin rotation and hop, adoption under satisfied unlock conditions, all 12 cards, new-species locked/unlocked states and emojis, six manifest-initiated HTTP 200 audio fetches, milestone boundaries (9/11/12), radial fence clearance, new-zoo save/reload, handcrafted pre-trick v1 restore, and preservation of a previously claimed all-species milestone.

The QA fixture supplies coins/lifetimeCoins and adopts eight happy penguins to unlock dependencies. No gameplay changes or debug hooks were added. Desktop is 1440x900; phone is 390x844 desktop emulation, not physical-device certification. Mobile carousel captures cover successive scroll positions rather than shrinking all 12 cards into one unreadable frame. Idle captures explicitly set heading +Z for model review.

`git diff --check`: PASS (only Git line-ending normalization notices).

## Screenshots
All relative to `qa/evidence/`:
- `desktop-zebra.png`, `desktop-hippo.png`, `desktop-flamingo.png`
- `phone-zebra.png`, `phone-hippo.png`, `phone-flamingo.png`
- `desktop-zebra-trick.png`, `desktop-hippo-trick.png`, `desktop-flamingo-trick.png`, `phone-trick.png`
- `desktop-menu-{penguin,panda,giraffe,fox,turtle,flamingo}.png`
- `phone-menu-{penguin,panda,giraffe,fox,turtle,flamingo}.png`
- `contact-sheet.jpg`: overview of all 22 screenshots.

Reviewed captures: recognizable warm low-poly forms, readable forward faces, no observed z-fighting or fence intersections. An initial blank phone capture was a QA resize/render race with rAF suppressed; waiting for resize before manual rendering fixed the capture, and the full 39-check run passed afterward. No game-code workaround was needed.

No deviations from the pinned species table. No save-schema change, UI rewrite, audio wiring change, or trick implementation change.

READY_FOR_REVIEW
