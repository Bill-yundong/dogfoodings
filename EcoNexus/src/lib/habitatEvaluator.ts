import { HabitatQuality, EnvironmentalFactor } from "@/types";

export class EdgeHabitatEvaluator {
  private weights = {
    foodAvailability: 0.25,
    waterAvailability: 0.25,
    shelterQuality: 0.2,
    disturbanceLevel: 0.15,
    biodiversityIndex: 0.15,
  };

  private cache = new Map<string, { result: HabitatQuality; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000;

  evaluate(
    location: { latitude: number; longitude: number },
    envFactors: EnvironmentalFactor[],
    habitatType: string
  ): HabitatQuality {
    const cacheKey = `${location.latitude}-${location.longitude}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    const localFactors = this.filterLocalFactors(envFactors, location, 50);
    
    const foodAvailability = this.calculateFoodAvailability(localFactors);
    const waterAvailability = this.calculateWaterAvailability(localFactors);
    const shelterQuality = this.calculateShelterQuality(localFactors);
    const disturbanceLevel = this.calculateDisturbanceLevel(localFactors);
    const biodiversityIndex = this.calculateBiodiversityIndex(localFactors);

    const overallScore = this.calculateOverallScore({
      foodAvailability,
      waterAvailability,
      shelterQuality,
      disturbanceLevel,
      biodiversityIndex,
    });

    const confidence = this.calculateConfidence(localFactors.length);

    const result: HabitatQuality = {
      id: `habitat-${Date.now()}`,
      location: {
        ...location,
        timestamp: new Date(),
      },
      habitatType,
      overallScore,
      foodAvailability,
      waterAvailability,
      shelterQuality,
      disturbanceLevel,
      biodiversityIndex,
      lastUpdated: new Date(),
      confidence,
    };

    this.cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  private filterLocalFactors(
    factors: EnvironmentalFactor[],
    center: { latitude: number; longitude: number },
    radiusKm: number
  ): EnvironmentalFactor[] {
    return factors.filter((f) => {
      const distance = this.haversineDistance(
        center.latitude,
        center.longitude,
        f.location.latitude,
        f.location.longitude
      );
      return distance <= radiusKm;
    });
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateFoodAvailability(factors: EnvironmentalFactor[]): number {
    if (factors.length === 0) return 50;
    
    const avgVegetation =
      factors.reduce((sum, f) => sum + f.vegetationIndex, 0) / factors.length;
    const avgTemp =
      factors.reduce((sum, f) => sum + f.temperature, 0) / factors.length;
    
    const tempScore = this.normalize(avgTemp, 10, 30, 20, 0);
    const vegScore = avgVegetation * 100;
    
    return Math.min(100, (tempScore * 0.4 + vegScore * 0.6));
  }

  private calculateWaterAvailability(factors: EnvironmentalFactor[]): number {
    if (factors.length === 0) return 50;
    
    const avgPrecip =
      factors.reduce((sum, f) => sum + f.precipitation, 0) / factors.length;
    const avgWaterQuality =
      factors.reduce((sum, f) => sum + (f.waterQuality || 70), 0) / factors.length;
    const avgHumidity =
      factors.reduce((sum, f) => sum + f.humidity, 0) / factors.length;
    
    const precipScore = this.normalize(avgPrecip, 0, 50, 25, 0);
    const humidScore = this.normalize(avgHumidity, 40, 90, 60, 0);
    
    return Math.min(100, (precipScore * 0.4 + humidScore * 0.3 + avgWaterQuality * 0.3));
  }

  private calculateShelterQuality(factors: EnvironmentalFactor[]): number {
    if (factors.length === 0) return 50;
    
    const avgVegetation =
      factors.reduce((sum, f) => sum + f.vegetationIndex, 0) / factors.length;
    const avgWind =
      factors.reduce((sum, f) => sum + f.windSpeed, 0) / factors.length;
    
    const vegScore = avgVegetation * 100;
    const windScore = this.normalize(avgWind, 0, 20, 5, 100);
    
    return Math.min(100, (vegScore * 0.6 + windScore * 0.4));
  }

  private calculateDisturbanceLevel(factors: EnvironmentalFactor[]): number {
    if (factors.length === 0) return 50;
    
    const satelliteRatio =
      factors.filter((f) => f.source === "satellite").length / factors.length;
    const timeVariance = this.calculateTimeVariance(factors);
    
    const disturbanceScore = (satelliteRatio * 40) + (timeVariance * 60);
    return Math.min(100, disturbanceScore);
  }

  private calculateBiodiversityIndex(factors: EnvironmentalFactor[]): number {
    if (factors.length === 0) return 50;
    
    const envStability = this.calculateEnvironmentalStability(factors);
    const resourceAvailability =
      (this.calculateFoodAvailability(factors) +
        this.calculateWaterAvailability(factors)) /
      2;
    
    return Math.min(100, (envStability * 0.5 + resourceAvailability * 0.5));
  }

  private calculateEnvironmentalStability(factors: EnvironmentalFactor[]): number {
    if (factors.length < 2) return 50;
    
    const tempVariance = this.variance(factors.map((f) => f.temperature));
    const humVariance = this.variance(factors.map((f) => f.humidity));
    
    const tempStability = this.normalize(tempVariance, 0, 20, 5, 100);
    const humStability = this.normalize(humVariance, 0, 30, 10, 100);
    
    return (tempStability + humStability) / 2;
  }

  private calculateTimeVariance(factors: EnvironmentalFactor[]): number {
    if (factors.length < 2) return 0;
    const timestamps = factors.map((f) => f.timestamp.getTime());
    return this.variance(timestamps) / (1000 * 60 * 60 * 24);
  }

  private variance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private normalize(
    value: number,
    min: number,
    max: number,
    optimal: number,
    fallback: number
  ): number {
    if (value < min || value > max) return fallback;
    const distanceFromOptimal = Math.abs(value - optimal);
    const range = max - min;
    return Math.max(0, 100 - (distanceFromOptimal / range) * 100);
  }

  private calculateOverallScore(scores: {
    foodAvailability: number;
    waterAvailability: number;
    shelterQuality: number;
    disturbanceLevel: number;
    biodiversityIndex: number;
  }): number {
    return Math.round(
      scores.foodAvailability * this.weights.foodAvailability +
        scores.waterAvailability * this.weights.waterAvailability +
        scores.shelterQuality * this.weights.shelterQuality +
        (100 - scores.disturbanceLevel) * this.weights.disturbanceLevel +
        scores.biodiversityIndex * this.weights.biodiversityIndex
    );
  }

  private calculateConfidence(sampleSize: number): number {
    if (sampleSize >= 50) return 95;
    if (sampleSize >= 30) return 85;
    if (sampleSize >= 15) return 70;
    if (sampleSize >= 5) return 50;
    return 30;
  }

  getQualityLevel(score: number): "excellent" | "good" | "moderate" | "poor" | "critical" {
    if (score >= 85) return "excellent";
    if (score >= 70) return "good";
    if (score >= 55) return "moderate";
    if (score >= 40) return "poor";
    return "critical";
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const habitatTypes = [
  "湿地",
  "沿海滩涂",
  "湖泊",
  "河流",
  "森林",
  "草原",
  "农田",
  "人工湿地",
];
