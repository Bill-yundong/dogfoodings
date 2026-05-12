import { Component, For } from 'solid-js';
import { energyStore } from '../store/energyStore';

export const StationList: Component = () => {
  const { stations, toggleStationStatus, syncStatuses } = energyStore;

  const getSyncStatus = (stationId: string) => {
    return syncStatuses().find(s => s.stationId === stationId);
  };

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">能源站状态</h3>
      <div class="space-y-4">
        <For each={stations()}>
          {(station) => {
            const syncStatus = getSyncStatus(station.id);
            const utilization = {
              cooling: (station.currentOutput.cooling / Math.max(station.capacity.cooling, 1)) * 100,
              heating: (station.currentOutput.heating / Math.max(station.capacity.heating, 1)) * 100,
              electricity: (station.currentOutput.electricity / Math.max(station.capacity.electricity, 1)) * 100,
            };

            return (
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                  <div class="flex items-center space-x-2">
                    <span class={`w-3 h-3 rounded-full ${station.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span class="font-medium text-gray-800">{station.name}</span>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span class={`text-xs px-2 py-1 rounded ${
                      syncStatus?.status === 'synced' ? 'bg-green-100 text-green-700' :
                      syncStatus?.status === 'syncing' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {syncStatus?.status === 'synced' ? '已同步' : syncStatus?.status === 'syncing' ? '同步中' : '错误'}
                      {syncStatus && ` (${syncStatus.latency}ms)`}
                    </span>
                    <button
                      onClick={() => toggleStationStatus(station.id)}
                      class={`text-xs px-3 py-1 rounded transition-colors ${
                        station.status === 'online'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {station.status === 'online' ? '下线' : '上线'}
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  {(['cooling', 'heating', 'electricity'] as const).map(type => {
                    const labels = { cooling: '制冷', heating: '供热', electricity: '电力' };
                    const colors = { cooling: 'bg-blue-500', heating: 'bg-red-500', electricity: 'bg-yellow-500' };
                    
                    return (
                      <div class="space-y-1">
                        <div class="flex justify-between text-xs text-gray-600">
                          <span>{labels[type]}</span>
                          <span>{station.currentOutput[type].toFixed(0)}/{station.capacity[type]} kW</span>
                        </div>
                        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            class={`h-full ${colors[type]} transition-all duration-300`}
                            style={{ width: `${Math.min(100, utilization[type])}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span>效率: 冷 {(station.efficiency.cooling * 100).toFixed(1)}% | 热 {(station.efficiency.heating * 100).toFixed(1)}% | 电 {(station.efficiency.electricity * 100).toFixed(1)}%</span>
                  <span>位置: {station.location.lat.toFixed(2)}, {station.location.lng.toFixed(2)}</span>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};
