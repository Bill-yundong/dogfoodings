import React from 'react';

export const FeatureHighlights: React.FC = () => {
  const features = [
    {
      icon: '🧭',
      title: '异步 Dijkstra 算法',
      description: '动态最优路径规划，实时考虑负载和优先级',
      color: 'text-blue-400'
    },
    {
      icon: '⚡',
      title: 'WCS-PLC 毫秒对齐',
      description: '实时指令同步，确保设备响应一致性',
      color: 'text-cyan-400'
    },
    {
      icon: '💾',
      title: 'IndexedDB 快照存储',
      description: '自动持久化系统状态，支持异常回溯与恢复',
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      {features.map((feature, index) => (
        <div
          key={index}
          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center hover:border-gray-600 transition-all"
        >
          <span className="text-3xl block mb-2">{feature.icon}</span>
          <h4 className={`font-semibold ${feature.color} mb-1`}>{feature.title}</h4>
          <p className="text-gray-500 text-xs">{feature.description}</p>
        </div>
      ))}
    </div>
  );
};

export default FeatureHighlights;
