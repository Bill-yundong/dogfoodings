export interface FoodItem {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  gi: number;
  gl: number;
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
  tags: string[];
}

export interface MealItem {
  foodId: string;
  foodName: string;
  amount: number;
  unit: string;
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  gi: number;
  gl: number;
}

export interface MealRecord {
  id: string;
  userId: string;
  timestamp: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: MealItem[];
  totalNutrition: NutritionSummary;
}

export interface MetabolicProfile {
  userId: string;
  basalMetabolicRate: number;
  insulinSensitivity: number;
  glucoseTolerance: number;
  bodyWeight: number;
  age: number;
  sex: 'male' | 'female';
}

export interface BloodSugarPrediction {
  mealId: string;
  curve: CurvePoint[];
  peakTime: number;
  peakValue: number;
  iauc: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CurvePoint {
  time: number;
  glucose: number;
}

export interface Alert {
  id: string;
  predictionId: string;
  type: 'peak' | 'sustained' | 'rapid';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
}

export interface SemanticAlignment {
  id: string;
  userDimension: string;
  professionalDimension: string;
  mappingConfidence: number;
  description: string;
  category: string;
}

export type UserRole = 'user' | 'analyst';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
