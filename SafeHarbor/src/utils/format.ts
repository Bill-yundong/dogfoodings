import { DRAG_RISK_LABELS, DRAG_RISK_COLORS } from '../constants';
import type { DragRiskLevel } from '../types';

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN');
};

export const getDragRiskLabel = (risk: DragRiskLevel): string => {
  return DRAG_RISK_LABELS[risk] || '未知';
};

export const getDragRiskColor = (risk: DragRiskLevel): string => {
  return DRAG_RISK_COLORS[risk] || '#94a3b8';
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals);
};

export const formatForce = (force: number): string => {
  return `${(force / 1000).toFixed(1)} kN`;
};

export const formatSpeed = (speed: number): string => {
  return `${speed.toFixed(1)} m/s`;
};

export const calculateSafetyFactor = (holdingPower: number, environmentalForce: number): number => {
  return holdingPower / environmentalForce;
};

export const getWindSeverity = (windSpeed: number): string => {
  if (windSpeed < 15) return '风力较小';
  if (windSpeed < 25) return '中等风力';
  if (windSpeed < 35) return '大风警报';
  return '台风级别';
};

export const generateId = (): string => {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateSemanticHash = (payload: any, type: string, version: string = '1.0.0'): string => {
  const data = JSON.stringify({ payload, type, version });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};
