import React from 'react';
import { FeatureCard } from '../common/FeatureCard';

export const FeatureShowcase: React.FC = () => {
  const features = [
    {
      icon: '🧭',
      title: '异步 Dijkstra 算法',
      description: '动态最优路径规划，实时考虑节点负载和包裹优先级，优化分拣效率',
      color: 'blue' as const
    },
    {
      icon: '⚡',
      title: 'WCS-PLC 毫秒级对齐',
      description: '实时指令同步与状态验证，确保设备响应一致性，降低错误率',
      color: 'cyan' as const
    },
    {
      icon: '💾',
      title: 'IndexedDB 快照缓存',
      description: '自动持久化系统状态，支持异常回溯与快速恢复，保证系统稳定性',
      color: 'purple' as const
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-5 mt-6">
      {features.map((feature, index) => (
        <FeatureCard key={index} {...feature} />
      ))}
    </div>
  );
};

export default FeatureShowcase;
