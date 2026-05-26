import { Bell, User, Clock, Wifi } from 'lucide-react';
import { formatDateTime } from '@/utils/format';
import { useState, useEffect } from 'react';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 bg-space-blue/60 backdrop-blur-md border-b border-electric-blue/20 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-electric-blue">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{formatDateTime(currentTime)}</span>
        </div>
        <div className="h-4 w-px bg-electric-blue/20"></div>
        <div className="flex items-center gap-2 text-status-green">
          <Wifi className="w-4 h-4" />
          <span className="text-xs">实时连接</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-metal-gray hover:text-electric-blue transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-alert-orange rounded-full"></span>
        </button>
        <div className="h-6 w-px bg-electric-blue/20"></div>
        <button className="flex items-center gap-2 text-metal-gray hover:text-white transition-colors">
          <div className="w-8 h-8 rounded-full bg-electric-blue/20 flex items-center justify-center">
            <User className="w-4 h-4 text-electric-blue" />
          </div>
          <span className="text-sm">管理员</span>
        </button>
      </div>
    </header>
  );
}
