import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-blue-800 text-white py-6 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold">港口避风锚地船舶运力协同系统</h1>
        <p className="text-blue-200 mt-1">走锚风险监控与台风应急协同平台</p>
      </div>
    </header>
  );
};
