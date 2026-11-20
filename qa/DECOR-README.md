# Three new decorations — local review handoff

Base: `14e05ac`. Branch: `feature/three-new-decorations`. Local only: no push, deploy, or PR.

## Changed files
- `src/config.ts`: Pond 💧 60, Slide 🛝 80, Fountain ⛲ 90; append five-decor (5 decorations, 75 coins).
- `src/world3d.ts`: primitive-only one-tile models, solid-part shadows, shared automatic pop animation. Pond has sand rim/lily; slide has ladder, rails and chute; fountain has stacked basins and blue jet.
- `qa/decor_qa.py`: headed Chrome production-preview pump harness following `species_qa.py`; no production debug hooks added.
- `qa/decor-evidence/*`: machine-readable results and 15 reviewed captures plus contact sheet.
- `qa/DECOR-README.md`: reproducible verification and findings.

## Verified gates
`npm run build -- --outDir qa/build`: PASS, TypeScript zero errors. Vite 7.3.7, 17 modules, 1.31s. HTML 7.97 kB (gzip 2.46); JS 616.44 kB (gzip 157.50). Existing non-fatal >500 kB chunk warning remains. `dist/`, `node_modules`, and `playtests/` untouched.

Preview: `npm run preview -- --outDir qa/build --host 127.0.0.1 --port 4184 --strictPort`

`python qa/decor_qa.py`: **54/54 PASS**, zero page exceptions. Native shop/pointer placements cover all three exact prices, valid/occupied ghosts, duplicate refusal without state/coin changes, mesh creation, advancing pop, placement sound buffer starts, one-tile vertex bounds (within +/-0.901 world units), solid shadows, habitat occupancy, insufficient funds, unknown kinds, and out-of-bounds rejection. All seven cards have exact names/emojis/prices and >=48px targets at both viewport sizes. Four/five threshold, exactly 75 reward, 80 routed confetti sprites, no repeat payout, v1 save/reload meshes/claims, handcrafted pre-trick legacy zoo, and preserved first-decor claim pass.

Production preview served byte-identical `index-CrUao5ej.js`; SHA-256 `fb6fe94297d65e0e769f3ae25a34a01f85aee1a773f7f3931acea28a89e126de`.

`git diff --check`: PASS (Git line-ending notices only).

## Screenshot paths
Under `qa/decor-evidence/`:
- `desktop-pond.png`, `desktop-slide.png`, `desktop-fountain.png`
- `phone-pond.png`, `phone-slide.png`, `phone-fountain.png`
- `desktop-shop-tree.png`, `desktop-shop-balloons.png`, `desktop-shop-fountain.png`
- `phone-shop-tree.png`, `phone-shop-balloons.png`, `phone-shop-fountain.png`
- `desktop-mid-pop.png`, `phone-mid-pop.png`, `phone-mid-pop-milestone.png`
- Overview: `contact-sheet.jpg`; assertions: `results.json`.

Desktop 1440x900; phone 390x844 desktop emulation, not physical-device certification. Existing horizontal carousel is captured at successive scroll positions to cover all seven cards, rather than shrinking touch targets. Diagnostic close-ups lower the camera minimum distance to inspect forms; ordinary overview is used for milestone confetti. The initial close-up milestone screenshot intersected confetti sprites, producing large colored foreground squares: one harness-framing defect, fixed by returning to the ordinary overview, not a game-code workaround. Both full runs passed 54 assertions. Mid-pop model captures are frozen at 4/60 seconds using the existing pump hook.

Visual review: sunny cream/blue pond and fountain, yellow/coral/teal slide, recognizable silhouettes, no observed fence intersections or static z-fighting; actual mesh vertex bounds independently verify tile containment. Foreground fountain cropping in slide close-ups is camera framing, not a broken mesh. Placement rejection toast in captures is the deliberately exercised occupied-tile test. Still images do not certify absence of temporal flicker.

## Findings and scope
No deviations from the pinned table. No schema bump; no new persisted fields needed. Generic sim, save, UI, placement and audio code left unchanged. `decorPlaced` routing only marks dirty, but actual pointer placement already calls `world.addDecor()` and `audio.play('thud')` in `main.ts`; sound is NOT missing. Browser instrumentation observed a real AudioBufferSource start for each placement, not a speaker/listening test.

Recommended next step: independent review of this local commit, then orchestrator-owned merge/deploy.

READY_FOR_REVIEW
