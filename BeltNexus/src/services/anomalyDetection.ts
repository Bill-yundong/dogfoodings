import type { SensorData, Alarm, AlarmThresholds } from '@/types';
import { generateId } from '@/utils/math';

export function detectAlarms(
  sensorData: SensorData[],
  thresholds: AlarmThresholds
): Alarm[] {
  const alarms: Alarm[] = [];
  const timestamp = Date.now();
  
  for (const data of sensorData) {
    if (data.tension >= thresholds.tension.critical) {
      alarms.push(createAlarm(
        timestamp,
        'tension',
        'critical',
        data,
        thresholds.tension.critical,
        `张力严重超标：${data.tension.toFixed(1)} kN`
      ));
    } else if (data.tension >= thresholds.tension.warning) {
      alarms.push(createAlarm(
        timestamp,
        'tension',
        'warning',
        data,
        thresholds.tension.warning,
        `张力超标：${data.tension.toFixed(1)} kN`
      ));
    }
    
    if (data.temperature >= thresholds.temperature.critical) {
      alarms.push(createAlarm(
        timestamp,
        'temperature',
        'critical',
        data,
        thresholds.temperature.critical,
        `温度严重超标：${data.temperature.toFixed(1)} °C`
      ));
    } else if (data.temperature >= thresholds.temperature.warning) {
      alarms.push(createAlarm(
        timestamp,
        'temperature',
        'warning',
        data,
        thresholds.temperature.warning,
        `温度超标：${data.temperature.toFixed(1)} °C`
      ));
    }
    
    if (data.vibration >= thresholds.vibration.critical) {
      alarms.push(createAlarm(
        timestamp,
        'sensor',
        'critical',
        data,
        thresholds.vibration.critical,
        `振动严重超标：${data.vibration.toFixed(2)} mm/s`
      ));
    } else if (data.vibration >= thresholds.vibration.warning) {
      alarms.push(createAlarm(
        timestamp,
        'sensor',
        'warning',
        data,
        thresholds.vibration.warning,
        `振动超标：${data.vibration.toFixed(2)} mm/s`
      ));
    }
    
    const strainRate = data.strain / data.tension;
    if (strainRate > 0.005 && data.tension > 60) {
      alarms.push(createAlarm(
        timestamp,
        'tear',
        'warning',
        data,
        0.005,
        `检测到异常应变率，可能存在撕裂风险`
      ));
    }
  }
  
  return alarms;
}

function createAlarm(
  timestamp: number,
  type: Alarm['type'],
  severity: Alarm['severity'],
  data: SensorData,
  threshold: number,
  message: string
): Alarm {
  return {
    id: generateId(),
    timestamp,
    type,
    severity,
    position: data.position,
    sensorId: data.sensorId,
    value: type === 'tension' ? data.tension :
           type === 'temperature' ? data.temperature :
           type === 'sensor' ? data.vibration : data.strain,
    threshold,
    message,
    acknowledged: false,
    resolved: false,
  };
}

export function deduplicateAlarms(
  newAlarms: Alarm[],
  existingAlarms: Alarm[],
  timeWindow: number = 5000
): Alarm[] {
  return newAlarms.filter((newAlarm) => {
    const isDuplicate = existingAlarms.some(
      (existing) =>
        existing.type === newAlarm.type &&
        existing.sensorId === newAlarm.sensorId &&
        Math.abs(existing.timestamp - newAlarm.timestamp) < timeWindow &&
        !existing.resolved
    );
    return !isDuplicate;
  });
}
