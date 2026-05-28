import { create } from 'zustand';
import type {
  Pet,
  VitalSigns,
  GaitData,
  AnomalyDetection,
  HealthRecord,
  Device,
  User,
  HealthScore,
} from '@/types';

interface PetLinkState {
  user: User | null;
  pets: Pet[];
  selectedPet: Pet | null;
  vitalSigns: VitalSigns[];
  gaitData: GaitData[];
  anomalies: AnomalyDetection[];
  healthRecords: HealthRecord[];
  devices: Device[];
  healthScore: HealthScore | null;
  isOnline: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setPets: (pets: Pet[]) => void;
  setSelectedPet: (pet: Pet | null) => void;
  addPet: (pet: Pet) => void;
  updatePet: (pet: Pet) => void;
  setVitalSigns: (data: VitalSigns[]) => void;
  addVitalSigns: (data: VitalSigns) => void;
  setGaitData: (data: GaitData[]) => void;
  addGaitData: (data: GaitData) => void;
  setAnomalies: (anomalies: AnomalyDetection[]) => void;
  addAnomaly: (anomaly: AnomalyDetection) => void;
  acknowledgeAnomaly: (id: string) => void;
  setHealthRecords: (records: HealthRecord[]) => void;
  addHealthRecord: (record: HealthRecord) => void;
  setDevices: (devices: Device[]) => void;
  updateDevice: (device: Device) => void;
  setHealthScore: (score: HealthScore) => void;
  setOnline: (online: boolean) => void;
  setLoading: (loading: boolean) => void;
  loadMockData: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const mockPets: Pet[] = [
  {
    id: 'pet-001',
    name: '旺财',
    species: 'dog',
    breed: '金毛寻回犬',
    age: 3,
    weight: 28.5,
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20golden%20retriever%20dog%20portrait%20professional%20photography&image_size=square',
    ownerId: 'user-001',
    createdAt: Date.now() - 86400000 * 365,
    updatedAt: Date.now(),
    version: 1,
  },
];

const generateMockVitalSigns = (petId: string): VitalSigns[] => {
  const data: VitalSigns[] = [];
  const now = Date.now();
  for (let i = 0; i < 24; i++) {
    data.push({
      id: `vital-${i}`,
      petId,
      timestamp: now - (23 - i) * 3600000,
      heartRate: 70 + Math.random() * 30,
      temperature: 38.0 + Math.random() * 1.0,
      respiratoryRate: 15 + Math.random() * 10,
      activityLevel: Math.random() * 100,
      source: 'wearable',
      synced: true,
      version: 1,
    });
  }
  return data;
};

const generateMockGaitData = (petId: string): GaitData[] => {
  const data: GaitData[] = [];
  const now = Date.now();
  for (let i = 0; i < 7; i++) {
    data.push({
      id: `gait-${i}`,
      petId,
      timestamp: now - (6 - i) * 86400000,
      stepCount: 3000 + Math.floor(Math.random() * 5000),
      strideLength: 0.5 + Math.random() * 0.3,
      cadence: 100 + Math.random() * 40,
      symmetryScore: 85 + Math.random() * 15,
      acceleration: [],
      synced: true,
      version: 1,
    });
  }
  return data;
};

const mockAnomalies: AnomalyDetection[] = [
  {
    id: 'anomaly-001',
    petId: 'pet-001',
    type: 'gait',
    severity: 'medium',
    confidence: 0.78,
    timestamp: Date.now() - 3600000 * 2,
    description: '步态对称性下降，可能存在关节不适',
    acknowledged: false,
    synced: true,
    version: 1,
  },
  {
    id: 'anomaly-002',
    petId: 'pet-001',
    type: 'vital',
    severity: 'low',
    confidence: 0.65,
    timestamp: Date.now() - 86400000,
    description: '心率轻微波动，建议观察',
    acknowledged: true,
    synced: true,
    version: 1,
  },
];

const mockHealthRecords: HealthRecord[] = [
  {
    id: 'record-001',
    petId: 'pet-001',
    type: 'checkup',
    date: Date.now() - 86400000 * 30,
    veterinarianName: '张医生',
    notes: '年度体检，各项指标正常。建议增加运动量。',
    attachments: [],
    synced: true,
    version: 1,
  },
  {
    id: 'record-002',
    petId: 'pet-001',
    type: 'vaccination',
    date: Date.now() - 86400000 * 60,
    veterinarianName: '李医生',
    notes: '狂犬疫苗接种',
    attachments: [],
    synced: true,
    version: 1,
  },
];

const mockDevices: Device[] = [
  {
    id: 'device-001',
    petId: 'pet-001',
    name: 'PetLink Smart Collar',
    type: 'collar',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    batteryLevel: 78,
    connected: true,
    lastSync: Date.now(),
  },
];

export const usePetLinkStore = create<PetLinkState>((set, get) => ({
  user: {
    id: 'user-001',
    name: '宠物主人',
    email: 'owner@petlink.com',
    role: 'owner',
    avatar: '',
  },
  pets: [],
  selectedPet: null,
  vitalSigns: [],
  gaitData: [],
  anomalies: [],
  healthRecords: [],
  devices: [],
  healthScore: null,
  isOnline: true,
  isLoading: false,

  setUser: (user) => set({ user }),
  setPets: (pets) => set({ pets }),
  setSelectedPet: (pet) => set({ selectedPet: pet }),
  addPet: (pet) => set((state) => ({ pets: [...state.pets, pet] })),
  updatePet: (pet) =>
    set((state) => ({
      pets: state.pets.map((p) => (p.id === pet.id ? pet : p)),
    })),
  setVitalSigns: (data) => set({ vitalSigns: data }),
  addVitalSigns: (data) =>
    set((state) => ({ vitalSigns: [...state.vitalSigns, data] })),
  setGaitData: (data) => set({ gaitData: data }),
  addGaitData: (data) =>
    set((state) => ({ gaitData: [...state.gaitData, data] })),
  setAnomalies: (anomalies) => set({ anomalies }),
  addAnomaly: (anomaly) =>
    set((state) => ({ anomalies: [anomaly, ...state.anomalies] })),
  acknowledgeAnomaly: (id) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      ),
    })),
  setHealthRecords: (records) => set({ healthRecords: records }),
  addHealthRecord: (record) =>
    set((state) => ({ healthRecords: [record, ...state.healthRecords] })),
  setDevices: (devices) => set({ devices }),
  updateDevice: (device) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === device.id ? device : d)),
    })),
  setHealthScore: (score) => set({ healthScore: score }),
  setOnline: (online) => set({ isOnline: online }),
  setLoading: (loading) => set({ isLoading: loading }),

  loadMockData: async () => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pet = mockPets[0];
    const vitals = generateMockVitalSigns(pet.id);
    const gaits = generateMockGaitData(pet.id);

    const latestVitals = vitals[vitals.length - 1];
    const latestGait = gaits[gaits.length - 1];

    const healthScore: HealthScore = {
      overall: 85,
      vitality: Math.min(100, (latestVitals.heartRate / 100) * 50 + 50),
      mobility: latestGait.symmetryScore,
      behavior: 88,
      timestamp: Date.now(),
    };

    set({
      pets: mockPets,
      selectedPet: pet,
      vitalSigns: vitals,
      gaitData: gaits,
      anomalies: mockAnomalies,
      healthRecords: mockHealthRecords,
      devices: mockDevices,
      healthScore,
      isLoading: false,
    });
  },
}));
