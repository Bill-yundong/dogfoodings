'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Download, Share2, CheckCircle2, AlertCircle,
  Clock, MapPin, Users, Settings, ChevronRight,
  Globe, Mail, Apple, Download as DownloadIcon
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { CalendarExportPanel } from '@/components/calendar/export-panel';
import { useTripStore, useUIStore } from '@/lib/store';
import { CalendarMapper } from '@/lib/mappers/calendar-mapper';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function CalendarPage() {
  const { currentTrip, dailyItineraries, selectedResult } = useTripStore();
  const { showToast } = useUIStore();
  const [exportFormat, setExportFormat] = useState<'ical' | 'google' | 'outlook'>('ical');

  const calendarMapper = new CalendarMapper();
  const events = currentTrip && dailyItineraries.length > 0
    ? calendarMapper.mapTripToEvents(currentTrip)
    : [];

  const conflicts = events.length > 0 ? calendarMapper.detectConflicts(events, []) : [];

  const handleDownloadICal = () => {
    if (events.length === 0 || !currentTrip) {
      showToast('error', '请先完成路径优化并生成日程');
      return;
    }
    calendarMapper.downloadICal(currentTrip, `${currentTrip?.name || '行程'}.ics`);
    showToast('success', `已下载 ${events.length} 个日程事件`);
  };

  const calendarServices = [
    {
      id: 'apple',
      name: 'Apple 日历',
      icon: Apple,
      color: 'from-gray-700 to-gray-900',
      description: '适用于 macOS、iOS、iPadOS',
      action: '下载 iCal 文件后双击导入',
    },
    {
      id: 'google',
      name: 'Google 日历',
      icon: Globe,
      color: 'from-red-500 to-yellow-500',
      description: '网页版和移动应用',
      action: '通过链接逐个添加',
    },
    {
      id: 'outlook',
      name: 'Outlook',
      icon: Mail,
      color: 'from-blue-600 to-blue-800',
      description: '微软邮箱日历',
      action: '导入 iCal 文件',
    },
  ];

  const upcomingEvents = events.slice(0, 5);

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-dark-800">
              日程同步
            </h1>
            <p className="text-dark-500 mt-1">
              将行程同步到您的日历应用，随时查看和提醒
            </p>
          </div>
          
          <button
            onClick={handleDownloadICal}
            disabled={events.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            下载 iCal 文件
          </button>
        </div>

        {conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800">检测到 {conflicts.length} 个日程冲突</h4>
              <p className="text-sm text-amber-700 mt-1">
                以下时间段存在重叠，请检查调整：
              </p>
              <div className="mt-2 space-y-1">
                {conflicts.map((conflict, index) => (
                  <p key={index} className="text-sm text-amber-600">
                    • {conflict.event1?.summary || '未知事件'} 与 {conflict.event2?.summary || '未知事件'} 
                    ({conflict.event1?.start ? format(new Date(conflict.event1.start), 'HH:mm', { locale: zhCN }) : '--:--'} - 
                    {conflict.event1?.end ? format(new Date(conflict.event1.end), 'HH:mm', { locale: zhCN }) : '--:--'})
                  </p>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                同步到日历服务
              </h3>
              
              <div className="grid md:grid-cols-3 gap-4">
                {calendarServices.map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-2xl border-2 border-dark-100 hover:border-primary-200 transition-all group"
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="font-bold text-dark-800 mb-1">{service.name}</h4>
                      <p className="text-sm text-dark-500 mb-3">{service.description}</p>
                      <p className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-lg inline-block">
                        {service.action}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <CalendarExportPanel />

            {upcomingEvents.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  即将到来的行程
                </h3>
                
                <div className="space-y-3">
                  {upcomingEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-dark-50 hover:bg-primary-50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex flex-col items-center justify-center text-white flex-shrink-0">
                        <span className="text-xs opacity-80">
                          {format(new Date(event.start), 'MMM', { locale: zhCN })}
                        </span>
                        <span className="text-lg font-bold -mt-1">
                          {format(new Date(event.start), 'd')}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark-800 truncate">{event.summary}</h4>
                        <p className="text-sm text-dark-500 truncate">{event.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.start), 'HH:mm', { locale: zhCN })} - 
                            {format(new Date(event.end), 'HH:mm', { locale: zhCN })}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-dark-300" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">同步统计</h3>
                  <p className="text-sm text-white/80">当前行程数据</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-3xl font-bold">{events.length}</p>
                  <p className="text-sm text-white/80">日程事件</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-3xl font-bold">{dailyItineraries.length}</p>
                  <p className="text-sm text-white/80">旅行天数</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-3xl font-bold">
                    {events.filter(e => e.summary.includes('游览')).length}
                  </p>
                  <p className="text-sm text-white/80">游览景点</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-3xl font-bold">
                    {events.filter(e => e.summary.includes('交通')).length}
                  </p>
                  <p className="text-sm text-white/80">交通路段</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary-500" />
                导出选项
              </h3>
              
              <div className="space-y-3">
                {[
                  { id: 'ical', name: 'iCal 格式', desc: '通用格式，兼容性最好', icon: DownloadIcon },
                  { id: 'google', name: 'Google 日历', desc: '生成添加链接', icon: Globe },
                  { id: 'outlook', name: 'Outlook', desc: '微软生态支持', icon: Mail },
                ].map((format) => {
                  const Icon = format.icon;
                  return (
                    <button
                      key={format.id}
                      onClick={() => setExportFormat(format.id as any)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        exportFormat === format.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-dark-100 hover:border-primary-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        exportFormat === format.id ? 'bg-primary-500 text-white' : 'bg-dark-100 text-dark-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${exportFormat === format.id ? 'text-primary-700' : 'text-dark-700'}`}>
                          {format.name}
                        </p>
                        <p className="text-xs text-dark-500">{format.desc}</p>
                      </div>
                      {exportFormat === format.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent-500" />
                分享行程
              </h3>
              
              <p className="text-sm text-dark-500 mb-4">
                将您的行程分享给朋友或家人，一起规划完美旅程。
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (!currentTrip) {
                      showToast('error', '请先选择一个行程');
                      return;
                    }
                    const shareUrl = `${window.location.origin}/share/${currentTrip.id}`;
                    navigator.clipboard.writeText(shareUrl);
                    showToast('success', '分享链接已复制到剪贴板');
                  }}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  复制分享链接
                </button>
                
                <button
                  onClick={() => {
                    if (!currentTrip || dailyItineraries.length === 0) {
                      showToast('error', '请先完成路径优化');
                      return;
                    }
                    const text = `${currentTrip.name}\n${format(currentTrip.startDate, 'yyyy年MM月dd日', { locale: zhCN })} - ${format(currentTrip.endDate, 'yyyy年MM月dd日', { locale: zhCN })}\n共 ${dailyItineraries.length} 天，${events.length} 个行程`;
                    navigator.clipboard.writeText(text);
                    showToast('success', '行程信息已复制');
                  }}
                  className="w-full px-6 py-3 bg-dark-100 text-dark-700 font-medium rounded-xl hover:bg-dark-200 transition-colors flex items-center justify-center gap-2"
                >
                  复制文本简介
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
