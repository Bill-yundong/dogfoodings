export const BOILER_CONSTANTS = {
  OXYGEN_OPTIMAL_RANGE: { min: 3.5, max: 5.0, target: 4.2 },
  TEMPERATURE_OPTIMAL_RANGE: { min: 850, max: 950, target: 900 },
  PRESSURE_OPTIMAL_RANGE: { min: 12, max: 16, target: 14 },
  EFFICIENCY_MAX: 96.5,
  EFFICIENCY_MIN: 75,
  FUEL_FLOW_RATE: { min: 50, max: 100, default: 75 },
  PRIMARY_AIR_FLOW: { min: 60, max: 120, default: 90 },
  SECONDARY_AIR_FLOW: { min: 40, max: 80, default: 60 },
  INDUCED_DRAFT_FAN: { min: 30, max: 90, default: 60 },
  FORCED_DRAFT_FAN: { min: 40, max: 100, default: 70 }
};

export const ANOMALY_THRESHOLDS = {
  oxygenHigh: 7.0,
  oxygenLow: 2.0,
  tempHigh: 1000,
  tempLow: 800,
  pressureHigh: 18,
  pressureLow: 10,
  efficiencyDrop: 5
};

export const COMBUSTION_PARAMS = [
  { id: 'fuelFlow', label: '燃料流量', unit: 't/h', min: 50, max: 100, default: 75 },
  { id: 'primaryAir', label: '一次风量', unit: 'kNm³/h', min: 60, max: 120, default: 90 },
  { id: 'secondaryAir', label: '二次风量', unit: 'kNm³/h', min: 40, max: 80, default: 60 },
  { id: 'inducedDraft', label: '引风机频率', unit: 'Hz', min: 30, max: 90, default: 60 },
  { id: 'forcedDraft', label: '送风机频率', unit: 'Hz', min: 40, max: 100, default: 70 },
  { id: 'excessAir', label: '过量空气系数', unit: 'α', min: 1.1, max: 1.5, default: 1.25 }
];

export const MONITOR_PARAMS = [
  { id: 'oxygen', label: '烟气氧含量', unit: '%', color: '#3b82f6',
    optimal: { min: 3.5, max: 5.0 } },
  { id: 'temperature', label: '炉膛温度', unit: '°C', color: '#ef4444',
    optimal: { min: 850, max: 950 } },
  { id: 'pressure', label: '炉膛负压', unit: 'Pa', color: '#10b981',
    optimal: { min: 12, max: 16 } },
  { id: 'co', label: 'CO排放', unit: 'ppm', color: '#f59e0b',
    optimal: { min: 0, max: 50 } },
  { id: 'nox', label: 'NOx排放', unit: 'mg/m³', color: '#8b5cf6',
    optimal: { min: 0, max: 100 } },
  { id: 'efficiency', label: '热效率', unit: '%', color: '#06b6d4',
    optimal: { min: 90, max: 100 } }
];
