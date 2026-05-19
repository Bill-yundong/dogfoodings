import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { SolarPanelMesh } from './SolarPanelMesh';
import { BuildingMesh } from './BuildingMesh';
import { useSimulationStore } from '@/store/useSimulationStore';
import { calculateSunDirection, calculateSolarIntensity } from '@/utils/solar';
import type { SolarPanel, Building, RayTracingResult, PowerGeneration } from '@/types/solar';

interface SunLightProps {
  altitude: number;
  azimuth: number;
  intensity: number;
}

function SunLight({ altitude, azimuth, intensity }: SunLightProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  
  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      const dir = calculateSunDirection(altitude, azimuth);
      const distance = 200;
      lightRef.current.position.set(
        dir.x * distance,
        Math.max(dir.y * distance, 50),
        dir.z * distance
      );
      lightRef.current.intensity = intensity / 1361 * 3;
      targetRef.current.position.set(0, 0, 0);
      lightRef.current.target = targetRef.current;
    }
  }, [altitude, azimuth, intensity]);
  
  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0005}
      />
      <object3D ref={targetRef} />
    </>
  );
}

interface SceneContentProps {
  panels: SolarPanel[];
  buildings: Building[];
  rayResults: RayTracingResult[];
  generations: PowerGeneration[];
  selectedPanelId: string | null;
  onPanelSelect: (id: string | null) => void;
  sunAltitude: number;
  sunAzimuth: number;
  autoRotate: boolean;
}

function SceneContent({
  panels,
  buildings,
  rayResults,
  generations,
  selectedPanelId,
  onPanelSelect,
  sunAltitude,
  sunAzimuth,
  autoRotate,
}: SceneContentProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  const sunIntensity = useMemo(() => {
    if (sunAltitude <= 0) return 0;
    return calculateSolarIntensity(sunAltitude);
  }, [sunAltitude]);
  
  useFrame(() => {
    if (autoRotate && controlsRef.current) {
      const azimuthalAngle = controlsRef.current.getAzimuthalAngle();
      controlsRef.current.setAzimuthalAngle(azimuthalAngle + 0.002);
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#87CEEB', '#362d1f', 0.5]} />
      
      <SunLight
        altitude={sunAltitude}
        azimuth={sunAzimuth}
        intensity={sunIntensity}
      />
      
      {sunAltitude > 0 && <Sky sunPosition={[sunAzimuth, sunAltitude, 0]} turbidity={2} rayleigh={2} />}
      {sunAltitude <= 0 && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial
          color="#1a3a1a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      <Grid
        position={[0, 0, 0]}
        args={[200, 200]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#2d4a2d"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#3d5a3d"
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
      />
      
      {buildings.map((building) => (
        <BuildingMesh key={building.id} building={building} />
      ))}
      
      {panels.map((panel) => (
        <SolarPanelMesh
          key={panel.id}
          panel={panel}
          rayResult={rayResults.find((r) => r.panelId === panel.id)}
          generation={generations.find((g) => g.panelId === panel.id)}
          isSelected={selectedPanelId === panel.id}
          onClick={() => onPanelSelect(selectedPanelId === panel.id ? null : panel.id)}
        />
      ))}
      
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
      />
      
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          height={300}
          intensity={0.5}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export function SolarScene() {
  const {
    panels,
    buildings,
    rayTracingResults,
    powerGenerations,
    solarPosition,
    selectedPanelId,
    setSelectedPanelId,
    simulationState,
  } = useSimulationStore();
  
  const sunAltitude = solarPosition?.altitude ?? 45;
  const sunAzimuth = solarPosition?.azimuth ?? 180;
  
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [50, 50, 50], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <fog attach="fog" args={['#0A192F', 100, 200]} />
        <color attach="background" args={[sunAltitude > 0 ? '#1a1a2e' : '#0a0a15']} />
        
        <SceneContent
          panels={panels}
          buildings={buildings}
          rayResults={rayTracingResults}
          generations={powerGenerations}
          selectedPanelId={selectedPanelId}
          onPanelSelect={setSelectedPanelId}
          sunAltitude={sunAltitude}
          sunAzimuth={sunAzimuth}
          autoRotate={simulationState.autoRotate}
        />
      </Canvas>
    </div>
  );
}
