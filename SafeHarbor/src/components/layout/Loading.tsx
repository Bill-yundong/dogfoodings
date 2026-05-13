import React from 'react';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = '正在加载数据...' }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-xl text-gray-600">{message}</div>
    </div>
  );
};
