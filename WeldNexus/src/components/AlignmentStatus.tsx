'use client';

import { CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { AlignmentStatus as AlignmentStatusType } from '@/types/welding';

interface AlignmentStatusProps {
  status: AlignmentStatusType;
  confidence: number;
}

export function AlignmentStatus({ status, confidence }: AlignmentStatusProps) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">数据对齐状态</h3>
        {status.synchronized ? (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">已同步</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">未同步</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">延迟</p>
            <p className="text-sm font-medium text-white">{status.latency.toFixed(0)} ms</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">对齐置信度</p>
            <p className="text-sm font-medium text-white">{confidence.toFixed(1)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <div>
            <p className="text-xs text-gray-500">机器人时间戳</p>
            <p className="text-sm font-medium text-white">
              {new Date(status.robotTimestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-500" />
          <div>
            <p className="text-xs text-gray-500">质控时间戳</p>
            <p className="text-sm font-medium text-white">
              {new Date(status.qcTimestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>时间漂移</span>
          <span>{status.drift.toFixed(2)} ms</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              Math.abs(status.drift) < 10 ? 'bg-green-500' : 
              Math.abs(status.drift) < 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, Math.abs(status.drift) * 3 + 10)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
