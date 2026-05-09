export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RoadSegment {
  id: string;
  points: Point[];
  width: number;
  type: 'primary' | 'secondary' | 'tertiary' | 'pedestrian';
  name?: string;
}

export interface Building {
  id: string;
  polygon: Point[];
  height: number;
  name?: string;
}

export interface RoadNetworkTile {
  tileKey: string;
  zoom: number;
  x: number;
  y: number;
  bbox: BoundingBox;
  segments: RoadSegment[];
  buildings: Building[];
  createdAt: number;
  expiresAt?: number;
}

export interface VisibilityCell {
  x: number;
  y: number;
  visible: boolean;
  distance: number;
  obstruction: string | null;
}

export interface Viewpoint {
  id: string;
  position: Point;
  height: number;
  fieldOfView: number;
  maxDistance: number;
  direction: number;
}

export interface VisibilityAnalysisResult {
  viewpointId: string;
  viewpointPosition: Point;
  cells: VisibilityCell[];
  totalVisible: number;
  totalAnalyzed: number;
  visibilityRatio: number;
  timestamp: number;
}

export interface StreetPerceptionScore {
  segmentId: string;
  pedestrianAccessibility: number;
  visualConnectivity: number;
  safetyPerception: number;
  overallScore: number;
  contributingViewpoints: string[];
}

export interface SyncMapEntry {
  sourceModule: 'urban-design' | 'traffic-assessment';
  dataType: 'visibility' | 'perception' | 'network';
  dataId: string;
  timestamp: number;
  version: number;
}

export interface ModuleSyncState {
  lastSyncTime: number;
  pendingUpdates: SyncMapEntry[];
  isSynchronizing: boolean;
}
