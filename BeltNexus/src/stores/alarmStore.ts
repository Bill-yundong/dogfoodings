import { createStore } from 'solid-js/store';
import type { Alarm, AlarmThresholds } from '@/types';

interface AlarmStoreState {
  alarms: Alarm[];
  unacknowledgedCount: number;
  thresholds: AlarmThresholds;
}

const defaultThresholds: AlarmThresholds = {
  tension: {
    warning: 80,
    critical: 95,
  },
  temperature: {
    warning: 65,
    critical: 80,
  },
  vibration: {
    warning: 5.5,
    critical: 8,
  },
  wear: {
    warning: 4,
    critical: 6,
  },
};

const initialState: AlarmStoreState = {
  alarms: [],
  unacknowledgedCount: 0,
  thresholds: defaultThresholds,
};

export const [alarmState, setAlarmState] = createStore<AlarmStoreState>(initialState);

export function addAlarm(alarm: Alarm) {
  setAlarmState('alarms', (prev) => [alarm, ...prev].slice(0, 500));
  if (!alarm.acknowledged) {
    setAlarmState('unacknowledgedCount', (prev) => prev + 1);
  }
}

export function acknowledgeAlarm(id: string, userId: string) {
  setAlarmState('alarms', (prev) =>
    prev.map((a) =>
      a.id === id ? { ...a, acknowledged: true, acknowledgedBy: userId } : a
    )
  );
  setAlarmState('unacknowledgedCount', (prev) => Math.max(0, prev - 1));
}

export function resolveAlarm(id: string) {
  setAlarmState('alarms', (prev) =>
    prev.map((a) =>
      a.id === id ? { ...a, resolved: true, resolvedAt: Date.now() } : a
    )
  );
}

export function setAlarms(alarms: Alarm[]) {
  setAlarmState('alarms', alarms);
  const unack = alarms.filter((a) => !a.acknowledged).length;
  setAlarmState('unacknowledgedCount', unack);
}

export function updateThresholds(thresholds: Partial<AlarmThresholds>) {
  setAlarmState('thresholds', (prev) => ({ ...prev, ...thresholds }));
}
