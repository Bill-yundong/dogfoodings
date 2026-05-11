import { Component, createEffect, createSignal, For } from 'solid-js';
import { doorStore, getDoorArray, updateDoorStatus } from '../store/doorStore';
import { DoorState } from '../types';

const stateColors: Record<DoorState, string> = {
  [DoorState.CLOSED]: 'bg-green-500',
  [DoorState.OPENING]: 'bg-yellow-500',
  [DoorState.OPEN]: 'bg-blue-500',
  [DoorState.CLOSING]: 'bg-orange-500',
  [DoorState.FAULT]: 'bg-red-500'
};

const stateLabels: Record<DoorState, string> = {
  [DoorState.CLOSED]: '关闭',
  [DoorState.OPENING]: '开启中',
  [DoorState.OPEN]: '开启',
  [DoorState.CLOSING]: '关闭中',
  [DoorState.FAULT]: '故障'
};

export const DoorStatusPanel: Component = () => {
  const [doors, setDoors] = createSignal(getDoorArray());

  createEffect(() => {
    const interval = setInterval(() => {
      const doorArray = getDoorArray();
      doorArray.forEach(door => {
        if (Math.random() > 0.95) {
          const states: DoorState[] = [DoorState.CLOSED, DoorState.OPENING, DoorState.OPEN, DoorState.CLOSING];
          const randomState = states[Math.floor(Math.random() * states.length)];
          updateDoorStatus(door.doorId, {
            state: randomState,
            position: randomState === DoorState.OPEN ? 100 : randomState === DoorState.CLOSED ? 0 : Math.random() * 100,
            speed: Math.random() * 0.5,
            motorCurrent: 2 + Math.random() * 3
          });
        }
      });
      setDoors(getDoorArray());
    }, 500);

    return () => clearInterval(interval);
  });

  return (
    <div class="bg-gray-800 rounded-lg p-4 shadow-lg">
      <h2 class="text-xl font-bold text-white mb-4">屏蔽门状态监控</h2>
      <div class="grid grid-cols-3 gap-3">
        <For each={doors()}>
          {door => (
            <div class="bg-gray-700 rounded-lg p-3 transition-all hover:bg-gray-600">
              <div class="flex items-center justify-between mb-2">
                <span class="text-white font-semibold">{door.doorId}</span>
                <span class={`${stateColors[door.state]} px-2 py-1 rounded text-xs text-white font-medium`}>
                  {stateLabels[door.state]}
                </span>
              </div>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between text-gray-300">
                  <span>位置:</span>
                  <span>{door.position.toFixed(1)}%</span>
                </div>
                <div class="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    class={`${stateColors[door.state]} h-2 rounded-full transition-all`}
                    style={{ width: `${door.position}%` }}
                  />
                </div>
                <div class="flex justify-between text-gray-300">
                  <span>速度:</span>
                  <span>{door.speed.toFixed(2)} m/s</span>
                </div>
                <div class="flex justify-between text-gray-300">
                  <span>电流:</span>
                  <span>{door.motorCurrent.toFixed(2)} A</span>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
