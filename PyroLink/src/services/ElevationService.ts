import { TerrainPoint } from '../types';

export class ElevationService {
  private gridSize: number;
  private resolution: number;

  constructor(gridSize: number = 100, resolution: number = 10) {
    this.gridSize = gridSize;
    this.resolution = resolution;
  }

  async fetchElevationData(lat: number, lng: number): Promise<TerrainPoint[][]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const terrain = this.generateSyntheticTerrain(lat, lng);
        resolve(terrain);
      }, 100);
    });
  }

  private generateSyntheticTerrain(lat: number, lng: number): TerrainPoint[][] {
    const terrain: TerrainPoint[][] = [];
    const centerX = this.gridSize / 2;
    const centerY = this.gridSize / 2;

    for (let i = 0; i < this.gridSize; i++) {
      terrain[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        const dx = (i - centerX) / (this.gridSize / 2);
        const dy = (j - centerY) / (this.gridSize / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const baseElevation = 500;
        const mountainPeak = Math.exp(-distance * 2) * 800;
        const rollingHills = Math.sin(i * 0.3 + lat) * Math.cos(j * 0.3 + lng) * 150;
        const noise = (Math.sin(i * 1.5) * Math.cos(j * 1.7)) * 30;
        
        const elevation = baseElevation + mountainPeak + rollingHills + noise;

        terrain[i][j] = {
          x: i * this.resolution,
          y: j * this.resolution,
          elevation: Math.max(0, elevation)
        };
      }
    }

    return terrain;
  }

  getSlope(terrain: TerrainPoint[][], i: number, j: number): number {
    if (i <= 0 || i >= terrain.length - 1 || j <= 0 || j >= terrain[0].length - 1) {
      return 0;
    }

    const dzdx = (terrain[i + 1][j].elevation - terrain[i - 1][j].elevation) / (2 * this.resolution);
    const dzdy = (terrain[i][j + 1].elevation - terrain[i][j - 1].elevation) / (2 * this.resolution);
    
    return Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
  }

  getAspect(terrain: TerrainPoint[][], i: number, j: number): number {
    if (i <= 0 || i >= terrain.length - 1 || j <= 0 || j >= terrain[0].length - 1) {
      return 0;
    }

    const dzdx = (terrain[i + 1][j].elevation - terrain[i - 1][j].elevation) / (2 * this.resolution);
    const dzdy = (terrain[i][j + 1].elevation - terrain[i][j - 1].elevation) / (2 * this.resolution);
    
    let aspect = Math.atan2(dzdy, -dzdx);
    if (aspect < 0) aspect += 2 * Math.PI;
    
    return aspect;
  }
}
