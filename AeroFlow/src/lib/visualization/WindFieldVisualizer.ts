import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FlowField, Building } from '../turbulence/RNGKEpsilon';

export interface VisualizationConfig {
  showVelocityVectors: boolean;
  showPressureContours: boolean;
  showTurbulence: boolean;
  showBuildings: boolean;
  vectorScale: number;
  vectorDensity: number;
  pressureColorScale: number;
  slicePlane: 'xy' | 'xz' | 'yz';
  slicePosition: number;
}

export const DEFAULT_CONFIG: VisualizationConfig = {
  showVelocityVectors: true,
  showPressureContours: false,
  showTurbulence: false,
  showBuildings: true,
  vectorScale: 5.0,
  vectorDensity: 4,
  pressureColorScale: 100.0,
  slicePlane: 'xz',
  slicePosition: 0.5
};

export class WindFieldVisualizer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private config: VisualizationConfig;
  
  private flowField: FlowField | null = null;
  private buildings: Building[] = [];
  
  private vectorGroup: THREE.Group;
  private buildingGroup: THREE.Group;
  private pressurePlane: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper;
  private velocityLegend: THREE.Mesh | null = null;

  private animationId: number | null = null;
  private particleSystems: THREE.Points[] = [];
  private boundHandleResize: () => void;

  constructor(container: HTMLElement, config: Partial<VisualizationConfig> = {}) {
    this.container = container;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.boundHandleResize = this.handleResize.bind(this);
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
    this.camera.position.set(200, 150, 200);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(250, 50, 250);
    
    this.vectorGroup = new THREE.Group();
    this.buildingGroup = new THREE.Group();
    this.scene.add(this.vectorGroup);
    this.scene.add(this.buildingGroup);
    
    this.gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x333333);
    this.scene.add(this.gridHelper);
    
    this.addLighting();
    this.addAxesHelper();
    
    window.addEventListener('resize', this.boundHandleResize);
    this.animate();
  }

  private addLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x4a90d9, 0.5, 500);
    pointLight.position.set(0, 150, 0);
    this.scene.add(pointLight);
  }

  private addAxesHelper(): void {
    const axesHelper = new THREE.AxesHelper(100);
    this.scene.add(axesHelper);
  }

  setFlowField(flowField: FlowField): void {
    this.flowField = flowField;
    this.updateVisualization();
  }

  setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
    this.updateBuildings();
  }

  updateConfig(config: Partial<VisualizationConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateVisualization();
  }

  private updateVisualization(): void {
    this.clearVisualization();
    
    if (!this.flowField) return;
    
    if (this.config.showVelocityVectors) {
      this.createVelocityVectors();
    }
    
    if (this.config.showPressureContours) {
      this.createPressurePlane();
    }
    
    if (this.config.showTurbulence) {
      this.createTurbulenceParticles();
    }
  }

  private clearVisualization(): void {
    while (this.vectorGroup.children.length > 0) {
      const child = this.vectorGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      } else if (child instanceof THREE.ArrowHelper) {
        child.line.geometry.dispose();
        if (child.line.material instanceof THREE.Material) {
          child.line.material.dispose();
        }
        if (child.cone) {
          child.cone.geometry.dispose();
          if (child.cone.material instanceof THREE.Material) {
            child.cone.material.dispose();
          }
        }
      }
      this.vectorGroup.remove(child);
    }
    
    this.particleSystems.forEach(ps => {
      ps.geometry.dispose();
      if (ps.material instanceof THREE.Material) {
        ps.material.dispose();
      }
    });
    this.particleSystems = [];
    
    if (this.pressurePlane) {
      this.pressurePlane.geometry.dispose();
      if (this.pressurePlane.material instanceof THREE.Material) {
        this.pressurePlane.material.dispose();
      }
      this.scene.remove(this.pressurePlane);
      this.pressurePlane = null;
    }
  }

  private createVelocityVectors(): void {
    if (!this.flowField) return;
    
    const { nx, ny, nz, dx, dy, dz, u, v, w, pressure } = this.flowField;
    const density = this.config.vectorDensity;
    
    for (let k = 0; k < nz; k += density) {
      for (let j = 0; j < ny; j += density) {
        for (let i = 0; i < nx; i += density) {
          const idx = k * nx * ny + j * nx + i;
          const speed = Math.sqrt(u[idx] * u[idx] + v[idx] * v[idx] + w[idx] * w[idx]);
          
          if (speed < 0.01) continue;
          
          const origin = new THREE.Vector3(i * dx, k * dz, j * dy);
          const direction = new THREE.Vector3(u[idx], w[idx], v[idx]).normalize();
          const length = speed * this.config.vectorScale;
          
          const color = this.getVelocityColor(speed);
          
          const arrowHelper = new THREE.ArrowHelper(
            direction,
            origin,
            length,
            color,
            length * 0.2,
            length * 0.1
          );
          
          this.vectorGroup.add(arrowHelper);
        }
      }
    }
  }

  private getVelocityColor(speed: number): number {
    const maxSpeed = 20;
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
    
    const hue = (1 - normalizedSpeed) * 0.65;
    return new THREE.Color().setHSL(hue, 1, 0.5).getHex();
  }

  private getPressureColor(pressure: number, scale: number): number {
    const normalizedPressure = Math.max(-1, Math.min(1, pressure / scale));
    
    if (normalizedPressure < 0) {
      return new THREE.Color().setHSL(0.65, 1, 0.5 + normalizedPressure * 0.5).getHex();
    } else {
      return new THREE.Color().setHSL(0, 1, 0.5 + normalizedPressure * 0.5).getHex();
    }
  }

  private createPressurePlane(): void {
    if (!this.flowField) return;
    
    const { nx, ny, nz, dx, dy, dz, pressure } = this.flowField;
    const planeSize = 500;
    
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize, 50, 50);
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      const gridX = Math.floor((x + planeSize / 2) / dx);
      const gridY = Math.floor((y + planeSize / 2) / dy);
      const gridZ = Math.floor(nz * this.config.slicePosition);
      
      const idx = Math.max(0, Math.min(nx * ny * nz - 1, 
        gridZ * nx * ny + Math.max(0, Math.min(ny - 1, gridY)) * nx + Math.max(0, Math.min(nx - 1, gridX))
      ));
      
      const p = pressure[idx];
      const color = new THREE.Color(this.getPressureColor(p, this.config.pressureColorScale));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    
    this.pressurePlane = new THREE.Mesh(geometry, material);
    this.pressurePlane.rotation.x = -Math.PI / 2;
    this.pressurePlane.position.set(250, 10, 250);
    this.scene.add(this.pressurePlane);
  }

  private createTurbulenceParticles(): void {
    if (!this.flowField) return;
    
    const { nx, ny, nz, dx, dy, dz, k } = this.flowField;
    const particleCount = 5000;
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * nx * dx;
      const y = Math.random() * nz * dz;
      const z = Math.random() * ny * dy;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      const gridX = Math.floor(x / dx);
      const gridY = Math.floor(y / dy);
      const gridZ = Math.floor(z / dz);
      const idx = gridZ * nx * ny + gridY * nx + gridX;
      
      const turb = k[Math.min(idx, k.length - 1)];
      const normalizedTurb = Math.min(turb / 5, 1);
      
      const color = new THREE.Color().setHSL(0.3 - normalizedTurb * 0.3, 1, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });
    
    const particleSystem = new THREE.Points(geometry, material);
    this.particleSystems.push(particleSystem);
    this.vectorGroup.add(particleSystem);
  }

  private updateBuildings(): void {
    while (this.buildingGroup.children.length > 0) {
      const child = this.buildingGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      this.buildingGroup.remove(child);
    }
    
    this.buildings.forEach(building => {
      const geometry = new THREE.BoxGeometry(
        building.width,
        building.height,
        building.depth
      );
      
      const material = new THREE.MeshPhongMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        building.x + building.width / 2,
        building.z + building.height / 2,
        building.y + building.depth / 2
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      this.buildingGroup.add(mesh);
      
      if (building.surfacePressure && building.surfacePressure.length > 0) {
        this.addBuildingPressureOverlay(building);
      }
    });
  }

  private addBuildingPressureOverlay(building: Building): void {
    if (!building.surfacePressure) return;
    
    const edgeGeometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(building.width, building.height, building.depth)
    );
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: this.getPressureColor(
        building.surfacePressure.reduce((a, b) => a + b, 0) / building.surfacePressure.length,
        this.config.pressureColorScale
      ),
      linewidth: 2
    });
    
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.set(
      building.x + building.width / 2,
      building.z + building.height / 2,
      building.y + building.depth / 2
    );
    
    this.buildingGroup.add(edges);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize(): void {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  resetCamera(): void {
    this.camera.position.set(200, 150, 200);
    this.controls.target.set(250, 50, 250);
    this.controls.update();
  }

  exportScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    window.removeEventListener('resize', this.boundHandleResize);
    this.clearVisualization();
    
    while (this.buildingGroup.children.length > 0) {
      const child = this.buildingGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      } else if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      this.buildingGroup.remove(child);
    }
    
    this.controls.dispose();
    this.renderer.dispose();
    
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
