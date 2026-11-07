// Little Zoo Planet — bootstrap. One renderer, one loop, sim-driven.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sim, SimEvent, PLOT_MIN, PLOT_MAX, worldToTile } from './sim';
import { World3D } from './world3d';
import { Fx } from './fx';
import { Ui, ShopAction } from './ui';
import { AudioMan } from './audio';
import { loadSave, writeSave, loadPrefs, writePrefs } from './save';
import { COSTS, TILE, SPECIES, SAVE_KEY } from './config';

const isCoarse = matchMedia('(pointer: coarse)').matches;

// ---------- renderer / scene ----------
const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, isCoarse ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // r186 removed PCFSoftShadowMap
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8f7);
scene.fog = new THREE.Fog(0x7ec8f7, 55, 110);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.4;

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(10, 30, 16);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x6fb44f, 0.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff5e0, 1.15);
sun.position.set(18, 30, 12);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(isCoarse ? 1024 : 2048);
sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
sun.shadow.camera.near = 5; sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.55;
scene.add(sun);

// ---------- controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = 1.15;
controls.minDistance = 10;
controls.maxDistance = 45;
controls.target.set(0, 0, 0);

// ---------- game objects ----------
const prefs = loadPrefs();
const audio = new AudioMan();
audio.musicOn = prefs.musicOn;
audio.sfxOn = prefs.sfxOn;

const freshStart = new URLSearchParams(location.search).has('fresh');
if (freshStart) localStorage.removeItem(SAVE_KEY);
const saved = freshStart ? null : loadSave();
const sim = saved ? Sim.restore(saved) : new Sim(`zoo-${Date.now()}`);
const world = new World3D(scene);
const fx = new Fx(scene);

let placement: { kind: 'habitat' } | { kind: 'decor'; decorId: string } | { kind: 'animal'; speciesId: string } | null = null;

const ui = new Ui({
  onShopAction(a: ShopAction) { handleShopAction(a); },
  onCategory() {
    exitPlacement();
    ui.renderShop(sim);
  },
  onToggleAudio(which) {
    if (which === 'music') { audio.setMusicOn(!audio.musicOn); }
    else { audio.setSfxOn(!audio.sfxOn); }
    ui.setAudioToggles(audio.musicOn, audio.sfxOn);
    writePrefs({ musicOn: audio.musicOn, sfxOn: audio.sfxOn });
  },
});
ui.setAudioToggles(audio.musicOn, audio.sfxOn);

// restore world from save
for (const h of sim.habitats) world.addHabitat(h);
for (const d of sim.decor) world.addDecor(d);

// ---------- audio manifest ----------
const AUDIO_BASE = 'assets/audio/';
const manifest: Record<string, string[]> = {
  music: ['music.wav'],
  coin: ['coin_0.wav', 'coin_1.wav', 'coin_2.wav', 'coin_3.wav'],
  ui: ['ui_0.wav', 'ui_1.wav'],
  powerup: ['powerup_0.wav', 'powerup_1.wav'],
  magic: ['magic_0.wav', 'magic_1.wav'],
  pickup: ['pickup_0.wav', 'pickup_1.wav'],
  thud: ['thud_0.wav', 'thud_1.wav'],
};
for (const sp of SPECIES) {
  manifest[`chirp_${sp.id}`] = [`chirp_${sp.id}_0.wav`, `chirp_${sp.id}_1.wav`];
}
for (const urls of Object.values(manifest)) {
  for (let i = 0; i < urls.length; i++) urls[i] = AUDIO_BASE + urls[i];
}

// ---------- title screen ----------
const titleEl = document.getElementById('title')!;
document.getElementById('playbtn')!.addEventListener('click', async () => {
  titleEl.classList.add('hidden');
  audio.unlock();
  await audio.load(manifest);
  audio.startMusic();
  if (!saved) ui.toast('Build your first home! 🏡');
});

