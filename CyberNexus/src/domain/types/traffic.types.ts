export type TrafficDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';

export type FeatureVector = number[];

export interface TimeWindow {
  start: number;
  end: number;
}

export interface IPacketInfo {
  length: number;
  timestamp: number;
  flags?: string[];
}

export interface IConnectionStats {
  packetCount: number;
  byteCount: number;
  duration: number;
  packetRate: number;
  byteRate: number;
}
