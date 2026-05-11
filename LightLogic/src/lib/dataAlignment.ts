import { Building, AlignmentData, FacadeMaterial } from './types';
import { dbManager } from './indexedDB';

interface EPADataPoint {
  buildingId: string;
  measuredReflectivity: number;
  measurementDate: string;
  confidence: number;
}

interface PlanningSystemData {
  buildingId: string;
  approvedReflectivity: number;
  approvalDate: string;
  materialSpecification: string;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class DataAlignmentService {
  private static instance: DataAlignmentService;
  private conflictThreshold: number = 0.1;

  private constructor() {}

  static getInstance(): DataAlignmentService {
    if (!DataAlignmentService.instance) {
      DataAlignmentService.instance = new DataAlignmentService();
    }
    return DataAlignmentService.instance;
  }

  setConflictThreshold(threshold: number): void {
    this.conflictThreshold = Math.max(0, Math.min(1, threshold));
  }

  async alignBuildingData(
    buildingId: string,
    epaData: EPADataPoint,
    planningData: PlanningSystemData
  ): Promise<AlignmentData> {
    const building = await dbManager.getBuilding(buildingId);
    if (!building) {
      throw new Error(`Building with id ${buildingId} not found`);
    }

    const difference = Math.abs(
      epaData.measuredReflectivity - planningData.approvedReflectivity
    );

    let status: 'aligned' | 'conflict' | 'pending' = 'pending';
    let alignedReflectivity: number;

    if (difference <= this.conflictThreshold) {
      status = 'aligned';
      alignedReflectivity = this.calculateWeightedAverage(
        epaData.measuredReflectivity,
        planningData.approvedReflectivity,
        epaData.confidence
      );
    } else {
      status = 'conflict';
      alignedReflectivity = this.resolveConflict(
        building,
        epaData,
        planningData
      );
    }

    const alignment: AlignmentData = {
      id: generateUUID(),
      buildingId,
      epaReflectivity: epaData.measuredReflectivity,
      planningReflectivity: planningData.approvedReflectivity,
      alignedReflectivity,
      timestamp: Date.now(),
      status,
    };

    await dbManager.saveAlignment(alignment);
    await this.updateBuildingReflectivity(building, alignedReflectivity);

    return alignment;
  }

  private calculateWeightedAverage(
    epaValue: number,
    planningValue: number,
    confidence: number
  ): number {
    const epaWeight = confidence;
    const planningWeight = 1 - confidence;
    return (epaValue * epaWeight + planningValue * planningWeight) / (epaWeight + planningWeight);
  }

  private resolveConflict(
    building: Building,
    epaData: EPADataPoint,
    planningData: PlanningSystemData
  ): number {
    const buildingReflectivity = building.facadeMaterial.reflectivity;
    const epaDiff = Math.abs(buildingReflectivity - epaData.measuredReflectivity);
    const planningDiff = Math.abs(buildingReflectivity - planningData.approvedReflectivity);

    if (epaDiff < planningDiff) {
      return epaData.measuredReflectivity;
    } else if (planningDiff < epaDiff) {
      return planningData.approvedReflectivity;
    }

    return (epaData.measuredReflectivity + planningData.approvedReflectivity) / 2;
  }

  private async updateBuildingReflectivity(
    building: Building,
    newReflectivity: number
  ): Promise<void> {
    const updatedBuilding: Building = {
      ...building,
      facadeMaterial: {
        ...building.facadeMaterial,
        reflectivity: newReflectivity,
      },
    };
    await dbManager.saveBuilding(updatedBuilding);
  }

  async batchAlignBuildings(
    buildings: Building[],
    epaDataMap: Map<string, EPADataPoint>,
    planningDataMap: Map<string, PlanningSystemData>
  ): Promise<AlignmentData[]> {
    const alignments: AlignmentData[] = [];

    for (const building of buildings) {
      const epaData = epaDataMap.get(building.id);
      const planningData = planningDataMap.get(building.id);

      if (epaData && planningData) {
        const alignment = await this.alignBuildingData(
          building.id,
          epaData,
          planningData
        );
        alignments.push(alignment);
      }
    }

    return alignments;
  }

  async getAlignmentReport(): Promise<{
    total: number;
    aligned: number;
    conflicts: number;
    pending: number;
  }> {
    const allAlignments = await dbManager.getAllAlignments();

    const report = {
      total: allAlignments.length,
      aligned: 0,
      conflicts: 0,
      pending: 0,
    };

    for (const alignment of allAlignments) {
      switch (alignment.status) {
        case 'aligned':
          report.aligned++;
          break;
        case 'conflict':
          report.conflicts++;
          break;
        case 'pending':
          report.pending++;
          break;
      }
    }

    return report;
  }

  async getConflicts(): Promise<AlignmentData[]> {
    const allAlignments = await dbManager.getAllAlignments();
    return allAlignments.filter((a) => a.status === 'conflict');
  }

  async syncWithMaterialLibrary(
    material: FacadeMaterial
  ): Promise<void> {
    const existing = await dbManager.getMaterial(material.id);

    if (existing) {
      const reflectivityDiff = Math.abs(
        existing.reflectivity - material.reflectivity
      );

      if (reflectivityDiff > this.conflictThreshold) {
        console.warn(
          `Material ${material.name} reflectivity changed by ${reflectivityDiff}`
        );
      }
    }

    await dbManager.saveMaterial(material);
  }

  async validateConsistency(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const buildings = await dbManager.getAllBuildings();
    const materials = await dbManager.getAllMaterials();

    const materialMap = new Map(materials.map((m) => [m.id, m]));

    for (const building of buildings) {
      const material = materialMap.get(building.facadeMaterial.id);

      if (!material) {
        issues.push(
          `Building ${building.name} references missing material ${building.facadeMaterial.id}`
        );
      } else {
        const reflectivityDiff = Math.abs(
          material.reflectivity - building.facadeMaterial.reflectivity
        );

        if (reflectivityDiff > this.conflictThreshold) {
          issues.push(
            `Building ${building.name} reflectivity mismatch with material library`
          );
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

export const dataAlignmentService = DataAlignmentService.getInstance();
