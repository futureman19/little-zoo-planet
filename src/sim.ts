// The sim: pure game logic, fully deterministic (seeded RNG only).
// Visuals read state; they never decide rules.

import { Rng, makeRng, rngRange, rngInt, rngPick } from './rng';
import {
  GRID, TILE, HABITAT_TILES, SPECIES, COSTS, ECON, MILESTONES,
  SpeciesDef, MilestoneDef,
} from './config';

export interface Habitat { id: number; gx: number; gz: number }
export interface Animal {
  id: number; speciesId: string; habitatId: number;
  happiness: number;             // 0..100
  x: number; z: number;          // world position (inside habitat)
  tx: number; tz: number;        // wander target
  pauseT: number;                // seconds left standing still
  hopT: number;                  // >0 while celebrating
  trickT: number;                // >0 while doing a trick (spin)
  trickCd: number;               // seconds until the next trick is allowed
}
export interface Guest {
  id: number; x: number; z: number; tx: number; tz: number;
  tipT: number; shirtIdx: number;
}
export interface Decor { id: number; kind: string; gx: number; gz: number }

export type SimEvent =
  | { type: 'coin'; x: number; z: number; amount: number }
  | { type: 'milestone'; def: MilestoneDef }
  | { type: 'fed'; animalId: number; x: number; z: number }
  | { type: 'adopted'; animalId: number }
  | { type: 'habitatPlaced'; id: number }
  | { type: 'decorPlaced'; id: number }
  | { type: 'hop'; animalId: number }
  | { type: 'trick'; animalId: number; x: number; z: number };

export interface SimSnapshot {
  v: 1; seed: string; coins: number; lifetimeCoins: number;
  freeHabitat: boolean; nextId: number;
  habitats: Habitat[]; animals: Animal[]; guests: Guest[];
  decor: Decor[]; milestonesDone: string[];
  tricksDone?: number;           // absent in pre-trick saves
}

export const PLOT_MIN = -(GRID * TILE) / 2;   // -16
export const PLOT_MAX = (GRID * TILE) / 2;    // +16

export function tileToWorld(g: number): number { return PLOT_MIN + g * TILE; }
export function worldToTile(w: number): number { return Math.floor((w - PLOT_MIN) / TILE); }

export function habitatBounds(h: Habitat) {
  const x0 = tileToWorld(h.gx), z0 = tileToWorld(h.gz);
  return { x0, z0, x1: x0 + HABITAT_TILES * TILE, z1: z0 + HABITAT_TILES * TILE };
}
export function habitatInner(h: Habitat) {
  const b = habitatBounds(h);
  const m = 1.0; // keep animals off the fence
  return { x0: b.x0 + m, z0: b.z0 + m, x1: b.x1 - m, z1: b.z1 - m };
}
/** Viewing spot for guests: just south of the habitat fence. */
export function habitatViewSpot(h: Habitat): { x: number; z: number } {
  const b = habitatBounds(h);
  return { x: (b.x0 + b.x1) / 2, z: b.z1 + 1.2 };
}

export const MAX_ANIMALS_PER_HABITAT = 3;

const TIP_MIN = ECON.guestTipSec[0];
const TIP_MAX = ECON.guestTipSec[1];

export class Sim {
  rng: Rng;
  seed: string;
  coins = ECON.startCoins;
  lifetimeCoins = 0;
  freeHabitat = true;
  nextId = 1;
  habitats: Habitat[] = [];
  animals: Animal[] = [];
  guests: Guest[] = [];
  decor: Decor[] = [];
  milestonesDone = new Set<string>();
  events: SimEvent[] = [];
  guestSpawnT = 2.5;
  tricksDone = 0;

  constructor(seed: string) {
    this.seed = seed;
    this.rng = makeRng(seed);
  }

  // ---------- queries ----------
  species(id: string): SpeciesDef { return SPECIES.find((s) => s.id === id)!; }
  animal(id: number): Animal | undefined { return this.animals.find((a) => a.id === id); }

  habitatAt(gx: number, gz: number): Habitat | undefined {
    return this.habitats.find((h) =>
      gx >= h.gx && gx < h.gx + HABITAT_TILES && gz >= h.gz && gz < h.gz + HABITAT_TILES);
  }
  decorAt(gx: number, gz: number): Decor | undefined {
    return this.decor.find((d) => d.gx === gx && d.gz === gz);
  }
  animalsIn(habitatId: number): Animal[] {
    return this.animals.filter((a) => a.habitatId === habitatId);
  }
  happyCount(): number { return this.animals.filter((a) => a.happiness >= 60).length; }
  speciesOwned(): number { return new Set(this.animals.map((a) => a.speciesId)).size; }

  isUnlocked(sp: SpeciesDef): boolean {
    const u = sp.unlock;
    switch (u.kind) {
      case 'start': return true;
      case 'happyCount': return this.happyCount() >= u.n;
      case 'lifetimeCoins': return this.lifetimeCoins >= u.n;
      case 'animalCount': return this.animals.length >= u.n;
    }
  }

