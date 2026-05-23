import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useWeatherStore } from '@/store/weatherStore';
import { useRouteStore } from '@/store/routeStore';
import { db } from '@/db';
import type { PlatformMetadata, SubmarineCable, HelicopterPosition, RoutePlan, LandingWindow } from '@/types';

interface ThreeDMapProps {
  selectedPlatformId?: string;
  onSelectPlatform?: (id: string) => void;
  highlightRoute?: RoutePlan;
  landingWindows?: LandingWindow[];
}

const latLngToVector3 = (lat: number, lng: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
};

const Earth: React.FC = () => {
  return (
    <Sphere args={[2, 64, 64]}>
      <meshPhongMaterial
        color="#061640"
        transparent
        opacity={0.6}
        wireframe={false}
      />
    </Sphere>
  );
};

const PlatformMarker: React.FC<{
  platform: PlatformMetadata;
  isSelected: boolean;
  onClick: () => void;
}> = ({ platform, isSelected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = latLngToVector3(platform.latitude, platform.longitude, 2.05);

  const color = useMemo(() => {
    if (platform.status === 'emergency') return '#EF4444';
    if (platform.status === 'maintenance') return '#F46036';
    if (isSelected) return '#3369B8';
    return '#1B998B';
  }, [platform.status, isSelected]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <octahedronGeometry args={[0.06, 0]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.2, 0)]}
        color={color}
        lineWidth={2}
      />
      <Html center distanceFactor={8} zIndexRange={[100, 0]}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`px-2 py-1 rounded-sm text-[10px] font-mono whitespace-nowrap cursor-pointer
            ${isSelected ? 'bg-deep-ocean-600' : 'bg-steel-800/90'}
            ${platform.status === 'emergency' ? 'border border-red-500' : 'border border-steel-600'}`}
          onClick={onClick}
        >
          <span className="text-steel-100">{platform.code}</span>
        </motion.div>
      </Html>
    </group>
  );
};

const CableRenderer: React.FC<{ cable: SubmarineCable }> = ({ cable }) => {
  const points = useMemo(() => {
    const cablePoints: THREE.Vector3[] = [];
    cable.coordinates.forEach((coord, i) => {
      const start = latLngToVector3(coord.lat, coord.lng, 2.02);
      cablePoints.push(start);
      if (i < cable.coordinates.length - 1) {
        const next = cable.coordinates[i + 1];
        const midLat = (coord.lat + next.lat) / 2;
        const midLng = (coord.lng + next.lng) / 2;
        const midPoint = latLngToVector3(midLat, midLng, 2.08);
        cablePoints.push(midPoint);
      }
    });
    return cablePoints;
  }, [cable]);

  const color = useMemo(() => {
    if (cable.status === 'damaged') return '#EF4444';
    if (cable.status === 'warning') return '#F46036';
    return '#3369B8';
  }, [cable.status]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.7}
    />
  );
};

const HelicopterMarker: React.FC<{ helicopter: HelicopterPosition }> = ({ helicopter }) => {
  const position = latLngToVector3(helicopter.latitude, helicopter.longitude, 2.15);

  useFrame((state) => {
    position.y = 2.15 + Math.sin(state.clock.elapsedTime * 3) * 0.02;
  });

  return (
    <group position={position}>
      <mesh>
        <coneGeometry args={[0.04, 0.1, 4]} />
        <meshBasicMaterial color="#F46036" />
      </mesh>
      <Html center distanceFactor={10}>
        <div className="bg-alert-orange-600/90 px-2 py-0.5 rounded-sm text-[9px] font-mono text-white whitespace-nowrap border border-alert-orange-400">
          🚁 {helicopter.flightNumber}
        </div>
      </Html>
    </group>
  );
};

const RouteRenderer: React.FC<{ route: RoutePlan; platforms: PlatformMetadata[] }> = ({
  route,
  platforms,
}) => {
  const points = useMemo(() => {
    return route.waypoints.map(wp =>
      latLngToVector3(wp.lat, wp.lng, 2.1 + wp.alt / 5000)
    );
  }, [route]);

  return (
    <Line
      points={points}
      color="#1B998B"
      lineWidth={3}
      transparent
      opacity={0.9}
    />
  );
};

const Scene: React.FC<ThreeDMapProps> = ({
  selectedPlatformId,
  onSelectPlatform,
  highlightRoute,
}) => {
  const { camera } = useThree();
  const { platforms } = useWeatherStore();
  const [cables, setCables] = React.useState<SubmarineCable[]>([]);
  const [helicopters, setHelicopters] = React.useState<HelicopterPosition[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const cablesData = await db.submarineCables.toArray();
      const helicoptersData = await db.helicopterPositions.toArray();
      setCables(cablesData);
      setHelicopters(helicoptersData);
    };
    loadData();

    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPlatformId && platforms.length > 0) {
      const selected = platforms.find(p => p.id === selectedPlatformId);
      if (selected) {
        const target = latLngToVector3(selected.latitude, selected.longitude, 4);
        camera.position.lerp(target, 0.05);
      }
    }
  }, [selectedPlatformId, platforms, camera]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#3369B8" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#1B998B" />

      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />

      <Earth />

      {cables.map(cable => (
        <CableRenderer key={cable.id} cable={cable} />
      ))}

      {highlightRoute && (
        <RouteRenderer
          route={highlightRoute}
          platforms={platforms}
        />
      )}

      {platforms.map(platform => (
        <PlatformMarker
          key={platform.id}
          platform={platform}
          isSelected={platform.id === selectedPlatformId}
          onClick={() => onSelectPlatform?.(platform.id)}
        />
      ))}

      {helicopters.map(heli => (
        <HelicopterMarker key={heli.id} helicopter={heli} />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={8}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
};

export const ThreeDMap: React.FC<ThreeDMapProps> = ({
  selectedPlatformId,
  onSelectPlatform,
  highlightRoute,
}) => {
  const { platforms } = useWeatherStore();
  const [helicopters, setHelicopters] = React.useState<HelicopterPosition[]>([]);

  React.useEffect(() => {
    const loadHelicopters = async () => {
      const data = await db.helicopterPositions.toArray();
      setHelicopters(data);
    };
    loadHelicopters();

    const interval = setInterval(loadHelicopters, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-sm">
      <div className="absolute inset-0 bg-gradient-to-b from-[#061640] via-[#0a0e17] to-[#0a0e17]" />

      <Canvas
        camera={{ position: [0, 3, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={['#061640', 5, 15]} />
        <Scene
          selectedPlatformId={selectedPlatformId}
          onSelectPlatform={onSelectPlatform}
          highlightRoute={highlightRoute}
        />
      </Canvas>

      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-[#1f2937]/80 backdrop-blur-sm px-3 py-2 rounded border border-[#374151]">
          <div className="text-[10px] text-gray-400 font-mono">平台数量</div>
          <div className="text-xl font-bold text-[#1B998B]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {platforms.length}
          </div>
        </div>
        <div className="bg-[#1f2937]/80 backdrop-blur-sm px-3 py-2 rounded border border-[#374151]">
          <div className="text-[10px] text-gray-400 font-mono">直升机</div>
          <div className="text-xl font-bold text-[#F46036]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            {helicopters.length}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-[#1f2937]/80 backdrop-blur-sm px-3 py-2 rounded border border-[#374151]">
        <div className="text-[10px] text-gray-400 font-mono">操作提示</div>
        <div className="text-xs text-gray-300 font-mono">拖拽旋转 · 滚轮缩放 · 点击平台</div>
      </div>
    </div>
  );
};
