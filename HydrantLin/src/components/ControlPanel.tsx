import { Component, createSignal } from 'solid-js';
import { AppStore } from '../store';

interface ControlPanelProps {
  store: AppStore;
}

export const ControlPanel: Component<ControlPanelProps> = (props) => {
  const { state, actions } = props.store;
  const [mockDataCount, setMockDataCount] = createSignal(1000);

  const handleGenerateMockData = async () => {
    if (confirm(`将生成 ${mockDataCount()} 个消火栓模拟数据，是否继续？`)) {
      await actions.generateMockData(mockDataCount());
    }
  };

  return (
    <div class="control-panel">
      <h3>控制面板</h3>

      <div class="control-section">
        <h4>数据生成</h4>
        <div class="control-row">
          <label for="mockCount">消火栓数量:</label>
          <input
            id="mockCount"
            type="number"
            min="100"
            max="50000"
            value={mockDataCount()}
            onInput={(e) =>
              setMockDataCount(parseInt(e.currentTarget.value) || 1000)
            }
            disabled={state.isLoading}
          />
        </div>
        <button
          onClick={handleGenerateMockData}
          disabled={state.isLoading}
          class="primary"
        >
          {state.isLoading ? '生成中...' : '生成模拟数据'}
        </button>
      </div>

      <div class="control-section">
        <h4>压力模拟</h4>
        <button
          onClick={actions.runPressureSimulation}
          disabled={state.isSimulating || state.hydrants.length === 0}
        >
          {state.isSimulating ? '模拟中...' : '运行压力模拟'}
        </button>
        <p class="hint">
          根据流体力学模型计算管网压力分布，考虑流量衰减效应
        </p>
      </div>

      <div class="control-section">
        <h4>数据同步</h4>
        <button
          onClick={actions.triggerSync}
          disabled={state.isLoading}
        >
          立即同步
        </button>
        <p class="hint">
          同步消防支队和自来水公司的水压数据，自动处理冲突
        </p>
      </div>

      <div class="control-section">
        <h4>数据管理</h4>
        <button onClick={actions.loadHydrants} disabled={state.isLoading}>
          刷新数据
        </button>
        <button onClick={actions.refreshStats} disabled={state.isLoading}>
          刷新统计
        </button>
      </div>
    </div>
  );
};
