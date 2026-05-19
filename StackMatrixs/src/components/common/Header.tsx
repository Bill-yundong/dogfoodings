import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { formatDate } from '@/utils/formatters';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { lastUpdate, alerts, markAlertRead } = useWarehouseStore();
  const [showAlerts, setShowAlerts] = React.useState(false);
  const unreadCount = alerts.filter((a) => !a.read).length;

  const recentAlerts = alerts.slice(0, 5);

  return (
    <header className="h-16 bg-wms-panel/80 backdrop-blur-sm border-b border-wms-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-display font-bold text-wms-text">{title}</h1>
        <span className="text-xs text-wms-subtext">
          最后更新: {formatDate(lastUpdate)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wms-subtext" />
          <input
            type="text"
            placeholder="搜索 SKU、货位..."
            className="w-64 pl-9 pr-4 py-2 bg-wms-bg border border-wms-border rounded-lg text-sm text-wms-text placeholder-wms-subtext focus:outline-none focus:border-wms-primary transition-colors"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-2 rounded-lg text-wms-subtext hover:text-wms-text hover:bg-wms-bg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-wms-danger text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-wms-panel border border-wms-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-wms-border flex items-center justify-between">
                <h3 className="font-semibold text-wms-text">告警通知</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => alerts.forEach((a) => markAlertRead(a.id))}
                    className="text-xs text-wms-primary hover:underline"
                  >
                    全部已读
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto wms-scrollbar">
                {recentAlerts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-wms-subtext text-sm">
                    暂无告警
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="px-4 py-3 border-b border-wms-border/50 hover:bg-wms-bg/50 cursor-pointer transition-colors"
                      onClick={() => markAlertRead(alert.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            alert.type === 'danger'
                              ? 'bg-wms-danger'
                              : alert.type === 'warning'
                              ? 'bg-wms-warning'
                              : alert.type === 'success'
                              ? 'bg-wms-success'
                              : 'bg-wms-primary'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-wms-text truncate">
                            {alert.title}
                          </p>
                          <p className="text-xs text-wms-subtext mt-0.5 truncate">
                            {alert.message}
                          </p>
                        </div>
                        {!alert.read && (
                          <span className="w-2 h-2 bg-wms-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-4 border-l border-wms-border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wms-primary to-wms-accent flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-wms-text">管理员</p>
            <p className="text-xs text-wms-subtext">系统管理员</p>
          </div>
        </div>
      </div>
    </header>
  );
};
