import React, { useState, useMemo } from 'react';
import { Bell, Search, User, X, Package, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { formatDate, formatRelativeTime } from '@/utils/formatters';
import type { SKU, Location } from '@/types';

interface HeaderProps {
  title: string;
}

interface SearchResult {
  type: 'sku' | 'location';
  item: SKU | Location;
  title: string;
  subtitle: string;
  path: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  const { lastUpdate, alerts, markAlertRead, skus, locations } = useWarehouseStore();
  const [showAlerts, setShowAlerts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const unreadCount = alerts.filter((a) => !a.read).length;

  const recentAlerts = alerts.slice(0, 5);

  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    const matchedSkus = skus
      .filter(
        (sku) =>
          sku.id.toLowerCase().includes(query) ||
          sku.name.toLowerCase().includes(query) ||
          sku.category.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .map((sku) => ({
        type: 'sku' as const,
        item: sku,
        title: sku.name,
        subtitle: `${sku.id} · ${sku.category} · 库存: ${sku.totalStock}${sku.unit}`,
        path: '/sku',
      }));

    const matchedLocations = locations
      .filter(
        (loc) =>
          loc.id.toLowerCase().includes(query) ||
          `巷道${loc.aisle}`.includes(query) ||
          `货架${loc.rack}`.includes(query)
      )
      .slice(0, 5)
      .map((loc) => ({
        type: 'location' as const,
        item: loc,
        title: loc.id,
        subtitle: `巷道${loc.aisle} · 货架${loc.rack} · 层级${loc.level} · ${loc.status === 'occupied' ? '已占用' : loc.status === 'empty' ? '空闲' : '预留'}`,
        path: '/space',
      }));

    results.push(...matchedSkus, ...matchedLocations);
    return results.slice(0, 8);
  }, [searchQuery, skus, locations]);

  const handleSearchFocus = () => {
    setShowSearchResults(true);
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowSearchResults(false), 200);
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setShowSearchResults(false);
    navigate(result.path);
  };

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="搜索 SKU、货位..."
            className="w-64 pl-9 pr-4 py-2 bg-wms-bg border border-wms-border rounded-lg text-sm text-wms-text placeholder-wms-subtext focus:outline-none focus:border-wms-primary focus:ring-1 focus:ring-wms-primary transition-colors"
          />

          {showSearchResults && (searchQuery.trim() || searchResults.length > 0) && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-wms-panel border border-wms-border rounded-xl shadow-2xl z-50 overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-wms-subtext text-sm">
                  {searchQuery.trim() ? '未找到匹配结果' : '输入关键词搜索 SKU 或货位'}
                </div>
              ) : (
                <div className="py-2">
                  <div className="px-4 py-1.5 text-xs text-wms-subtext font-medium uppercase tracking-wider">
                    搜索结果 ({searchResults.length})
                  </div>
                  {searchResults.map((result, idx) => (
                    <button
                      key={`${result.type}-${idx}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-wms-bg/50 transition-colors text-left"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          result.type === 'sku'
                            ? 'bg-wms-primary/10 text-wms-primary'
                            : 'bg-wms-accent/10 text-wms-accent'
                        }`}
                      >
                        {result.type === 'sku' ? (
                          <Package className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-wms-text truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-wms-subtext truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-wms-subtext flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => alerts.forEach((a) => markAlertRead(a.id))}
                      className="text-xs text-wms-primary hover:underline"
                    >
                      全部已读
                    </button>
                  )}
                  <button onClick={() => setShowAlerts(false)} className="text-wms-subtext hover:text-wms-text">
                    <X className="w-4 h-4" />
                  </button>
                </div>
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
                          <p className="text-xs text-wms-subtext mt-1">
                            {formatRelativeTime(alert.timestamp)}
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
