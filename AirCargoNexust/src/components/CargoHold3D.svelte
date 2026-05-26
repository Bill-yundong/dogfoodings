<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import type { Cargo, CargoPlacement, AircraftSpec } from '@/types';
  import { getRotatedDimensions } from '@/utils/calculations';

  let {
    placements = [] as CargoPlacement[],
    cargos = [] as Cargo[],
    aircraft = null as AircraftSpec | null,
    highlightedCargoId = null as string | null
  }: {
    placements?: CargoPlacement[];
    cargos?: Cargo[];
    aircraft?: AircraftSpec | null;
    highlightedCargoId?: string | null;
  } = $props();

  let container: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let cargoMeshes: Map<string, THREE.Mesh> = new Map();
  let animationId: number;
  let isInitialized = $state(false);

  const zoneColors: Record<string, number> = {
    A: 0x2a6f97,
    B: 0x16537e,
    C: 0x0f3460
  };

  function initScene() {
    if (!container || !aircraft) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
    camera.position.set(
      aircraft.cargoHoldDimensions.length * 0.8,
      aircraft.cargoHoldDimensions.width * 1.2,
      aircraft.cargoHoldDimensions.height * 1.5
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;

    setupLighting();
    createCargoHold();
    createGrid();

    isInitialized = true;
    animate();
  }

  function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(2000, 3000, 2000);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 10000;
    mainLight.shadow.camera.left = -3000;
    mainLight.shadow.camera.right = 3000;
    mainLight.shadow.camera.top = 3000;
    mainLight.shadow.camera.bottom = -3000;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
    fillLight.position.set(-2000, 1000, -1000);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x00ffaa, 0.3);
    rimLight.position.set(0, 500, -2000);
    scene.add(rimLight);
  }

  function createCargoHold() {
    if (!aircraft) return;

    const { length, width, height } = aircraft.cargoHoldDimensions;
    
    const edgeGeometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(length, height, width)
    );
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x2a6f97, 
      transparent: true, 
      opacity: 0.6 
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.set(length / 2, height / 2, 0);
    scene.add(edges);

    const floorGeometry = new THREE.PlaneGeometry(length, width);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(length / 2, 0, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    for (const zone of aircraft.cargoZones) {
      const zoneLength = zone.boundaries.maxX - zone.boundaries.minX;
      const zoneGeometry = new THREE.BoxGeometry(zoneLength, 0.5, width);
      const zoneMaterial = new THREE.MeshStandardMaterial({
        color: zoneColors[zone.code] || 0x2a6f97,
        transparent: true,
        opacity: 0.15,
        roughness: 0.5,
        metalness: 0.3
      });
      const zoneMesh = new THREE.Mesh(zoneGeometry, zoneMaterial);
      zoneMesh.position.set(
        (zone.boundaries.minX + zone.boundaries.maxX) / 2,
        0.25,
        0
      );
      scene.add(zoneMesh);

      const zoneEdgeGeo = new THREE.EdgesGeometry(zoneGeometry);
      const zoneEdgeMat = new THREE.LineBasicMaterial({ 
        color: zoneColors[zone.code] || 0x2a6f97, 
        transparent: true, 
        opacity: 0.4 
      });
      const zoneEdges = new THREE.LineSegments(zoneEdgeGeo, zoneEdgeMat);
      zoneEdges.position.copy(zoneMesh.position);
      scene.add(zoneEdges);
    }
  }

  function createGrid() {
    if (!aircraft) return;
    
    const gridHelper = new THREE.GridHelper(
      aircraft.cargoHoldDimensions.length,
      20,
      0x1e3a5f,
      0x1a2a3f
    );
    gridHelper.position.set(
      aircraft.cargoHoldDimensions.length / 2,
      0.1,
      0
    );
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(300);
    axesHelper.position.set(50, 5, 200);
    scene.add(axesHelper);
  }

  function updateCargoMeshes() {
    if (!scene || !aircraft) return;

    for (const [, mesh] of cargoMeshes) {
      scene.remove(mesh);
      if (Array.isArray(mesh.geometry)) {
        mesh.geometry.forEach(g => g.dispose());
      } else {
        mesh.geometry.dispose();
      }
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    cargoMeshes.clear();

    for (const placement of placements) {
      const cargo = cargos.find(c => c.id === placement.cargoId);
      if (!cargo) continue;

      const dims = getRotatedDimensions(cargo.dimensions, placement.rotation);
      const geometry = new THREE.BoxGeometry(dims.length, dims.height, dims.width);
      
      const isHighlighted = highlightedCargoId === cargo.id;
      const isDangerous = cargo.isDangerous;
      
      let color: number;
      if (isHighlighted) {
        color = 0x2ec4b6;
      } else if (isDangerous) {
        color = 0xff6b35;
      } else {
        color = zoneColors[placement.zone] || 0x2a6f97;
      }

      const material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: isHighlighted ? 0.95 : 0.85,
        roughness: 0.4,
        metalness: 0.3,
        emissive: isHighlighted ? color : 0x000000,
        emissiveIntensity: isHighlighted ? 0.3 : 0
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        placement.position.x + dims.length / 2,
        placement.position.z + dims.height / 2,
        placement.position.y + dims.width / 2
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { cargoId: cargo.id, cargoName: cargo.name };

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: isHighlighted ? 0xffffff : 0x4488aa, 
        transparent: true, 
        opacity: 0.8 
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      mesh.add(edges);

      scene.add(mesh);
      cargoMeshes.set(cargo.id, mesh);
    }
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
  }

  function handleResize() {
    if (!container || !camera || !renderer || !aircraft) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function resetCamera() {
    if (!camera || !aircraft || !controls) return;
    camera.position.set(
      aircraft.cargoHoldDimensions.length * 0.8,
      aircraft.cargoHoldDimensions.width * 1.2,
      aircraft.cargoHoldDimensions.height * 1.5
    );
    controls.target.set(
      aircraft.cargoHoldDimensions.length / 2,
      100,
      0
    );
    controls.update();
  }

  function setTopView() {
    if (!camera || !aircraft || !controls) return;
    camera.position.set(
      aircraft.cargoHoldDimensions.length / 2,
      Math.max(aircraft.cargoHoldDimensions.width, aircraft.cargoHoldDimensions.length) * 1.5,
      0.1
    );
    controls.target.set(
      aircraft.cargoHoldDimensions.length / 2,
      0,
      0
    );
    controls.update();
  }

  function setSideView() {
    if (!camera || !aircraft || !controls) return;
    camera.position.set(
      aircraft.cargoHoldDimensions.length / 2,
      200,
      aircraft.cargoHoldDimensions.width * 1.8
    );
    controls.target.set(
      aircraft.cargoHoldDimensions.length / 2,
      100,
      0
    );
    controls.update();
  }

  function setFrontView() {
    if (!camera || !aircraft || !controls) return;
    camera.position.set(
      aircraft.cargoHoldDimensions.length * 1.5,
      200,
      0
    );
    controls.target.set(
      aircraft.cargoHoldDimensions.length / 2,
      100,
      0
    );
    controls.update();
  }

  $effect(() => {
    if (isInitialized) {
      updateCargoMeshes();
    }
  });

  onMount(() => {
    initScene();
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    window.removeEventListener('resize', handleResize);
    cancelAnimationFrame(animationId);
    
    if (renderer) {
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }
  });


</script>

<div bind:this={container} class="w-full h-full relative">
  <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
    <button 
      onclick={resetCamera}
      class="btn-secondary text-xs py-1.5 px-3"
      title="重置视角"
    >
      重置
    </button>
    <button 
      onclick={setTopView}
      class="btn-secondary text-xs py-1.5 px-3"
      title="俯视图"
    >
      俯视
    </button>
    <button 
      onclick={setSideView}
      class="btn-secondary text-xs py-1.5 px-3"
      title="侧视图"
    >
      侧视
    </button>
    <button 
      onclick={setFrontView}
      class="btn-secondary text-xs py-1.5 px-3"
      title="前视图"
    >
      前视
    </button>
  </div>

  <div class="absolute bottom-4 left-4 z-10 glass-panel p-3 text-xs">
    <div class="hud-text mb-1">图例</div>
    <div class="flex items-center gap-2 mb-1">
      <span class="w-3 h-3 rounded" style="background: #2a6f97"></span>
      <span class="text-gray-400">普通货物</span>
    </div>
    <div class="flex items-center gap-2 mb-1">
      <span class="w-3 h-3 rounded" style="background: #ff6b35"></span>
      <span class="text-gray-400">危险品</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded" style="background: #2ec4b6"></span>
      <span class="text-gray-400">选中</span>
    </div>
  </div>
</div>
