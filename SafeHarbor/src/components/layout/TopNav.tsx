import React, { useState } from 'react';

interface TopNavProps {
  title: string;
}

export const TopNav: React.FC<TopNavProps> = ({ title }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="top-nav">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-navy-800">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            className="p-2 rounded-lg hover:bg-navy-50 transition-colors"
            onClick={() => {
              setShowSearch(!showSearch);
              setShowNotifications(false);
            }}
          >
            <svg className="w-5 h-5 text-navy-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {showSearch && (
            <div className="absolute right-0 top-12 w-72 bg-white rounded-lg shadow-lg border border-navy-100 p-3 z-50 animate-slide-in">
              <input
                type="text"
                placeholder="搜索船舶、锚地..."
                className="w-full px-4 py-2 border border-navy-200 rounded-lg focus:outline-none focus:border-ocean-500"
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="relative">
          <button 
            className="p-2 rounded-lg hover:bg-navy-50 transition-colors relative"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowSearch(false);
            }}
          >
            <svg className="w-5 h-5 text-navy-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v3a3 3 0 116 0v-3zM9 17h6" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-risk-critical rounded-full"></span>
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-navy-100 z-50 animate-slide-in">
              <div className="p-3 border-b border-navy-100">
                <h3 className="font-semibold text-navy-800">通知中心</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="p-3 hover:bg-navy-50 cursor-pointer border-b border-navy-50">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-risk-high mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-navy-700">走锚风险预警</p>
                      <p className="text-xs text-navy-500">东方明珠号风险等级升高</p>
                      <p className="text-xs text-navy-400 mt-1">2分钟前</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 hover:bg-navy-50 cursor-pointer border-b border-navy-50">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-ocean-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-navy-700">气象更新</p>
                      <p className="text-xs text-navy-500">检测到台风预警信号</p>
                      <p className="text-xs text-navy-400 mt-1">15分钟前</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 hover:bg-navy-50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-risk-medium mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-navy-700">系统同步完成</p>
                      <p className="text-xs text-navy-500">所有船舶数据同步成功</p>
                      <p className="text-xs text-navy-400 mt-1">1小时前</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-navy-100">
                <button className="w-full text-sm text-ocean-600 hover:text-ocean-700 font-medium">
                  查看全部通知
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="h-8 w-8 rounded-full bg-gradient-ocean flex items-center justify-center text-white text-sm font-medium shadow-md cursor-pointer hover:shadow-lg transition-shadow">
          管
        </div>
      </div>
    </header>
  );
};
