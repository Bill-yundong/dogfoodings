import { JSX } from 'solid-js';
import Sidebar from './Sidebar';

export default function Layout(props: { children: JSX.Element }) {
  return (
    <div class="flex h-screen">
      <Sidebar />
      <main class="flex-1 bg-[#0a0e27] p-6 overflow-auto">
        {props.children}
      </main>
    </div>
  );
}
