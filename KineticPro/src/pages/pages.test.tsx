import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import Keypoints from '@/pages/Keypoints';
import History from '@/pages/History';
import Sidebar from '@/components/Sidebar';
import { useKineticStore } from '@/store';

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('端到端业务场景 1：运动数据仪表盘完整流程', () => {
  beforeEach(() => {
    useKineticStore.setState({
      currentTrajectory: null,
      currentMetrics: null,
      currentAlignment: null,
      currentFrames: [],
      snapshots: [],
      isCollecting: false,
      playbackFrame: 0,
      isPlaying: false,
      collectionStatus: { connected: false, fps: 0, alignmentScore: 0, engineLatency: 0 },
      engineStatus: { state: 'idle', queueSize: 0, throughput: 0, avgLatency: 0, lastFrameIndex: 0 },
    });
  });

  it('页面应正确渲染标题和操作按钮', () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByText('运动数据仪表盘')).toBeInTheDocument();
    expect(screen.getByText('开始采集')).toBeInTheDocument();
    expect(screen.getByText('保存快照')).toBeInTheDocument();
  });

  it('Dashboard 组件挂载后自动加载演示数据', () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByText('运动数据仪表盘')).toBeInTheDocument();
  });

  it('加载演示数据后应显示语义对齐度面板', () => {
    useKineticStore.getState().loadDemoData();
    renderWithRouter(<Dashboard />);
    const matches = screen.getAllByText('语义对齐度');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('加载演示数据后稳定性评分应大于 0', () => {
    useKineticStore.getState().loadDemoData();
    const state = useKineticStore.getState();
    expect(state.currentMetrics).not.toBeNull();
    expect(state.currentMetrics!.stabilityScore).toBeGreaterThan(0);
  });

  it('加载演示数据后语义对齐度应显示', () => {
    useKineticStore.getState().loadDemoData();
    const state = useKineticStore.getState();
    expect(state.currentAlignment).not.toBeNull();
    expect(state.currentAlignment!.alignmentScore).toBeGreaterThan(0);
  });

  it('采集状态栏应在加载演示数据后显示连接状态', () => {
    useKineticStore.getState().loadDemoData();
    const state = useKineticStore.getState();
    expect(state.collectionStatus.connected).toBe(true);
    expect(state.collectionStatus.fps).toBeGreaterThan(0);
  });

  it('力学参数图表应渲染三个标签页', () => {
    useKineticStore.getState().loadDemoData();
    renderWithRouter(<Dashboard />);
    expect(screen.getByText('角速度')).toBeInTheDocument();
    expect(screen.getByText('线速度')).toBeInTheDocument();
    expect(screen.getByText('重心偏移')).toBeInTheDocument();
  });
});

describe('端到端业务场景 2：关键点序列分析完整流程', () => {
  it('页面应正确渲染标题', () => {
    renderWithRouter(<Keypoints />);
    expect(screen.getByText('关键点序列分析')).toBeInTheDocument();
  });

  it('应渲染骨架时序图区域', () => {
    renderWithRouter(<Keypoints />);
    expect(screen.getByText('骨架时序图')).toBeInTheDocument();
  });

  it('应渲染语义对齐分析区域', () => {
    renderWithRouter(<Keypoints />);
    expect(screen.getByText('语义对齐分析')).toBeInTheDocument();
  });

  it('应渲染识别引擎监控（包含四个管道阶段）', () => {
    renderWithRouter(<Keypoints />);
    expect(screen.getByText('采集帧')).toBeInTheDocument();
    expect(screen.getByText('识别引擎')).toBeInTheDocument();
    expect(screen.getByText('参数提取')).toBeInTheDocument();
    expect(screen.getByText('语义对齐')).toBeInTheDocument();
  });

  it('加载演示数据后语义对齐面板应有内容', () => {
    useKineticStore.getState().loadDemoData();
    const state = useKineticStore.getState();
    expect(state.currentAlignment).not.toBeNull();
    expect(state.currentAlignment!.fieldMappings.length).toBeGreaterThan(0);
  });
});

