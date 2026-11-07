// Game data — all tuning lives here. Kids 6–9: gentle numbers, no punishment.

export const GRID = 16;          // 16x16 tiles
export const TILE = 2;           // world units per tile
export const HABITAT_TILES = 4;  // habitats are 4x4 tiles

export interface SpeciesDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  unlock: UnlockRule;
  chirpFreq: number;   // base freq for its voice blip
  speed: number;       // wander speed (world units / s)
}

export type UnlockRule =
  | { kind: 'start' }
  | { kind: 'happyCount'; n: number }
  | { kind: 'lifetimeCoins'; n: number }
  | { kind: 'animalCount'; n: number };

export const SPECIES: readonly SpeciesDef[] = [
  { id: 'penguin',  name: 'Penguin',  emoji: '🐧', cost: 50,  unlock: { kind: 'start' },                 chirpFreq: 880,  speed: 0.9 },
  { id: 'monkey',   name: 'Monkey',   emoji: '🐒', cost: 75,  unlock: { kind: 'start' },                 chirpFreq: 660,  speed: 1.6 },
  { id: 'panda',    name: 'Panda',    emoji: '🐼', cost: 120, unlock: { kind: 'happyCount', n: 3 },      chirpFreq: 440,  speed: 0.8 },
  { id: 'lion',     name: 'Lion',     emoji: '🦁', cost: 150, unlock: { kind: 'lifetimeCoins', n: 300 }, chirpFreq: 180,  speed: 1.1 },
  { id: 'giraffe',  name: 'Giraffe',  emoji: '🦒', cost: 180, unlock: { kind: 'animalCount', n: 5 },     chirpFreq: 520,  speed: 1.0 },
  { id: 'elephant', name: 'Elephant', emoji: '🐘', cost: 250, unlock: { kind: 'lifetimeCoins', n: 800 }, chirpFreq: 120,  speed: 0.7 },
  { id: 'fox',      name: 'Fox',      emoji: '🦊', cost: 100, unlock: { kind: 'animalCount', n: 3 },     chirpFreq: 740,  speed: 1.5 },
  { id: 'owl',      name: 'Owl',      emoji: '🦉', cost: 160, unlock: { kind: 'lifetimeCoins', n: 500 }, chirpFreq: 330,  speed: 1.2 },
  { id: 'turtle',   name: 'Turtle',   emoji: '🐢', cost: 140, unlock: { kind: 'happyCount', n: 6 },      chirpFreq: 240,  speed: 0.45 },
];

export const COSTS = {
  habitat: 100,
  feed: 5,
  decor: { tree: 20, flower: 10, rock: 15, balloons: 40 } as Record<string, number>,
};

export const DECOR: readonly { id: string; name: string; emoji: string }[] = [
  { id: 'tree',     name: 'Tree',     emoji: '🌳' },
  { id: 'flower',   name: 'Flower',   emoji: '🌷' },
  { id: 'rock',     name: 'Rock',     emoji: '🪨' },
  { id: 'balloons', name: 'Balloons', emoji: '🎈' },
];

export const ECON = {
  startCoins: 200,
  feedHappy: 30,
  happyDecayPerSec: 1 / 15,   // 1 point per 15s
  hungryBelow: 30,            // sleepy below this
  guestBaseMax: 2,
  guestPerAnimal: 1.5,
  guestHardCap: 14,
  guestSpawnSec: 4,
  guestTipSec: [6, 10] as const, // min/max seconds between coin drops per guest
  tipChanceHappy: 0.85,          // tip chance when watching happy animals
  tipChanceBase: 0.35,           // baseline so kids always progress
};

export interface MilestoneDef {
  id: string;
  text: string;
  reward: number;
  test: (s: MilestoneState) => boolean;
}

export interface MilestoneState {
  animalCount: number;
  speciesOwned: number;
  happyCount: number;
  lifetimeCoins: number;
  habitatCount: number;
  decorCount: number;
  tricksDone: number;
}

export const MILESTONES: readonly MilestoneDef[] = [
  { id: 'first-animal', text: 'Adopt your first animal', reward: 50,  test: (s) => s.animalCount >= 1 },
  { id: 'first-decor',  text: 'Place a decoration',       reward: 25,  test: (s) => s.decorCount >= 1 },
  { id: 'first-trick',  text: 'Double-tap an animal: trick! ✨', reward: 30, test: (s) => s.tricksDone >= 1 },
  { id: 'three-species', text: 'Adopt 3 different animals', reward: 75, test: (s) => s.speciesOwned >= 3 },
  { id: 'three-homes',  text: 'Build 3 homes',            reward: 100, test: (s) => s.habitatCount >= 3 },
  { id: 'five-happy',   text: 'Make 5 animals happy',     reward: 100, test: (s) => s.happyCount >= 5 },
  { id: 'rich-zoo',     text: 'Earn 500 coins total',     reward: 150, test: (s) => s.lifetimeCoins >= 500 },
  { id: 'five-species', text: 'Adopt 5 different animals', reward: 150, test: (s) => s.speciesOwned >= 5 },
  { id: 'ten-animals',  text: 'Adopt 10 animals',         reward: 200, test: (s) => s.animalCount >= 10 },
  { id: 'all-species',  text: 'Adopt all 9 animals!',     reward: 400, test: (s) => s.speciesOwned >= 9 },
];

export const PALETTE = {
  sky: 0x7ec8f7,
  grass: 0x7fc85e,
  grassDark: 0x6fb44f,
  path: 0xe8d8b0,
  fence: 0xb08954,
  fenceDark: 0x8a6a3f,
  habitatGround: 0xd9c89a,
  water: 0x5db9e8,
  guestShirts: [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xc780fa, 0xff9f45] as const,
};

export const SAVE_KEY = 'little-zoo-planet-v1';
