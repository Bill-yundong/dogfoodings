import { Component, For } from 'solid-js';
import { appState, actions } from '../../store';

export const FaultChainSimulatorPanel: Component = () => {
  const chainStates = () => appState.chainStates;
  const isSimulating = () => appState.isSimulating;

  return (
    <div style={{ background: '#fff', 'border-radius': '8px', padding: '16px', 'box-shadow': '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '16px' }}>
        <h3 style={{ margin: 0, 'font-size': '18px', 'font-weight': 600, color: '#333' }}>故障链模拟器</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => actions.triggerRandomFault()}
            style={{ padding: '6px 12px', border: 'none', 'border-radius': '4px', background: '#FF9800', color: '#fff', cursor: 'pointer' }}
          >
            随机触发
          </button>
          <button
            onClick={() => actions.toggleSimulation()}
            style={{
              padding: '6px 12px',
              border: 'none',
              'border-radius': '4px',
              background: isSimulating() ? '#f44336' : '#4CAF50',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            {isSimulating() ? '停止模拟' : '开始模拟'}
          </button>
          <button
            onClick={() => actions.resetAllChains()}
            style={{ padding: '6px 12px', border: 'none', 'border-radius': '4px', background: '#9E9E9E', color: '#fff', cursor: 'pointer' }}
          >
            重置全部
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <For each={chainStates()}>
          {(chain) => (
            <div style={{
              padding: '12px',
              'border-radius': '6px',
              border: `2px solid ${chain.active ? '#f44336' : '#e0e0e0'}`,
              background: chain.active ? '#fff5f5' : '#fafafa'
            }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '10px' }}>
                <span style={{ 'font-weight': 600, color: '#333' }}>{chain.name}</span>
                <span style={{
                  padding: '2px 8px',
                  'border-radius': '4px',
                  'font-size': '12px',
                  background: chain.active ? '#f44336' : '#9E9E9E',
                  color: '#fff'
                }}>
                  {chain.active ? '触发中' : '待机'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '4px', 'flex-wrap': 'wrap' }}>
                <For each={chain.gates}>
                  {(gate) => (
                    <button
                      onClick={() => actions.triggerFault(chain.id, gate.id)}
                      style={{
                        padding: '4px 8px',
                        'font-size': '11px',
                        border: `1px solid ${gate.output ? '#f44336' : '#ccc'}`,
                        'border-radius': '4px',
                        background: gate.output ? '#ffebee' : '#fff',
                        color: gate.output ? '#f44336' : '#666',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={`点击触发 ${gate.id}`}
                    >
                      {gate.id}
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
