import { openDB, type IDBPDatabase } from 'idb';
import type { FoodItem, MealRecord, MetabolicProfile, BloodSugarPrediction, SemanticAlignment } from '../types';

const DB_NAME = 'metaboflow';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('foods')) {
        const foodStore = db.createObjectStore('foods', { keyPath: 'id' });
        foodStore.createIndex('name', 'name', { unique: false });
        foodStore.createIndex('category', 'category', { unique: false });
        foodStore.createIndex('gi', 'gi', { unique: false });
        foodStore.createIndex('tags', 'tags', { multiEntry: true });
      }

      if (!db.objectStoreNames.contains('meals')) {
        const mealStore = db.createObjectStore('meals', { keyPath: 'id' });
        mealStore.createIndex('userId', 'userId', { unique: false });
        mealStore.createIndex('timestamp', 'timestamp', { unique: false });
        mealStore.createIndex('mealType', 'mealType', { unique: false });
      }

      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'userId' });
      }

      if (!db.objectStoreNames.contains('predictions')) {
        const predStore = db.createObjectStore('predictions', { keyPath: 'mealId' });
        predStore.createIndex('riskLevel', 'riskLevel', { unique: false });
        predStore.createIndex('peakValue', 'peakValue', { unique: false });
      }

      if (!db.objectStoreNames.contains('alignments')) {
        const alignStore = db.createObjectStore('alignments', { keyPath: 'id' });
        alignStore.createIndex('userDimension', 'userDimension', { unique: false });
        alignStore.createIndex('professionalDimension', 'professionalDimension', { unique: false });
      }
    },
  });

  return dbInstance;
}

export async function searchFoods(query: string, limit = 20): Promise<FoodItem[]> {
  const db = await getDB();
  const tx = db.transaction('foods', 'readonly');
  const store = tx.objectStore('foods');
  const allFoods = await store.getAll();
  const q = query.toLowerCase();
  return allFoods
    .filter((f: FoodItem) =>
      f.name.toLowerCase().includes(q) ||
      f.nameEn.toLowerCase().includes(q) ||
      f.tags.some(t => t.toLowerCase().includes(q))
    )
    .slice(0, limit);
}

export async function getFoodsByCategory(category: string): Promise<FoodItem[]> {
  const db = await getDB();
  const tx = db.transaction('foods', 'readonly');
  const index = tx.objectStore('foods').index('category');
  return index.getAll(category);
}

export async function getFoodsByGI(giMin: number, giMax: number): Promise<FoodItem[]> {
  const db = await getDB();
  const tx = db.transaction('foods', 'readonly');
  const index = tx.objectStore('foods').index('gi');
  const range = IDBKeyRange.bound(giMin, giMax);
  return index.getAll(range);
}

export async function getFoodById(id: string): Promise<FoodItem | undefined> {
  const db = await getDB();
  return db.get('foods', id);
}

export async function addMeal(record: MealRecord): Promise<void> {
  const db = await getDB();
  await db.put('meals', record);
}

export async function getMealsByUser(userId: string): Promise<MealRecord[]> {
  const db = await getDB();
  const tx = db.transaction('meals', 'readonly');
  const index = tx.objectStore('meals').index('userId');
  return index.getAll(userId);
}

export async function getMealsByDateRange(userId: string, start: number, end: number): Promise<MealRecord[]> {
  const db = await getDB();
  const tx = db.transaction('meals', 'readonly');
  const index = tx.objectStore('meals').index('userId');
  const allMeals = await index.getAll(userId);
  return allMeals.filter((m: MealRecord) => m.timestamp >= start && m.timestamp <= end);
}

export async function deleteMeal(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('meals', id);
}

export async function getProfile(userId: string): Promise<MetabolicProfile | undefined> {
  const db = await getDB();
  return db.get('profiles', userId);
}

export async function saveProfile(profile: MetabolicProfile): Promise<void> {
  const db = await getDB();
  await db.put('profiles', profile);
}

export async function savePrediction(prediction: BloodSugarPrediction): Promise<void> {
  const db = await getDB();
  await db.put('predictions', prediction);
}

export async function getPredictionsByRisk(riskLevel: string): Promise<BloodSugarPrediction[]> {
  const db = await getDB();
  const tx = db.transaction('predictions', 'readonly');
  const index = tx.objectStore('predictions').index('riskLevel');
  return index.getAll(riskLevel);
}

export async function saveAlignment(alignment: SemanticAlignment): Promise<void> {
  const db = await getDB();
  await db.put('alignments', alignment);
}

export async function getAllAlignments(): Promise<SemanticAlignment[]> {
  const db = await getDB();
  return db.getAll('alignments');
}

export async function getDBStats(): Promise<{ foods: number; meals: number; predictions: number }> {
  const db = await getDB();
  const foods = await db.count('foods');
  const meals = await db.count('meals');
  const predictions = await db.count('predictions');
  return { foods, meals, predictions };
}

export async function bulkImportFoods(foods: FoodItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('foods', 'readwrite');
  const store = tx.objectStore('foods');
  for (const food of foods) {
    await store.put(food);
  }
  await tx.done;
}
