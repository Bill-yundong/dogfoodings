export interface SoilSample {
  id: string;
  location: {
    lat: number;
    lng: number;
    farmId: string;
    plotName: string;
  };
  timestamp: string;
  pH: number;
  organicMatter: number;
  totalNitrogen: number;
  availablePhosphorus: number;
  availablePotassium: number;
  moisture: number;
  temperature: number;
  bulkDensity: number;
  cationExchangeCapacity: number;
}

export interface NutrientLossData {
  id: string;
  farmId: string;
  timestamp: string;
  nitrogenLoss: number;
  phosphorusLoss: number;
  potassiumLoss: number;
  runoffVolume: number;
  leachingDepth: number;
  rainfallIntensity: number;
}

export interface FertilizationPlan {
  id: string;
  farmId: string;
  plotName: string;
  cropType: string;
  growthStage: string;
  recommendations: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organicFertilizer: number;
    micronutrients: Record<string, number>;
  };
  applicationMethod: string;
  applicationDate: string;
  estimatedYield: number;
  costEstimate: number;
  createdBy: string;
  status: "draft" | "approved" | "implemented";
}

export interface RootUptakeSimulation {
  id: string;
  farmId: string;
  plotName: string;
  cropType: string;
  parameters: {
    rootDepth: number;
    rootDensity: number;
    soilTemperature: number;
    soilMoisture: number;
  };
  results: {
    nitrogenUptake: number[];
    phosphorusUptake: number[];
    potassiumUptake: number[];
    waterUptake: number[];
    timestamps: number[];
  };
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
}

export interface SupplyChainItem {
  id: string;
  fertilizerType: string;
  quantity: number;
  unit: string;
  supplier: string;
  expectedDelivery: string;
  status: "ordered" | "in_transit" | "delivered" | "applied";
  farmId: string;
  pricePerUnit: number;
  totalCost: number;
}

export interface Farm {
  id: string;
  name: string;
  owner: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  totalArea: number;
  plots: Plot[];
  contactInfo: string;
}

export interface Plot {
  id: string;
  name: string;
  area: number;
  cropType: string;
  soilType: string;
  irrigationType: string;
}

export interface SyncStatus {
  lastSync: string;
  pendingRecords: number;
  totalRecords: number;
  status: "idle" | "syncing" | "error";
}
