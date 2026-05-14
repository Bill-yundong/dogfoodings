import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-spin">⚙️</div>
        <h2 className="text-xl text-gray-400">系统初始化中...</h2>
      </div>
    </div>
  );
};

export default LoadingScreen;
