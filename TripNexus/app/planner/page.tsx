'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/page-container';
import { LocationInput } from '@/components/trip/location-input';
import { OptimizationPanel } from '@/components/trip/optimization-panel';
import { RouteVisualizer } from '@/components/map/route-visualizer';
import { CalendarExportPanel } from '@/components/calendar/export-panel';
import { ItineraryTimeline } from '@/components/trip/itinerary-timeline';
import { useTripStore, useUIStore } from '@/lib/store';
import { Map, Calendar, Clock, DollarSign, Route } from 'lucide-react';

export default function PlannerPage() {
  const { selectedResult, dailyItineraries, generateDailyItineraries, currentTrip } = useTripStore();
  const { showToast, activeTab, setActiveTab } = useUIStore();
  const [showExportPanel, setShowExportPanel] = useState(false);

  const handleOptimize = () => {
    if (currentTrip) {
      const itineraries = generateDailyItineraries();
      if (itineraries.length > 0) {
        showToast('success', `已生成 ${itineraries.length} 天的行程安排`);
      }
    }
  };

  const tabs = [
    { id: 'map', label: '地图视图', icon: Map },
    { id: 'itinerary', label: '日程安排', icon: Calendar },
    { id: 'export', label: '导出同步', icon: Route },
  ];

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-dark-800">
              智能路径规划
            </h1>
            <p className="text-dark-500 mt-1">
              添加目的地，选择优化算法，生成最优旅行路线
            </p>
          </div>
          
          {selectedResult && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-card">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
                <Route className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">
                  {(selectedResult.totalDistance / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-lg">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">
                  {Math.round(selectedResult.totalTime / 60)} h
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">
                  ¥{selectedResult.totalCost?.toFixed(0) || '0'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <LocationInput />
            <OptimizationPanel onOptimize={handleOptimize} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-2 p-1 bg-white rounded-xl shadow-card">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-primary text-white shadow-md'
                        : 'text-dark-600 hover:bg-dark-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'map' && (
                <RouteVisualizer height="600px" />
              )}
              
              {activeTab === 'itinerary' && (
                <ItineraryTimeline />
              )}
              
              {activeTab === 'export' && (
                <CalendarExportPanel />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