// ---------- shop / placement ----------
function handleShopAction(a: ShopAction): void {
  audio.play('ui');
  if (a.kind === 'habitat') {
    if (!sim.freeHabitat && sim.coins < COSTS.habitat) { ui.toast('Need more coins! 🪙'); return; }
    placement = { kind: 'habitat' };
    world.showGhost('habitat');
    ui.hint(true);
    ui.renderShop(sim);
  } else if (a.kind === 'decor') {
    if (sim.coins < COSTS.decor[a.decorId]) { ui.toast('Need more coins! 🪙'); return; }
    placement = { kind: 'decor', decorId: a.decorId };
    world.showGhost('decor');
    ui.hint(true);
    ui.renderShop(sim);
  } else {
    const sp = SPECIES.find((s) => s.id === a.speciesId)!;
    if (!sim.isUnlocked(sp)) { ui.toast('Not yet! Keep playing ⭐'); return; }
    if (sim.coins < sp.cost) { ui.toast('Need more coins! 🪙'); return; }
    if (sim.habitats.length === 0) { ui.toast('Build a home first! 🏡'); return; }
    placement = { kind: 'animal', speciesId: a.speciesId };
    world.hideGhost();
    ui.hint(true, `👆 Tap a home for the ${sp.name}!`);
    ui.renderShop(sim);
  }
}

function exitPlacement(): void {
  placement = null;
  world.hideGhost();
  ui.hint(false);
  ui.renderShop(sim);
}

// ---------- picking ----------
const ray = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();
let downPos: { x: number; y: number; t: number } | null = null;

function setNdc(e: PointerEvent): void {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY, t: performance.now() };
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!placement || placement.kind === 'animal') return;
  setNdc(e);
  ray.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(groundPlane, hit)) {
    world.moveGhost(sim, hit.x, hit.z);
  }
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  const dt = performance.now() - downPos.t;
  downPos = null;
  if (moved > 12 || dt > 500) return; // it was a drag, not a tap
  handleTap(e);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') exitPlacement(); });

function handleTap(e: PointerEvent): void {
  if (ui.goalsOpen()) return;
  setNdc(e);
  ray.setFromCamera(ndc, camera);

  if (placement) {
    if (placement.kind === 'animal') {
      const sp = SPECIES.find((s) => s.id === (placement as { speciesId: string }).speciesId)!;
      // tap a habitat pad to adopt into it
      const hit = new THREE.Vector3();
      if (!ray.ray.intersectPlane(groundPlane, hit)) return;
      const gx = worldToTile(hit.x), gz = worldToTile(hit.z);
      const h = sim.habitatAt(gx, gz);
      if (!h) { ui.toast('Tap a home! 🏡'); return; }
      if (sim.animalsIn(h.id).length >= 3) { ui.toast('That home is full! 🐾'); return; }
      const a = sim.adoptAnimal(sp.id, h.id);
      if (a) {
        exitPlacement();
        ui.closeShop();
      } else {
        ui.toast('Need more coins! 🪙');
      }
      return;
    }
    // habitat / decor placement
    const tile = world.ghostTile();
    if (!tile || !tile.ok) { ui.toast('Not there! Try another spot 🌱'); return; }
    if (placement.kind === 'habitat') {
      const h = sim.placeHabitat(tile.gx, tile.gz);
      if (h) { world.addHabitat(h); audio.play('thud'); fx.stars(new THREE.Vector3(0, 1, 0).set(tileToWorld0(tile.gx), 1, tileToWorld0(tile.gz)), 5); afterSpend(); }
    } else {
      const d = sim.placeDecor(placement.decorId, tile.gx, tile.gz);
      if (d) { world.addDecor(d); audio.play('thud'); afterSpend(); }
    }
    return;
  }

  // feed: tap an animal
  const meshes = [...world.animalScreenTargets().entries()];
  const hits = ray.intersectObjects(meshes.map(([, m]) => m), true);
  (window as unknown as Record<string, unknown>).__LZP_TAP = {
    cx: e.clientX, cy: e.clientY, hits: hits.length,
    first: hits[0] ? hits[0].object.type : null, meshCount: meshes.length,
  };
  if (hits.length) {
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !meshes.some(([, m]) => m === obj)) obj = obj.parent;
    const entry = meshes.find(([, m]) => m === obj);
    if (entry) {
      const [animalId, m] = entry;
      if (sim.feedAnimal(animalId)) {
        const a = sim.animal(animalId)!;
        fx.hearts(m.position.clone());
        audio.play('pickup');
        audio.play(`chirp_${a.speciesId}`, 1, 0.1);
        afterSpend();
      } else {
        ui.toast('Need more coins! 🪙');
      }
    }
  }
}

