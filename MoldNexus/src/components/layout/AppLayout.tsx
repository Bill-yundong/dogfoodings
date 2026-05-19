import { Component, JSX } from 'solid-js';
import { Show } from 'solid-js';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '@/stores/appStore';
import { Loader2 } from 'lucide-solid';

const AppLayout: Component<{ children?: JSX.Element }> = (props) => {
  const { state } = useAppStore();

  return (
    <Show when={state.dbReady} fallback={
      <div class="h-screen w-screen flex flex-col items-center justify-center bg-dark-300">
        <Loader2 class="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p class="text-gray-400 text-lg">正在初始化数据库...</p>
        <p class="text-gray-600 text-sm mt-2">MoldNexus 注塑成型仿真平台</p>
      </div>
    }>
      <div class="h-screen w-screen flex flex-col bg-dark-300 overflow-hidden">
        <Header />
        <div class="flex flex-1 overflow-hidden">
          <Sidebar />
          <main
            class={`flex-1 overflow-auto transition-all duration-300 ${
              state.sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}
          >
            <div class="p-6">
              {props.children}
            </div>
          </main>
        </div>
      </div>
    </Show>
  );
};

export default AppLayout;
