# Little Zoo Planet 🦁

A kid-friendly 3D zoo builder — "a simpler Planet Zoo" for ages 6–9.
Build homes, adopt and feed cute low-poly animals, make them do tricks,
and attract guests who tip coins. Nothing dies, progress saves automatically.

**Play: https://little-zoo-planet.vercel.app**

## How to play

1. **🏡 Home** → tap the grass to build a habitat
2. **🐾 Animals** → pick an animal → tap a home to adopt it
3. **Tap an animal** to feed it · **double-tap** for a trick ✨
4. **🌷 Decor** to prettify · **⭐ Goals** for coin rewards
5. **🌙** night mode · **📸** save a photo of your zoo

9 animals: penguin, monkey, panda, lion, giraffe, elephant, fox, owl, turtle.

## Tech

- Three.js (r186) + Vite + TypeScript, no other runtime deps
- Fully deterministic sim (seeded RNG); `window.__APP.pump(n)` QA hook
- Procedural low-poly animal models (primitives only)
- Music + SFX procedurally generated (GameForge tools, CC0)
- Save = versioned localStorage snapshot (kids never lose their zoo)

## Dev

```bash
npm install
npm run dev      # dev server
npm run build    # typecheck + production build → dist/
```

Deploys: pushes to `master` auto-deploy to production via the Vercel
GitHub integration.
