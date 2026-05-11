export class SpatioTemporalInterpolation {
  constructor(options = {}) {
    this.resolution = options.resolution || 100;
    this.timeSteps = options.timeSteps || 12;
    this.kernelSize = options.kernelSize || 3;
    this.cache = new Map();
  }

  async interpolateSatelliteData(rawData, targetTime, targetBounds) {
    const cacheKey = this.generateCacheKey(rawData, targetTime, targetBounds);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    await new Promise(resolve => setTimeout(resolve, 50));

    const interpolated = this.performInterpolation(rawData, targetTime, targetBounds);
    
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, interpolated);

    return interpolated;
  }

  performInterpolation(rawData, targetTime, targetBounds) {
    const grid = [];
    const { minLat, maxLat, minLon, maxLon } = targetBounds;
    const latStep = (maxLat - minLat) / this.resolution;
    const lonStep = (maxLon - minLon) / this.resolution;

    for (let i = 0; i < this.resolution; i++) {
      for (let j = 0; j < this.resolution; j++) {
        const lat = minLat + i * latStep;
        const lon = minLon + j * lonStep;
        
        const value = this.bilinearInterpolation(
          rawData,
          lat,
          lon,
          targetTime
        );

        grid.push({
          lat,
          lon,
          concentration: value,
          uncertainty: this.calculateUncertainty(lat, lon, targetTime)
        });
      }
    }

    return grid;
  }

  bilinearInterpolation(dataPoints, lat, lon, time) {
    const nearby = this.findNearbyPoints(dataPoints, lat, lon, time);
    
    if (nearby.length === 0) return 0;
    if (nearby.length === 1) return nearby[0].concentration;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const point of nearby) {
      const spatialDist = Math.sqrt(
        Math.pow(point.lat - lat, 2) + Math.pow(point.lon - lon, 2)
      );
      const timeDist = Math.abs(point.time - time);
      const weight = 1 / (1 + spatialDist * 10 + timeDist * 0.1);
      
      weightedSum += point.concentration * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  }

  findNearbyPoints(dataPoints, lat, lon, time) {
    return dataPoints.filter(point => {
      const spatialDist = Math.sqrt(
        Math.pow(point.lat - lat, 2) + Math.pow(point.lon - lon, 2)
      );
      const timeDist = Math.abs(point.time - time);
      return spatialDist < 10 && timeDist < 30;
    }).slice(0, 8);
  }

  calculateUncertainty(lat, lon, time) {
    const seasonalFactor = Math.abs(Math.sin(time * Math.PI / 6));
    const spatialFactor = Math.abs(lat) / 90;
    return 0.05 + seasonalFactor * 0.03 + spatialFactor * 0.02;
  }

  generateCacheKey(data, time, bounds) {
    return `${data.length}-${time.toFixed(2)}-${JSON.stringify(bounds)}`;
  }

  clearCache() {
    this.cache.clear();
  }
}

export function generateSimulatedIceData(year, month, region = 'arctic') {
  const data = [];
  const resolution = 50;
  const isArctic = region === 'arctic';
  const baseLat = isArctic ? 60 : -60;
  const latRange = isArctic ? 30 : -30;
  
  const seasonalCycle = Math.sin((month - 3) * Math.PI / 6) * 0.3;
  const yearTrend = (year - 2000) * -0.005;
  
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const lat = baseLat + (i / resolution) * latRange;
      const lon = (j / resolution) * 360 - 180;
      
      const distFromPole = isArctic ? (90 - Math.abs(lat)) / 30 : (90 - Math.abs(lat)) / 30;
      const baseConcentration = Math.max(0, 1 - distFromPole * distFromPole);
      
      const noise = (Math.random() - 0.5) * 0.1;
      
      let concentration = baseConcentration + seasonalCycle + yearTrend + noise;
      concentration = Math.max(0, Math.min(1, concentration));
      
      const area = Math.cos(lat * Math.PI / 180) * 1000;
      
      data.push({
        lat,
        lon,
        concentration,
        area,
        year,
        month,
        time: year + month / 12,
        region
      });
    }
  }
  
  return data;
}