  // ---------- actions ----------
  canPlaceHabitat(gx: number, gz: number): boolean {
    if (gx < 0 || gz < 0 || gx + HABITAT_TILES > GRID || gz + HABITAT_TILES > GRID) return false;
    for (let x = gx; x < gx + HABITAT_TILES; x++)
      for (let z = gz; z < gz + HABITAT_TILES; z++)
        if (this.habitatAt(x, z) || this.decorAt(x, z)) return false;
    return true;
  }

  placeHabitat(gx: number, gz: number): Habitat | null {
    if (!this.canPlaceHabitat(gx, gz)) return null;
    const cost = this.freeHabitat ? 0 : COSTS.habitat;
    if (this.coins < cost) return null;
    this.spend(cost);
    this.freeHabitat = false;
    const h: Habitat = { id: this.nextId++, gx, gz };
    this.habitats.push(h);
    this.events.push({ type: 'habitatPlaced', id: h.id });
    return h;
  }

  adoptAnimal(speciesId: string, habitatId: number): Animal | null {
    const sp = this.species(speciesId);
    if (!this.isUnlocked(sp) || this.coins < sp.cost) return null;
    const h = this.habitats.find((hh) => hh.id === habitatId);
    if (!h || this.animalsIn(habitatId).length >= MAX_ANIMALS_PER_HABITAT) return null;
    this.spend(sp.cost);
    const inner = habitatInner(h);
    const a: Animal = {
      id: this.nextId++, speciesId, habitatId,
      happiness: 70,
      x: rngRange(this.rng, inner.x0, inner.x1), z: rngRange(this.rng, inner.z0, inner.z1),
      tx: 0, tz: 0, pauseT: 0, hopT: 0, trickT: 0, trickCd: 0,
    };
    a.tx = a.x; a.tz = a.z;
    this.animals.push(a);
    this.events.push({ type: 'adopted', animalId: a.id });
    this.checkMilestones();
    return a;
  }

  feedAnimal(id: number): boolean {
    const a = this.animal(id);
    if (!a || this.coins < COSTS.feed) return false;
    this.spend(COSTS.feed);
    a.happiness = Math.min(100, a.happiness + ECON.feedHappy);
    a.hopT = 0.9;
    this.events.push({ type: 'fed', animalId: a.id, x: a.x, z: a.z });
    this.checkMilestones();
    return true;
  }

  /** Double-tap trick: free, small happiness bump, per-animal cooldown. */
  trickAnimal(id: number): boolean {
    const a = this.animal(id);
    if (!a || a.trickCd > 0) return false;
    a.trickT = 1.1;
    a.trickCd = 8;
    a.pauseT = Math.max(a.pauseT, 1.1); // hold still while spinning
    a.happiness = Math.min(100, a.happiness + 6);
    this.tricksDone++;
    this.events.push({ type: 'trick', animalId: a.id, x: a.x, z: a.z });
    this.checkMilestones();
    return true;
  }

  canPlaceDecor(gx: number, gz: number): boolean {
    if (gx < 0 || gz < 0 || gx >= GRID || gz >= GRID) return false;
    return !this.habitatAt(gx, gz) && !this.decorAt(gx, gz);
  }

  placeDecor(kind: string, gx: number, gz: number): Decor | null {
    const cost = COSTS.decor[kind];
    if (cost === undefined || !this.canPlaceDecor(gx, gz) || this.coins < cost) return null;
    this.spend(cost);
    const d: Decor = { id: this.nextId++, kind, gx, gz };
    this.decor.push(d);
    this.events.push({ type: 'decorPlaced', id: d.id });
    this.checkMilestones();
    return d;
  }

  // ---------- tick ----------
  tick(dt: number): void {
    // happiness decay
    for (const a of this.animals) {
      a.happiness = Math.max(0, a.happiness - ECON.happyDecayPerSec * dt);
      if (a.hopT > 0) a.hopT = Math.max(0, a.hopT - dt);
      if (a.trickT > 0) a.trickT = Math.max(0, a.trickT - dt);
      if (a.trickCd > 0) a.trickCd = Math.max(0, a.trickCd - dt);
      this.wanderAnimal(a, dt);
    }
    this.updateGuests(dt);
    if (this.events.length > 400) this.events.length = 0; // safety valve
  }

