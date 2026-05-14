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
    <div class="black-box-viewer p-10">
      <div class="flex justify-between items-start mb-10 flex-wrap gap-5">
        <h3 class="text-2xl font-extrabold text-slate-800 flex items-center gap-5 flex-wrap">
          <span class="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-3xl shadow-xl shadow-cyan-500/30 flex-shrink-0">
            📦
          </span>
          <span>黑匣子数据中心</span>
        </h3>
        <button
          onClick={clearAllData}
          class="px-8 py-4 text-base bg-gradient-to-r from-red-100 to-rose-100 text-red-700 rounded-xl font-extrabold hover:from-red-200 hover:to-rose-200 transition-all duration-200 border-2 border-red-200 active:scale-95 shadow-md whitespace-nowrap flex-shrink-0"
        >
          🗑️ 清除所有数据
        </button>
      </div>

      <div class="mb-10 p-8 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border-2 border-slate-200 shadow-inner">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="text-center bg-white rounded-2xl py-6 px-5 shadow-md hover:shadow-lg transition-shadow">
            <div class="text-4xl font-extrabold text-blue-600">{stats()?.totalRecords || 0}</div>
            <div class="text-base text-slate-500 mt-3 font-semibold">总记录数</div>
          </div>
          <div class="text-center bg-white rounded-2xl py-6 px-5 shadow-md hover:shadow-lg transition-shadow">
            <div class="text-4xl font-extrabold text-emerald-600">{stats()?.cranes.length || 0}</div>
            <div class="text-base text-slate-500 mt-3 font-semibold">监控塔吊数</div>
          </div>
          <div class="text-center bg-white rounded-2xl py-6 px-5 shadow-md hover:shadow-lg transition-shadow">
            <div class="text-4xl font-extrabold text-amber-600">{stats()?.sessions.length || 0}</div>
            <div class="text-base text-slate-500 mt-3 font-semibold">会话数</div>
          </div>
        </div>
      </div>

      <div class="mb-10">
        <label class="block text-base font-extrabold text-slate-700 mb-5 flex items-center gap-3">
          <span class="text-2xl">📋</span>
          选择历史会话查看详情:
        </label>
        <select
          value={selectedSession()}
          onChange={(e) => setSelectedSession(e.target.value)}
          class="w-full px-8 py-5 border-2 border-slate-200 rounded-2xl text-base font-semibold focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white shadow-sm hover:shadow-md cursor-pointer"
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
        <div class="mt-6">
          <h4 class="text-xl font-extrabold text-slate-700 mb-6 flex items-center gap-3">
            <span class="text-2xl">📝</span>
            会话记录详情 ({records().length} 条)
          </h4>
          <div class="max-h-80 overflow-y-auto space-y-4 pr-3">
            <For each={records().slice(0, 20)}>
              {(record) => (
                <div class="p-6 bg-gradient-to-r from-slate-50 to-white rounded-2xl border-2 border-slate-200 hover:shadow-xl transition-all duration-300">
                  <div class="flex justify-between items-center flex-wrap gap-4">
                    <span class="font-extrabold text-slate-800 text-lg flex items-center gap-3">
                      <span class="w-3.5 h-3.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                      {record.craneId}
                    </span>
                    <span class="text-sm text-slate-500 font-mono bg-slate-100 px-4 py-2 rounded-xl flex-shrink-0">
                      🕐 {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div class="mt-6 text-base text-slate-600 grid grid-cols-3 gap-5">
                    <div class="bg-white px-5 py-4 rounded-xl border border-slate-100 shadow-sm">
                      <span class="text-slate-400 text-xs font-semibold uppercase tracking-wide block">角度</span>
                      <span class="font-extrabold text-slate-700 text-xl mt-2 block">{record.state.jibAngle.toFixed(0)}°</span>
                    </div>
                    <div class="bg-white px-5 py-4 rounded-xl border border-slate-100 shadow-sm">
                      <span class="text-slate-400 text-xs font-semibold uppercase tracking-wide block">小车</span>
                      <span class="font-extrabold text-slate-700 text-xl mt-2 block">{record.state.trolleyPosition.toFixed(1)}m</span>
                    </div>
                    <div class="bg-white px-5 py-4 rounded-xl border border-slate-100 shadow-sm">
                      <span class="text-slate-400 text-xs font-semibold uppercase tracking-wide block">吊钩</span>
                      <span class="font-extrabold text-slate-700 text-xl mt-2 block">{record.state.hookHeight.toFixed(1)}m</span>
                    </div>
                  </div>
                </div>
              )}
            </For>
            {records().length > 20 && (
              <div class="text-center text-base text-slate-400 py-6 font-semibold">
                ... 还有 {records().length - 20} 条历史记录
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedSession() && sessions().length === 0 && (
        <div class="text-center py-20 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-dashed border-slate-300">
          <div class="text-6xl mb-7">📦</div>
          <div class="text-slate-600 font-extrabold text-2xl mb-3">暂无黑匣子数据</div>
          <div class="text-slate-500 text-lg">开始仿真后系统将自动记录所有塔吊运行轨迹</div>
        </div>
      )}
    </div>
  );
}
