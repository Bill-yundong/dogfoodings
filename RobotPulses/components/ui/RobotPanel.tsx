'use client';

import { Activity, Zap, Target } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';

const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const RobotPanel = () => {
  const {
    robotModels,
    robotPoses,
    robotTargets,
    selectedRobotId,
    actions,
  } = useSimulationStore();

  const selectedRobot = robotModels.find(r => r.id === selectedRobotId);
  const selectedPose = selectedRobotId ? robotPoses.get(selectedRobotId) : null;
  const selectedTarget = selectedRobotId ? robotTargets.get(selectedRobotId) : null;

  return (
    <div className="w-72 bg-industrial-800 border-r border-industrial-600 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-accent-cyan" />
        机器人状态
      </h2>

      <div className="space-y-3 mb-6">
        {robotModels.map(robot => {
          const pose = robotPoses.get(robot.id);
          const isSelected = selectedRobotId === robot.id;

          return (
            <div
              key={robot.id}
              onClick={() => actions.selectRobot(robot.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-industrial-600 border-2 border-accent-cyan'
                  : 'bg-industrial-700 hover:bg-industrial-600 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: robot.color }}
                  />
                  <span className="text-white font-medium text-sm">{robot.name}</span>
                </div>
                <span className="text-xs text-industrial-400">ID: {robot.id}</span>
              </div>
              {pose && (
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {pose.joints.slice(0, 6).map((joint, i) => (
                    <div key={i} className="bg-industrial-800 p-1 rounded text-center">
                      <div className="text-industrial-400">J{i + 1}</div>
                      <div className="text-white font-mono">{radToDeg(joint).toFixed(1)}°</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedRobot && selectedPose && (
        <div className="border-t border-industrial-600 pt-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent-yellow" />
            末端执行器
          </h3>
          <div className="bg-industrial-700 rounded-lg p-3 mb-4">
            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div>
                <div className="text-industrial-400">X</div>
                <div className="text-white font-mono">{selectedPose.endEffector.position[0].toFixed(3)}m</div>
              </div>
              <div>
                <div className="text-industrial-400">Y</div>
                <div className="text-white font-mono">{selectedPose.endEffector.position[1].toFixed(3)}m</div>
              </div>
              <div>
                <div className="text-industrial-400">Z</div>
                <div className="text-white font-mono">{selectedPose.endEffector.position[2].toFixed(3)}m</div>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-yellow" />
            关节速度
          </h3>
          <div className="bg-industrial-700 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {selectedPose.jointStates.slice(0, 6).map((state, i) => (
                <div key={i}>
                  <div className="text-industrial-400">J{i + 1}</div>
                  <div className="text-white font-mono">{Math.abs(state.velocity).toFixed(2)} rad/s</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedRobot && selectedTarget && (
        <div className="border-t border-industrial-600 pt-4 mt-4">
          <h3 className="text-sm font-bold text-white mb-3">目标位置</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-industrial-400">X</div>
              <input
                type="number"
                step="0.1"
                value={selectedTarget.position[0]}
                onChange={(e) => {
                  const newPos: [number, number, number] = [
                    parseFloat(e.target.value),
                    selectedTarget.position[1],
                    selectedTarget.position[2],
                  ];
                  actions.setRobotTarget(selectedRobot.id, newPos);
                }}
                className="w-full bg-industrial-800 text-white px-2 py-1 rounded text-xs font-mono border border-industrial-600 focus:outline-none focus:border-accent-cyan"
              />
            </div>
            <div>
              <div className="text-industrial-400">Y</div>
              <input
                type="number"
                step="0.1"
                value={selectedTarget.position[1]}
                onChange={(e) => {
                  const newPos: [number, number, number] = [
                    selectedTarget.position[0],
                    parseFloat(e.target.value),
                    selectedTarget.position[2],
                  ];
                  actions.setRobotTarget(selectedRobot.id, newPos);
                }}
                className="w-full bg-industrial-800 text-white px-2 py-1 rounded text-xs font-mono border border-industrial-600 focus:outline-none focus:border-accent-cyan"
              />
            </div>
            <div>
              <div className="text-industrial-400">Z</div>
              <input
                type="number"
                step="0.1"
                value={selectedTarget.position[2]}
                onChange={(e) => {
                  const newPos: [number, number, number] = [
                    selectedTarget.position[0],
                    selectedTarget.position[1],
                    parseFloat(e.target.value),
                  ];
                  actions.setRobotTarget(selectedRobot.id, newPos);
                }}
                className="w-full bg-industrial-800 text-white px-2 py-1 rounded text-xs font-mono border border-industrial-600 focus:outline-none focus:border-accent-cyan"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