function tileToWorld0(g: number): number { return PLOT_MIN + g * TILE + TILE / 2; }

function afterSpend(): void {
  ui.setCoins(sim.coins);
  ui.renderShop(sim);
  dirty = true;
}

// ---------- event routing ----------
function routeEvents(events: SimEvent[]): void {
  for (const ev of events) {
    switch (ev.type) {
      case 'coin': {
        fx.coin(new THREE.Vector3(ev.x, 0.5, ev.z));
        audio.play('coin');
        ui.setCoins(sim.coins);
        dirty = true;
        break;
      }
      case 'milestone': {
        fx.confetti(new THREE.Vector3(0, 4, 0), 80);
        audio.play('magic');
        ui.toast(`⭐ ${ev.def.text}! +${ev.def.reward} 🪙`);
        ui.setCoins(sim.coins);
        dirty = true;
        break;
      }
      case 'adopted': {
        const a = sim.animal(ev.animalId);
        if (a) {
          fx.stars(new THREE.Vector3(a.x, 1, a.z), 6);
          audio.play('powerup');
          audio.play(`chirp_${a.speciesId}`);
          ui.toast(`${sim.species(a.speciesId).emoji} New friend!`);
        }
        dirty = true;
        break;
      }
      case 'fed': {
        dirty = true;
        break;
      }
      case 'hop': {
        const a = sim.animal(ev.animalId);
        if (a && Math.random() < 0.5) audio.play(`chirp_${a.speciesId}`, 1, 0.12);
        break;
      }
      case 'habitatPlaced':
      case 'decorPlaced': {
        dirty = true;
        break;
      }
    }
  }
}

// ---------- save ----------
let dirty = false;
setInterval(() => {
  if (dirty) { writeSave(sim.snapshot()); dirty = false; }
}, 4000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { writeSave(sim.snapshot()); dirty = false; }
});
addEventListener('beforeunload', () => writeSave(sim.snapshot()));

// ---------- loop ----------
let simTime = 0;
let last = performance.now();

function step(dt: number): void {
  simTime += dt;
  sim.tick(dt);
  routeEvents(sim.drainEvents());
  world.sync(sim, simTime, dt);
  fx.update(dt);
}

renderer.setAnimationLoop((t) => {
  const dt = Math.min((t - last) / 1000, 0.1);
  last = t;
  step(dt);
  // clamp camera target to the plot
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, PLOT_MIN, PLOT_MAX);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, PLOT_MIN, PLOT_MAX);
  controls.target.y = 0;
  controls.update();
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

ui.setCoins(sim.coins);

// ---------- QA hooks ----------
declare global {
  interface Window {
    __APP: {
      sim: Sim;
      world: World3D;
      camera: THREE.PerspectiveCamera;
      controls: OrbitControls;
      pump(n: number, dtEach?: number): void;
      renderOnce(): void;
      stats(): { calls: number; tris: number };
    };
    __LZP_SIM_DONE: Set<string>;
  }
}
window.__LZP_SIM_DONE = sim.milestonesDone;
window.__APP = {
  sim,
  world,
  camera,
  controls,
  pump(n: number, dtEach = 1 / 60): void {
    for (let i = 0; i < n; i++) step(dtEach);
  },
  renderOnce(): void {
    controls.update();
    renderer.render(scene, camera);
  },
  stats() {
    return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  },
};
