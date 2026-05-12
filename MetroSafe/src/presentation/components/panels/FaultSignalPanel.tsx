import { Component, For } from 'solid-js';
import { appState, actions } from '../../store';
import { FaultTypeLabel, SemanticLevelLabel, SemanticLevelColor } from '../../../domain';

export const FaultSignalPanel: Component = () => {
  const faults = () => appState.faults;
  const maintenanceStatus = () => appState.maintenanceSyncStatus;
  const operationStatus = () => appState.operationSyncStatus;

  return (
    <div style={{ background: '#fff', 'border-radius': '8px', padding: '16px', 'box-shadow': '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '16px' }}>
        <h3 style={{ margin: 0, 'font-size': '18px', 'font-weight': 600, color: '#333' }}>故障信号监控</h3>
        <button
          onClick={() => actions.clearFaults()}
          style={{ padding: '6px 12px', border: 'none', 'border-radius': '4px', background: '#f44336', color: '#fff', cursor: 'pointer' }}
        >
          清空
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', 'margin-bottom': '16px', 'font-size': '12px' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', 'border-radius': '2px', background: '#2196F3' }}></span>
          <span>维保系统: {maintenanceStatus().synced}/{maintenanceStatus().total} 已同步</span>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', 'border-radius': '2px', background: '#4CAF50' }}></span>
          <span>运行控制: {operationStatus().synced}/{operationStatus().total} 已同步</span>
        </div>
      </div>

      <div style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
        {faults().length === 0 ? (
          <div style={{ 'text-align': 'center', color: '#999', padding: '20px' }}>暂无故障信号</div>
        ) : (
          <For each={faults()}>
            {(fault) => (
              <div style={{
                padding: '10px',
                'margin-bottom': '8px',
                'border-radius': '6px',
                'border-left': `4px solid ${SemanticLevelColor[fault.semanticLevel]}`,
                background: fault.acknowledged ? '#f5f5f5' : '#fff8f5',
                opacity: fault.acknowledged ? 0.7 : 1
              }}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                  <div>
                    <div style={{ 'font-weight': 600, color: '#333' }}>
                      {FaultTypeLabel[fault.faultType]} - {fault.doorId}
                    </div>
                    <div style={{ 'font-size': '12px', color: '#666', 'margin-top': '4px' }}>
                      {fault.description}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', 'margin-top': '6px', 'font-size': '11px' }}>
                      <span style={{
                        padding: '2px 6px',
                        'border-radius': '3px',
                        background: SemanticLevelColor[fault.semanticLevel] + '20',
                        color: SemanticLevelColor[fault.semanticLevel]
                      }}>
                        {SemanticLevelLabel[fault.semanticLevel]}
                      </span>
                      <span style={{ color: '#999' }}>
                        {new Date(fault.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span
                      title={`维保系统: ${actions.isFaultSynced(fault.id, 'maintenance') ? '已同步' : '同步中'}`}
                      style={{
                        width: '12px',
                        height: '12px',
                        'border-radius': '50%',
                        background: actions.isFaultSynced(fault.id, 'maintenance') ? '#4CAF50' : '#FFC107'
                      }}
                    />
                    <span
                      title={`运行控制: ${actions.isFaultSynced(fault.id, 'operation_control') ? '已同步' : '同步中'}`}
                      style={{
                        width: '12px',
                        height: '12px',
                        'border-radius': '50%',
                        background: actions.isFaultSynced(fault.id, 'operation_control') ? '#4CAF50' : '#FFC107'
                      }}
                    />
                  </div>
                </div>
                {!fault.acknowledged && (
                  <button
                    onClick={() => actions.acknowledgeFault(fault.id)}
                    style={{
                      'margin-top': '8px',
                      padding: '4px 8px',
                      'font-size': '11px',
                      border: 'none',
                      'border-radius': '3px',
                      background: '#2196F3',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    确认收到
                  </button>
                )}
              </div>
            )}
          </For>
        )}
      </div>
    </div>
  );
};
