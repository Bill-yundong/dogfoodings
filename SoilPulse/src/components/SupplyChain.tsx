'use client';

import { useState } from 'react';
import SupplyChainCoordinator from '@/lib/SupplyChainCoordinator';

export default function SupplyChain() {
  const [suppliers] = useState(SupplyChainCoordinator.getSuppliers());
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [optimizedOrder, setOptimizedOrder] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const runOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      const result = SupplyChainCoordinator.optimizeOrder(
        { nitrogen: 500, phosphorus: 300, potassium: 400, organic: 1000 },
        { lat: 35.0, lng: 115.0 },
        targetDate
      );
      setOptimizedOrder(result);
      setIsOptimizing(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">认证供应商</h3>
              <span className="text-sm text-slate-500">共 {suppliers.length} 家</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className={`p-5 border-2 rounded-2xl cursor-pointer transition-all ${
                    selectedSupplier === supplier.id
                      ? 'border-crop-500 bg-crop-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedSupplier(supplier.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-800">{supplier.name}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">{supplier.location}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-500">★</span>
                      <span className="font-bold text-slate-700">{supplier.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span>📦 起订量: {supplier.minimumOrder} 吨</span>
                    <span>🚚 配送: {supplier.deliveryDays} 天</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">主营产品</p>
                    <div className="flex flex-wrap gap-2">
                      {supplier.products.map((product) => (
                        <span
                          key={product.id}
                          className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg"
                        >
                          {product.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">库存概览</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-blue-700">2,500</span>
                  <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">kg</span>
                </div>
                <p className="text-sm font-medium text-blue-600">氮肥库存</p>
                <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <p className="text-xs text-blue-500 mt-2">可用约 45 天</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-crop-50 to-crop-100 rounded-2xl border border-crop-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-crop-700">1,800</span>
                  <span className="text-xs bg-crop-200 text-crop-700 px-2 py-1 rounded-full">kg</span>
                </div>
                <p className="text-sm font-medium text-crop-600">磷肥库存</p>
                <div className="mt-3 h-2 bg-crop-200 rounded-full overflow-hidden">
                  <div className="h-full bg-crop-500 rounded-full" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-crop-500 mt-2">可用约 60 天</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-amber-700">2,200</span>
                  <span className="text-xs bg-amber-200 text-amber-700 px-2 py-1 rounded-full">kg</span>
                </div>
                <p className="text-sm font-medium text-amber-600">钾肥库存</p>
                <div className="mt-3 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '55%' }}></div>
                </div>
                <p className="text-xs text-amber-500 mt-2">可用约 55 天</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-orange-700">5,000</span>
                  <span className="text-xs bg-orange-200 text-orange-700 px-2 py-1 rounded-full">kg</span>
                </div>
                <p className="text-sm font-medium text-orange-600">有机肥库存</p>
                <div className="mt-3 h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: '90%' }}></div>
                </div>
                <p className="text-xs text-orange-500 mt-2">可用约 90 天</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">智能补库优化</h3>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">预计需求</span>
                  <span className="text-xs text-slate-400">未来 30 天</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">500 kg</p>
                    <p className="text-xs text-slate-500">氮肥</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-crop-600">300 kg</p>
                    <p className="text-xs text-slate-500">磷肥</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber-600">400 kg</p>
                    <p className="text-xs text-slate-500">钾肥</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-orange-600">1000 kg</p>
                    <p className="text-xs text-slate-500">有机肥</p>
                  </div>
                </div>
              </div>

              <button
                onClick={runOptimization}
                disabled={isOptimizing}
                className={`w-full py-3.5 font-bold rounded-xl transition-all ${
                  isOptimizing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-crop-500 to-crop-600 text-white hover:from-crop-600 hover:to-crop-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isOptimizing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span> 优化计算中...
                  </span>
                ) : (
                  '🎯 一键智能补库'
                )}
              </button>
            </div>
          </div>

          {optimizedOrder && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">优化采购方案</h3>

              <div className="space-y-3 mb-6">
                {optimizedOrder.recommendedOrders.map((order: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-800">{order.supplierName}</p>
                        <p className="text-xs text-slate-500">{order.productName}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        order.productType === 'nitrogen' ? 'bg-blue-100 text-blue-700' :
                        order.productType === 'phosphorus' ? 'bg-crop-100 text-crop-700' :
                        order.productType === 'potassium' ? 'bg-amber-100 text-amber-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {order.productType === 'nitrogen' ? 'N' :
                         order.productType === 'phosphorus' ? 'P' :
                         order.productType === 'potassium' ? 'K' : 'O'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-700">
                        {order.quantity.toFixed(1)} {order.unit}
                      </span>
                      <span className="text-lg font-bold text-crop-600">
                        ¥{order.totalPrice.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">预计送达: {order.deliveryDate.toLocaleDateString()}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">采购总成本</span>
                  <span className="text-2xl font-bold text-slate-800">¥{optimizedOrder.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">预计节省</span>
                  <span className="text-lg font-bold text-crop-600">¥{optimizedOrder.potentialSavings.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">预计送达</span>
                  <span className="font-medium text-slate-700">{optimizedOrder.deliveryTimeline.toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button className="w-full py-3 bg-gradient-to-r from-crop-500 to-crop-600 text-white font-bold rounded-xl hover:from-crop-600 hover:to-crop-700 transition-all shadow-md">
                  ✅ 确认并生成订单
                </button>
                <button className="w-full py-3 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-all">
                  🔄 重新优化
                </button>
              </div>
            </div>
          )}

          {!optimizedOrder && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
              <div className="text-6xl mb-4 opacity-30">🚚</div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">智能供应链协同</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                基于实时库存、作物需求和供应商数据，智能优化农资采购方案
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
