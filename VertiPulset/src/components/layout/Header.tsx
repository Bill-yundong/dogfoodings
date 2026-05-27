import { Bell, User, Clock, Wifi, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { formatDateTime } from '@/utils/format';
import { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { cn } from '@/utils/format';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const { alerts } = useDashboardStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-alert-orange" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-status-green" />;
      default: return <Info className="w-4 h-4 text-electric-blue" />;
    }
  };

  return (
    <header className="h-14 bg-space-blue/60 backdrop-blur-md border-b border-electric-blue/20 flex items-center justify-between px-6 relative z-[90]">
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
        <div className="relative" ref={panelRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-metal-gray hover:text-electric-blue transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-alert-orange rounded-full animate-pulse"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="fixed right-6 top-14 mt-2 w-80 bg-space-blue/95 backdrop-blur-md border border-electric-blue/20 rounded-lg shadow-2xl z-[9999]">
              <div className="flex items-center justify-between p-3 border-b border-electric-blue/20">
                <h3 className="text-sm font-semibold text-white">系统通知</h3>
                <span className="text-xs text-metal-gray">{unreadCount} 条未读</span>
              </div>
              <div className="max-h-96 overflow-auto">
                {alerts.length > 0 ? (
                  alerts.slice(0, 10).map((alert) => (
                    <div 
                      key={alert.id}
                      className={cn(
                        'p-3 border-b border-electric-blue/10 hover:bg-electric-blue/5 transition-colors',
                        !alert.acknowledged && 'bg-electric-blue/10'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{alert.message}</p>
                          <p className="text-xs text-metal-gray mt-1">
                            {formatDateTime(alert.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-metal-gray">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无通知</p>
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-electric-blue/20">
                <button className="w-full text-xs text-electric-blue hover:text-white transition-colors py-1">
                  查看全部通知
                </button>
              </div>
            </div>
          )}
        </div>
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
