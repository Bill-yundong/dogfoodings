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
    <div class="black-box-viewer p-6">
      <div class="flex justify-between items-center mb-7">
        <h3 class="text-xl font-bold text-slate-800 flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-lg">
            📦
          </span>
          黑匣子数据中心
        </h3>
        <button
          onClick={clearAllData}
          class="px-5 py-2.5 text-sm bg-gradient-to-r from-red-100 to-rose-100 text-red-700 rounded-xl font-semibold hover:from-red-200 hover:to-rose-200 transition-all duration-200 border border-red-200 active:scale-95"
        >
          🗑️ 清除所有数据
        </button>
      </div>

      <div class="mb-7 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
        <div class="grid grid-cols-3 gap-6">
          <div class="text-center bg-white rounded-xl py-4 px-3 shadow-sm">
            <div class="text-3xl font-bold text-blue-600">{stats()?.totalRecords || 0}</div>
            <div class="text-sm text-slate-500 mt-1 font-medium">总记录数</div>
          </div>
          <div class="text-center bg-white rounded-xl py-4 px-3 shadow-sm">
            <div class="text-3xl font-bold text-emerald-600">{stats()?.cranes.length || 0}</div>
            <div class="text-sm text-slate-500 mt-1 font-medium">监控塔吊数</div>
          </div>
          <div class="text-center bg-white rounded-xl py-4 px-3 shadow-sm">
            <div class="text-3xl font-bold text-amber-600">{stats()?.sessions.length || 0}</div>
            <div class="text-sm text-slate-500 mt-1 font-medium">会话数</div>
          </div>
        </div>
      </div>

      <div class="mb-7">
        <label class="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <span>📋</span>
          选择历史会话查看详情:
        </label>
        <select
          value={selectedSession()}
          onChange={(e) => setSelectedSession(e.target.value)}
          class="w-full px-5 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
        >
          <option value="">-- 请选择一个历史会话 --</option>
          <For each={sessions()}>
            {(session) => (
              <option value={session}>
                🕐 {new Date(parseInt(session.split('-')[1])).toLocaleString()}
              </option>
            )}
          </For>
        </select>
      </div>

      {records().length > 0 && (
        <div class="mt-4">
          <h4 class="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span>📝</span>
            会话记录详情 ({records().length} 条)
          </h4>
          <div class="max-h-64 overflow-y-auto space-y-3 pr-2">
            <For each={records().slice(0, 20)}>
              {(record) => (
                <div class="p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200">
                  <div class="flex justify-between items-center">
                    <span class="font-bold text-slate-800 flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      {record.craneId}
                    </span>
                    <span class="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-lg">
                      🕐 {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div class="mt-3 text-sm text-slate-600 grid grid-cols-3 gap-3">
                    <div class="bg-white px-3 py-2 rounded-lg border border-slate-100">
                      <span class="text-slate-400 text-xs">角度</span>
                      <span class="ml-2 font-bold text-slate-700">{record.state.jibAngle.toFixed(0)}°</span>
                    </div>
                    <div class="bg-white px-3 py-2 rounded-lg border border-slate-100">
                      <span class="text-slate-400 text-xs">小车</span>
                      <span class="ml-2 font-bold text-slate-700">{record.state.trolleyPosition.toFixed(1)}m</span>
                    </div>
                    <div class="bg-white px-3 py-2 rounded-lg border border-slate-100">
                      <span class="text-slate-400 text-xs">吊钩</span>
                      <span class="ml-2 font-bold text-slate-700">{record.state.hookHeight.toFixed(1)}m</span>
                    </div>
                  </div>
                </div>
              )}
            </For>
            {records().length > 20 && (
              <div class="text-center text-sm text-slate-400 py-4 font-medium">
                ... 还有 {records().length - 20} 条历史记录
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedSession() && sessions().length === 0 && (
        <div class="text-center py-16 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-dashed border-slate-300">
          <div class="text-5xl mb-4">📦</div>
          <div class="text-slate-600 font-bold text-lg mb-2">暂无黑匣子数据</div>
          <div class="text-slate-400 text-sm">开始仿真后系统将自动记录所有塔吊运行轨迹</div>
        </div>
      )}
    </div>
  );
}
