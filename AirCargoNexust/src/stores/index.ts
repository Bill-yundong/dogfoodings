import { writable, derived, type Writable, type Readable } from 'svelte/store';
import type { Cargo, LoadPlan, LoadSnapshot, AircraftSpec, AlgorithmProgress, Notification } from '@/types';
import * as db from '@/db';

export const cargos: Writable<Cargo[]> = writable([]);
export const selectedCargoIds: Writable<Set<string>> = writable(new Set());
export const loadPlans: Writable<LoadPlan[]> = writable([]);
export const currentLoadPlan: Writable<LoadPlan | null> = writable(null);
export const snapshots: Writable<LoadSnapshot[]> = writable([]);
export const aircraftSpecs: Writable<AircraftSpec[]> = writable([]);
export const currentAircraft: Writable<AircraftSpec | null> = writable(null);
export const algorithmProgress: Writable<AlgorithmProgress> = writable({
  currentIteration: 0,
  bestScore: Infinity,
  solutionsEvaluated: 0,
  currentDepth: 0,
  status: 'idle',
  elapsedMs: 0
});
export const notifications: Writable<Notification[]> = writable([]);
export const isLoading: Writable<boolean> = writable(false);

export const selectedCargos: Readable<Cargo[]> = derived(
  [cargos, selectedCargoIds],
  ([$cargos, $selectedIds]) => $cargos.filter(c => $selectedIds.has(c.id))
);

export const totalSelectedWeight: Readable<number> = derived(
  selectedCargos,
  ($selected) => $selected.reduce((sum, c) => sum + c.weight, 0)
);

export const confirmedLoadPlans: Readable<LoadPlan[]> = derived(
  loadPlans,
  ($plans) => $plans.filter(p => p.status === 'confirmed')
);

export function addNotification(notification: Omit<Notification, 'id'>) {
  const id = crypto.randomUUID();
  notifications.update(n => [...n, { ...notification, id }]);
  if (notification.duration !== 0) {
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration || 3000);
  }
}

export function removeNotification(id: string) {
  notifications.update(n => n.filter(notification => notification.id !== id));
}

export async function loadAllData() {
  isLoading.set(true);
  try {
    const [loadedCargos, loadedPlans, loadedSnapshots] = await Promise.all([
      db.getAllCargos(),
      db.getAllLoadPlans(),
      db.getAllSnapshots()
    ]);
    cargos.set(loadedCargos);
    loadPlans.set(loadedPlans);
    snapshots.set(loadedSnapshots);
  } finally {
    isLoading.set(false);
  }
}

export async function addCargo(cargo: Omit<Cargo, 'id' | 'createdAt'>) {
  const newCargo: Cargo = {
    ...cargo,
    id: crypto.randomUUID(),
    createdAt: Date.now()
  };
  await db.saveCargo(newCargo);
  cargos.update(c => [...c, newCargo]);
  addNotification({ type: 'success', message: `货物 ${cargo.name} 已添加` });
  return newCargo;
}

export async function updateCargo(cargo: Cargo) {
  await db.saveCargo(cargo);
  cargos.update(c => c.map(item => item.id === cargo.id ? cargo : item));
  addNotification({ type: 'success', message: `货物 ${cargo.name} 已更新` });
}

export async function removeCargo(id: string) {
  const cargo = (await db.getCargoById(id))!;
  await db.deleteCargo(id);
  cargos.update(c => c.filter(item => item.id !== id));
  selectedCargoIds.update(ids => {
    const newIds = new Set(ids);
    newIds.delete(id);
    return newIds;
  });
  addNotification({ type: 'info', message: `货物 ${cargo.name} 已删除` });
}

export async function savePlan(plan: LoadPlan) {
  await db.saveLoadPlan(plan);
  loadPlans.update(p => {
    const index = p.findIndex(item => item.id === plan.id);
    if (index >= 0) {
      const newPlans = [...p];
      newPlans[index] = plan;
      return newPlans;
    }
    return [...p, plan];
  });
  addNotification({ type: 'success', message: `配载方案 ${plan.flightNumber} 已保存` });
}

export async function createSnapshot(planId: string, comment?: string) {
  const plan = await db.getLoadPlanById(planId);
  if (!plan) throw new Error('Load plan not found');

  const existingSnapshots = await db.getSnapshotsByPlanId(planId);
  const snapshot: LoadSnapshot = {
    id: crypto.randomUUID(),
    planId,
    timestamp: Date.now(),
    version: existingSnapshots.length + 1,
    payload: JSON.parse(JSON.stringify(plan)),
    metadata: {
      createdBy: '配载员',
      comment
    }
  };

  await db.saveSnapshot(snapshot);
  snapshots.update(s => [...s, snapshot]);
  addNotification({ type: 'success', message: `快照 v${snapshot.version} 已创建` });
  return snapshot;
}
