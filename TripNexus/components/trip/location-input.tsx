'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, X, GripVertical, Navigation } from 'lucide-react';
import { useTripStore, useUIStore } from '@/lib/store';
import type { Location } from '@/lib/types';

interface LocationInputProps {
  onLocationsChange?: (locations: Location[]) => void;
}

export function LocationInput({ onLocationsChange }: LocationInputProps) {
  const { locations, addLocation, removeLocation, updateLocation, reorderLocations } = useTripStore();
  const { showToast } = useUIStore();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [stayDuration, setStayDuration] = useState('60');
  const [isExpanded, setIsExpanded] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddLocation = () => {
    if (!name.trim()) {
      showToast('error', '请输入地点名称');
      return;
    }
    
    if (!lat || !lng) {
      showToast('error', '请输入经纬度坐标');
      return;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      showToast('error', '请输入有效的经纬度坐标');
      return;
    }

    addLocation({
      name: name.trim(),
      address: address.trim() || '',
      coordinates: { lat: latitude, lng: longitude },
      duration: parseInt(stayDuration) || 60,
      stayDuration: parseInt(stayDuration) || 60,
      priority: Math.min(3, Math.max(1, locations.length + 1)) as 1 | 2 | 3,
    });

    setName('');
    setAddress('');
    setLat('');
    setLng('');
    setIsExpanded(false);
    showToast('success', '地点添加成功');
  };

  const handleAddDemoLocations = () => {
    const demoLocations = [
      { name: '北京故宫', address: '北京市东城区景山前街4号', lat: 39.9163, lng: 116.3972, stayDuration: 120 },
      { name: '颐和园', address: '北京市海淀区新建宫门路19号', lat: 39.9999, lng: 116.2755, stayDuration: 180 },
      { name: '八达岭长城', address: '北京市延庆区八达岭镇', lat: 40.3576, lng: 116.0206, stayDuration: 240 },
      { name: '天坛', address: '北京市东城区天坛东里甲1号', lat: 39.8822, lng: 116.4108, stayDuration: 90 },
      { name: '圆明园', address: '北京市海淀区清华西路28号', lat: 40.0080, lng: 116.2985, stayDuration: 120 },
    ];

    demoLocations.forEach((loc, index) => {
      setTimeout(() => {
        addLocation({
          name: loc.name,
          address: loc.address,
          coordinates: { lat: loc.lat, lng: loc.lng },
          duration: loc.stayDuration,
          stayDuration: loc.stayDuration,
          priority: Math.min(3, Math.max(1, locations.length + index + 1)) as 1 | 2 | 3,
        });
      }, index * 100);
    });
    
    showToast('success', `已添加 ${demoLocations.length} 个示例地点`);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderLocations(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    onLocationsChange?.(locations);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-dark-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-500" />
            目的地列表
          </h3>
          <p className="text-sm text-dark-500 mt-1">
            已添加 {locations.length} 个地点
            {locations.length >= 2 && ' ✓ 可进行路径优化'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {locations.length === 0 && (
            <button
              onClick={handleAddDemoLocations}
              className="px-4 py-2 text-sm bg-dark-100 text-dark-600 rounded-xl hover:bg-dark-200 transition-colors"
            >
              添加示例
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-primary py-2 text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加地点
          </button>
        </div>
      </div>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 bg-dark-50 rounded-xl space-y-4"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">地点名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：故宫博物院"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">详细地址</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="例如：北京市东城区景山前街4号"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">纬度 *</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="例如：39.9163"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">经度 *</label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="例如：116.3972"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">预计停留时间（分钟）</label>
              <input
                type="number"
                value={stayDuration}
                onChange={(e) => setStayDuration(e.target.value)}
                placeholder="60"
                className="input-field"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="px-6 py-2 text-dark-600 hover:bg-dark-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddLocation}
              className="btn-primary py-2"
            >
              确认添加
            </button>
          </div>
        </motion.div>
      )}

      {locations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-dark-400" />
          </div>
          <p className="text-dark-500 mb-2">还没有添加任何目的地</p>
          <p className="text-sm text-dark-400">点击"添加地点"按钮开始规划您的旅程</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((location, index) => (
            <motion.div
              key={location.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-move ${
                draggedIndex === index
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-dark-100 bg-white hover:border-primary-200 hover:bg-primary-50/50'
              }`}
            >
              <div className="text-dark-400 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5" />
              </div>
              
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
                {index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-dark-800 truncate">{location.name}</p>
                {location.address && (
                  <p className="text-sm text-dark-500 truncate">{location.address}</p>
                )}
                <p className="text-xs text-dark-400 font-mono mt-1">
                  {location.coordinates.lat.toFixed(4)}, {location.coordinates.lng.toFixed(4)}
                  {location.stayDuration && ` · 停留 ${location.stayDuration}分钟`}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-dark-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                  title="导航到此处"
                >
                  <Navigation className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    removeLocation(location.id);
                    showToast('info', '已删除地点');
                  }}
                  className="p-2 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除地点"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
