export const DB_NAME = 'BoilerPulseDB';
export const DB_VERSION = 1;

export const STORES = {
  WAVEFORM_SNAPSHOTS: 'waveformSnapshots',
  SEMANTIC_MAPPINGS: 'semanticMappings',
  HISTORY_DATA: 'historyData',
  ANALYSIS_REPORTS: 'analysisReports'
} as const;

export interface DBSchema {
  waveformSnapshots: {
    key: string;
    value: {
      id: string;
      startTime: number;
      endTime: number;
      triggerType: string;
      channels: Array<{
        name: string;
        unit: string;
        data: number[];
        timestamps: number[];
      }>;
      tags: string[];
      notes: string;
      createdAt: number;
    };
    indexes: {
      'by-startTime': number;
      'by-triggerType': string;
      'by-createdAt': number;
    };
  };
  semanticMappings: {
    key: string;
    value: {
      id: string;
      sourceTag: string;
      targetTag: string;
      transform: string;
      unit: string;
      description: string;
    };
    indexes: {
      'by-sourceTag': string;
      'by-targetTag': string;
    };
  };
  historyData: {
    key: string;
    value: {
      id: string;
      semanticTag: string;
      timestamp: number;
      value: number;
      unit: string;
      source: string;
    };
    indexes: {
      'by-semanticTag': string;
      'by-timestamp': number;
      'by-tag-time': [string, number];
    };
  };
  analysisReports: {
    key: string;
    value: {
      id: string;
      title: string;
      type: string;
      data: Record<string, unknown>;
      createdAt: number;
      updatedAt: number;
    };
    indexes: {
      'by-type': string;
      'by-createdAt': number;
    };
  };
}
