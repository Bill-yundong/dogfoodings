import React from 'react';

interface TopNavProps {
  title: string;
}

export const TopNav: React.FC<TopNavProps> = ({ title }) => {
  return (
    <header className="top-nav">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-navy-800">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button className="p-2 rounded-lg hover:bg-navy-50 transition-colors">
            <svg className="w-5 h-5 text-navy-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        <button className="p-2 rounded-lg hover:bg-navy-50 transition-colors relative">
          <svg className="w-5 h-5 text-navy-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v3a3 3 0 116 0v-3zM9 17h6" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-risk-critical rounded-full"></span>
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-ocean flex items-center justify-center text-white text-sm font-medium shadow-md">
          管
        </div>
      </div>
    </header>
  );
};
