import { Component, For } from 'solid-js';
import { appState, actions } from '../../store';
import { DoorStateLabel, DoorStateColor } from '../../../domain';

export const DoorStatusPanel: Component = () => {
  const doors = () => appState.doors;

  return (
    <div style={{ background: '#fff', 'border-radius': '8px', padding: '16px', 'box-shadow': '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 16px 0', 'font-size': '18px', 'font-weight': 600, color: '#333' }}>屏蔽门状态监控</h3>
      <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '12px' }}>
        <For each={doors()}>
          {(door) => (
            <div style={{
              padding: '12px',
              'border-radius': '6px',
              border: `2px solid ${DoorStateColor[door.state]}`,
              background: `${DoorStateColor[door.state]}15`
            }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                <span style={{ 'font-weight': 600, color: '#333' }}>{door.id}</span>
                <span style={{
                  padding: '2px 8px',
                  'border-radius': '4px',
                  background: DoorStateColor[door.state],
                  color: '#fff',
                  'font-size': '12px'
                }}>
                  {DoorStateLabel[door.state]}
                </span>
              </div>
              <div style={{ 'margin-top': '8px', 'font-size': '12px', color: '#666' }}>
                <div>位置: {door.position.toFixed(1)}%</div>
                <div>速度: {door.speed.toFixed(1)} mm/s</div>
                <div>电流: {door.motorCurrent.toFixed(1)} mA</div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
