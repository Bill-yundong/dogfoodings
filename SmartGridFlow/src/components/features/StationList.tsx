import { Component, For } from 'solid-js';
import { Card } from '../shared/Card';
import { ProgressBar } from '../shared/ProgressBar';
import { useEnergyStore } from '../../store/useEnergyStore';
import { ENERGY_TYPE_LABELS, SYNC_STATUS_LABELS } from '../../domain/constants/energy';

export const StationList: Component = () => {
  const { stations, toggleStationStatus, syncStatuses } = useEnergyStore();

  const getSyncStatus = (stationId: string) => {
    return syncStatuses().find((s) => s.stationId === stationId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'text-green-700 bg-green-100';
      case 'syncing':
        return 'text-yellow-700 bg-yellow-100';
      default:
        return 'text-red-700 bg-red-100';
    }
  };

  return (
    <Card title="能源站状态">
      <div class="space-y-4">
        <For each={stations()}>
          {(station) => {
            const syncStatus = getSyncStatus(station.id);

            return (
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                  <div class="flex items-center space-x-2">
                    <span
                      class={`w-3 h-3 rounded-full ${
                        station.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span class="font-medium text-gray-800">{station.name}</span>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span
                      class={`text-xs px-2 py-1 rounded ${getStatusColor(syncStatus?.status || 'error')}`}
                    >
                      {SYNC_STATUS_LABELS[syncStatus?.status || 'error']}
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
                  {(['cooling', 'heating', 'electricity'] as const).map((type) => {
                    const colors = { cooling: 'blue', heating: 'red', electricity: 'yellow' } as const;

                    return (
                      <div class="space-y-1">
                        <div class="flex justify-between text-xs text-gray-600">
                          <span>{ENERGY_TYPE_LABELS[type]}</span>
                          <span>
                            {station.currentOutput[type].toFixed(0)}/{station.capacity[type]} kW
                          </span>
                        </div>
                        <ProgressBar
                          value={station.currentOutput[type]}
                          max={station.capacity[type]}
                          color={colors[type]}
                          height="6px"
                        />
                      </div>
                    );
                  })}
                </div>

                <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span>
                    效率: 冷 {(station.efficiency.cooling * 100).toFixed(1)}% | 热{' '}
                    {(station.efficiency.heating * 100).toFixed(1)}% | 电{' '}
                    {(station.efficiency.electricity * 100).toFixed(1)}%
                  </span>
                  <span>
                    位置: {station.location.lat.toFixed(2)}, {station.location.lng.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </Card>
  );
};
