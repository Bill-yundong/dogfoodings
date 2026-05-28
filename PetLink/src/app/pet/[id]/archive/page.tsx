'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { usePetLinkStore } from '@/lib/store';
import {
  FileText,
  Calendar,
  Syringe,
  Stethoscope,
  Scissors,
  Download,
  Cloud,
  CloudOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HealthRecord } from '@/types';

export default function ArchivePage({ params }: { params: { id: string } }) {
  const { loadMockData, healthRecords, selectedPet, isOnline } = usePetLinkStore();
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  if (!selectedPet) return null;

  const toggleRecord = (id: string) => {
    setExpandedRecords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'checkup':
        return <Stethoscope className="w-5 h-5" />;
      case 'vaccination':
        return <Syringe className="w-5 h-5" />;
      case 'treatment':
        return <FileText className="w-5 h-5" />;
      case 'surgery':
        return <Scissors className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'checkup':
        return 'bg-blue-50 text-blue-600';
      case 'vaccination':
        return 'bg-green-50 text-green-600';
      case 'treatment':
        return 'bg-purple-50 text-purple-600';
      case 'surgery':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'checkup':
        return '体检';
      case 'vaccination':
        return '疫苗接种';
      case 'treatment':
        return '治疗记录';
      case 'surgery':
        return '手术记录';
      default:
        return '记录';
    }
  };

  const sortedRecords = [...healthRecords].sort((a, b) => b.date - a.date);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="font-poppins text-3xl font-bold text-slate-800">
                健康档案
              </h1>
              <p className="text-slate-500 mt-1">
                {selectedPet.name} 的完整医疗记录
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                isOnline ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {isOnline ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {isOnline ? '已同步' : '离线模式'}
                </span>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" />
                导出档案
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6 mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="font-poppins font-semibold text-lg text-slate-800">
                  档案摘要
                </h2>
                <div className="flex items-center gap-6 mt-2 text-sm text-slate-500">
                  <span>共 {healthRecords.length} 条记录</span>
                  <span>最后更新: {new Date(sortedRecords[0]?.date || Date.now()).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-4">
            {sortedRecords.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <div className="card overflow-hidden">
                  <button
                    onClick={() => toggleRecord(record.id)}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(record.type)}`}>
                        {getTypeIcon(record.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-800">
                            {getTypeName(record.type)}
                          </h3>
                          {!record.synced && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                              待同步
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(record.date).toLocaleDateString('zh-CN')}
                          </span>
                          {record.veterinarianName && (
                            <span>医生: {record.veterinarianName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedRecords.has(record.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedRecords.has(record.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-slate-100 px-5 py-4 bg-slate-50"
                    >
                      <p className="text-slate-700 whitespace-pre-wrap">
                        {record.notes}
                      </p>
                      {record.attachments.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-slate-500 mb-2">附件</p>
                          <div className="flex flex-wrap gap-2">
                            {record.attachments.map((att, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-white rounded-lg text-sm text-slate-600 border border-slate-200"
                              >
                                {att}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