  private wanderAnimal(a: Animal, dt: number): void {
    const sp = this.species(a.speciesId);
    const h = this.habitats.find((hh) => hh.id === a.habitatId);
    if (!h) return;
    if (a.pauseT > 0) { a.pauseT -= dt; return; }
    if (a.trickT > 0) return; // spinning in place
    const dx = a.tx - a.x, dz = a.tz - a.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.15) {
      const inner = habitatInner(h);
      a.tx = rngRange(this.rng, inner.x0, inner.x1);
      a.tz = rngRange(this.rng, inner.z0, inner.z1);
      a.pauseT = rngRange(this.rng, 0.8, 3.2);
      return;
    }
    const sleepy = a.happiness < ECON.hungryBelow;
    const speed = sp.speed * (sleepy ? 0.35 : 1);
    a.x += (dx / dist) * speed * dt;
    a.z += (dz / dist) * speed * dt;
  }

  private updateGuests(dt: number): void {
    const maxGuests = Math.min(
      ECON.guestHardCap,
      Math.floor(ECON.guestBaseMax + this.animals.length * ECON.guestPerAnimal));
    this.guestSpawnT -= dt;
    if (this.guestSpawnT <= 0 && this.guests.length < maxGuests && this.animals.length > 0) {
      this.guestSpawnT = ECON.guestSpawnSec;
      const g: Guest = {
        id: this.nextId++, x: rngRange(this.rng, -2, 2), z: PLOT_MAX - 1.5,
        tx: 0, tz: 0,
        tipT: rngRange(this.rng, TIP_MIN, TIP_MAX),
        shirtIdx: rngInt(this.rng, 0, 5),
      };
      this.newGuestTarget(g);
      this.guests.push(g);
    }
    for (const g of this.guests) {
      const dx = g.tx - g.x, dz = g.tz - g.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.2) {
        const speed = 1.35;
        g.x += (dx / dist) * speed * dt;
        g.z += (dz / dist) * speed * dt;
      } else {
        g.tipT -= dt;
        if (g.tipT <= 0) {
          g.tipT = rngRange(this.rng, TIP_MIN, TIP_MAX);
          this.guestTip(g);
          this.newGuestTarget(g);
        }
      }
    }
  }

  private guestTip(g: Guest): void {
    // happiest habitat avg influences tip chance; baseline keeps kids progressing
    let chance = ECON.tipChanceBase;
    if (this.habitats.length > 0) {
      const avgs = this.habitats.map((h) => {
        const list = this.animalsIn(h.id);
        return list.length ? list.reduce((s, a) => s + a.happiness, 0) / list.length : 0;
      });
      const best = Math.max(...avgs);
      if (best >= 60) chance = ECON.tipChanceHappy;
    }
    if (this.rng() < chance) {
      const amount = rngInt(this.rng, 1, 3);
      this.earn(amount);
      this.events.push({ type: 'coin', x: g.x, z: g.z, amount });
      if (this.rng() < 0.25) {
        const near = this.nearestAnimal(g.x, g.z);
        if (near) { near.hopT = 0.7; this.events.push({ type: 'hop', animalId: near.id }); }
      }
      this.checkMilestones();
    }
  }

  private nearestAnimal(x: number, z: number): Animal | undefined {
    let best: Animal | undefined; let bd = Infinity;
    for (const a of this.animals) {
      const d = Math.hypot(a.x - x, a.z - z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  private newGuestTarget(g: Guest): void {
    if (this.habitats.length > 0 && this.rng() < 0.8) {
      const h = rngPick(this.rng, this.habitats);
      const v = habitatViewSpot(h);
      g.tx = v.x + rngRange(this.rng, -1.5, 1.5);
      g.tz = Math.min(PLOT_MAX - 1, v.z + rngRange(this.rng, 0, 1));
    } else {
      g.tx = rngRange(this.rng, PLOT_MIN + 2, PLOT_MAX - 2);
      g.tz = rngRange(this.rng, PLOT_MIN + 2, PLOT_MAX - 2);
    }
  }

  private checkMilestones(): void {
    const s = {
      animalCount: this.animals.length,
      speciesOwned: this.speciesOwned(),
      happyCount: this.happyCount(),
      lifetimeCoins: this.lifetimeCoins,
      habitatCount: this.habitats.length,
      decorCount: this.decor.length,
      tricksDone: this.tricksDone,
    };
    for (const m of MILESTONES) {
      if (!this.milestonesDone.has(m.id) && m.test(s)) {
        this.milestonesDone.add(m.id);
        this.earn(m.reward);
        this.events.push({ type: 'milestone', def: m });
      }
    }
  }

  private spend(n: number): void { this.coins = Math.max(0, this.coins - n); }
  private earn(n: number): void { this.coins += n; this.lifetimeCoins += n; }

  drainEvents(): SimEvent[] {
    if (this.events.length === 0) return [];
    const out = this.events;
    this.events = [];
    return out;
  }

  // ---------- save / load ----------
  snapshot(): SimSnapshot {
    return {
      v: 1, seed: this.seed, coins: this.coins, lifetimeCoins: this.lifetimeCoins,
      freeHabitat: this.freeHabitat, nextId: this.nextId,
      habitats: this.habitats, animals: this.animals, guests: [],
      decor: this.decor, milestonesDone: [...this.milestonesDone],
      tricksDone: this.tricksDone,
    };
  }

  static restore(snap: SimSnapshot): Sim {
    const sim = new Sim(snap.seed);
    sim.coins = snap.coins;
    sim.lifetimeCoins = snap.lifetimeCoins;
    sim.freeHabitat = snap.freeHabitat;
    sim.nextId = snap.nextId;
    sim.habitats = snap.habitats;
    sim.animals = snap.animals;
    // pre-trick saves lack the new fields — normalize, never lose the zoo
    for (const a of sim.animals) { a.trickT ??= 0; a.trickCd ??= 0; }
    sim.decor = snap.decor;
    sim.milestonesDone = new Set(snap.milestonesDone);
    sim.tricksDone = snap.tricksDone ?? 0;
    return sim;
  }
}

