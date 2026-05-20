'use client';

import { motion } from 'framer-motion';
import { MapPin, Gauge, Thermometer, Wind } from 'lucide-react';
import type { PressureStation } from '@/types';
import { cn, formatPressure, formatFlow, getStationStatusColor, getStationStatusLabel } from '@/utils';
import { useGasMatrixStore } from '@/store';

interface StationListProps {
  stations: PressureStation[];
  onStationClick?: (station: PressureStation) => void;
  selectedStationId?: string;
}

export default function StationList({
  stations,
  onStationClick,
  selectedStationId,
}: StationListProps) {
  const { pressureData, flowData, temperatureData, settings } = useGasMatrixStore();

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
      {stations.map((station, index) => {
        const pressure = pressureData[station.id] || station.normalPressure;
        const flow = flowData[station.id] || 0;
        const temperature = temperatureData[station.id] || 15;
        const isSelected = selectedStationId === station.id;

        return (
          <motion.div
            key={station.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onStationClick?.(station)}
            className={cn(
              'glass-card-hover p-4 cursor-pointer',
              isSelected && 'border-primary-500 bg-primary-500/10'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    getStationStatusColor(station.status)
                  )}
                />
                <div>
                  <h4 className="font-medium text-dark-100">{station.name}</h4>
                  <p className="text-xs text-dark-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {station.id}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded',
                  station.status === 'online' && 'bg-success-500/20 text-success-400',
                  station.status === 'warning' && 'bg-warning-500/20 text-warning-400',
                  station.status === 'danger' && 'bg-danger-500/20 text-danger-400',
                  station.status === 'offline' && 'bg-dark-700 text-dark-400'
                )}
              >
                {getStationStatusLabel(station.status)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-dark-800/50 rounded p-2">
                <div className="flex items-center gap-1 text-xs text-dark-500 mb-1">
                  <Gauge className="w-3 h-3" />
                  压力
                </div>
                <p className="font-mono text-sm text-primary-400">
                  {formatPressure(pressure, settings.pressureUnit)}
                </p>
              </div>
              <div className="bg-dark-800/50 rounded p-2">
                <div className="flex items-center gap-1 text-xs text-dark-500 mb-1">
                  <Wind className="w-3 h-3" />
                  流量
                </div>
                <p className="font-mono text-sm text-success-400">
                  {formatFlow(flow, settings.flowUnit)}
                </p>
              </div>
              <div className="bg-dark-800/50 rounded p-2">
                <div className="flex items-center gap-1 text-xs text-dark-500 mb-1">
                  <Thermometer className="w-3 h-3" />
                  温度
                </div>
                <p className="font-mono text-sm text-warning-400">
                  {temperature.toFixed(1)}°{settings.temperatureUnit}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
