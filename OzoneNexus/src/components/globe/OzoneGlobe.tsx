"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OzoneDataPoint } from "@/types";

interface OzoneGlobeProps {
  dataPoints?: OzoneDataPoint[];
  onPointClick?: (point: OzoneDataPoint) => void;
  width?: number;
  height?: number;
}

export function OzoneGlobe({
  dataPoints = [],
  onPointClick,
  width = 800,
  height = 600,
}: OzoneGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  const latLongToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  };

  const getOzoneColor = (concentration: number): THREE.Color => {
    const normalized = Math.min(Math.max((concentration - 200) / 150, 0, 1);

    if (normalized < 0.33) {
      return new THREE.Color().lerpColors(
        new THREE.Color(0x00ff00),
        new THREE.Color(0xffff00),
        normalized / 0.33
      );
    } else if (normalized < 0.66) {
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffff00),
        new THREE.Color(0xff8800),
        (normalized - 0.33) / 0.33
      );
    } else {
      return new THREE.Color().lerpColors(
        new THREE.Color(0xff8800),
        new THREE.Color(0xff0000),
        (normalized - 0.66) / 0.34
      );
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4488ff, 0.5);
    pointLight.position.set(-5, -3, -5);
    scene.add(pointLight);

    const earthGeometry = new THREE.SphereGeometry(1.5, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a4d6e,
      shininess: 25,
      transparent: true,
      opacity: 0.9,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    const wireframeGeometry = new THREE.SphereGeometry(1.51, 32, 32);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);

    const ozoneGeometry = new THREE.SphereGeometry(1.55, 64, 64);
    const ozoneMaterial = new THREE.MeshPhongMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const ozoneLayer = new THREE.Mesh(ozoneGeometry, ozoneMaterial);
    scene.add(ozoneLayer);

    const atmosphereGeometry = new THREE.SphereGeometry(1.7, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    const starsGeometry = new THREE.BufferGeometry();
    const starVertices: number[] = [];
    for (let i = 0; i < 5000; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      starVertices.push(x, y, z);
    }
    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starVertices, 3)
    );
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    setIsLoaded(true);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      earth.rotation.y += 0.001;
      wireframe.rotation.y += 0.001;
      ozoneLayer.rotation.y += 0.001;
      atmosphere.rotation.y += 0.0005;

      if (!isDraggingRef.current) {
        earth.rotation.x += rotationVelocityRef.current.x;
        earth.rotation.y += rotationVelocityRef.current.y;
        rotationVelocityRef.current.x *= 0.95;
        rotationVelocityRef.current.y *= 0.95;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (!sceneRef.current || !isLoaded) return;

    const scene = sceneRef.current;

    const oldPoints = scene.children.filter(
      (child) => child instanceof THREE.Mesh && child.userData.isDataPoint
    );
    oldPoints.forEach((point) => {
      scene.remove(point);
      if (point instanceof THREE.Mesh) {
        point.geometry.dispose();
        if (Array.isArray(point.material)) {
          point.material.forEach((m) => m.dispose());
        } else {
          point.material.dispose();
        }
      }
    });

    dataPoints.forEach((point) => {
      const position = latLongToVector3(point.latitude, point.longitude, 1.55);
      const geometry = new THREE.SphereGeometry(0.03, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: getOzoneColor(point.ozoneConcentration),
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData = { isDataPoint: true, data: point };
      scene.add(mesh);
    });
  }, [dataPoints, isLoaded]);

  useEffect(() => {
    if (!containerRef.current || !sceneRef.current || !cameraRef.current) return;

    const container = containerRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !sceneRef.current) return;

      const deltaX = e.clientX - previousMouseRef.current.x;
      const deltaY = e.clientY - previousMouseRef.current.y;

      scene.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.y += deltaX * 0.005;
          child.rotation.x += deltaY * 0.005;
          child.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, child.rotation.x));
        }
      });

      rotationVelocityRef.current = {
        x: deltaY * 0.0002,
        y: deltaX * 0.0002,
      };

      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (!onPointClick) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / width * 2 - 1,
        -((e.clientY - rect.top) / height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const dataPoints = scene.children.filter(
        (child) => child instanceof THREE.Mesh && child.userData.isDataPoint
      );

      const intersects = raycaster.intersectObjects(dataPoints);

      if (intersects.length > 0) {
        const clickedPoint = intersects[0].object as THREE.Mesh;
        onPointClick(clickedPoint.userData.data);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const camera = cameraRef.current;
      camera.position.z = Math.max(3, Math.min(10, camera.position.z + e.deltaY * 0.01));
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseUp);
    container.addEventListener("click", handleClick);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseUp);
      container.removeEventListener("click", handleClick);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [onPointClick, width, height]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden glow-effect cursor-grab active:cursor-grabbing"
      style={{ width, height }}
    />
  );
}
