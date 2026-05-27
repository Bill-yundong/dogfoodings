'use client';

import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generateThermalBalanceHistory } from '@/lib/mock-data';
import { useMemo } from 'react';

export default function ThermalBalanceChart() {
  const data = useMemo(() => {
    const history = generateThermalBalanceHistory('demo', 12);
    return history.map((record) => ({
      month: new Date(record.timestamp).toLocaleDateString('zh-CN', { month: 'short' }),
      balance: record.balanceValue,
      efficiency: record.efficiency,
      temp: record.groundTemp,
    }));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-6">热平衡趋势</h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#14B8A6"
              strokeWidth={2}
              name="热平衡值"
              dot={{ fill: '#14B8A6' }}
            />
            <Line
              type="monotone"
              dataKey="efficiency"
              stroke="#F97316"
              strokeWidth={2}
              name="效率 (%)"
              dot={{ fill: '#F97316' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
