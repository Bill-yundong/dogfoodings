import { onMount, onCleanup, createEffect } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BeltState, TensionAnalysisResult, SensorData } from '@/types';
import { settings } from '@/stores/settingsStore';

interface BeltSceneProps {
  beltState: BeltState | null;
  tensionAnalysis: TensionAnalysisResult | null;
  sensorData: SensorData[];
  onSensorClick?: (sensorId: string) => void;
}

export function BeltScene(props: BeltSceneProps) {
  let containerRef: HTMLDivElement | undefined;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let beltMesh: THREE.Mesh;
  let sensorMeshes: THREE.Mesh[] = [];
  let animationId: number;
  let beltOffset = 0;

  const BELT_LENGTH = 20;
  const BELT_WIDTH = 1.5;
  const SEGMENTS = 100;

  function initScene(container: HTMLDivElement) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    scene.fog = new THREE.Fog(0x0d1117, 15, 40);

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2.1;

    addLights();
    createBelt();
    createSensors();
    createEnvironment();
    animate();

    window.addEventListener('resize', handleResize);
  }

  function addLights() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const blueLight = new THREE.PointLight(0x0066ff, 0.8, 20);
    blueLight.position.set(-5, 3, -5);
    scene.add(blueLight);

    const orangeLight = new THREE.PointLight(0xff6600, 0.5, 15);
    orangeLight.position.set(5, 2, 5);
    scene.add(orangeLight);
  }

  function createBelt() {
    const geometry = new THREE.PlaneGeometry(BELT_LENGTH, BELT_WIDTH, SEGMENTS, 10);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const originalPositions = new Float32Array(positions.array);

    for (let i = 0; i < positions.count; i++) {
      const x = originalPositions[i * 3];
      const y = originalPositions[i * 3 + 1];
      
      const sag = Math.sin((x / BELT_LENGTH + 0.5) * Math.PI) * 0.3;
      positions.setY(i, y - sag);
    }

    geometry.computeVertexNormals();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTensionData: { value: new Float32Array(SEGMENTS + 1).fill(0.5) },
        uMinTension: { value: 30 },
        uMaxTension: { value: 100 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uTensionData[101];
        uniform float uMinTension;
        uniform float uMaxTension;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        vec3 getTensionColor(float tension) {
          float t = clamp((tension - uMinTension) / (uMaxTension - uMinTension), 0.0, 1.0);
          
          vec3 colorLow = vec3(0.0, 0.96, 0.83);
          vec3 colorMid = vec3(1.0, 0.42, 0.21);
          vec3 colorHigh = vec3(0.94, 0.27, 0.27);
          
          if (t < 0.5) {
            return mix(colorLow, colorMid, t * 2.0);
          } else {
            return mix(colorMid, colorHigh, (t - 0.5) * 2.0);
          }
        }
        
        void main() {
          int idx = int(floor(vUv.x * 100.0));
          float tension = uTensionData[idx];
          vec3 baseColor = getTensionColor(tension);
          
          float stripe = sin(vUv.x * 80.0 + uTime * 2.0) * 0.5 + 0.5;
          stripe = smoothstep(0.45, 0.55, stripe);
          
          float edge = smoothstep(0.0, 0.02, vUv.y) * smoothstep(1.0, 0.98, vUv.y);
          vec3 finalColor = mix(baseColor * 0.7, baseColor, edge);
          finalColor += stripe * 0.1;
          
          float fresnel = pow(1.0 - abs(dot(normalize(vPosition), vec3(0.0, 1.0, 0.0))), 3.0);
          finalColor += fresnel * vec3(0.0, 0.4, 0.8) * 0.3;
          
          gl_FragColor = vec4(finalColor, 0.95);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    beltMesh = new THREE.Mesh(geometry, material);
    beltMesh.receiveShadow = true;
    scene.add(beltMesh);

    const frameGeometry = new THREE.BoxGeometry(BELT_LENGTH + 0.2, 0.15, BELT_WIDTH + 0.3);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.8,
      roughness: 0.3,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = -0.25;
    scene.add(frame);

    for (let i = 0; i < 6; i++) {
      const rollerGeometry = new THREE.CylinderGeometry(0.2, 0.2, BELT_WIDTH + 0.4, 16);
      const rollerMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d3436,
        metalness: 0.9,
        roughness: 0.2,
      });
      const roller = new THREE.Mesh(rollerGeometry, rollerMaterial);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(-BELT_LENGTH / 2 + i * (BELT_LENGTH / 5), -0.35, 0);
      scene.add(roller);
    }
  }

  function createSensors() {
    const sensorGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    
    for (let i = 0; i < 20; i++) {
      const sensorMaterial = new THREE.MeshStandardMaterial({
        color: 0x00f5d4,
        emissive: 0x00f5d4,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      });
      
      const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
      const x = -BELT_LENGTH / 2 + (i / 19) * BELT_LENGTH;
      const sag = Math.sin((x / BELT_LENGTH + 0.5) * Math.PI) * 0.3;
      sensor.position.set(x, 0.05 - sag, 0);
      sensor.userData = { sensorId: `sensor_${i.toString().padStart(3, '0')}` };
      
      scene.add(sensor);
      sensorMeshes.push(sensor);
    }
  }

  function createEnvironment() {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0f,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(30, 30, 0x1a1a2e, 0x0f0f18);
    gridHelper.position.y = -0.99;
    scene.add(gridHelper);
  }

  function updateTensionColors(profile: number[]) {
    if (!beltMesh) return;
    
    const material = beltMesh.material as THREE.ShaderMaterial;
    const tensionData = material.uniforms.uTensionData.value as Float32Array;
    
    for (let i = 0; i < Math.min(profile.length, tensionData.length); i++) {
      tensionData[i] = profile[i];
    }
    
    material.uniforms.uMinTension.value = 30;
    material.uniforms.uMaxTension.value = 100;
  }

  function updateSensorStates(data: SensorData[]) {
    for (let i = 0; i < sensorMeshes.length && i < data.length; i++) {
      const sensor = sensorMeshes[i];
      const sensorData = data[i];
      const material = sensor.material as THREE.MeshStandardMaterial;
      
      if (sensorData) {
        const intensity = Math.min(1, sensorData.tension / 100);
        material.emissiveIntensity = 0.3 + intensity * 0.7;
        
        if (sensorData.tension > 80) {
          material.emissive.setHex(0xff4444);
          material.color.setHex(0xff6666);
        } else if (sensorData.tension > 60) {
          material.emissive.setHex(0xff8800);
          material.color.setHex(0xffaa00);
        } else {
          material.emissive.setHex(0x00f5d4);
          material.color.setHex(0x00f5d4);
        }
      }
    }
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    
    beltOffset += 0.01;
    if (beltMesh) {
      const material = beltMesh.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = beltOffset;
    }
    
    const time = Date.now() * 0.001;
    for (let i = 0; i < sensorMeshes.length; i++) {
      const sensor = sensorMeshes[i];
      const baseY = sensor.position.y;
      sensor.position.y = baseY + Math.sin(time * 2 + i * 0.3) * 0.01;
    }
    
    controls.update();
    renderer.render(scene, camera);
  }

  function handleResize() {
    if (!containerRef || !camera || !renderer) return;
    
    const width = containerRef.clientWidth;
    const height = containerRef.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  createEffect(() => {
    if (props.tensionAnalysis) {
      updateTensionColors(props.tensionAnalysis.profile);
    }
  });

  createEffect(() => {
    if (props.sensorData.length > 0) {
      updateSensorStates(props.sensorData);
    }
  });

  createEffect(() => {
    if (scene) {
      const isDark = settings.theme === 'dark';
      const bgColor = isDark ? 0x0d1117 : 0xf0f4f8;
      scene.background = new THREE.Color(bgColor);
      scene.fog = new THREE.Fog(bgColor, 15, 40);
    }
  });

  onMount(() => {
    if (containerRef) {
      initScene(containerRef);
    }
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    cancelAnimationFrame(animationId);
    if (renderer) {
      renderer.dispose();
      containerRef?.removeChild(renderer.domElement);
    }
  });

  return (
    <div
      ref={containerRef}
      class="w-full h-full rounded-xl overflow-hidden border border-industrial-700/50"
      style={{ background: '#0d1117' }}
    />
  );
}
