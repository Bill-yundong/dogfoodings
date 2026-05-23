'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, Car, Bus, Footprints, Bike,
  Utensils, Hotel, Clock, Navigation,
  Calendar, ChevronDown, ChevronUp, Sun, Sunset
} from 'lucide-react';
import { useTripStore, useUIStore } from '@/lib/store';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDuration } from '@/lib/utils/helpers';

const transportIcons = {
  driving: Car,
  transit: Bus,
  walking: Footprints,
  cycling: Bike,
};

const activityTypeConfig = {
  travel: { icon: Navigation, color: 'text-blue-500', bg: 'bg-blue-50', label: '交通' },
  visit: { icon: MapPin, color: 'text-purple-500', bg: 'bg-purple-50', label: '游览' },
  meal: { icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50', label: '用餐' },
  rest: { icon: Hotel, color: 'text-green-500', bg: 'bg-green-50', label: '休息' },
};

export function ItineraryTimeline() {
  const { dailyItineraries, selectedResult, currentTrip } = useTripStore();
  const { showToast } = useUIStore();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const toggleDay = (dateStr: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  const getTimeOfDay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 6) return { icon: Sunset, label: '凌晨' };
    if (hour < 12) return { icon: Sun, label: '上午' };
    if (hour < 18) return { icon: Sun, label: '下午' };
    return { icon: Sunset, label: '晚上' };
  };

  if (!currentTrip || dailyItineraries.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="w-20 h-20 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-10 h-10 text-dark-400" />
        </div>
        <h3 className="text-xl font-bold text-dark-700 mb-2">暂无日程安排</h3>
        <p className="text-dark-500 mb-6">
          请先创建行程并完成路径优化，系统将自动生成每日日程
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl">
          <MapPin className="w-5 h-5" />
          <span className="text-sm font-medium">步骤：创建行程 → 添加地点 → 路径优化 → 生成日程</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-dark-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              {currentTrip.name}
            </h3>
            <p className="text-sm text-dark-500 mt-1">
              {format(currentTrip.startDate, 'yyyy年MM月dd日', { locale: zhCN })} 
              {' - '}
              {format(currentTrip.endDate, 'yyyy年MM月dd日', { locale: zhCN })}
              {' · '}
              共 {dailyItineraries.length} 天
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedDays(new Set(dailyItineraries.map(d => String(d.date))))}
              className="px-4 py-2 text-sm bg-dark-100 text-dark-600 rounded-xl hover:bg-dark-200 transition-colors"
            >
              展开全部
            </button>
            <button
              onClick={() => setExpandedDays(new Set())}
              className="px-4 py-2 text-sm bg-dark-100 text-dark-600 rounded-xl hover:bg-dark-200 transition-colors"
            >
              收起全部
            </button>
          </div>
        </div>

        {dailyItineraries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-blue-600">{dailyItineraries.length}</p>
              <p className="text-sm text-blue-700">旅行天数</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-green-600">
                {dailyItineraries.reduce((sum, d) => sum + d.activities.filter(a => a.type === 'visit').length, 0)}
              </p>
              <p className="text-sm text-green-700">游览景点</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-purple-600">
                {dailyItineraries.reduce((sum, d) => sum + d.activities.filter(a => a.type === 'travel').length, 0)}
              </p>
              <p className="text-sm text-purple-700">交通路段</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-amber-600">
                {formatDuration(selectedResult?.totalTime || 0)}
              </p>
              <p className="text-sm text-amber-700">总行程时间</p>
            </div>
          </div>
        )}
      </div>

      {dailyItineraries.map((day, dayIndex) => {
        const dateStr = String(day.date);
        const isExpanded = expandedDays.has(dateStr) || expandedDays.size === 0;
        const dayOfWeek = format(day.date, 'EEEE', { locale: zhCN });
        const visitCount = day.activities.filter(a => a.type === 'visit').length;
        const travelCount = day.activities.filter(a => a.type === 'travel').length;
        
        return (
          <motion.div
            key={dateStr}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.1 }}
            className="card overflow-hidden"
          >
            <button
              onClick={() => toggleDay(dateStr)}
              className="w-full flex items-center justify-between p-4 -m-6 mb-0 hover:bg-dark-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 flex flex-col items-center justify-center text-white shadow-lg">
                  <span className="text-2xl font-bold">{format(day.date, 'd')}</span>
                  <span className="text-xs opacity-80">{format(day.date, 'MMM', { locale: zhCN })}</span>
                </div>
                <div className="text-left">
                  <h4 className="text-lg font-bold text-dark-800">
                    第 {dayIndex + 1} 天 · {dayOfWeek}
                  </h4>
                  <p className="text-sm text-dark-500">
                    {visitCount} 个景点 · {travelCount} 段交通 · {day.activities.length} 项活动
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {day.summary && (
                  <div className="hidden md:block text-right">
                    <p className="text-sm text-dark-600">{day.summary}</p>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-dark-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-dark-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 pt-6 border-t border-dark-100"
              >
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-cyan-500 to-accent-500" />
                  
                  <div className="space-y-4">
                    {day.activities.map((activity, actIndex) => {
                      const config = activityTypeConfig[activity.type];
                      const Icon = config.icon;
                      const timeOfDay = getTimeOfDay(activity.startTime);
                      const TimeIcon = timeOfDay.icon;
                      
                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: actIndex * 0.05 }}
                          className="relative pl-16"
                        >
                          <div className={`absolute left-4 w-5 h-5 rounded-full ${config.bg} border-4 border-white shadow-md`}>
                            <div className={`w-full h-full rounded-full ${config.color} flex items-center justify-center`}>
                              <div className="w-2 h-2 rounded-full bg-current" />
                            </div>
                          </div>
                          
                          <div className={`p-4 rounded-xl ${config.bg} border border-current/10`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${config.color}`} />
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                                  {config.label}
                                </span>
                                <TimeIcon className="w-4 h-4 text-dark-400" />
                                <span className="text-xs text-dark-500">{timeOfDay.label}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-dark-600">
                                <Clock className="w-4 h-4" />
                                {activity.startTime} - {activity.endTime}
                              </div>
                            </div>
                            
                            <h5 className="font-semibold text-dark-800 text-lg mb-1">
                              {activity.locationName}
                            </h5>
                            
                            {activity.address && (
                              <p className="text-sm text-dark-500 mb-2">{activity.address}</p>
                            )}
                            
                            {activity.notes && (
                              <p className="text-sm text-dark-600 bg-white/50 rounded-lg p-3">
                                💡 {activity.notes}
                              </p>
                            )}
                            
                            {activity.type === 'travel' && activity.transportMode && (
                              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-current/10">
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const TransportIcon = transportIcons[activity.transportMode as keyof typeof transportIcons];
                                    return TransportIcon ? <TransportIcon className="w-4 h-4 text-dark-500" /> : null;
                                  })()}
                                  <span className="text-sm text-dark-600">
                                    {activity.transportMode === 'driving' ? '驾车' : 
                                     activity.transportMode === 'transit' ? '公共交通' :
                                     activity.transportMode === 'walking' ? '步行' : '骑行'}
                                  </span>
                                </div>
                                {activity.distance && (
                                  <div className="text-sm text-dark-600">
                                    {(activity.distance / 1000).toFixed(1)} km
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
