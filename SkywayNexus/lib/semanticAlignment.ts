import {
  FlightPlan,
  Aircraft,
  FlightRoute,
  Waypoint,
  SystemType,
  SemanticAlignedData,
  SemanticMapping,
  MappingRule,
} from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const FLIGHT_STATUS_MAPPINGS: Record<
  string,
  Record<string, { value: FlightPlan["status"]; confidence: number }>
> = {
  caac: {
    "已申请": { value: "planned", confidence: 0.95 },
    "已批复": { value: "planned", confidence: 0.98 },
    "执行中": { value: "active", confidence: 1.0 },
    "已完成": { value: "completed", confidence: 1.0 },
    "取消": { value: "cancelled", confidence: 1.0 },
    "改航": { value: "diverted", confidence: 0.9 },
  },
  operator: {
    scheduled: { value: "planned", confidence: 0.92 },
    boarding: { value: "planned", confidence: 0.85 },
    "in-flight": { value: "active", confidence: 1.0 },
    landed: { value: "completed", confidence: 1.0 },
    cancelled: { value: "cancelled", confidence: 1.0 },
    diverted: { value: "diverted", confidence: 0.95 },
  },
  logistics: {
    pending: { value: "planned", confidence: 0.88 },
    approved: { value: "planned", confidence: 0.96 },
    en_route: { value: "active", confidence: 1.0 },
    delivered: { value: "completed", confidence: 1.0 },
    cancelled: { value: "cancelled", confidence: 1.0 },
    rerouted: { value: "diverted", confidence: 0.88 },
  },
};

const AIRCRAFT_STATUS_MAPPINGS: Record<
  string,
  Record<string, { value: Aircraft["status"]; confidence: number }>
> = {
  caac: {
    待命: { value: "idle", confidence: 0.95 },
    滑行: { value: "taxiing", confidence: 1.0 },
    起飞: { value: "takeoff", confidence: 1.0 },
    巡航: { value: "cruise", confidence: 1.0 },
    降落: { value: "landing", confidence: 1.0 },
    紧急: { value: "emergency", confidence: 1.0 },
  },
  operator: {
    available: { value: "idle", confidence: 0.9 },
    taxiing: { value: "taxiing", confidence: 1.0 },
    takeoff: { value: "takeoff", confidence: 1.0 },
    cruise: { value: "cruise", confidence: 1.0 },
    landing: { value: "landing", confidence: 1.0 },
    emergency: { value: "emergency", confidence: 1.0 },
  },
  logistics: {
    ready: { value: "idle", confidence: 0.85 },
    loading: { value: "idle", confidence: 0.8 },
    in_transit: { value: "cruise", confidence: 0.9 },
    delivering: { value: "cruise", confidence: 0.85 },
    emergency: { value: "emergency", confidence: 1.0 },
  },
};

const ROUTE_TYPE_MAPPINGS: Record<
  string,
  Record<string, { value: FlightRoute["routeType"]; confidence: number }>
> = {
  caac: {
    商业航班: { value: "commercial", confidence: 1.0 },
    私人飞行: { value: "private", confidence: 1.0 },
    物流配送: { value: "logistics", confidence: 1.0 },
    紧急救援: { value: "emergency", confidence: 1.0 },
  },
  operator: {
    commercial: { value: "commercial", confidence: 1.0 },
    private: { value: "private", confidence: 1.0 },
    cargo: { value: "logistics", confidence: 0.95 },
    emergency: { value: "emergency", confidence: 1.0 },
  },
  logistics: {
    regular: { value: "logistics", confidence: 0.98 },
    express: { value: "logistics", confidence: 0.98 },
    urgent: { value: "emergency", confidence: 0.9 },
  },
};

export class SemanticAlignmentService {
  private mappings: SemanticMapping[] = [];

  constructor() {
    this.initializeDefaultMappings();
  }

  private initializeDefaultMappings() {
    this.mappings = [
      ...this.createStatusMappings(),
      ...this.createRouteTypeMappings(),
    ];
  }

