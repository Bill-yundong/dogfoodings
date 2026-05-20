'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PressureStation } from '@/types';
import { formatPressure, interpolateColor } from '@/utils';

interface PressureMapProps {
  stations: PressureStation[];
  pressureData: Record<string, number>;
  selectedStationId: string | null;
  onStationSelect: (stationId: string | null) => void;
}

export default function PressureMap({
  stations,
  pressureData,
  selectedStationId,
  onStationSelect,
}: PressureMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      center: [39.9042, 116.4074],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current.clear();

    stations.forEach((station) => {
      const pressure = pressureData[station.id] || station.normalPressure;
      const color = interpolateColor(pressure, station.minPressure, station.maxPressure);
      const isSelected = selectedStationId === station.id;

      const marker = L.circleMarker([station.lat, station.lng], {
        radius: isSelected ? 12 : 8,
        fillColor: color,
        color: isSelected ? '#ffffff' : color,
        weight: isSelected ? 3 : 1,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(mapInstanceRef.current!);

      const popupContent = `
        <div class="p-2">
          <div class="font-bold text-sm mb-1">${station.name}</div>
          <div class="text-xs text-gray-600 mb-1">${station.id}</div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
            <span class="font-mono text-sm">${formatPressure(pressure, 'kPa')}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        onStationSelect(isSelected ? null : station.id);
      });

      markersRef.current.set(station.id, marker);
    });
  }, [stations, pressureData, selectedStationId, onStationSelect]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />
      
      <div className="absolute bottom-4 left-4 glass-card p-3 text-xs">
        <div className="font-medium mb-2 text-dark-200">压力图例</div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#3B82F6' }} />
          <span className="text-dark-400">低</span>
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#10B981' }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#F59E0B' }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#F97316' }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#EF4444' }} />
          <span className="text-dark-400">高</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 glass-card p-3 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-success-500" />
          <span className="text-dark-300">正常</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-warning-500" />
          <span className="text-dark-300">预警</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-danger-500" />
          <span className="text-dark-300">告警</span>
        </div>
      </div>
    </div>
  );
}
