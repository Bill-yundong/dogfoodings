import { Component } from 'solid-js';
import { Bell, Search, User, Database } from 'lucide-solid';
import { useAppStore } from '@/stores/appStore';

const Header: Component = () => {
  const { state } = useAppStore();

  return (
    <header class="h-14 bg-dark-200 border-b border-dark-100 flex items-center justify-between px-4 z-50 sticky top-0">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-lg flex items-center justify-center">
            <Database class="w-5 h-5 text-white" />
          </div>
          <span class="text-lg font-bold bg-gradient-to-r from-primary-400 to-accent-cyan bg-clip-text text-transparent">
            MoldNexus
          </span>
        </div>

        <div class="hidden md:flex items-center gap-2 ml-8">
          <div class="relative">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="搜索模拟任务、参数..."
              class="w-72 pl-10 pr-4 py-1.5 bg-dark-100 border border-dark-100 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class={`flex items-center gap-2 px-2 py-1 rounded ${
          state.dbReady ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-yellow/20 text-accent-yellow'
        }`}>
          <div class={`w-2 h-2 rounded-full ${state.dbReady ? 'bg-accent-green' : 'bg-accent-yellow animate-pulse'}`} />
          <span class="text-xs font-medium">
            {state.dbReady ? '数据库已连接' : '连接中...'}
          </span>
        </div>

        <button 
          onClick={() => alert('通知功能开发中...')}
          class="relative p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-100 rounded-lg transition-colors"
        >
          <Bell class="w-5 h-5" />
          <span class="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full" />
        </button>

        <div class="flex items-center gap-3 pl-3 border-l border-dark-100">
          <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <User class="w-4 h-4 text-white" />
          </div>
          <div class="hidden md:block">
            <p class="text-sm font-medium text-gray-200">{state.currentUser?.name}</p>
            <p class="text-xs text-gray-500">
              {state.currentUser?.role === 'process_engineer' && '工艺工程师'}
              {state.currentUser?.role === 'production_operator' && '生产线操作员'}
              {state.currentUser?.role === 'quality_engineer' && '质量工程师'}
              {state.currentUser?.role === 'admin' && '系统管理员'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