  private createStatusMappings(): SemanticMapping[] {
    const mappings: SemanticMapping[] = [];

    for (const sourceSystem of Object.keys(FLIGHT_STATUS_MAPPINGS)) {
      for (const targetSystem of Object.keys(FLIGHT_STATUS_MAPPINGS)) {
        if (sourceSystem !== targetSystem) {
          const rules: MappingRule[] = [];
          const sourceMap =
            FLIGHT_STATUS_MAPPINGS[
              sourceSystem as keyof typeof FLIGHT_STATUS_MAPPINGS
            ];
          const targetMap =
            FLIGHT_STATUS_MAPPINGS[
              targetSystem as keyof typeof FLIGHT_STATUS_MAPPINGS
            ];

          for (const [sourceKey, sourceInfo] of Object.entries(sourceMap)) {
            for (const [targetKey, targetInfo] of Object.entries(targetMap)) {
              if (sourceInfo.value === targetInfo.value) {
                rules.push({
                  condition: `status === '${sourceKey}'`,
                  sourceValue: sourceKey,
                  targetValue: targetKey,
                  priority: Math.round(
                    (sourceInfo.confidence * targetInfo.confidence) * 100
                  ),
                });
              }
            }
          }

          mappings.push({
            id: uuidv4(),
            sourceSystem: sourceSystem as SystemType,
            targetSystem: targetSystem as SystemType,
            entityType: "flight_plan",
            sourceField: "status",
            targetField: "status",
            transformation: "direct_mapping",
            mappingRules: rules,
          });
        }
      }
    }

    return mappings;
  }

  private createRouteTypeMappings(): SemanticMapping[] {
    const mappings: SemanticMapping[] = [];

    for (const sourceSystem of Object.keys(ROUTE_TYPE_MAPPINGS)) {
      for (const targetSystem of Object.keys(ROUTE_TYPE_MAPPINGS)) {
        if (sourceSystem !== targetSystem) {
          const rules: MappingRule[] = [];
          const sourceMap =
            ROUTE_TYPE_MAPPINGS[
              sourceSystem as keyof typeof ROUTE_TYPE_MAPPINGS
            ];
          const targetMap =
            ROUTE_TYPE_MAPPINGS[
              targetSystem as keyof typeof ROUTE_TYPE_MAPPINGS
            ];

          for (const [sourceKey, sourceInfo] of Object.entries(sourceMap)) {
            for (const [targetKey, targetInfo] of Object.entries(targetMap)) {
              if (sourceInfo.value === targetInfo.value) {
                rules.push({
                  condition: `routeType === '${sourceKey}'`,
                  sourceValue: sourceKey,
                  targetValue: targetKey,
                  priority: Math.round(
                    (sourceInfo.confidence * targetInfo.confidence) * 100
                  ),
                });
              }
            }
          }

          mappings.push({
            id: uuidv4(),
            sourceSystem: sourceSystem as SystemType,
            targetSystem: targetSystem as SystemType,
            entityType: "route",
            sourceField: "routeType",
            targetField: "routeType",
            transformation: "direct_mapping",
            mappingRules: rules,
          });
        }
      }
    }

    return mappings;
  }

  alignFlightPlan(
    flightPlan: FlightPlan,
    sourceSystem: SystemType,
    targetSystem: SystemType
  ): SemanticAlignedData<FlightPlan> {
    const alignedFields: string[] = [];
    let totalConfidence = 0;
    let fieldsAligned = 0;

    const alignedStatus = this.mapFieldValue(
      flightPlan.status,
      sourceSystem,
      targetSystem,
      FLIGHT_STATUS_MAPPINGS
    );

    const alignedPlan: FlightPlan = {
      ...flightPlan,
      status: alignedStatus.value,
    };

    alignedFields.push("status");
    totalConfidence += alignedStatus.confidence;
    fieldsAligned++;

    return {
      data: alignedPlan,
      alignedAt: Date.now(),
      sourceSystem,
      alignedFields,
      alignmentConfidence: fieldsAligned > 0 ? totalConfidence / fieldsAligned : 0,
    };
  }

