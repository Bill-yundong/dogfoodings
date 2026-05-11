import { createEffect, createSignal, onCleanup } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainPoint, FirePoint } from '../types';

interface Terrain3DProps {
  terrain: TerrainPoint[][];
  fires: FirePoint[];
}

export function Terrain3D(props: Terrain3DProps) {
  let containerRef: HTMLDivElement | undefined;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let terrainMesh: THREE.Mesh;
  let fireMeshes: THREE.Mesh[] = [];
  let animationId: number;

  const [container, setContainer] = createSignal<HTMLDivElement>();

  createEffect(() => {
    const el = container();
    if (!el) return;

    initScene(el);
    animate();

    onCleanup(() => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      controls.dispose();
    });
  });

  createEffect(() => {
    if (props.terrain.length > 0 && scene) {
      updateTerrain();
    }
  });

  createEffect(() => {
    if (scene) {
      updateFires();
    }
  });

  function initScene(container: HTMLElement) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 1000, 3000);

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000);
    camera.position.set(800, 600, 800);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;

    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(500, 1000, 500);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 2000;
    sunLight.shadow.camera.left = -1000;
    sunLight.shadow.camera.right = 1000;
    sunLight.shadow.camera.top = 1000;
    sunLight.shadow.camera.bottom = -1000;
    scene.add(sunLight);

    window.addEventListener('resize', handleResize);
  }

  function handleResize() {
    const el = container();
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function updateTerrain() {
    if (terrainMesh) {
      scene.remove(terrainMesh);
      terrainMesh.geometry.dispose();
      (terrainMesh.material as THREE.Material).dispose();
    }

    const gridSize = props.terrain.length;
    const geometry = new THREE.PlaneGeometry(
      gridSize * 10,
      gridSize * 10,
      gridSize - 1,
      gridSize - 1
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j;
        const elevation = props.terrain[i][j].elevation;
        positions.setZ(index, elevation * 0.5);

        const normalizedHeight = elevation / 1500;
        const color = new THREE.Color();
        
        if (normalizedHeight < 0.3) {
          color.setHSL(0.3, 0.6, 0.25 + normalizedHeight * 0.3);
        } else if (normalizedHeight < 0.6) {
          color.setHSL(0.25 - normalizedHeight * 0.1, 0.5, 0.35);
        } else {
          color.setHSL(0, 0, 0.5 + normalizedHeight * 0.3);
        }

        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    });

    terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    const gridHelper = new THREE.GridHelper(gridSize * 10, gridSize / 2, 0x444444, 0x333333);
    gridHelper.position.y = 1;
    scene.add(gridHelper);
  }

  function updateFires() {
    fireMeshes.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    fireMeshes = [];

    props.fires.forEach(fire => {
      const fireGeometry = new THREE.ConeGeometry(
        15 + fire.intensity * 5,
        30 + fire.intensity * 20,
        8
      );
      
      const fireMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05 + fire.intensity * 0.05, 1, 0.5 + fire.intensity * 0.2),
        transparent: true,
        opacity: 0.8
      });

      const fireMesh = new THREE.Mesh(fireGeometry, fireMaterial);
      const height = props.terrain[Math.floor(fire.x / 10)]?.[Math.floor(fire.y / 10)]?.elevation * 0.5 || 0;
      fireMesh.position.set(
        fire.x - props.terrain.length * 5,
        height + 20 + fire.intensity * 10,
        fire.y - props.terrain.length * 5
      );
      fireMesh.rotation.x = Math.PI;
      
      scene.add(fireMesh);
      fireMeshes.push(fireMesh);
    });
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  return (
    <div 
      ref={(el) => {
        containerRef = el;
        setContainer(el);
      }}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
