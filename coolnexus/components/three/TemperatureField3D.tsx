'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TemperaturePoint, Rack, PrecisionAC } from '@/lib/types/datacenter';

interface TemperatureField3DProps {
  temperaturePoints: TemperaturePoint[];
  racks: Rack[];
  acs: PrecisionAC[];
  width?: number;
  height?: number;
}

export default function TemperatureField3D({
  temperaturePoints,
  racks,
  acs,
  width = 800,
  height = 500
}: TemperatureField3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointsMeshRef = useRef<THREE.Points | null>(null);
  const rackMeshesRef = useRef<THREE.Mesh[]>([]);
  const acMeshesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(25, 20, 25);
    camera.lookAt(10, 0, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(40, 40, 0x333333, 0x222222);
    scene.add(gridHelper);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let spherical = new THREE.Spherical(35, Math.PI / 4, 0);

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
      
      camera.position.setFromSpherical(spherical);
      camera.lookAt(10, 2, 10);
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(15, Math.min(60, spherical.radius + e.deltaY * 0.05));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(10, 2, 10);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (!sceneRef.current || temperaturePoints.length === 0) return;

    if (pointsMeshRef.current) {
      sceneRef.current.remove(pointsMeshRef.current);
      pointsMeshRef.current.geometry.dispose();
      (pointsMeshRef.current.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(temperaturePoints.length * 3);
    const colors = new Float32Array(temperaturePoints.length * 3);

    temperaturePoints.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const color = getTemperatureColor(point.temperature);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const pointsMesh = new THREE.Points(geometry, material);
    sceneRef.current.add(pointsMesh);
    pointsMeshRef.current = pointsMesh;
  }, [temperaturePoints]);

  useEffect(() => {
    if (!sceneRef.current) return;

    rackMeshesRef.current.forEach(mesh => {
      sceneRef.current!.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    rackMeshesRef.current = [];

    racks.forEach(rack => {
      const geometry = new THREE.BoxGeometry(1, 4, 2);
      const avgTemp = rack.outletTemperature;
      const color = getTemperatureColor(avgTemp);
      
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(color.r, color.g, color.b),
        transparent: true,
        opacity: 0.7
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        rack.position.col * 2.5 + 1,
        2,
        rack.position.row * 3 + 1
      );

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      sceneRef.current!.add(mesh);
      rackMeshesRef.current.push(mesh);
    });
  }, [racks]);

  useEffect(() => {
    if (!sceneRef.current) return;

    acMeshesRef.current.forEach(mesh => {
      sceneRef.current!.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    acMeshesRef.current = [];

    acs.forEach(ac => {
      const geometry = new THREE.BoxGeometry(3, 2, 2);
      const material = new THREE.MeshLambertMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.8
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        ac.position.col * 2.5 + 2,
        1,
        ac.position.row * 3 + 1
      );

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x60a5fa });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      sceneRef.current!.add(mesh);
      acMeshesRef.current.push(mesh);
    });
  }, [acs]);

  return <div ref={containerRef} className="rounded-lg overflow-hidden" />;
}

function getTemperatureColor(temp: number): { r: number; g: number; b: number } {
  if (temp < 20) return { r: 0.04, g: 0.71, b: 0.83 };
  if (temp < 25) return { r: 0.06, g: 0.73, b: 0.91 };
  if (temp < 30) return { r: 0.06, g: 0.65, b: 0.51 };
  if (temp < 35) return { r: 0.2, g: 0.83, b: 0.6 };
  if (temp < 40) return { r: 0.96, g: 0.62, b: 0.04 };
  if (temp < 45) return { r: 0.98, g: 0.44, b: 0.44 };
  return { r: 0.86, g: 0.15, b: 0.15 };
}
