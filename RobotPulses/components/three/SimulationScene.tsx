'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { RobotArm } from './RobotArm';
import { Obstacle } from './Obstacle';
import { Workspace } from './Workspace';
import { TargetMarker } from './TargetMarker';
import { simulationEngine } from '@/lib/simulation/engine';
import { initDatabase, robotDB } from '@/lib/storage/indexedDB';

export const SimulationScene = () => {
  const {
    robotModels,
    robotPoses,
    robotTargets,
    obstacles,
    selectedRobotId,
    status,
    actions,
  } = useSimulationStore();

  useEffect(() => {
    initDatabase();

    return () => {
      simulationEngine.stop();
      robotDB.close();
    };
  }, []);

  useEffect(() => {
    if (status === 'running') {
      simulationEngine.start();
    } else {
      simulationEngine.stop();
    }
  }, [status]);

  useEffect(() => {
    const interval = setInterval(() => {
      actions.syncSnapshotCount();
    }, 2000);

    return () => clearInterval(interval);
  }, [actions]);

  return (
    <Canvas shadows className="w-full h-full">
      <PerspectiveCamera makeDefault position={[0, 6, 8]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
      />

      <color attach="background" args={['#0a0e17']} />
      <fog attach="fog" args={['#0a0e17', 8, 20]} />

      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#4da6ff" />
      <pointLight position={[5, 5, -5]} intensity={0.5} color="#ff6b6b" />

      <Workspace />

      {obstacles.map(obstacle => (
        <Obstacle key={obstacle.id} obstacle={obstacle} />
      ))}

      {robotModels.map(model => {
        const pose = robotPoses.get(model.id);
        if (!pose) return null;

        const target = robotTargets.get(model.id);
        const isSelected = selectedRobotId === model.id;

        return (
          <group key={model.id}>
            <RobotArm model={model} pose={pose} isSelected={isSelected} />
            {target && (
              <TargetMarker position={target.position} color={model.color} />
            )}
          </group>
        );
      })}

      <gridHelper args={[12, 24, '#1a2c42', '#152238']} position={[0, 0.005, 0]} />
    </Canvas>
  );
};
