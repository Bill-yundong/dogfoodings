'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { 
  Calendar, Download, Share2, CheckCircle2, 
  Mail, Globe, Clock, MapPin, AlertCircle
} from 'lucide-react';
import { useTripStore, useUIStore } from '@/lib/store';
import { CalendarMapper } from '@/lib/mappers/calendar-mapper';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const exportFormats = [
  {
    id: 'ical',
    name: 'iCal 格式',
    description: '适用于 Apple 日历、Outlook、Thunderbird 等',
    icon: Download,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'google',
    name: 'Google 日历',
    description: '一键添加到 Google 日历',
    icon: Globe,
    color: 'from-red-500 to-orange-500',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: '生成 Outlook 日历添加链接',
    icon: Mail,
    color: 'from-blue-600 to-indigo-600',
  },
];

export function CalendarExportPanel() {
  const { currentTrip, dailyItineraries, selectedResult } = useTripStore();
  const { showToast } = useUIStore();
  const [selectedFormat, setSelectedFormat] = useState<string>('ical');
  const [includeTravel, setIncludeTravel] = useState(true);
  const [includeReminders, setIncludeReminders] = useState(true);

  const canExport = currentTrip && dailyItineraries.length > 0;

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!canExport) throw new Error('请先完成路径优化');

      const calendarMapper = new CalendarMapper();
      const events = calendarMapper.mapTripToEvents(currentTrip!);
      
      if (selectedFormat === 'ical') {
        calendarMapper.downloadICal(currentTrip!, `${currentTrip!.name}.ics`);
        return { type: 'download', count: events.length };
      } else if (selectedFormat === 'google' || selectedFormat === 'outlook') {
        const urls = events.map(event => ({
          eventId: event.id,
          name: event.summary,
          url: calendarMapper.getGoogleCalendarUrl(currentTrip!),
        }));
        return { type: 'links', count: events.length, urls };
      }
      
      throw new Error('不支持的导出格式');
    },
    onSuccess: (data) => {
      if (data.type === 'download') {
        showToast('success', `已下载 ${data.count} 个日程事件`);
      } else if (data.type === 'links') {
        showToast('success', `已生成 ${data.count} 个日历链接`);
      }
    },
    onError: (error) => {
      showToast('error', error instanceof Error ? error.message : '导出失败');
    },
  });

  const detectConflictsMutation = useMutation({
    mutationFn: async () => {
      if (!canExport) throw new Error('请先完成路径优化');
      
      const calendarMapper = new CalendarMapper();
      const events = calendarMapper.mapTripToEvents(currentTrip!);
      const conflicts = calendarMapper.detectConflicts(events, []);
      
      return conflicts;
    },
    onSuccess: (conflicts) => {
      if (conflicts.length === 0) {
        showToast('success', '✓ 未检测到日程冲突');
      } else {
        showToast('warning', `检测到 ${conflicts.length} 个日程冲突`);
      }
    },
    onError: (error) => {
      showToast('error', error instanceof Error ? error.message : '冲突检测失败');
    },
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-dark-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              日程同步与导出
            </h3>
            <p className="text-sm text-dark-500 mt-1">
              将行程同步到您的日历应用，随时查看
            </p>
          </div>
          
          <button
            onClick={() => detectConflictsMutation.mutate()}
            disabled={!canExport || detectConflictsMutation.isPending}
            className="px-4 py-2 text-sm bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            检测冲突
          </button>
        </div>

        {!canExport ? (
          <div className="text-center py-12 bg-dark-50 rounded-2xl">
            <div className="w-16 h-16 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-dark-400" />
            </div>
            <p className="text-dark-500 mb-2">暂无可用日程</p>
            <p className="text-sm text-dark-400">
              请先创建行程并完成路径优化
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedFormat === format.id
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-dark-100 hover:border-primary-200 hover:bg-dark-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${format.color} flex items-center justify-center mb-3 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className={`font-semibold mb-1 ${selectedFormat === format.id ? 'text-primary-700' : 'text-dark-700'}`}>
                      {format.name}
                    </h4>
                    <p className="text-xs text-dark-500">{format.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-dark-50 rounded-xl space-y-4 mb-6">
              <h4 className="font-semibold text-dark-700">导出选项</h4>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTravel}
                  onChange={(e) => setIncludeTravel(e.target.checked)}
                  className="w-5 h-5 rounded border-dark-300 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-dark-700">包含交通时间</p>
                  <p className="text-xs text-dark-500">将路段交通时间作为单独事件导出</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReminders}
                  onChange={(e) => setIncludeReminders(e.target.checked)}
                  className="w-5 h-5 rounded border-dark-300 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-dark-700">添加提醒</p>
                  <p className="text-xs text-dark-500">每个事件前 15 分钟提醒</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{dailyItineraries.length}</p>
                <p className="text-xs text-blue-700">旅行天数</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <MapPin className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {dailyItineraries.reduce((sum, d) => sum + d.activities.filter(a => a.type === 'visit').length, 0)}
                </p>
                <p className="text-xs text-green-700">游览景点</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl text-center">
                <Clock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">
                  {dailyItineraries.reduce((sum, d) => sum + d.activities.length, 0)}
                </p>
                <p className="text-xs text-purple-700">日程事件</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <CheckCircle2 className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-600">
                  {format(currentTrip.startDate, 'MM/dd', { locale: zhCN })}
                </p>
                <p className="text-xs text-amber-700">开始日期</p>
              </div>
            </div>

            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg"
            >
              {exportMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  正在生成...
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  导出 {exportFormats.find(f => f.id === selectedFormat)?.name}
                </>
              )}
            </button>
          </>
        )}
      </div>

      {exportMutation.data?.type === 'links' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h4 className="font-semibold text-dark-700 mb-4">生成的日历链接</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(exportMutation.data.urls || []).slice(0, 10).map((item: any) => (
              <div
                key={item.eventId}
                className="flex items-center justify-between p-3 bg-dark-50 rounded-xl hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-dark-700 truncate flex-1 mr-4">{item.name}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors flex-shrink-0"
                >
                  添加
                </a>
              </div>
            ))}
            {(exportMutation.data.urls || []).length > 10 && (
              <p className="text-center text-sm text-dark-500 py-2">
                还有 {(exportMutation.data.urls || []).length - 10} 个链接...
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
