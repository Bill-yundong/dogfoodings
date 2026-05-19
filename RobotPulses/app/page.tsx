'use client';

import { Header } from '@/components/ui/Header';
import { RobotPanel } from '@/components/ui/RobotPanel';
import { SafetyPanel } from '@/components/ui/SafetyPanel';
import { SimulationScene } from '@/components/three/SimulationScene';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-industrial-900 overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <RobotPanel />

        <main className="flex-1 relative">
          <SimulationScene />

          <div className="absolute bottom-4 left-4 bg-industrial-800/90 backdrop-blur-sm rounded-lg px-4 py-2 text-xs text-industrial-400">
            <div className="flex items-center gap-4">
              <span>鼠标左键: 旋转</span>
              <span>鼠标右键: 平移</span>
              <span>滚轮: 缩放</span>
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-industrial-800/90 backdrop-blur-sm rounded-lg px-4 py-2 text-xs">
            <div className="text-industrial-400 mb-1">图例</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-cyan" />
                <span className="text-white">机械臂 A</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-green" />
                <span className="text-white">机械臂 B</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-industrial-500" />
                <span className="text-white">障碍物</span>
              </div>
            </div>
          </div>
        </main>

        <SafetyPanel />
      </div>
    </div>
  );
}
