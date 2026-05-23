'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { 
  Map, Plus, Calendar, Clock, MapPin, 
  Edit2, Trash2, Copy, Search, Filter,
  CheckCircle2, XCircle, MoreHorizontal, ChevronRight
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { useTripStore, useUIStore } from '@/lib/store';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const statusColors = {
  draft: 'bg-gray-100 text-gray-600',
  planning: 'bg-blue-100 text-blue-600',
  confirmed: 'bg-green-100 text-green-600',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-purple-100 text-purple-600',
};

const statusLabels = {
  draft: '草稿',
  planning: '规划中',
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成',
};

export default function TripsPage() {
  const { trips, addTrip, deleteTrip, setCurrentTrip, loadTrips } = useTripStore();
  const { showToast, viewMode, setViewMode } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const createTripMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 7);
      
      return await addTrip({
        name: `新行程 ${format(today, 'MMdd')}`,
        description: '',
        startDate: today,
        endDate: endDate,
        userId: 'anonymous',
        transportMode: 'driving',
        locations: [],
        preferences: {
          transportMode: 'driving',
          optimizationGoal: 'balanced',
          dailyStartTime: '09:00',
          dailyEndTime: '21:00',
          defaultStayDuration: 60,
        },
      });
    },
    onSuccess: (trip) => {
      showToast('success', '行程创建成功');
      setCurrentTrip(trip);
    },
    onError: (error) => {
      showToast('error', error instanceof Error ? error.message : '创建失败');
    },
  });

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch = trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          trip.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-dark-800">
              我的行程
            </h1>
            <p className="text-dark-500 mt-1">
              管理您的所有旅行计划，共 {trips.length} 个行程
            </p>
          </div>
          
          <button
            onClick={() => createTripMutation.mutate()}
            disabled={createTripMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            创建新行程
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索行程..."
              className="input-field pl-12"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">全部状态</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            
            <div className="flex bg-white rounded-xl border border-dark-100 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
              >
                <div className="w-5 h-5 grid grid-cols-2 gap-1">
                  <div className="rounded-sm bg-current opacity-70" />
                  <div className="rounded-sm bg-current opacity-70" />
                  <div className="rounded-sm bg-current opacity-70" />
                  <div className="rounded-sm bg-current opacity-70" />
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-dark-600 hover:bg-dark-50'}`}
              >
                <div className="w-5 h-5 flex flex-col justify-center gap-1">
                  <div className="h-1 rounded bg-current opacity-70" />
                  <div className="h-1 rounded bg-current opacity-70" />
                  <div className="h-1 rounded bg-current opacity-70" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Map className="w-12 h-12 text-primary-500" />
            </div>
            <h3 className="text-2xl font-bold text-dark-700 mb-2">
              {trips.length === 0 ? '还没有任何行程' : '没有匹配的行程'}
            </h3>
            <p className="text-dark-500 mb-8 max-w-md mx-auto">
              {trips.length === 0 
                ? '点击"创建新行程"按钮，开始规划您的下一次完美旅程'
                : '尝试调整搜索条件或筛选器'}
            </p>
            <button
              onClick={() => createTripMutation.mutate()}
              disabled={createTripMutation.isPending}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              创建第一个行程
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card group hover:-translate-y-2 cursor-pointer"
                onClick={() => {
                  setCurrentTrip(trip);
                  showToast('info', `已选择行程：${trip.name}`);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[trip.status as keyof typeof statusColors]}`}>
                    {statusLabels[trip.status as keyof typeof statusLabels]}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-dark-800 mb-2 group-hover:text-primary-600 transition-colors">
                  {trip.name}
                </h3>
                
                {trip.description && (
                  <p className="text-sm text-dark-500 mb-4 line-clamp-2">
                    {trip.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-dark-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(trip.startDate, 'MM/dd', { locale: zhCN })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{trip.locations?.length || 0} 个地点</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-dark-100">
                  <span className="text-xs text-dark-400">
                    更新于 {format(trip.updatedAt, 'MM/dd HH:mm', { locale: zhCN })}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(trip.id);
                        showToast('success', '行程ID已复制');
                      }}
                      className="p-2 hover:bg-dark-50 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4 text-dark-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确定要删除这个行程吗？')) {
                          deleteTrip(trip.id);
                          showToast('info', '行程已删除');
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="card flex items-center gap-6 hover:bg-primary-50/50 cursor-pointer group"
                onClick={() => {
                  setCurrentTrip(trip);
                  showToast('info', `已选择行程：${trip.name}`);
                }}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-dark-800 truncate group-hover:text-primary-600 transition-colors">
                      {trip.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[trip.status as keyof typeof statusColors]}`}>
                      {statusLabels[trip.status as keyof typeof statusLabels]}
                    </span>
                  </div>
                  
                  {trip.description && (
                    <p className="text-sm text-dark-500 truncate mb-2">{trip.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-dark-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(trip.startDate, 'yyyy/MM/dd', { locale: zhCN })} - {format(trip.endDate, 'yyyy/MM/dd', { locale: zhCN })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {trip.locations?.length || 0} 个目的地
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      更新于 {format(trip.updatedAt, 'HH:mm', { locale: zhCN })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(trip.id);
                      showToast('success', '行程ID已复制');
                    }}
                    className="p-2 hover:bg-dark-100 rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5 text-dark-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('确定要删除这个行程吗？')) {
                        deleteTrip(trip.id);
                        showToast('info', '行程已删除');
                      }
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-dark-400" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
