import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { Coordinates, Location } from '@/lib/types';

export const generateId = (): string => uuidv4();

export const formatDate = (date: string | Date, pattern: string = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
};

export const formatTime = (date: string | Date, pattern: string = 'HH:mm'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm');
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? ` ${mins}分钟` : ''}`;
  }
  return `${mins}分钟`;
};

export const formatDistance = (km: number): string => {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(2)} 千公里`;
  }
  if (km >= 1) {
    return `${km.toFixed(1)} 公里`;
  }
  return `${Math.round(km * 1000)} 米`;
};

export const formatCost = (cost: number, currency: string = 'CNY'): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(cost);
};

export const calculateDistance = (from: Coordinates, to: Coordinates): number => {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLon = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateTravelTime = (
  distance: number,
  mode: 'driving' | 'transit' | 'walking' | 'flying'
): number => {
  const speeds = {
    driving: 60,
    transit: 40,
    walking: 5,
    flying: 800,
  };
  return (distance / speeds[mode]) * 60;
};

export const calculateTravelCost = (
  distance: number,
  mode: 'driving' | 'transit' | 'walking' | 'flying'
): number => {
  const costs = {
    driving: 0.8,
    transit: 0.3,
    walking: 0,
    flying: 0.5,
  };
  return distance * costs[mode];
};

export const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

export const isWithinTimeWindow = (
  currentTime: Date,
  startTime: string,
  endTime: string
): boolean => {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

export const getDayEndTime = (baseDate: Date, endTimeStr: string): Date => {
  const { hours, minutes } = parseTimeString(endTimeStr);
  const end = new Date(baseDate);
  end.setHours(hours, minutes, 0, 0);
  return end;
};

export const createLocation = (partial: Partial<Location> = {}): Location => ({
  id: generateId(),
  name: partial.name || '',
  address: partial.address || '',
  coordinates: partial.coordinates || { lat: 0, lng: 0 },
  duration: partial.duration || 60,
  priority: partial.priority || 2,
  openHours: partial.openHours,
  constraints: partial.constraints,
  orderIndex: partial.orderIndex,
  tripId: partial.tripId,
});

export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const cn = (...classes: (string | false | null | undefined)[]): string => {
  return classes.filter(Boolean).join(' ');
};
