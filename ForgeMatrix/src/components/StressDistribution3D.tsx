import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { StressPoint } from '../types';

interface StressDistribution3DProps {
  stressData: StressPoint[];
  gridSize: number;
}

export const StressDistribution3D: React.FC<StressDistribution3DProps> = ({ stressData, gridSize }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !stressData || stressData.length === 0) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(gridSize * 1.5, gridSize * 1.5, gridSize * 1.5);
    camera.lookAt(gridSize / 2, gridSize / 2, gridSize / 2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const maxStress = Math.max(...stressData.map(p => p.stress));
    const minStress = Math.min(...stressData.map(p => p.stress));

    stressData.forEach((point) => {
      const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const normalizedStress = (point.stress - minStress) / (maxStress - minStress);
      
      const color = new THREE.Color();
      color.setHSL((1 - normalizedStress) * 0.6, 0.8, 0.5);
      
      const material = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity: 0.6 + normalizedStress * 0.3
      });
      
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(point.x, point.y, point.z);
      scene.add(cube);
    });

    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(gridSize, gridSize, gridSize));
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.set(gridSize / 2 - 0.5, gridSize / 2 - 0.5, gridSize / 2 - 0.5);
    scene.add(edgeLines);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !cameraRef.current) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      const spherical = new THREE.Spherical();
      spherical.setFromVector3(cameraRef.current.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      cameraRef.current.position.setFromSpherical(spherical);
      cameraRef.current.lookAt(gridSize / 2, gridSize / 2, gridSize / 2);

      previousMousePosition = { x: e.clientX, y: e.clientY };
      renderer.render(scene, cameraRef.current);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);

    renderer.render(scene, camera);

    return () => {
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [stressData, gridSize]);

  return (
    <div>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: 350,
          cursor: 'grab',
          borderRadius: 8,
          overflow: 'hidden'
        }} 
      />
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        marginTop: 10,
        fontSize: '12px',
        color: '#666'
      }}>
        <span>低应力 (蓝色)</span>
        <span>←</span>
        <span>高应力 (红色)</span>
      </div>
    </div>
  );
};
