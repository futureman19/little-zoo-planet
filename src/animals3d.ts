// Procedural low-poly animals — primitives only, every species faces +Z.
// Each factory returns a Group whose position the sim drives; idle hop/bob
// animation reads animal.hopT / a shared clock in world3d.

import * as THREE from 'three';

function mat(color: number, flat = true): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: flat });
}

function sphere(r: number, color: number, w = 7, h = 5): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat(color));
}
function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
}
function cyl(rt: number, rb: number, h: number, color: number, seg = 7): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
}
function cone(r: number, h: number, color: number, seg = 7): THREE.Mesh {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
}

function eyes(parent: THREE.Group, x: number, y: number, z: number, s = 0.045): void {
  for (const side of [-1, 1]) {
    const e = sphere(s, 0x222222, 5, 4);
    e.position.set(side * x, y, z);
    parent.add(e);
  }
}

export function makeAnimal(speciesId: string): THREE.Group {
  const g = new THREE.Group();
  builders[speciesId](g);
  g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });
  return g;
}

const builders: Record<string, (g: THREE.Group) => void> = {
  penguin(g) {
    const body = sphere(0.34, 0x2b2b33); body.scale.set(1, 1.2, 0.95); body.position.y = 0.42; g.add(body);
    const belly = sphere(0.26, 0xf5f5f0); belly.scale.set(0.8, 1.05, 0.6); belly.position.set(0, 0.4, 0.14); g.add(belly);
    const head = sphere(0.2, 0x2b2b33); head.position.y = 0.85; g.add(head);
    const beak = cone(0.06, 0.16, 0xff9f45, 5); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.85, 0.24); g.add(beak);
    eyes(g, 0.09, 0.92, 0.16);
    for (const s of [-1, 1]) {
      const wing = box(0.08, 0.34, 0.2, 0x2b2b33); wing.position.set(s * 0.36, 0.45, 0); wing.rotation.z = s * -0.25; g.add(wing);
      const foot = box(0.12, 0.05, 0.2, 0xff9f45); foot.position.set(s * 0.12, 0.03, 0.06); g.add(foot);
    }
  },

  monkey(g) {
    const body = sphere(0.3, 0x8a5a33); body.scale.set(1, 1.1, 0.9); body.position.y = 0.42; g.add(body);
    const head = sphere(0.21, 0x8a5a33); head.position.y = 0.82; g.add(head);
    const face = sphere(0.15, 0xe8c39a); face.scale.set(1, 0.9, 0.55); face.position.set(0, 0.8, 0.13); g.add(face);
    for (const s of [-1, 1]) {
      const ear = sphere(0.07, 0xe8c39a); ear.position.set(s * 0.22, 0.86, 0); g.add(ear);
      const arm = cyl(0.05, 0.05, 0.34, 0x8a5a33); arm.position.set(s * 0.3, 0.42, 0.05); arm.rotation.z = s * 0.3; g.add(arm);
      const leg = cyl(0.06, 0.06, 0.24, 0x6f4525); leg.position.set(s * 0.13, 0.13, 0); g.add(leg);
    }
    eyes(g, 0.08, 0.86, 0.2);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 5, 8, Math.PI * 1.2), mat(0x6f4525));
    tail.position.set(0, 0.5, -0.3); tail.rotation.y = Math.PI / 2; tail.rotation.z = 0.6; g.add(tail);
  },

  panda(g) {
    const body = sphere(0.38, 0xf5f5f0); body.scale.set(1, 1.05, 0.95); body.position.y = 0.45; g.add(body);
    const head = sphere(0.24, 0xf5f5f0); head.position.y = 0.92; g.add(head);
    for (const s of [-1, 1]) {
      const ear = sphere(0.08, 0x2b2b33); ear.position.set(s * 0.16, 1.1, 0); g.add(ear);
      const patch = sphere(0.06, 0x2b2b33); patch.scale.set(1, 1.3, 0.5); patch.position.set(s * 0.1, 0.95, 0.19); g.add(patch);
      const arm = sphere(0.12, 0x2b2b33); arm.scale.set(0.8, 1.6, 0.8); arm.position.set(s * 0.4, 0.4, 0.05); g.add(arm);
      const leg = sphere(0.13, 0x2b2b33); leg.scale.set(0.9, 1.1, 0.9); leg.position.set(s * 0.17, 0.12, 0); g.add(leg);
    }
    const nose = sphere(0.045, 0x2b2b33, 5, 4); nose.position.set(0, 0.88, 0.24); g.add(nose);
  },

  lion(g) {
    const body = sphere(0.4, 0xd9a25f); body.scale.set(1.15, 1, 1); body.position.y = 0.5; g.add(body);
    const mane = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), mat(0xa8641f));
    mane.position.set(0, 0.92, -0.02); g.add(mane);
    const face = sphere(0.22, 0xd9a25f); face.position.set(0, 0.92, 0.14); g.add(face);
    const muzzle = sphere(0.1, 0xf0d9b0); muzzle.scale.set(1.2, 0.8, 0.9); muzzle.position.set(0, 0.86, 0.3); g.add(muzzle);
    for (const s of [-1, 1]) {
      const ear = sphere(0.07, 0xa8641f); ear.position.set(s * 0.18, 1.08, 0.1); g.add(ear);
      const leg = cyl(0.07, 0.07, 0.34, 0xc08b4a); leg.position.set(s * 0.2, 0.17, s > 0 ? 0.18 : 0.18); g.add(leg);
      const legB = cyl(0.07, 0.07, 0.34, 0xc08b4a); legB.position.set(s * 0.2, 0.17, -0.22); g.add(legB);
    }
    eyes(g, 0.09, 0.98, 0.32);
    const tail = cyl(0.03, 0.03, 0.5, 0xc08b4a); tail.position.set(0, 0.55, -0.5); tail.rotation.x = 1.0; g.add(tail);
    const tuft = sphere(0.07, 0xa8641f); tuft.position.set(0, 0.75, -0.72); g.add(tuft);
  },

  giraffe(g) {
    const body = sphere(0.36, 0xe8c06a); body.scale.set(1.1, 1, 1); body.position.y = 1.05; g.add(body);
    const neck = box(0.2, 0.95, 0.24, 0xe8c06a); neck.position.set(0, 1.75, 0.12); neck.rotation.x = -0.12; g.add(neck);
    const head = box(0.22, 0.2, 0.4, 0xe8c06a); head.position.set(0, 2.28, 0.22); g.add(head);
    const muzzle = box(0.16, 0.14, 0.16, 0xd9a25f); muzzle.position.set(0, 2.24, 0.44); g.add(muzzle);
    for (const s of [-1, 1]) {
      const horn = cyl(0.025, 0.025, 0.12, 0xa8641f); horn.position.set(s * 0.07, 2.44, 0.16); g.add(horn);
      const tip = sphere(0.04, 0xa8641f, 5, 4); tip.position.set(s * 0.07, 2.51, 0.16); g.add(tip);
      const ear = box(0.1, 0.06, 0.04, 0xd9a25f); ear.position.set(s * 0.16, 2.36, 0.14); g.add(ear);
      for (const z of [0.2, -0.2]) {
        const leg = cyl(0.055, 0.055, 0.85, 0xd9a25f); leg.position.set(s * 0.16, 0.42, z); g.add(leg);
      }
    }
    eyes(g, 0.1, 2.32, 0.4, 0.05);
    // spots
    const spotPos: [number, number, number][] = [
      [0.25, 1.15, 0.15], [-0.22, 1.0, 0.28], [0.1, 0.95, 0.34], [-0.3, 1.2, -0.1],
      [0.12, 1.6, 0.24], [-0.1, 1.9, 0.22], [0.05, 2.0, 0.24],
    ];
    for (const [x, y, z] of spotPos) {
      const spot = sphere(0.06, 0xa8641f, 5, 4); spot.scale.z = 0.4; spot.position.set(x, y, z); g.add(spot);
    }
  },

  elephant(g) {
    const body = sphere(0.55, 0x9aa3ad); body.scale.set(1.15, 1, 1); body.position.y = 0.75; g.add(body);
    const head = sphere(0.34, 0x9aa3ad); head.position.set(0, 1.05, 0.55); g.add(head);
    for (const s of [-1, 1]) {
      const ear = sphere(0.26, 0x8a939e); ear.scale.set(0.25, 1, 1.15); ear.position.set(s * 0.36, 1.05, 0.5); g.add(ear);
      const tusk = cone(0.04, 0.22, 0xf5f0e0, 5); tusk.rotation.x = Math.PI / 2 + 0.35; tusk.position.set(s * 0.14, 0.86, 0.85); g.add(tusk);
      for (const z of [0.3, -0.28]) {
        const leg = cyl(0.11, 0.12, 0.5, 0x8a939e); leg.position.set(s * 0.28, 0.25, z); g.add(leg);
      }
    }
    eyes(g, 0.16, 1.16, 0.82, 0.05);
    // trunk: stacked segments curving down-forward
    const seg1 = cyl(0.09, 0.075, 0.3, 0x9aa3ad); seg1.position.set(0, 0.82, 0.85); seg1.rotation.x = 0.5; g.add(seg1);
    const seg2 = cyl(0.07, 0.055, 0.28, 0x9aa3ad); seg2.position.set(0, 0.6, 0.95); seg2.rotation.x = 0.15; g.add(seg2);
    const seg3 = cyl(0.05, 0.04, 0.22, 0x8a939e); seg3.position.set(0, 0.4, 0.98); g.add(seg3);
  },
};

const SKIN = [0xf0c8a0, 0xd9a06a, 0xa06840, 0xf5d5b8];

export function makeGuest(shirtColor: number, skinIdx: number): THREE.Group {
  const g = new THREE.Group();
  const body = cyl(0.16, 0.2, 0.5, shirtColor, 8); body.position.y = 0.45; g.add(body);
  const head = sphere(0.15, SKIN[skinIdx % SKIN.length]); head.position.y = 0.85; g.add(head);
  const hair = sphere(0.15, 0x4a3220, 7, 5); hair.scale.set(1, 0.6, 1); hair.position.y = 0.95; g.add(hair);
  for (const s of [-1, 1]) {
    const leg = cyl(0.05, 0.05, 0.25, 0x3a4a6b); leg.position.set(s * 0.08, 0.12, 0); g.add(leg);
  }
  g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });
  return g;
}
