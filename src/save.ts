// Versioned localStorage save. Kids never lose their zoo.

import { SimSnapshot } from './sim';
import { SAVE_KEY } from './config';

export interface Prefs { musicOn: boolean; sfxOn: boolean; nightMode: boolean }

export function loadSave(): SimSnapshot | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as SimSnapshot;
    if (snap.v !== 1 || !Array.isArray(snap.habitats)) return null;
    return snap;
  } catch {
    return null;
  }
}

export function writeSave(snap: SimSnapshot): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch { /* private mode: play session-only */ }
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(SAVE_KEY + '-prefs');
    if (raw) return { musicOn: true, sfxOn: true, nightMode: false, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { musicOn: true, sfxOn: true, nightMode: false };
}

export function writePrefs(p: Prefs): void {
  try { localStorage.setItem(SAVE_KEY + '-prefs', JSON.stringify(p)); } catch { /* ignore */ }
}
