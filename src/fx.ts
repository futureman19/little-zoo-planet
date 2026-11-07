// FX pool — emoji sprite particles (hearts, coins) + confetti.
// All motion is dt-driven so window.__APP.pump() advances it deterministically.

import * as THREE from 'three';

export function makeEmojiTexture(emoji: string, px = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d')!;
  ctx.font = `${px * 0.8}px "Segoe UI Emoji", "Apple Color Emoji", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, px / 2, px / 2 + px * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Particle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  spin: number;
  grow: number;
}

const CONFETTI_COLORS = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xc780fa, 0xff9f45];

export class Fx {
  private scene: THREE.Scene;
  private parts: Particle[] = [];
  private texHeart: THREE.CanvasTexture;
  private texCoin: THREE.CanvasTexture;
  private texStar: THREE.CanvasTexture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.texHeart = makeEmojiTexture('❤️');
    this.texCoin = makeEmojiTexture('🪙');
    this.texStar = makeEmojiTexture('⭐');
  }

  hearts(pos: THREE.Vector3, n = 6): void {
    for (let i = 0; i < n; i++) {
      this.spawn(this.texHeart, pos, {
        vx: (Math.random() - 0.5) * 1.2, vy: 1.6 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.2,
        life: 1.1 + Math.random() * 0.4, size: 0.45, gravity: -0.4,
      });
    }
  }

  coin(pos: THREE.Vector3): void {
    this.spawn(this.texCoin, pos, {
      vx: 0, vy: 2.2, vz: 0, life: 0.9, size: 0.55, gravity: -1.5,
    });
  }

  stars(pos: THREE.Vector3, n = 4): void {
    for (let i = 0; i < n; i++) {
      this.spawn(this.texStar, pos, {
        vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 1.6, vz: (Math.random() - 0.5) * 2.4,
        life: 0.9 + Math.random() * 0.3, size: 0.4, gravity: -2.2,
      });
    }
  }

  confetti(center: THREE.Vector3, n = 60): void {
    for (let i = 0; i < n; i++) {
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const m = new THREE.SpriteMaterial({ color, transparent: true });
      const s = new THREE.Sprite(m);
      s.position.copy(center).add(new THREE.Vector3(
        (Math.random() - 0.5) * 6, Math.random() * 2, (Math.random() - 0.5) * 6));
      s.scale.setScalar(0.18 + Math.random() * 0.14);
      this.scene.add(s);
      this.parts.push({
        sprite: s,
        vel: new THREE.Vector3((Math.random() - 0.5) * 5, 4.5 + Math.random() * 3.5, (Math.random() - 0.5) * 5),
        life: 0, maxLife: 1.8 + Math.random() * 0.8, gravity: -6, spin: (Math.random() - 0.5) * 8, grow: 0,
      });
    }
  }

  private spawn(tex: THREE.Texture, pos: THREE.Vector3,
    o: { vx: number; vy: number; vz: number; life: number; size: number; gravity: number }): void {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const s = new THREE.Sprite(m);
    s.position.copy(pos);
    s.position.y += 0.8;
    s.scale.setScalar(o.size);
    this.scene.add(s);
    this.parts.push({
      sprite: s, vel: new THREE.Vector3(o.vx, o.vy, o.vz),
      life: 0, maxLife: o.life, gravity: o.gravity, spin: 0, grow: 0.3,
    });
  }

  update(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.parts.splice(i, 1);
        continue;
      }
      p.vel.y += p.gravity * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      if (p.spin) p.sprite.material.rotation += p.spin * dt;
      const k = p.life / p.maxLife;
      p.sprite.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      if (p.grow) p.sprite.scale.multiplyScalar(1 + p.grow * dt);
    }
  }

  dispose(): void {
    for (const p of this.parts) {
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    }
    this.parts.length = 0;
    this.texHeart.dispose(); this.texCoin.dispose(); this.texStar.dispose();
  }
}
