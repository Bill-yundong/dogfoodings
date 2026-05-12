import { BiomassComposition, CalibrationPoint, SemanticAlignment } from '../types';

const NIR_WAVELENGTHS = {
  moisture: [1450, 1940],
  carbon: [1680, 1730],
  hydrogen: [1700, 1750],
  oxygen: [1760, 1810],
  cellulose: [2100, 2280],
  lignin: [2300, 2350]
};

export class SemanticAlignmentService {
  private calibrationCurve: Map<string, CalibrationPoint[]> = new Map();

  constructor() {
    this.initializeCalibrationCurves();
  }

  private initializeCalibrationCurves(): void {
    Object.keys(NIR_WAVELENGTHS).forEach(component => {
      this.calibrationCurve.set(component, this.generateCalibrationPoints(component));
    });
  }

  private generateCalibrationPoints(component: string): CalibrationPoint[] {
    const wavelengths = NIR_WAVELENGTHS[component as keyof typeof NIR_WAVELENGTHS] || [1600, 1800];
    const points: CalibrationPoint[] = [];
    
    for (let wl = wavelengths[0]; wl <= wavelengths[1]; wl += 10) {
      points.push({
        wavelength: wl,
        absorbance: 0.3 + Math.random() * 0.4,
        component
      });
    }
    return points;
  }

  public extractSpectralFeatures(spectralData: number[]): Map<string, number> {
    const features = new Map<string, number>();
    
    Object.entries(NIR_WAVELENGTHS).forEach(([component, wavelengths]) => {
      const startIdx = Math.floor((wavelengths[0] - 1000) / 10);
      const endIdx = Math.floor((wavelengths[1] - 1000) / 10);
      const segment = spectralData.slice(startIdx, endIdx + 1);
      
      if (segment.length > 0) {
        const avgAbsorbance = segment.reduce((a, b) => a + b, 0) / segment.length;
        features.set(component, avgAbsorbance);
      }
    });
    
    return features;
  }

  public alignFuelAndCombustionData(
    fuelData: BiomassComposition,
    combustionParams: { boilerLoad: number; oxygenLevel: number }
  ): SemanticAlignment {
    const spectralFeatures = this.extractSpectralFeatures(fuelData.spectralData);
    
    const alignedParameters: string[] = [];
    let confidence = 0;

    const moistureMatch = this.matchParameter(
      fuelData.moisture,
      spectralFeatures.get('moisture') || 0,
      'moisture'
    );
    if (moistureMatch > 0.7) {
      alignedParameters.push('moisture');
      confidence += moistureMatch * 0.25;
    }

    const carbonMatch = this.matchParameter(
      fuelData.carbon,
      spectralFeatures.get('carbon') || 0,
      'carbon'
    );
    if (carbonMatch > 0.7) {
      alignedParameters.push('carbon');
      confidence += carbonMatch * 0.25;
    }

    const loadCorrelation = this.correlateBoilerLoad(
      fuelData.calorificValue,
      combustionParams.boilerLoad
    );
    if (loadCorrelation > 0.6) {
      alignedParameters.push('calorificValue');
      confidence += loadCorrelation * 0.3;
    }

    const oxygenMatch = this.matchOxygenLevel(
      combustionParams.oxygenLevel,
      fuelData.volatileMatter
    );
    if (oxygenMatch > 0.6) {
      alignedParameters.push('volatileMatter');
      confidence += oxygenMatch * 0.2;
    }

    return {
      fuelManagementId: fuelData.id,
      combustionControlId: `cc-${Date.now()}`,
      alignedParameters,
      confidence: Math.min(confidence, 1),
      timestamp: Date.now()
    };
  }

  private matchParameter(labValue: number, spectralValue: number, _parameter: string): number {
    const normalizedLab = labValue / 100;
    const normalizedSpectral = spectralValue / 0.8;
    return 1 - Math.abs(normalizedLab - normalizedSpectral);
  }

  private correlateBoilerLoad(calorificValue: number, boilerLoad: number): number {
    const normalizedCV = (calorificValue - 15) / 10;
    const normalizedLoad = boilerLoad / 100;
    return Math.max(0, 1 - Math.abs(normalizedCV - normalizedLoad) * 1.5);
  }

  private matchOxygenLevel(oxygenLevel: number, volatileMatter: number): number {
    const normalizedO2 = oxygenLevel / 10;
    const normalizedVM = volatileMatter / 100;
    return Math.max(0, 1 - Math.abs(normalizedO2 - normalizedVM));
  }

  public predictCalorificValue(spectralData: number[]): number {
    const features = this.extractSpectralFeatures(spectralData);
    
    const moisture = features.get('moisture') || 0.5;
    const carbon = features.get('carbon') || 0.5;
    const cellulose = features.get('cellulose') || 0.5;
    const lignin = features.get('lignin') || 0.5;
    
    const baseCV = 18.5;
    const moistureEffect = -moisture * 15;
    const carbonEffect = carbon * 8;
    const celluloseEffect = cellulose * 3;
    const ligninEffect = lignin * 2;
    
    return baseCV + moistureEffect + carbonEffect + celluloseEffect + ligninEffect;
  }

  public generateSemanticMappingReport(alignment: SemanticAlignment): string {
    const confidenceLevel = alignment.confidence > 0.8 ? '高' : 
                           alignment.confidence > 0.6 ? '中' : '低';
    
    return `语义对齐报告 [${new Date(alignment.timestamp).toLocaleString()}]
对齐参数: ${alignment.alignedParameters.join(', ')}
置信度: ${(alignment.confidence * 100).toFixed(1)}% (${confidenceLevel})
燃料管理ID: ${alignment.fuelManagementId}
燃烧控制ID: ${alignment.combustionControlId}
状态: ${alignment.confidence > 0.6 ? '对齐成功' : '需要人工校验'}`;
  }
}

export const semanticAlignmentService = new SemanticAlignmentService();
