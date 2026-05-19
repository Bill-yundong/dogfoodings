import { Component, JSX } from 'solid-js';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '@/stores/appStore';

const AppLayout: Component<{ children?: JSX.Element }> = (props) => {
  const { state } = useAppStore();

  return (
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
  );
};

export default AppLayout;
