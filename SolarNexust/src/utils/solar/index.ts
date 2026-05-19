import type { SolarPosition } from '@/types/solar';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function calculateSolarPosition(
  timestamp: number,
  latitude: number,
  longitude: number
): SolarPosition {
  const date = new Date(timestamp);
  
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  const julianDay = calculateJulianDay(year, month, day, hours, minutes, seconds);
  const julianCentury = (julianDay - 2451545.0) / 36525.0;

  const geomMeanLongSun = (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) % 360;
  const geomMeanAnomSun = (357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury)) % 360;
  const eccentricity = 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
  
  const sunEqOfCenter = 
    Math.sin(geomMeanAnomSun * DEG_TO_RAD) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin(2 * geomMeanAnomSun * DEG_TO_RAD) * (0.019993 - 0.000101 * julianCentury) +
    Math.sin(3 * geomMeanAnomSun * DEG_TO_RAD) * 0.000289;

  const sunTrueLong = geomMeanLongSun + sunEqOfCenter;
  const sunTrueAnom = geomMeanAnomSun + sunEqOfCenter;
  const sunRadVector = (1.000001018 * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(sunTrueAnom * DEG_TO_RAD));
  
  const sunApparentLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * julianCentury) * DEG_TO_RAD);
  
  const meanObliquityEcliptic = 23 + (26 + (21.448 - julianCentury * (46.815 + julianCentury * (0.00059 - julianCentury * 0.001813))) / 60) / 60;
  const obliquityCorrected = meanObliquityEcliptic + 0.00256 * Math.cos((125.04 - 1934.136 * julianCentury) * DEG_TO_RAD);
  
  const sunDeclination = RAD_TO_DEG * Math.asin(Math.sin(obliquityCorrected * DEG_TO_RAD) * Math.sin(sunApparentLong * DEG_TO_RAD));
  
  const equationOfTime = 4 * RAD_TO_DEG * (
    0.017453292519943295 * (0.5 * Math.cos(obliquityCorrected * DEG_TO_RAD / 2) * Math.cos(obliquityCorrected * DEG_TO_RAD / 2) -
    2 * eccentricity * Math.cos(geomMeanAnomSun * DEG_TO_RAD) +
    1.25 * eccentricity * eccentricity * Math.cos(2 * geomMeanAnomSun * DEG_TO_RAD) *
    (1 + 3 * Math.cos(2 * geomMeanAnomSun * DEG_TO_RAD)) / 4)
  );

  const solarTime = (hours * 60 + minutes + seconds / 60 + equationOfTime + 4 * longitude - 60 * getTimezoneOffset(date)) % 1440;
  
  let hourAngle = solarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;
  
  const solarZenithAngle = RAD_TO_DEG * Math.acos(
    Math.sin(latitude * DEG_TO_RAD) * Math.sin(sunDeclination * DEG_TO_RAD) +
    Math.cos(latitude * DEG_TO_RAD) * Math.cos(sunDeclination * DEG_TO_RAD) * Math.cos(hourAngle * DEG_TO_RAD)
  );
  
  const solarAltitude = 90 - solarZenithAngle;
  
  let solarAzimuth: number;
  if (hourAngle > 0) {
    solarAzimuth = (RAD_TO_DEG * Math.acos(
      ((Math.sin(latitude * DEG_TO_RAD) * Math.cos(solarZenithAngle * DEG_TO_RAD)) -
      Math.sin(sunDeclination * DEG_TO_RAD)) /
      (Math.cos(latitude * DEG_TO_RAD) * Math.sin(solarZenithAngle * DEG_TO_RAD))
    ) + 180) % 360;
  } else {
    solarAzimuth = (540 - RAD_TO_DEG * Math.acos(
      ((Math.sin(latitude * DEG_TO_RAD) * Math.cos(solarZenithAngle * DEG_TO_RAD)) -
      Math.sin(sunDeclination * DEG_TO_RAD)) /
      (Math.cos(latitude * DEG_TO_RAD) * Math.sin(solarZenithAngle * DEG_TO_RAD))
    )) % 360;
  }

  return {
    altitude: solarAltitude,
    azimuth: solarAzimuth,
    declination: sunDeclination,
    hourAngle: hourAngle,
  };
}

function calculateJulianDay(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number
): number {
  let Y = year;
  let M = month;
  
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + B - 1524.5 +
    (hours + minutes / 60 + seconds / 3600) / 24;
}

function getTimezoneOffset(date: Date): number {
  return -date.getTimezoneOffset() / 60;
}

export function calculateSunDirection(altitude: number, azimuth: number): { x: number; y: number; z: number } {
  const altRad = altitude * DEG_TO_RAD;
  const azRad = azimuth * DEG_TO_RAD;
  
  return {
    x: Math.cos(altRad) * Math.sin(azRad),
    y: Math.sin(altRad),
    z: Math.cos(altRad) * Math.cos(azRad),
  };
}

export function calculateSolarIntensity(altitude: number, turbidity: number = 2.0): number {
  if (altitude <= 0) return 0;
  
  const airMass = 1 / Math.sin(altitude * DEG_TO_RAD);
  const extinctionCoefficient = 0.1 * turbidity;
  const transmittance = Math.exp(-extinctionCoefficient * airMass);
  
  const solarConstant = 1361;
  
  return solarConstant * transmittance * Math.sin(altitude * DEG_TO_RAD);
}

export function calculateDayOfYear(timestamp: number): number {
  const date = new Date(timestamp);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getSunriseSunset(
  timestamp: number,
  latitude: number,
  longitude: number
): { sunrise: number; sunset: number; dayLength: number } {
  const date = new Date(timestamp);
  const dayOfYear = calculateDayOfYear(timestamp);
  
  const declination = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365) * DEG_TO_RAD;
  const latRad = latitude * DEG_TO_RAD;
  
  const hourAngle = RAD_TO_DEG * Math.acos(-Math.tan(latRad) * Math.tan(declination));
  
  const solarNoon = 12 - (longitude / 15) + getTimezoneOffset(date);
  
  const sunriseHour = solarNoon - hourAngle / 15;
  const sunsetHour = solarNoon + hourAngle / 15;
  
  const sunrise = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(sunriseHour), Math.floor((sunriseHour % 1) * 60)).getTime();
  const sunset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(sunsetHour), Math.floor((sunsetHour % 1) * 60)).getTime();
  
  return {
    sunrise,
    sunset,
    dayLength: (sunset - sunrise) / (1000 * 60 * 60),
  };
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(timestamp: number): string {
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
}
