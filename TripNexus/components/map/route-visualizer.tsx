'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, ZoomIn, ZoomOut, Maximize2, Share2, Download } from 'lucide-react';
import { useTripStore, useUIStore } from '@/lib/store';
import { MapMapper } from '@/lib/mappers/map-mapper';
import { formatDistance, formatDuration } from '@/lib/utils/helpers';
import type { Location } from '@/lib/types';

interface RouteVisualizerProps {
  height?: string;
  showControls?: boolean;
}

export function RouteVisualizer({ height = '500px', showControls = true }: RouteVisualizerProps) {
  const { locations, selectedResult } = useTripStore();
  const { showToast } = useUIStore();
  const [zoom, setZoom] = useState(1);
  const [showRouteNumbers, setShowRouteNumbers] = useState(true);

  const mapMapper = useMemo(() => new MapMapper(), []);

  const displayLocations = useMemo(() => {
    if (selectedResult?.optimizedOrder) {
      return selectedResult.optimizedOrder.map((loc, index) => ({
        ...loc,
        order: index + 1,
      }));
    }
    return locations.map((loc, index) => ({
      ...loc,
      order: index + 1,
    }));
  }, [locations, selectedResult]);

  const bounds = useMemo(() => {
    if (displayLocations.length === 0) return null;
    return mapMapper.calculateBounds(displayLocations);
  }, [displayLocations, mapMapper]);

  const polylines = useMemo(() => {
    if (displayLocations.length < 2 || !selectedResult?.segments) return [];
    return mapMapper.createPolylines(selectedResult.segments, true);
  }, [displayLocations, mapMapper, selectedResult]);

  const markers = useMemo(() => {
    return mapMapper.createMarkers(displayLocations as Location[], undefined, []);
  }, [displayLocations, mapMapper]);

  const svgPoints = useMemo(() => {
    if (!bounds || displayLocations.length === 0) return [];
    
    const padding = 40;
    const width = 800;
    const mapHeight = parseInt(height) || 500;
    const mapWidth = width - padding * 2;
    const mapHeightInner = mapHeight - padding * 2;
    
    const latRange = bounds.maxLat - bounds.minLat;
    const lngRange = bounds.maxLng - bounds.minLng;
    const scale = Math.min(mapWidth / lngRange, mapHeightInner / latRange);
    
    return displayLocations.map((loc) => ({
      x: padding + (loc.coordinates.lng - bounds.minLng) * scale,
      y: mapHeight - padding - (loc.coordinates.lat - bounds.minLat) * scale,
      location: loc,
    }));
  }, [displayLocations, bounds, height]);

  const pathD = useMemo(() => {
    if (svgPoints.length < 2) return '';
    return svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [svgPoints]);

  const handleExportImage = () => {
    showToast('info', '地图导出功能开发中...');
  };

  const handleShare = () => {
    if (displayLocations.length < 2) {
      showToast('error', '请先添加地点');
      return;
    }
    
    const shareUrl = mapMapper.getShareUrl(displayLocations as Location[], '我的行程');
    navigator.clipboard.writeText(shareUrl);
    showToast('success', '分享链接已复制到剪贴板');
  };

  const handleOpenGoogleMaps = () => {
    if (displayLocations.length < 2) {
      showToast('error', '请先添加地点');
      return;
    }
    
    const from = displayLocations[0] as Location;
    const to = displayLocations[displayLocations.length - 1] as Location;
    const directionsUrl = mapMapper.getDirectionsUrl(from, to);
    window.open(directionsUrl, '_blank');
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-dark-800 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary-500" />
            路线可视化
          </h3>
          <p className="text-sm text-dark-500 mt-1">
            {displayLocations.length} 个目的地
            {selectedResult && ` · 优化后总距离 ${(selectedResult.totalDistance / 1000).toFixed(1)}km`}
          </p>
        </div>
        
        {showControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 rounded-lg bg-dark-50 hover:bg-dark-100 transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5 text-dark-600" />
            </button>
            <span className="text-sm text-dark-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="p-2 rounded-lg bg-dark-50 hover:bg-dark-100 transition-colors"
              title="放大"
            >
              <ZoomIn className="w-5 h-5 text-dark-600" />
            </button>
            <div className="w-px h-6 bg-dark-200 mx-2" />
            <button
              onClick={() => setShowRouteNumbers(!showRouteNumbers)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                showRouteNumbers ? 'bg-primary-100 text-primary-700' : 'bg-dark-50 text-dark-600 hover:bg-dark-100'
              }`}
            >
              #{showRouteNumbers ? '显示' : '隐藏'}序号
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-dark-50 hover:bg-dark-100 transition-colors"
              title="分享路线"
            >
              <Share2 className="w-5 h-5 text-dark-600" />
            </button>
            <button
              onClick={handleExportImage}
              className="p-2 rounded-lg bg-dark-50 hover:bg-dark-100 transition-colors"
              title="导出图片"
            >
              <Download className="w-5 h-5 text-dark-600" />
            </button>
          </div>
        )}
      </div>

      <div 
        className="relative bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl overflow-hidden"
        style={{ height }}
      >
        {displayLocations.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-dark-400">
            <MapPin className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">添加目的地后查看路线</p>
            <p className="text-sm mt-2">点击"添加地点"开始规划</p>
          </div>
        ) : (
          <motion.svg
            width="100%"
            height="100%"
            viewBox={`0 0 800 ${parseInt(height) || 500}`}
            style={{ 
              transform: `scale(${zoom})`, 
              transformOrigin: 'center',
              transition: 'transform 0.3s ease'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
              </filter>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#grid)" />

            {svgPoints.length >= 2 && (
              <>
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#shadow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="0 12"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1, ease: 'easeInOut', delay: 0.2 }}
                />
              </>
            )}

            {svgPoints.map((point, index) => (
              <motion.g
                key={point.location.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 + 0.5 }}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="24"
                  fill="white"
                  filter="url(#shadow)"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="20"
                  fill={point.location.order === 1 ? '#22c55e' : point.location.order === displayLocations.length ? '#ef4444' : '#3b82f6'}
                />
                {showRouteNumbers && (
                  <text
                    x={point.x}
                    y={point.y + 6}
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {point.location.order}
                  </text>
                )}

                <foreignObject
                  x={point.x + 30}
                  y={point.y - 20}
                  width="200"
                  height="50"
                >
                  <div className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm whitespace-nowrap">
                    <p className="font-semibold text-dark-800">{point.location.name}</p>
                    {point.location.address && (
                      <p className="text-xs text-dark-500 truncate">{point.location.address}</p>
                    )}
                  </div>
                </foreignObject>
              </motion.g>
            ))}
          </motion.svg>
        )}

        {selectedResult && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-dark-500">总距离</p>
                <p className="text-lg font-bold text-primary-600">
                  {formatDistance(selectedResult.totalDistance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-500">总时间</p>
                <p className="text-lg font-bold text-green-600">
                  {formatDuration(selectedResult.totalTime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-500">预计成本</p>
                <p className="text-lg font-bold text-accent-600">
                  ¥{selectedResult.totalCost?.toFixed(0) || '0'}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-500">适应度评分</p>
                <p className="text-lg font-bold text-purple-600">
                  {selectedResult.fitnessScore.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {displayLocations.length >= 2 && (
          <button
            onClick={handleOpenGoogleMaps}
            className="absolute top-4 right-4 px-4 py-2 bg-white rounded-xl shadow-lg flex items-center gap-2 hover:shadow-xl transition-shadow"
          >
            <Navigation className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-dark-700">在地图中打开</span>
          </button>
        )}
      </div>

      {selectedResult?.routeLegs && selectedResult.routeLegs.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-semibold text-dark-700">路线详情</h4>
          {selectedResult.routeLegs.map((leg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-dark-50 hover:bg-primary-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-dark-800">
                  {leg.from.name} → {leg.to.name}
                </p>
                <p className="text-sm text-dark-500">
                  {formatDistance(leg.distance)} · {formatDuration(leg.duration)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-primary-600">
                  ¥{leg.cost?.toFixed(0) || '0'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