  alignAircraft(
    aircraft: Aircraft,
    sourceSystem: SystemType,
    targetSystem: SystemType
  ): SemanticAlignedData<Aircraft> {
    const alignedFields: string[] = [];
    let totalConfidence = 0;
    let fieldsAligned = 0;

    const alignedStatus = this.mapFieldValue(
      aircraft.status,
      sourceSystem,
      targetSystem,
      AIRCRAFT_STATUS_MAPPINGS
    );

    const alignedAircraft: Aircraft = {
      ...aircraft,
      status: alignedStatus.value,
    };

    alignedFields.push("status");
    totalConfidence += alignedStatus.confidence;
    fieldsAligned++;

    return {
      data: alignedAircraft,
      alignedAt: Date.now(),
      sourceSystem,
      alignedFields,
      alignmentConfidence: fieldsAligned > 0 ? totalConfidence / fieldsAligned : 0,
    };
  }

  alignRoute(
    route: FlightRoute,
    sourceSystem: SystemType,
    targetSystem: SystemType
  ): SemanticAlignedData<FlightRoute> {
    const alignedFields: string[] = [];
    let totalConfidence = 0;
    let fieldsAligned = 0;

    const alignedRouteType = this.mapFieldValue(
      route.routeType,
      sourceSystem,
      targetSystem,
      ROUTE_TYPE_MAPPINGS
    );

    const alignedRoute: FlightRoute = {
      ...route,
      routeType: alignedRouteType.value,
    };

    alignedFields.push("routeType");
    totalConfidence += alignedRouteType.confidence;
    fieldsAligned++;

    return {
      data: alignedRoute,
      alignedAt: Date.now(),
      sourceSystem,
      alignedFields,
      alignmentConfidence: fieldsAligned > 0 ? totalConfidence / fieldsAligned : 0,
    };
  }

  alignWaypoint(
    waypoint: Waypoint,
    sourceSystem: SystemType,
    targetSystem: SystemType
  ): SemanticAlignedData<Waypoint> {
    return {
      data: waypoint,
      alignedAt: Date.now(),
      sourceSystem,
      alignedFields: [],
      alignmentConfidence: 1.0,
    };
  }

  private mapFieldValue<T>(
    value: T,
    sourceSystem: string,
    targetSystem: string,
    mappings: Record<string, Record<string, { value: T; confidence: number }>>
  ): { value: T; confidence: number } {
    const sourceMap = mappings[sourceSystem];
    const targetMap = mappings[targetSystem];

    if (!sourceMap || !targetMap) {
      return { value, confidence: 0.5 };
    }

    const normalizedValue = this.findNormalizedValue(value, sourceMap);
    if (!normalizedValue) {
      return { value, confidence: 0.5 };
    }

    const targetValue = this.findTargetValue(normalizedValue, targetMap);
    if (!targetValue) {
      return { value, confidence: normalizedValue.confidence * 0.7 };
    }

    return {
      value: targetValue.value,
      confidence: normalizedValue.confidence * targetValue.confidence,
    };
  }

  private findNormalizedValue<T>(
    value: T,
    sourceMap: Record<string, { value: T; confidence: number }>
  ): { value: T; confidence: number } | null {
    for (const [key, mapping] of Object.entries(sourceMap)) {
      if (mapping.value === value || key === value) {
        return mapping;
      }
    }
    return null;
  }

  private findTargetValue<T>(
    normalized: { value: T; confidence: number },
    targetMap: Record<string, { value: T; confidence: number }>
  ): { value: T; confidence: number } | null {
    for (const mapping of Object.values(targetMap)) {
      if (mapping.value === normalized.value) {
        return mapping;
      }
    }
    return null;
  }

  getMappings(): SemanticMapping[] {
    return [...this.mappings];
  }

  addMapping(mapping: SemanticMapping): string {
    this.mappings.push(mapping);
    return mapping.id;
  }

  removeMapping(id: string): boolean {
    const index = this.mappings.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.mappings.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const semanticAlignmentService = new SemanticAlignmentService();
