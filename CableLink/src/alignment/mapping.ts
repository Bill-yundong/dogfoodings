import type { SensorMetaData } from '@/types';

export interface MappingRule {
  id: string;
  sourceSystem: string;
  sourcePath: string;
  targetEntity: string;
  targetPath: string;
  transformation: string;
  dataType: 'number' | 'string' | 'boolean' | 'timestamp';
  unit?: string;
  description?: string;
}

export class SemanticMapper {
  private mappings: MappingRule[] = [];
  private sensorMetadata: Map<string, SensorMetaData> = new Map();

  constructor(initialMappings?: MappingRule[]) {
    if (initialMappings) {
      this.mappings = initialMappings;
    }
  }

  addMapping(mapping: MappingRule): void {
    const existing = this.mappings.find(m =>
      m.sourceSystem === mapping.sourceSystem &&
      m.sourcePath === mapping.sourcePath
    );

    if (existing) {
      Object.assign(existing, mapping);
    } else {
      this.mappings.push(mapping);
    }
  }

  removeMapping(mappingId: string): void {
    this.mappings = this.mappings.filter(m => m.id !== mappingId);
  }

  getMappings(sourceSystem?: string): MappingRule[] {
    if (sourceSystem) {
      return this.mappings.filter(m => m.sourceSystem === sourceSystem);
    }
    return this.mappings;
  }

  mapData(
    sourceData: Record<string, unknown>,
    sourceSystem: string
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const systemMappings = this.mappings.filter(m => m.sourceSystem === sourceSystem);

    for (const mapping of systemMappings) {
      const sourceValue = this.getNestedValue(sourceData, mapping.sourcePath);
      if (sourceValue !== undefined) {
        const transformed = this.applyTransformation(sourceValue, mapping.transformation, mapping.dataType);
        this.setNestedValue(result, mapping.targetPath, transformed);
      }
    }

    return result;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    }, obj);
    target[lastKey] = value;
  }

  private applyTransformation(
    value: unknown,
    transformation: string,
    dataType: string
  ): unknown {
    if (!transformation || transformation === 'identity') {
      return this.castType(value, dataType);
    }

    try {
      const func = new Function('v', `return ${transformation}`);
      const result = func(value);
      return this.castType(result, dataType);
    } catch (e) {
      console.warn(`Transformation failed: ${transformation}`, e);
      return this.castType(value, dataType);
    }
  }

  private castType(value: unknown, dataType: string): unknown {
    switch (dataType) {
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      case 'boolean':
        return Boolean(value);
      case 'timestamp':
        return typeof value === 'number' ? value : new Date(String(value)).getTime();
      default:
        return value;
    }
  }

  registerSensorMetadata(metadata: SensorMetaData): void {
    this.sensorMetadata.set(metadata.id, metadata);
  }

  getSensorMetadata(sensorId: string): SensorMetaData | undefined {
    return this.sensorMetadata.get(sensorId);
  }

  getOntology(): Record<string, string[]> {
    const ontology: Record<string, string[]> = {};

    for (const mapping of this.mappings) {
      const entity = mapping.targetEntity;
      if (!ontology[entity]) {
        ontology[entity] = [];
      }
      if (!ontology[entity].includes(mapping.targetPath)) {
        ontology[entity].push(mapping.targetPath);
      }
    }

    return ontology;
  }
}

export const defaultMappings: MappingRule[] = [
  {
    id: 'map-001',
    sourceSystem: 'omron-dts',
    sourcePath: 'data.temperature',
    targetEntity: 'TemperaturePoint',
    targetPath: 'temperature',
    transformation: 'identity',
    dataType: 'number',
    unit: '°C'
  },
  {
    id: 'map-002',
    sourceSystem: 'siemens-scada',
    sourcePath: 'measuredValue',
    targetEntity: 'TemperaturePoint',
    targetPath: 'temperature',
    transformation: 'identity',
    dataType: 'number',
    unit: '°C'
  },
  {
    id: 'map-003',
    sourceSystem: 'abb-power',
    sourcePath: 'current',
    targetEntity: 'TemperaturePoint',
    targetPath: 'current',
    transformation: 'identity',
    dataType: 'number',
    unit: 'A'
  },
  {
    id: 'map-004',
    sourceSystem: 'generic-modbus',
    sourcePath: 'registers[0]',
    targetEntity: 'TemperaturePoint',
    targetPath: 'temperature',
    transformation: 'v / 10',
    dataType: 'number',
    unit: '°C'
  }
];

export function createSemanticMapper(): SemanticMapper {
  return new SemanticMapper(defaultMappings);
}
