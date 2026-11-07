// World visuals: terrain, gate, fences, decor + mesh management for
// animals and guests. Reads sim state; writes nothing back.

import * as THREE from 'three';
import { Sim, Habitat, Decor, habitatBounds, tileToWorld, PLOT_MIN, PLOT_MAX } from './sim';
import { makeAnimal, makeGuest } from './animals3d';
import { PALETTE, HABITAT_TILES, TILE, GRID } from './config';
import { makeEmojiTexture } from './fx';

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...opts });
}

export class World3D {
  scene: THREE.Scene;
  private habitatMeshes = new Map<number, THREE.Group>();
  private animalMeshes = new Map<number, THREE.Group>();
  private guestMeshes = new Map<number, THREE.Group>();
  private decorMeshes = new Map<number, THREE.Group>();
  private ghost: THREE.Group | null = null;
  ghostKind: 'habitat' | 'decor' | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildTerrain();
    this.buildGate();
  }

  // ---------- static world ----------
  private buildTerrain(): void {
    const size = GRID * TILE;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(size, 1, size), mat(PALETTE.grass));
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(size + 3, 0.8, size + 3), mat(PALETTE.grassDark));
    rim.position.y = -0.65;
    this.scene.add(rim);

    // stone path: south entrance strip + center cross
    const pathMat = mat(PALETTE.path);
    const strip1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.06, size), pathMat);
    strip1.position.set(0, 0.031, 0); strip1.receiveShadow = true;
    this.scene.add(strip1);
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(size, 0.06, 3), pathMat);
    strip2.position.set(0, 0.03, 0); strip2.receiveShadow = true;
    this.scene.add(strip2);

    // faint tile grid
    const grid = new THREE.GridHelper(size, GRID, 0xffffff, 0x69a84e);
    (grid.material as THREE.Material).opacity = 0.18;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.045;
    this.scene.add(grid);

    // clouds
    for (let i = 0; i < 5; i++) {
      const cloud = new THREE.Group();
      const n = 3 + (i % 2);
      for (let j = 0; j < n; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 - j * 0.25, 7, 5),
          mat(0xffffff, { roughness: 1 }));
        puff.position.set(j * 1.6 - n * 0.7, j % 2 ? 0.35 : 0, (j % 2) * 0.5);
        puff.scale.y = 0.6;
        cloud.add(puff);
      }
      cloud.position.set(-30 + i * 15, 14 + (i % 3) * 2.5, -22 + (i % 2) * 14);
      this.scene.add(cloud);
    }
  }

  private buildGate(): void {
    const gate = new THREE.Group();
    const postMat = mat(PALETTE.fenceDark);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.4, 7), postMat);
      post.position.set(s * 2.1, 1.7, 0); post.castShadow = true;
      gate.add(post);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), mat(0xffd93d));
      ball.position.set(s * 2.1, 3.5, 0);
      gate.add(ball);
    }
    const bannerTex = makeTextTexture('🦁 ZOO 🐧', '#fff8e7', '#ff6b6b');
    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 1.1, 0.15),
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.9 }));
    banner.position.set(0, 3.1, 0);
    gate.add(banner);
    gate.position.set(0, 0, PLOT_MAX - 0.6);
    this.scene.add(gate);
  }

  // ---------- habitats ----------
  addHabitat(h: Habitat): void {
    if (this.habitatMeshes.has(h.id)) return;
    const b = habitatBounds(h);
    const g = new THREE.Group();

    const w = b.x1 - b.x0, d = b.z1 - b.z0;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.08, d - 0.3), mat(PALETTE.habitatGround));
    pad.position.set((b.x0 + b.x1) / 2, 0.04, (b.z0 + b.z1) / 2);
    pad.receiveShadow = true;
    g.add(pad);

    // fence: posts + rails, with an opening centered on the south side
    const fenceMat = mat(PALETTE.fence);
    const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.1, 6);
    const gapX = (b.x0 + b.x1) / 2;
    const posts: [number, number][] = [];
    for (let x = b.x0; x <= b.x1 + 0.01; x += TILE) { posts.push([x, b.z0], [x, b.z1]); }
    for (let z = b.z0 + TILE; z <= b.z1 - 0.01; z += TILE) { posts.push([b.x0, z], [b.x1, z]); }
    for (const [x, z] of posts) {
      const p = new THREE.Mesh(postGeo, fenceMat);
      p.position.set(x, 0.55, z); p.castShadow = true;
      g.add(p);
    }
    const rail = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      for (const y of [0.45, 0.85]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.09), fenceMat);
        r.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
        r.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
        r.castShadow = true;
        g.add(r);
      }
    };
    // south side leaves a gate gap at the viewing spot
    rail(b.x0, b.z1, gapX - 1.1, b.z1);
    rail(gapX + 1.1, b.z1, b.x1, b.z1);
    rail(b.x0, b.z0, b.x1, b.z0);
    rail(b.x0, b.z0, b.x0, b.z1);
    rail(b.x1, b.z0, b.x1, b.z1);

    // little pond in a corner
    const pond = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 10),
      mat(PALETTE.water, { roughness: 0.4 }));
    pond.position.set(b.x0 + 1.3, 0.09, b.z0 + 1.3);
    g.add(pond);

    this.scene.add(g);
    this.habitatMeshes.set(h.id, g);

    // build pop
    g.scale.setScalar(0.01);
    this.pop(g, 0.35);
  }

  // ---------- decor ----------
  addDecor(d: Decor): void {
    if (this.decorMeshes.has(d.id)) return;
    const g = new THREE.Group();
    const x = tileToWorld(d.gx) + TILE / 2, z = tileToWorld(d.gz) + TILE / 2;
    g.position.set(x, 0, z);
    switch (d.kind) {
      case 'tree': {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.9, 6), mat(0x8a5a33));
        trunk.position.y = 0.45; trunk.castShadow = true; g.add(trunk);
        const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.3, 7), mat(0x4e9b47));
        c1.position.y = 1.5; c1.castShadow = true; g.add(c1);
        const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 7), mat(0x5db456));
        c2.position.y = 2.25; c2.castShadow = true; g.add(c2);
        break;
      }
      case 'flower': {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), mat(0x4e9b47));
        stem.position.y = 0.25; g.add(stem);
        const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), mat(0xff6b9d));
        head.position.y = 0.55; head.castShadow = true; g.add(head);
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat(0xffd93d));
        center.position.set(0, 0.55, 0.14); g.add(center);
        break;
      }
      case 'rock': {
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat(0x9a9aa2));
        rock.scale.set(1, 0.65, 0.8); rock.position.y = 0.3;
        rock.rotation.y = 0.7; rock.castShadow = true; g.add(rock);
        break;
      }
      case 'balloons': {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), mat(0x8a6a3f));
        pole.position.y = 0.7; g.add(pole);
        const colors = [0xff6b6b, 0xffd93d, 0x4d96ff];
        colors.forEach((c, i) => {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6),
            mat(c, { roughness: 0.35 }));
          b.scale.y = 1.15;
          b.position.set((i - 1) * 0.45, 1.8 + (i % 2) * 0.3, (i % 2) * 0.2);
          b.castShadow = true;
          g.add(b);
        });
        break;
      }
    }
    this.scene.add(g);
    this.decorMeshes.set(d.id, g);
    g.scale.setScalar(0.01);
    this.pop(g, 0.3);
  }

  // ---------- animals & guests ----------
  private pops: { g: THREE.Group; t: number; dur: number }[] = [];
  private pop(g: THREE.Group, dur: number): void { this.pops.push({ g, t: 0, dur }); }

  sync(sim: Sim, t: number, dt: number): void {
    // habitats / decor added by events in main; here we sync animals + guests
    for (const a of sim.animals) {
      let m = this.animalMeshes.get(a.id);
      if (!m) {
        m = makeAnimal(a.speciesId);
        this.scene.add(m);
        this.animalMeshes.set(a.id, m);
        m.scale.setScalar(0.01);
        this.pop(m, 0.4);
      }
      const dx = a.tx - a.x, dz = a.tz - a.z;
      const moving = Math.hypot(dx, dz) > 0.2 && a.pauseT <= 0;
      m.position.set(a.x, 0, a.z);
      if (moving) {
        const targetRot = Math.atan2(dx, dz);
        m.rotation.y += shortAngle(m.rotation.y, targetRot) * Math.min(1, dt * 8);
        m.position.y = Math.abs(Math.sin(t * 7 + a.id)) * 0.05;
      }
      if (a.hopT > 0) {
        const k = 1 - a.hopT / 0.9;
        m.position.y = Math.sin(k * Math.PI) * 0.55;
        const squash = 1 + Math.sin(k * Math.PI) * 0.18;
        m.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      } else if (a.happiness < 30) {
        m.scale.set(1.05, 0.88, 1.05); // sleepy droop
      } else if (!this.pops.some((p) => p.g === m)) {
        m.scale.setScalar(1);
      }
    }
    for (const gu of sim.guests) {
      let m = this.guestMeshes.get(gu.id);
      if (!m) {
        m = makeGuest(PALETTE.guestShirts[gu.shirtIdx % PALETTE.guestShirts.length], gu.shirtIdx);
        this.scene.add(m);
        this.guestMeshes.set(gu.id, m);
      }
      const dx = gu.tx - gu.x, dz = gu.tz - gu.z;
      const moving = Math.hypot(dx, dz) > 0.25;
      m.position.set(gu.x, 0, gu.z);
      if (moving) {
        const targetRot = Math.atan2(dx, dz);
        m.rotation.y += shortAngle(m.rotation.y, targetRot) * Math.min(1, dt * 6);
        m.position.y = Math.abs(Math.sin(t * 9 + gu.id)) * 0.04;
      }
    }
    // drop guest meshes that no longer exist
    for (const [id, m] of this.guestMeshes) {
      if (!sim.guests.some((gu) => gu.id === id)) {
        this.scene.remove(m);
        this.guestMeshes.delete(id);
      }
    }
    // build pops (overshoot ease)
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      const s = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); // easeOutBack-ish
      p.g.scale.setScalar(Math.max(0.01, s));
      if (k >= 1) { p.g.scale.setScalar(1); this.pops.splice(i, 1); }
    }
  }

  // ---------- placement ghost ----------
  showGhost(kind: 'habitat' | 'decor'): void {
    this.hideGhost();
    this.ghostKind = kind;
    this.ghost = new THREE.Group();
    if (kind === 'habitat') {
      const s = HABITAT_TILES * TILE;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(s - 0.2, s - 0.2),
        new THREE.MeshBasicMaterial({ color: 0x6bcb77, transparent: true, opacity: 0.4, depthWrite: false }));
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.07;
      plane.name = 'ghostPlane';
      this.ghost.add(plane);
    } else {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(TILE - 0.15, TILE - 0.15),
        new THREE.MeshBasicMaterial({ color: 0x6bcb77, transparent: true, opacity: 0.4, depthWrite: false }));
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.07;
      plane.name = 'ghostPlane';
      this.ghost.add(plane);
    }
    this.scene.add(this.ghost);
  }

  moveGhost(sim: Sim, wx: number, wz: number): void {
    if (!this.ghost) return;
    let gx: number, gz: number, ok: boolean;
    if (this.ghostKind === 'habitat') {
      gx = Math.floor((wx - PLOT_MIN) / TILE - (HABITAT_TILES - 1) / 2);
      gz = Math.floor((wz - PLOT_MIN) / TILE - (HABITAT_TILES - 1) / 2);
      gx = Math.max(0, Math.min(GRID - HABITAT_TILES, gx));
      gz = Math.max(0, Math.min(GRID - HABITAT_TILES, gz));
      ok = sim.canPlaceHabitat(gx, gz);
      const s = HABITAT_TILES * TILE;
      this.ghost.position.set(tileToWorld(gx) + s / 2, 0, tileToWorld(gz) + s / 2);
    } else {
      gx = Math.max(0, Math.min(GRID - 1, Math.floor((wx - PLOT_MIN) / TILE)));
      gz = Math.max(0, Math.min(GRID - 1, Math.floor((wz - PLOT_MIN) / TILE)));
      ok = sim.canPlaceDecor(gx, gz);
      this.ghost.position.set(tileToWorld(gx) + TILE / 2, 0, tileToWorld(gz) + TILE / 2);
    }
    const plane = this.ghost.getObjectByName('ghostPlane') as THREE.Mesh | undefined;
    if (plane) (plane.material as THREE.MeshBasicMaterial).color.setHex(ok ? 0x6bcb77 : 0xff6b6b);
    this.ghost.userData.tile = { gx, gz, ok };
  }

  hideGhost(): void {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost = null;
      this.ghostKind = null;
    }
  }

  ghostTile(): { gx: number; gz: number; ok: boolean } | null {
    return this.ghost?.userData.tile ?? null;
  }

  animalScreenTargets(): Map<number, THREE.Group> { return this.animalMeshes; }
}

function shortAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function makeTextTexture(text: string, bg: string, fg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = '900 64px "Comic Sans MS", "Segoe UI Emoji", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export { makeEmojiTexture };
