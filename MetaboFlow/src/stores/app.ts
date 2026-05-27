import { createSignal, createMemo } from 'solid-js';
import type { AppUser, UserRole, MealRecord, MetabolicProfile, BloodSugarPrediction, Alert } from '../types';

function loadUser(): AppUser | null {
  try {
    const stored = localStorage.getItem('metaboflow_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function persistUser(u: AppUser | null) {
  if (u) {
    localStorage.setItem('metaboflow_user', JSON.stringify(u));
  } else {
    localStorage.removeItem('metaboflow_user');
  }
}

const [user, setUser] = createSignal<AppUser | null>(loadUser());
const [meals, setMeals] = createSignal<MealRecord[]>([]);
const [profile, setProfile] = createSignal<MetabolicProfile>({
  userId: 'default',
  basalMetabolicRate: 1600,
  insulinSensitivity: 50,
  glucoseTolerance: 70,
  bodyWeight: 70,
  age: 30,
  sex: 'male',
});
const [predictions, setPredictions] = createSignal<BloodSugarPrediction[]>([]);
const [alerts, setAlerts] = createSignal<Alert[]>([]);
const [dbReady, setDbReady] = createSignal(false);
const [foodCount, setFoodCount] = createSignal(0);

export { user, meals, profile, predictions, alerts, dbReady, foodCount };

export const isLoggedIn = createMemo(() => user() !== null);
export const isAnalyst = createMemo(() => user()?.role === 'analyst');
export const todayMeals = createMemo(() => {
  const now = Date.now();
  const startOfDay = now - (now % 86400000);
  return meals().filter(m => m.timestamp >= startOfDay);
});
export const todayNutrition = createMemo(() => {
  const tm = todayMeals();
  return tm.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totalNutrition.calories,
      protein: acc.protein + m.totalNutrition.protein,
      fat: acc.fat + m.totalNutrition.fat,
      carbs: acc.carbs + m.totalNutrition.carbs,
      fiber: acc.fiber + m.totalNutrition.fiber,
      gi: acc.gi + m.totalNutrition.gi * m.items.length,
      gl: acc.gl + m.totalNutrition.gl,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0 }
  );
});
export const activeAlerts = createMemo(() => alerts().filter(a => a.severity !== 'low'));
export const highRiskPredictions = createMemo(() => predictions().filter(p => p.riskLevel === 'high'));

export function login(email: string, role: UserRole) {
  const u: AppUser = {
    id: `user_${Date.now()}`,
    email,
    name: email.split('@')[0],
    role,
  };
  setUser(u);
  persistUser(u);
  setProfile(prev => ({ ...prev, userId: u.id }));
}

export function logout() {
  setUser(null);
  persistUser(null);
  setMeals([]);
  setPredictions([]);
  setAlerts([]);
}

export function addMeal(record: MealRecord) {
  setMeals(prev => [...prev, record]);
}

export function removeMeal(id: string) {
  setMeals(prev => prev.filter(m => m.id !== id));
}

export function updateProfile(p: Partial<MetabolicProfile>) {
  setProfile(prev => ({ ...prev, ...p }));
}

export function addPrediction(p: BloodSugarPrediction) {
  setPredictions(prev => [...prev, p]);
}

export function addAlert(a: Alert) {
  setAlerts(prev => [a, ...prev]);
}

export function dismissAlert(id: string) {
  setAlerts(prev => prev.filter(a => a.id !== id));
}

export function markDbReady(count: number) {
  setDbReady(true);
  setFoodCount(count);
}
