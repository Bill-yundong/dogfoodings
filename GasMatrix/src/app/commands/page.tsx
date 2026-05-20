'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  X,
  Gauge,
  MapPin,
  User,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useGasMatrixStore } from '@/store';
import { websocketService } from '@/lib/websocket';
import {
  cn,
  formatPressure,
  formatTimestamp,
  getCommandStatusColor,
  getCommandStatusLabel,
  generateId,
} from '@/utils';
import type { Command } from '@/types';

export default function CommandsPage() {
  const { stations, commands, pressureData, addCommand, updateCommandStatus, user } =
    useGasMatrixStore();
  const [showNewCommand, setShowNewCommand] = useState(false);
  const [selectedStation, setSelectedStation] = useState('');
  const [targetPressure, setTargetPressure] = useState(300000);
  const [remark, setRemark] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleSubmitCommand = () => {
    if (!selectedStation || !user) return;

    const newCommand: Command = {
      id: generateId('CMD'),
      stationId: selectedStation,
      targetPressure,
      status: 'pending',
      issuedAt: Date.now(),
      operator: user.name,
      remark,
    };

    addCommand(newCommand);
    websocketService.sendCommand(newCommand);

    setTimeout(() => {
      updateCommandStatus(newCommand.id, 'executing');
    }, 2000);

    setTimeout(() => {
      updateCommandStatus(newCommand.id, 'completed');
    }, 8000);

    setShowNewCommand(false);
    setSelectedStation('');
    setTargetPressure(300000);
    setRemark('');
  };

  const filteredCommands =
    filterStatus === 'all'
      ? commands
      : commands.filter((c) => c.status === filterStatus);

  const getStationName = (stationId: string) => {
    return stations.find((s) => s.id === stationId)?.name || stationId;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">调压指令中心</h1>
            <p className="text-sm text-dark-400 mt-1">下发、追踪和管理调压站指令</p>
          </div>
          <button
            onClick={() => setShowNewCommand(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建指令
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'pending', 'executing', 'completed', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all',
                filterStatus === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              )}
            >
              {status === 'all'
                ? '全部'
                : getCommandStatusLabel(status as Command['status'])}
              <span className="ml-2 text-xs opacity-70">
                ({status === 'all'
                  ? commands.length
                  : commands.filter((c) => c.status === status).length}
                )
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredCommands.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Send className="w-12 h-12 mx-auto mb-3 text-dark-600" />
              <p className="text-dark-500">暂无指令记录</p>
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <motion.div
                key={command.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card-hover p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        command.status === 'completed' && 'bg-success-500/20',
                        command.status === 'executing' && 'bg-primary-500/20',
                        command.status === 'pending' && 'bg-warning-500/20',
                        command.status === 'failed' && 'bg-danger-500/20'
                      )}
                    >
                      {command.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-success-500" />
                      )}
                      {command.status === 'executing' && (
                        <Clock className="w-5 h-5 text-primary-500 animate-pulse" />
                      )}
                      {command.status === 'pending' && (
                        <AlertTriangle className="w-5 h-5 text-warning-500" />
                      )}
                      {command.status === 'failed' && (
                        <XCircle className="w-5 h-5 text-danger-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-dark-100">
                          {getStationName(command.stationId)}
                        </h3>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            getCommandStatusColor(command.status)
                          )}
                        >
                          {getCommandStatusLabel(command.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-dark-400">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-4 h-4" />
                          目标压力：
                          <span className="text-primary-400 font-mono">
                            {formatPressure(command.targetPressure, 'kPa')}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          操作人：{command.operator}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          下发时间：{formatTimestamp(command.issuedAt)}
                        </span>
                      </div>
                      {command.remark && (
                        <p className="mt-2 text-sm text-dark-500">备注：{command.remark}</p>
                      )}
                    </div>
                  </div>
                </div>

                {command.status === 'executing' && (
                  <div className="mt-4">
                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 6, ease: 'linear' }}
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showNewCommand && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
            onClick={() => setShowNewCommand(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-100">新建调压指令</h2>
                <button
                  onClick={() => setShowNewCommand(false)}
                  className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">选择调压站</label>
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="input-field"
                  >
                    <option value="">请选择调压站</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name} - 当前:{' '}
                        {formatPressure(pressureData[station.id] || station.normalPressure, 'kPa')}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStation && (
                  <>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">
                        目标压力：
                        <span className="text-primary-400 font-mono ml-2">
                          {formatPressure(targetPressure, 'kPa')}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={250000}
                        max={350000}
                        step={1000}
                        value={targetPressure}
                        onChange={(e) => setTargetPressure(Number(e.target.value))}
                        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-dark-500 mt-1">
                        <span>250 kPa</span>
                        <span>300 kPa</span>
                        <span>350 kPa</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-dark-300 mb-2">备注（可选）</label>
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="input-field h-24 resize-none"
                        placeholder="请输入指令备注..."
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewCommand(false)}
                    className="flex-1 btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmitCommand}
                    disabled={!selectedStation}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下发指令
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
