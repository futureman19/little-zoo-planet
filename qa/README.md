# Species wave 2 verification

Local branch `feature/species-wave-2`, based on `7978243`. No push/deploy/PR.

## Wave 2 changes
- `src/animals3d.ts`: shared-primitive tiger, koala and crocodile builders, +Z faces, warm colors; all fit the existing fence margin at every heading.
- `src/config.ts`: exact pinned definitions; all-species text and threshold now 15. Reward remains **400**, still the largest (next: 200). No reward or save-schema changes; existing claims remain claimed.
- `qa/species_qa.py`: extends prior pump harness for this wave, exact tuning/unlock boundary tests and 48px card checks.
- `qa/wave2-evidence/`: results, 28 screenshots and contact sheet. Previous-wave evidence remains in `qa/evidence/`.

## Wave 2 gates
- `npm run build -- --outDir qa/build`: PASS, zero TypeScript errors, 17 modules, 1.07s; JS 619.22 kB / gzip 158.24 kB. Existing non-fatal >500kB chunk warning.
- Preview: `npm run preview -- --outDir qa/build --host 127.0.0.1 --port 4185 --strictPort`.
- `python qa/species_qa.py`: **44/44 PASS**, zero page exceptions. Both manifest-loaded chirps per species HTTP 200; all 15 cards; locked/unlocked states and exact boundaries; pinned cost/frequency/speed; adoption; real pointer feed with six hearts; real double-tap with spin/hop; mesh clearance; full zoo save/reload; handcrafted pre-trick v1 restore with missing trick fields normalized and old all-species claim preserved; 48px adopt targets on both viewports.
- RED before implementation: harness failed at missing tiger manifest fetch, as expected with only 12 definitions. One fixture defect corrected: ten unlock animals require four habitats because capacity is three per habitat; three further habitats isolate new models. No product workaround.
- `git diff --check`: PASS. No dependency installation; `node_modules`, `dist`, `playtests` unchanged.

## Wave 2 screenshots
All under `qa/wave2-evidence/`:
- `{desktop,phone}-{tiger,koala,crocodile}.png` (six in-habitat views).
- `desktop-{tiger,koala,crocodile}-trick.png`, `phone-trick.png` (four action views).
- `{desktop,phone}-menu-{penguin,panda,giraffe,fox,turtle,flamingo,tiger,koala,crocodile}.png` (18 carousel views covering all 15 cards).
- `contact-sheet.jpg`; machine-readable checks in `results.json`.

Desktop 1440x900; phone 390x844 viewport emulation, not physical-device certification. Carousel captures deliberately preserve readable card sizing instead of squeezing 15 cards into one frame. Menu filenames identify the scrolled-to card, not the habitat animal. Diagnostic camera and paused seeded sim isolate model review; phone trick is pump-triggered, desktop double-taps use real pointer input.

Visual review: all frames rendered, models recognizable and fully in view; new card names/prices readable at native phone size. Existing edge-clipped carousel neighbors indicate scroll position. Initial crocodile feet looked disconnected in mid-air; added overlapping rounded leg primitives and re-ran the full gate. Fresh native-size phone trick review confirmed continuous body/leg/foot appearance. Initial contact sheet plus native-size menu/trick inspection completed; one transient vision credit error succeeded on retry. No remaining blocking visual defect observed.

No specification deviations. Independent review is next; no release action authorized.

READY_FOR_REVIEW

---

# Prior wave: three new species verification

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
