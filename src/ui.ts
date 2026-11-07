// DOM HUD: coins, action bar, shop cards, goals panel, toasts, hint.
// Kid rules: emoji + max 2 words, big targets, no punishment copy.

import { Sim } from './sim';
import { SPECIES, DECOR, COSTS, MILESTONES, SpeciesDef } from './config';

export type ShopAction =
  | { kind: 'habitat' }
  | { kind: 'animal'; speciesId: string }
  | { kind: 'decor'; decorId: string };

export interface UiCallbacks {
  onShopAction(a: ShopAction): void;
  onCategory(k: string | null): void;
  onToggleAudio(which: 'music' | 'sfx'): void;
}

export class Ui {
  private cb: UiCallbacks;
  private coinsEl: HTMLElement;
  private coinsNum: HTMLElement;
  private shopEl: HTMLElement;
  private barEl: HTMLElement;
  private toastEl: HTMLElement;
  private hintEl: HTMLElement;
  private goalsEl: HTMLElement;
  private goalListEl: HTMLElement;
  private openCategory: string | null = null;

  constructor(cb: UiCallbacks) {
    this.cb = cb;
    this.coinsEl = document.getElementById('coins')!;
    this.coinsNum = this.coinsEl.querySelector('.num')!;
    this.shopEl = document.getElementById('shop')!;
    this.barEl = document.getElementById('bar')!;
    this.toastEl = document.getElementById('toast')!;
    this.hintEl = document.getElementById('hint')!;
    this.goalsEl = document.getElementById('goals')!;
    this.goalListEl = document.getElementById('goallist')!;

    this.barEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.bigbtn') as HTMLElement | null;
      if (!btn) return;
      const k = btn.dataset.k!;
      if (k === 'goals') { this.openGoals(); return; }
      this.toggleCategory(k);
    });
    document.getElementById('goalclose')!.addEventListener('click', () => this.closeGoals());
    this.goalsEl.addEventListener('click', (e) => { if (e.target === this.goalsEl) this.closeGoals(); });
    document.getElementById('musicbtn')!.addEventListener('click', () => cb.onToggleAudio('music'));
    document.getElementById('sfxbtn')!.addEventListener('click', () => cb.onToggleAudio('sfx'));
  }

  setCoins(n: number): void {
    const cur = parseInt(this.coinsNum.textContent || '0', 10);
    this.coinsNum.textContent = String(n);
    if (n !== cur) {
      this.coinsEl.classList.remove('bump');
      void this.coinsEl.offsetWidth;
      this.coinsEl.classList.add('bump');
    }
  }

  setAudioToggles(musicOn: boolean, sfxOn: boolean): void {
    document.getElementById('musicbtn')!.classList.toggle('off', !musicOn);
    document.getElementById('sfxbtn')!.classList.toggle('off', !sfxOn);
  }

  private toggleCategory(k: string): void {
    if (this.openCategory === k) {
      this.closeShop();
      this.cb.onCategory(null);
      return;
    }
    this.openCategory = k;
    for (const b of this.barEl.querySelectorAll('.bigbtn')) {
      b.classList.toggle('active', (b as HTMLElement).dataset.k === k);
    }
    this.cb.onCategory(k);
  }

  closeShop(): void {
    this.openCategory = null;
    this.shopEl.classList.remove('open');
    for (const b of this.barEl.querySelectorAll('.bigbtn')) b.classList.remove('active');
  }

  category(): string | null { return this.openCategory; }

  renderShop(sim: Sim): void {
    if (!this.openCategory || this.openCategory === 'goals') { this.shopEl.classList.remove('open'); return; }
    const cards: string[] = [];
    if (this.openCategory === 'habitat') {
      const price = sim.freeHabitat ? 'FREE ⭐' : `🪙 ${COSTS.habitat}`;
      cards.push(`<button class="card" data-act="habitat"><span class="e">🏡</span><span class="nm">Home</span><span class="pr">${price}</span></button>`);
    } else if (this.openCategory === 'animals') {
      for (const sp of SPECIES) {
        const unlocked = sim.isUnlocked(sp);
        const sub = unlocked ? `🪙 ${sp.cost}` : this.lockText(sp);
        cards.push(`<button class="card ${unlocked ? '' : 'locked'}" data-act="animal" data-id="${sp.id}">
          <span class="e">${sp.emoji}</span><span class="nm">${sp.name}</span><span class="pr">${sub}</span></button>`);
      }
    } else if (this.openCategory === 'decor') {
      for (const d of DECOR) {
        cards.push(`<button class="card" data-act="decor" data-id="${d.id}">
          <span class="e">${d.emoji}</span><span class="nm">${d.name}</span><span class="pr">🪙 ${COSTS.decor[d.id]}</span></button>`);
      }
    }
    this.shopEl.innerHTML = cards.join('');
    this.shopEl.classList.add('open');
    this.shopEl.onclick = (e) => {
      const card = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
      if (!card) return;
      const act = card.dataset.act!;
      if (act === 'habitat') this.cb.onShopAction({ kind: 'habitat' });
      else if (act === 'animal') this.cb.onShopAction({ kind: 'animal', speciesId: card.dataset.id! });
      else if (act === 'decor') this.cb.onShopAction({ kind: 'decor', decorId: card.dataset.id! });
    };
  }

  private lockText(sp: SpeciesDef): string {
    const u = sp.unlock;
    switch (u.kind) {
      case 'start': return '';
      case 'happyCount': return `🔒 ${u.n} 😊`;
      case 'lifetimeCoins': return `🔒 🪙${u.n} all-time`;
      case 'animalCount': return `🔒 ${u.n} animals`;
    }
  }

  openGoals(): void {
    this.closeShop();
    const rows = MILESTONES.map((m) => {
      const done = (window.__LZP_SIM_DONE as Set<string> | undefined)?.has(m.id) ?? false;
      return `<div class="goal ${done ? 'done' : ''}">
        <span class="check">${done ? '✅' : '⬜'}</span>
        <span>${m.text}</span>
        <span class="reward">+${m.reward} 🪙</span></div>`;
    });
    this.goalListEl.innerHTML = rows.join('');
    this.goalsEl.classList.add('open');
  }

  closeGoals(): void { this.goalsEl.classList.remove('open'); }
  goalsOpen(): boolean { return this.goalsEl.classList.contains('open'); }

  toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  hint(show: boolean, text = '👆 Tap the grass!'): void {
    this.hintEl.textContent = text;
    this.hintEl.classList.toggle('show', show);
  }
}
