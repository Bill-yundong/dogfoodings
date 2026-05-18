import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Search, Filter, ArrowRight, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import useWMSStore from '../../store/useWMSStore';
import { Location, SKU } from '../../types';

interface LocationCellProps {
  location: Location;
  isSelected: boolean;
  isRecommended: boolean;
  onClick: () => void;
  sku?: SKU;
}

function LocationCell({ location, isSelected, isRecommended, onClick, sku }: LocationCellProps) {
  const getStatusColor = () => {
    if (location.status === 'occupied') return 'bg-accent-green/80';
    if (location.status === 'empty') return 'bg-surface-hover';
    if (location.status === 'reserved') return 'bg-accent-amber/80';
    if (location.status === 'defective') return 'bg-accent-red/80';
    return 'bg-surface-hover';
  };

  const getHeatColor = () => {
    const colors = [
      'from-slate-700 to-slate-600',
      'from-blue-900 to-blue-800',
      'from-cyan-900 to-cyan-800',
      'from-teal-900 to-teal-800',
      'from-amber-900 to-amber-800',
      'from-red-900 to-red-800'
    ];
    return colors[Math.min(location.heatLevel, colors.length - 1)];
  };

  return (
    <motion.div
      whileHover={{ scale: 1.1, zIndex: 10 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative w-full aspect-square rounded cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      } ${isRecommended ? 'ring-2 ring-accent-amber animate-pulse' : ''}`}
    >
      <div className={`w-full h-full rounded bg-gradient-to-br ${getHeatColor()} ${getStatusColor()} 
        flex items-center justify-center text-xs font-mono
        ${location.status === 'occupied' ? 'text-white' : 'text-text-muted'}`}
      >
        {location.status === 'occupied' ? (
          <Package className="w-3 h-3" />
        ) : (
          <span>{location.level}</span>
        )}
      </div>
      {sku && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-1 py-0.5 bg-background rounded text-[8px] text-text-muted whitespace-nowrap max-w-full overflow-hidden">
          {sku.name.slice(0, 6)}
        </div>
      )}
    </motion.div>
  );
}

function LocationDetail({ location, sku, onClose }: { location: Location; sku?: SKU; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-surface rounded-xl border border-surface-border p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">货位详情</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">货位编号</span>
          <span className="text-text-primary font-mono">{location.id}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">位置</span>
          <span className="text-text-primary">排 {location.row} 列 {location.col} 层 {location.level}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">状态</span>
          <span className={`px-2 py-0.5 rounded text-xs ${
            location.status === 'occupied' ? 'bg-accent-green/20 text-accent-green' :
            location.status === 'empty' ? 'bg-primary/20 text-primary' :
            location.status === 'reserved' ? 'bg-accent-amber/20 text-accent-amber' :
            'bg-accent-red/20 text-accent-red'
          }`}>
            {location.status === 'occupied' ? '已占用' : 
             location.status === 'empty' ? '空闲' :
             location.status === 'reserved' ? '已预留' : '故障'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">热度等级</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(level => (
              <div
                key={level}
                className={`w-2 h-2 rounded-full ${
                  level <= location.heatLevel ? 'bg-accent-amber' : 'bg-surface-hover'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">容量</span>
          <span className="text-text-primary font-mono">{location.usedCapacity}/{location.capacity}</span>
        </div>
        {sku && (
          <>
            <div className="border-t border-surface-border pt-3 mt-3">
              <p className="text-xs text-text-muted mb-2">存储商品</p>
              <div className="bg-background rounded-lg p-3">
                <p className="text-sm font-medium text-text-primary">{sku.name}</p>
                <p className="text-xs text-text-muted font-mono mt-1">{sku.id}</p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                    {sku.category}
                  </span>
                  <span className="px-2 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded">
                    热度 {sku.heatLevel}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function InboundForm({ onSubmit }: { onSubmit: (skuId: string, locationId: string) => void }) {
  const { skus, allocationRecommendations, allocateLocation, selectedSKUId, setSelectedSKUId } = useWMSStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSKUs = useMemo(() => {
    if (!searchTerm) return skus.slice(0, 50);
    return skus.filter(s => 
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 50);
  }, [skus, searchTerm]);

  const recommendations = selectedSKUId ? allocationRecommendations.get(selectedSKUId) : null;
  const selectedSKU = selectedSKUId ? skus.find(s => s.id === selectedSKUId) : null;

  const handleSKUSelect = (skuId: string) => {
    setSelectedSKUId(skuId);
    allocateLocation(skuId);
  };

  const handleConfirm = (locationId: string) => {
    if (selectedSKUId) {
      onSubmit(selectedSKUId, locationId);
      setSelectedSKUId(null);
      setSearchTerm('');
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
      <div className="p-4 border-b border-surface-border">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent-amber" />
          智能入库作业
        </h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-sm text-text-muted block mb-2">搜索 SKU</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="输入 SKU 编号或名称..."
              className="w-full bg-background border border-surface-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {filteredSKUs.length > 0 && !selectedSKUId && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredSKUs.map(sku => (
              <motion.div
                key={sku.id}
                whileHover={{ x: 4 }}
                onClick={() => handleSKUSelect(sku.id)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">{sku.name}</p>
                    <p className="text-xs text-text-muted font-mono">{sku.id}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted" />
              </motion.div>
            ))}
          </div>
        )}

        {selectedSKU && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{selectedSKU.name}</span>
                  <span className="text-xs font-mono text-text-muted">{selectedSKU.id}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-primary/20 text-primary rounded">
                    {selectedSKU.category}
                  </span>
                  <span className="px-2 py-0.5 bg-accent-amber/20 text-accent-amber rounded">
                    热度 {selectedSKU.heatLevel}
                  </span>
                  <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green rounded">
                    流动性 {selectedSKU.liquidityScore.toFixed(0)}
                  </span>
                </div>
              </div>

              {recommendations && recommendations.length > 0 ? (
                <div>
                  <p className="text-sm text-text-muted mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-green" />
                    智能推荐货位（按评分排序）
                  </p>
                  <div className="space-y-2">
                    {recommendations.map((rec, index) => (
                      <motion.div
                        key={rec.locationId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-background rounded-lg p-3 border border-surface-border hover:border-primary transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-mono text-text-primary">{rec.locationId}</span>
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {(rec.score * 100).toFixed(0)}分
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                          <div className="text-center">
                            <p className="text-text-muted">热度匹配</p>
                            <p className="text-text-primary">{(rec.heatMatch * 100).toFixed(0)}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-text-muted">关联度</p>
                            <p className="text-text-primary">{(rec.associationMatch * 100).toFixed(0)}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-text-muted">空间效率</p>
                            <p className="text-text-primary">{(rec.spaceEfficiency * 100).toFixed(0)}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-text-muted">路径成本</p>
                            <p className="text-text-primary">{(rec.pathCost * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.reasons.map((reason, i) => (
                            <span key={i} className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber text-xs rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleConfirm(rec.locationId)}
                          className="w-full py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          确认入库到此货位
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>暂无可用货位推荐</p>
                </div>
              )}

              <button
                onClick={() => setSelectedSKUId(null)}
                className="w-full py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                重新选择 SKU
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default function LocationPage() {
  const { locations, skus, selectedLocationId, setSelectedLocationId, createInboundTask } = useWMSStore();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const selectedLocation = selectedLocationId ? locations.find(l => l.id === selectedLocationId) : undefined;
  const selectedSKU = selectedLocation?.skuId ? skus.find(s => s.id === selectedLocation.skuId) : undefined;

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (loc.level !== selectedLevel) return false;
      if (filterStatus !== 'all' && loc.status !== filterStatus) return false;
      return true;
    });
  }, [locations, selectedLevel, filterStatus]);

  const rows = Math.max(...filteredLocations.map(l => l.row));
  const cols = Math.max(...filteredLocations.map(l => l.col));

  const handleInboundSubmit = async (skuId: string, locationId: string) => {
    const task = await createInboundTask(skuId, locationId);
    if (task) {
      setSelectedLocationId(locationId);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">货位矩阵视图</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">楼层</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        selectedLevel === level
                          ? 'bg-primary text-white'
                          : 'bg-background text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {level}F
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-muted" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-background border border-surface-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="all">全部状态</option>
                  <option value="empty">空闲</option>
                  <option value="occupied">已占用</option>
                  <option value="reserved">已预留</option>
                  <option value="defective">故障</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-4 overflow-auto">
            <div 
              className="grid gap-1 min-w-max"
              style={{ 
                gridTemplateColumns: `repeat(${cols}, minmax(32px, 40px))`,
              }}
            >
              {Array.from({ length: rows }).map((_, rowIdx) => (
                Array.from({ length: cols }).map((_, colIdx) => {
                  const location = filteredLocations.find(
                    l => l.row === rowIdx + 1 && l.col === colIdx + 1
                  );
                  if (!location) return <div key={`${rowIdx}-${colIdx}`} className="aspect-square" />;
                  
                  const locationSKU = location.skuId ? skus.find(s => s.id === location.skuId) : undefined;
                  
                  return (
                    <LocationCell
                      key={location.id}
                      location={location}
                      isSelected={selectedLocationId === location.id}
                      isRecommended={false}
                      onClick={() => setSelectedLocationId(location.id)}
                      sku={locationSKU}
                    />
                  );
                })
              )).flat()}
            </div>
          </div>

          <div className="p-4 border-t border-surface-border">
            <div className="flex items-center justify-center gap-6 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-accent-green/80" />
                已占用
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-surface-hover" />
                空闲
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-accent-amber/80" />
                已预留
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-accent-red/80" />
                故障
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <p className="text-text-muted text-sm mb-1">空闲货位</p>
            <p className="text-2xl font-bold text-primary font-mono">
              {locations.filter(l => l.status === 'empty').length}
            </p>
          </div>
          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <p className="text-text-muted text-sm mb-1">已占用</p>
            <p className="text-2xl font-bold text-accent-green font-mono">
              {locations.filter(l => l.status === 'occupied').length}
            </p>
          </div>
          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <p className="text-text-muted text-sm mb-1">已预留</p>
            <p className="text-2xl font-bold text-accent-amber font-mono">
              {locations.filter(l => l.status === 'reserved').length}
            </p>
          </div>
          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <p className="text-text-muted text-sm mb-1">故障</p>
            <p className="text-2xl font-bold text-accent-red font-mono">
              {locations.filter(l => l.status === 'defective').length}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <InboundForm onSubmit={handleInboundSubmit} />
        
        <AnimatePresence>
          {selectedLocation && (
            <LocationDetail
              location={selectedLocation}
              sku={selectedSKU}
              onClose={() => setSelectedLocationId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
