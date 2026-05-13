import { WeatherData, WeatherType } from '../domain/types/energy';
import { TYPICAL_WEATHER_DATA } from '../domain/constants/energy';

export class WeatherService {
  getTypicalWeather(weatherType: WeatherType): Omit<WeatherData, 'timestamp'> {
    return TYPICAL_WEATHER_DATA[weatherType];
  }

  calculateWeatherFactors(temperature: number, solarRadiation: number, windSpeed: number): {
    cooling: number;
    heating: number;
    electricity: number;
  } {
    const coolingFactor = temperature > 25 ? 1 + (temperature - 25) * 0.05 : 0.5;
    const heatingFactor = temperature < 15 ? 1 + (15 - temperature) * 0.03 : 0.5;
    const electricityFactor = 1 + (solarRadiation / 1000) * (-0.2) + (windSpeed / 10) * (-0.1);

    return { cooling: coolingFactor, heating: heatingFactor, electricity: electricityFactor };
  }

  simulateWeatherUpdate(currentWeather: WeatherData): WeatherData {
    return {
      ...currentWeather,
      temperature: currentWeather.temperature + (Math.random() - 0.5) * 0.5,
      humidity: Math.max(30, Math.min(80, currentWeather.humidity + (Math.random() - 0.5) * 2)),
      solarRadiation: Math.max(100, Math.min(1000, currentWeather.solarRadiation + (Math.random() - 0.5) * 30)),
      windSpeed: Math.max(1, Math.min(10, currentWeather.windSpeed + (Math.random() - 0.5) * 0.5)),
      timestamp: Date.now(),
    };
  }

  createWeatherData(weatherType: WeatherType): WeatherData {
    const typical = this.getTypicalWeather(weatherType);
    return {
      ...typical,
      timestamp: Date.now(),
    };
  }
}

export const weatherService = new WeatherService();
