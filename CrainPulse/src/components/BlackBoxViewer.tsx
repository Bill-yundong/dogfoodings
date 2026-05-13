import { createSignal, createEffect, For } from 'solid-js';
import { blackBoxStore } from '../utils/blackBoxStore';
import type { BlackBoxRecord } from '../types/crane';

export function BlackBoxViewer() {
  const [records, setRecords] = createSignal<BlackBoxRecord[]>([]);
  const [sessions, setSessions] = createSignal<string[]>([]);
  const [selectedSession, setSelectedSession] = createSignal<string>('');
  const [stats, setStats] = createSignal<{ totalRecords: number; cranes: string[]; sessions: string[] } | null>(null);

  const loadStats = async () => {
    try {
      const s = await blackBoxStore.getStats();
      setStats(s);
      setSessions(s.sessions);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadSessionRecords = async (sessionId: string) => {
    if (!sessionId) {
      setRecords([]);
      return;
    }
    try {
      const recs = await blackBoxStore.getRecordsBySession(sessionId);
      setRecords(recs);
    } catch (error) {
      console.error('Failed to load records:', error);
    }
  };

  const clearAllData = async () => {
    if (confirm('确定要清除所有黑匣子数据吗？')) {
      try {
        await blackBoxStore.clearAll();
        setRecords([]);
        setSessions([]);
        setStats(null);
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    }
  };

  createEffect(() => {
    loadStats();
  });

  createEffect(() => {
    if (selectedSession()) {
      loadSessionRecords(selectedSession());
    }
  });

  return (
    <div class="black-box-viewer bg-white rounded-lg shadow p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-800">黑匣子数据</h3>
        <button
          onClick={clearAllData}
          class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          清除数据
        </button>
      </div>

      <div class="mb-4 p-3 bg-gray-50 rounded-lg">
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-gray-500">总记录数:</span>
            <span class="ml-1 font-medium">{stats()?.totalRecords || 0}</span>
          </div>
          <div>
            <span class="text-gray-500">塔吊数:</span>
            <span class="ml-1 font-medium">{stats()?.cranes.length || 0}</span>
          </div>
          <div>
            <span class="text-gray-500">会话数:</span>
            <span class="ml-1 font-medium">{stats()?.sessions.length || 0}</span>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          选择会话:
        </label>
        <select
          value={selectedSession()}
          onChange={(e) => setSelectedSession(e.target.value)}
          class="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">-- 请选择 --</option>
          <For each={sessions()}>
            {(session) => (
              <option value={session}>
                {new Date(parseInt(session.split('-')[1])).toLocaleString()}
              </option>
            )}
          </For>
        </select>
      </div>

      {records().length > 0 && (
        <div class="mt-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">
            会话记录 ({records().length} 条)
          </h4>
          <div class="max-h-48 overflow-y-auto space-y-2">
            <For each={records().slice(0, 20)}>
              {(record) => (
                <div class="p-2 bg-gray-50 rounded text-xs">
                  <div class="flex justify-between">
                    <span class="font-medium text-gray-700">{record.craneId}</span>
                    <span class="text-gray-500">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div class="mt-1 text-gray-600">
                    角度: {record.state.jibAngle.toFixed(0)}° | 
                    小车: {record.state.trolleyPosition.toFixed(1)}m | 
                    吊钩: {record.state.hookHeight.toFixed(1)}m
                  </div>
                </div>
              )}
            </For>
            {records().length > 20 && (
              <div class="text-center text-xs text-gray-500 py-2">
                ... 还有 {records().length - 20} 条记录
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedSession() && sessions().length === 0 && (
        <div class="text-center py-8 text-gray-500 text-sm">
          暂无黑匣子数据，开始仿真后将自动记录
        </div>
      )}
    </div>
  );
}
