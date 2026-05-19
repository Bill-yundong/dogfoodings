"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { RobotState, Obstacle, Vector3, PlannedPath } from "@/types";

interface RobotSceneProps {
  robots: RobotState[];
  obstacles: Obstacle[];
  paths?: Map<string, PlannedPath>;
  onRobotClick?: (robotId: string) => void;
  onTargetSelect?: (position: Vector3) => void;
  selectedRobotId?: string;
}

export default function RobotScene({
  robots,
  obstacles,
  paths,
  onRobotClick,
  onTargetSelect,
  selectedRobotId,
}: RobotSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const robotMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const obstacleMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const pathLinesRef = useRef<Map<string, THREE.Line>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const targetMarkerRef = useRef<THREE.Mesh | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
    scene.add(gridHelper);

    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3436,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    groundPlaneRef.current = ground;

    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    const targetGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const targetMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
    });
    const targetMarker = new THREE.Mesh(targetGeometry, targetMaterial);
    targetMarker.visible = false;
    scene.add(targetMarker);
    targetMarkerRef.current = targetMarker;

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 4 };
    let cameraDistance = 12;

    const updateCameraPosition = () => {
      const x = cameraDistance * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
      const y = cameraDistance * Math.cos(cameraAngle.phi);
      const z = cameraDistance * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        cameraAngle.theta += deltaX * 0.01;
        cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngle.phi + deltaY * 0.01));
        updateCameraPosition();
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      cameraDistance = Math.max(5, Math.min(30, cameraDistance + e.deltaY * 0.01));
      updateCameraPosition();
    };

    const handleClick = (e: MouseEvent) => {
      if (isDragging) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const robotMeshes = Array.from(robotMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(robotMeshes, true);

      if (intersects.length > 0) {
        let clickedGroup: THREE.Object3D | null = intersects[0].object;
        while (clickedGroup && !clickedGroup.userData.robotId) {
          clickedGroup = clickedGroup.parent;
        }
        if (clickedGroup && onRobotClick) {
          onRobotClick(clickedGroup.userData.robotId);
        }
      } else if (groundPlaneRef.current) {
        const groundIntersects = raycasterRef.current.intersectObject(groundPlaneRef.current);
        if (groundIntersects.length > 0 && onTargetSelect) {
          const point = groundIntersects[0].point;
          onTargetSelect({ x: point.x, y: point.y, z: point.z });
          if (targetMarkerRef.current) {
            targetMarkerRef.current.position.set(point.x, 0.1, point.z);
            targetMarkerRef.current.visible = true;
          }
        }
      }
    };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mouseup", handleMouseUp);
    renderer.domElement.addEventListener("mouseleave", handleMouseUp);
    renderer.domElement.addEventListener("wheel", handleWheel);
    renderer.domElement.addEventListener("click", handleClick);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;
      for (const group of robotMeshesRef.current.values()) {
        group.rotation.y = time * 0.1;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    setIsReady(true);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("mouseup", handleMouseUp);
      renderer.domElement.removeEventListener("mouseleave", handleMouseUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.domElement.removeEventListener("click", handleClick);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !isReady) return;

    const currentRobotIds = new Set(robots.map((r) => r.id));

    for (const [robotId, mesh] of robotMeshesRef.current) {
      if (!currentRobotIds.has(robotId)) {
        sceneRef.current.remove(mesh);
        robotMeshesRef.current.delete(robotId);
      }
    }

    for (const robot of robots) {
      let group = robotMeshesRef.current.get(robot.id);

      if (!group) {
        group = new THREE.Group();
        group.userData.robotId = robot.id;

        const colors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6];
        const colorIndex = parseInt(robot.id.replace(/\D/g, "")) % colors.length;
        const robotColor = colors[colorIndex];

        const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({
          color: robotColor,
          metalness: 0.5,
          roughness: 0.3,
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.1;
        base.castShadow = true;
        group.add(base);

        const armMaterial = new THREE.MeshStandardMaterial({
          color: robotColor,
          metalness: 0.6,
          roughness: 0.4,
        });

        const joint1Geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12);
        const joint1 = new THREE.Mesh(joint1Geometry, armMaterial);
        joint1.position.y = 0.6;
        joint1.castShadow = true;
        group.add(joint1);

        const joint2Geometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const joint2 = new THREE.Mesh(joint2Geometry, armMaterial);
        joint2.position.set(0.2, 1.1, 0);
        joint2.rotation.z = Math.PI / 4;
        joint2.castShadow = true;
        group.add(joint2);

        const joint3Geometry = new THREE.BoxGeometry(0.12, 0.5, 0.12);
        const joint3 = new THREE.Mesh(joint3Geometry, armMaterial);
        joint3.position.set(0.4, 1.3, 0);
        joint3.rotation.z = -Math.PI / 4;
        joint3.castShadow = true;
        group.add(joint3);

        const endEffectorGeometry = new THREE.SphereGeometry(0.1, 12, 12);
        const endEffectorMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: robotColor,
          emissiveIntensity: 0.3,
        });
        const endEffector = new THREE.Mesh(endEffectorGeometry, endEffectorMaterial);
        endEffector.position.set(0.5, 1.5, 0);
        endEffector.castShadow = true;
        group.add(endEffector);

        robotMeshesRef.current.set(robot.id, group);
        sceneRef.current.add(group);
      }

      group.position.set(robot.pose.position.x, robot.pose.position.y, robot.pose.position.z);
      group.rotation.set(
        (robot.pose.orientation.x * Math.PI) / 180,
        (robot.pose.orientation.y * Math.PI) / 180,
        (robot.pose.orientation.z * Math.PI) / 180
      );

      const statusColors: Record<string, number> = {
        idle: 0x3498db,
        moving: 0x2ecc71,
        paused: 0xf39c12,
        error: 0xe74c3c,
        collision: 0xe74c3c,
      };

      const statusColor = statusColors[robot.status] || 0x3498db;
      group.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (child.geometry instanceof THREE.SphereGeometry) {
            child.material.emissive.setHex(statusColor);
          }
        }
      });

      if (selectedRobotId === robot.id) {
        group.scale.set(1.1, 1.1, 1.1);
      } else {
        group.scale.set(1, 1, 1);
      }
    }
  }, [robots, isReady, selectedRobotId]);

  useEffect(() => {
    if (!sceneRef.current || !isReady) return;

    const currentObstacleIds = new Set(obstacles.map((o) => o.id));

    for (const [obstacleId, mesh] of obstacleMeshesRef.current) {
      if (!currentObstacleIds.has(obstacleId)) {
        sceneRef.current.remove(mesh);
        obstacleMeshesRef.current.delete(obstacleId);
      }
    }

    for (const obstacle of obstacles) {
      let mesh = obstacleMeshesRef.current.get(obstacle.id);

      if (!mesh) {
        const geometry = new THREE.BoxGeometry(obstacle.size.x, obstacle.size.y, obstacle.size.z);
        const material = new THREE.MeshStandardMaterial({
          color: obstacle.type === "dynamic" ? 0xe67e22 : 0x7f8c8d,
          transparent: true,
          opacity: 0.8,
          metalness: 0.3,
          roughness: 0.7,
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        obstacleMeshesRef.current.set(obstacle.id, mesh);
        sceneRef.current.add(mesh);
      }

      mesh.position.set(obstacle.position.x, obstacle.position.y, obstacle.position.z);
    }
  }, [obstacles, isReady]);

  useEffect(() => {
    if (!sceneRef.current || !isReady || !paths) return;

    const currentPathIds = new Set(paths.keys());

    for (const [pathId, line] of pathLinesRef.current) {
      if (!currentPathIds.has(pathId)) {
        sceneRef.current.remove(line);
        pathLinesRef.current.delete(pathId);
      }
    }

    for (const [robotId, path] of paths) {
      let line = pathLinesRef.current.get(robotId);

      const points = path.points.map(
        (p) => new THREE.Vector3(p.position.x, p.position.y + 0.05, p.position.z)
      );

      if (points.length < 2) continue;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x3498db,
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
      });

      if (line) {
        line.geometry.dispose();
        line.geometry = geometry;
      } else {
        line = new THREE.Line(geometry, material);
        pathLinesRef.current.set(robotId, line);
        sceneRef.current.add(line);
      }
    }
  }, [paths, isReady]);

  return <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-lg overflow-hidden" />;
}