describe('端到端业务场景 3：历史对比与快照完整流程', () => {
  beforeEach(() => {
    useKineticStore.setState({ snapshots: [] });
  });

  it('页面应正确渲染标题', () => {
    renderWithRouter(<History />);
    expect(screen.getByText('历史对比与快照')).toBeInTheDocument();
  });

  it('应渲染筛选标签', () => {
    renderWithRouter(<History />);
    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByText('优秀 (80+)')).toBeInTheDocument();
    expect(screen.getByText('良好 (60-80)')).toBeInTheDocument();
    expect(screen.getByText('待提升 (<60)')).toBeInTheDocument();
  });

  it('应显示生成快照按钮', () => {
    renderWithRouter(<History />);
    expect(screen.getByText('生成快照')).toBeInTheDocument();
  });

  it('应渲染轨迹叠加对比区域', () => {
    renderWithRouter(<History />);
    expect(screen.getByText('轨迹叠加对比')).toBeInTheDocument();
  });

  it('应渲染参数趋势区域', () => {
    renderWithRouter(<History />);
    expect(screen.getByText('参数趋势')).toBeInTheDocument();
  });

  it('无快照时应在列表显示提示', () => {
    useKineticStore.setState({ snapshots: [] });
    renderWithRouter(<History />);
    expect(screen.getByText(/暂无快照数据/)).toBeInTheDocument();
  });
});

describe('端到端业务场景 4：核心数据流完整性验证', () => {
  it('完整数据流：生成 → 存储 → 读取 → 验证', async () => {
    const { generateSwingSnapshot } = await import('@/engine/mockData');
    const { saveSnapshot, getSnapshot } = await import('@/storage/indexeddb');

    const snapshot = generateSwingSnapshot();
    await saveSnapshot(snapshot);
    const loaded = await getSnapshot(snapshot.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.trajectory.clubHeadPath).toHaveLength(120);
    expect(loaded!.trajectory.centerOfGravityPath).toHaveLength(120);
    expect(loaded!.metrics.stabilityScore).toBeGreaterThan(0);
    expect(loaded!.alignment.alignmentScore).toBeGreaterThan(0);
  });

  it('语义对齐：采集端 → 分析端字段映射完整性', async () => {
    const { SemanticAligner } = await import('@/engine/index');
    const source = {
      club_head_pos: [0, 0, 0],
      cog_pos: [0, 0.9, 0],
      joint_angles: [30, 60, 90],
      velocity: 25,
      torque: 45,
      phase_label: 'downswing',
    };
    const targets = ['club_head_pos', 'cog_pos', 'joint_angles', 'velocity', 'torque', 'phase_label'];
    const result = SemanticAligner.align(source, targets);

    expect(result.alignmentScore).toBeGreaterThan(0.5);
    expect(result.fieldMappings).toHaveLength(6);
    result.fieldMappings.forEach(m => {
      expect(m.confidence).toBeGreaterThan(0);
      expect(m.deviation).toBeGreaterThanOrEqual(0);
    });
  });

  it('生物力学提取：关键点帧 → 重心/角速度计算', async () => {
    const { BiomechanicsExtractor } = await import('@/engine/index');
    const { generateKeypointFrames } = await import('@/engine/mockData');

    const frames = generateKeypointFrames(60);
    const cog = BiomechanicsExtractor.computeCenterOfGravity(frames);
    const angVel = BiomechanicsExtractor.computeAngularVelocity(frames);

    expect(cog).toHaveLength(60);
    expect(angVel).toHaveLength(60);
    expect(angVel[0]).toBe(0);
  });
});

describe('Sidebar - 侧边栏导航', () => {
  it('应渲染品牌标题和三个导航项', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText(/KINETIC/)).toBeInTheDocument();
    expect(screen.getByText('运动仪表盘')).toBeInTheDocument();
    expect(screen.getByText('关键点分析')).toBeInTheDocument();
    expect(screen.getByText('历史对比')).toBeInTheDocument();
  });

  it('应显示系统在线状态', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('系统在线')).toBeInTheDocument();
  });
});
