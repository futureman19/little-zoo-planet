# Little Zoo Planet — DESIGN (pinned)

A simpler "Planet Zoo" for kids 6–9. Web, Three.js low-poly 3D, phone + desktop.

## The 6-line pin
- **Genre:** zoo builder / caretaker sim (no fail states)
- **Core verb:** place habitats, adopt animals, feed them, watch guests arrive
- **Win/lose:** no losing — goals ("Make 5 animals happy") give confetti + unlocks
- **Session length:** 3–10 minutes, progress persists (localStorage)
- **Mood:** warm, safe, bouncy — a toy zoo that is always glad to see you
- **Art direction:** low-poly primitives (Crossy-Road-ish), sunny palette — sky blue `#7ec8f7`, grass `#7fc85e`, warm sand paths, candy accent UI (coral `#ff6b6b`, sunny yellow `#ffd93d`)

## Audience rules (kids 6–9)
- Icons + max 2 words per button. Big touch targets (≥48px).
- No reading required to play; words are a bonus.
- Nothing dies, nothing is punished. Hungry animals get sleepy, not dead.
- Every action gets a sound + a pop. Confetti for milestones.

## Core loop (v1)
1. Start with an empty plot, 200 coins, one free habitat.
2. Buy habitat → place on grid (tap tile).
3. Adopt animal into habitat (lion, elephant, giraffe, panda, penguin, monkey).
4. Tap animal → feed (small coin cost) → hearts, happiness up.
5. Happy animals attract guests; guests wander paths and drop coins.
6. Coins buy more habitats, animals, decorations (tree, rock, flower, balloon stand).
7. Milestones unlock species + give confetti bursts.

## Tech (pinned by skills)
- Vite + TypeScript + Three.js (core/addons same release).
- Seeded RNG (mulberry32) for ALL gameplay randomness. No Math.random in sim.
- Split sim state from visuals; one rAF loop; `window.__APP.pump(n, dt)` QA hook; `preserveDrawingBuffer: true`.
- Orbit camera: rotate/pinch/pan, clamped polar; `touch-action: none`.
- SRGB output, ACES tone mapping (~1.08), PCFSoft shadows, DPR cap 1.5 mobile / 2 desktop, RoomEnvironment PMREM.
- Audio via forge tools (music loop + SFX pools), WebAudio unlock on first tap.
- Save: localStorage, versioned schema.

## v1 scope fence (NOT in v1)
- No staff, no research trees, no genetics, no terrain editing, no animal breeding.
- No accounts, no purchases, no ads, no external network calls at runtime (fonts/assets local).
- No keyboard required.

## Milestones
- M1: scene + camera + grid + place habitat (compiles + screenshot PASS)
- M2: animals (procedural low-poly, idle anim) + adopt flow
- M3: feed + happiness + hearts particles
- M4: guests + coins economy
- M5: decorations + milestones + confetti
- M6: audio (forge music + SFX) + save/load
- M7: playtest gate (forge_playtest / bot pump) → fix → SOLID
- M8: production build + Vercel deploy + live verify
