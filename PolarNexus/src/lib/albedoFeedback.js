import * as THREE from 'three';

export class AlbedoFeedbackRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.iceMesh = null;
    this.albedoParticles = null;
    this.animationId = null;
    this.time = 0;
    
    this.albedoData = {
      current: 0.35,
      target: 0.35,
      feedbackStrength: 0.4
    };
    
    this.init();
  }

  init() {
    this.scene.background = new THREE.Color(0x0a0a1a);
    
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    this.scene.add(directionalLight);
    
    this.createPoleSphere();
    this.createAlbedoParticles();
    this.createEnergyFlowLines();
    
    this.camera.position.z = 5;
    this.camera.position.y = 2;
    this.camera.lookAt(0, 0, 0);
  }

  createPoleSphere() {
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        albedo: { value: 0.35 },
        iceConcentration: { value: 0.7 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vElevation;
        
        void main() {
          vUv = uv;
          vNormal = normal;
          
          vec3 pos = position;
          float noise = sin(pos.x * 2.0 + pos.y * 3.0) * 0.1;
          vElevation = noise;
          pos.z += noise;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float albedo;
        uniform float iceConcentration;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vElevation;
        
        void main() {
          float lat = (vUv.y - 0.5) * 3.14159;
          float polarFactor = pow(abs(lat) / 1.57);
          
          vec3 iceColor = vec3(0.85, 0.92, 1.0);
          vec3 waterColor = vec3(0.1, 0.2, 0.4);
          
          float iceMask = smoothstep(0.3, 0.7, iceConcentration * polarFactor);
          
          vec3 baseColor = mix(waterColor, iceColor, iceMask);
          
          float albedoEffect = albedo * 0.5 + 0.5;
          baseColor *= albedoEffect;
          
          vec3 lightDir = normalize(vec3(0.5, 0.7, 0.3));
          float diff = max(dot(vNormal, lightDir), 0.0);
          
          vec3 finalColor = baseColor * (0.3 + 0.7 * diff);
          
          float glow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
          finalColor += vec3(0.3, 0.5, 0.8) * glow * 0.3;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    
    this.iceMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.iceMesh);
  }

  createAlbedoParticles() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 2.2 + Math.random() * 0.5;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
      
      const t = Math.random();
      colors[i * 3] = 0.5 + t * 0.5;
      colors[i * 3 + 1] = 0.7 + t * 0.3;
      colors[i * 3 + 2] = 1.0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });
    
    this.albedoParticles = new THREE.Points(geometry, material);
    this.scene.add(this.albedoParticles);
  }

  createEnergyFlowLines() {
    const lineCount = 50;
    this.energyLines = [];
    
    for (let i = 0; i < lineCount; i++) {
      const points = [];
      const startTheta = Math.random() * Math.PI * 2;
      const startPhi = Math.acos(2 * Math.random() - 1);
      
      for (let j = 0; j < 20; j++) {
        const t = j / 19;
        const radius = 2.1 + t * 2;
        points.push(new THREE.Vector3(
          radius * Math.sin(startPhi + t * 0.3) * Math.cos(startTheta + t * 0.5),
          radius * Math.sin(startPhi + t * 0.3) * Math.sin(startTheta + t * 0.5),
          radius * Math.cos(startPhi + t * 0.3)
        ));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.8, 0.6),
        transparent: true,
        opacity: 0.4
      });
      
      const line = new THREE.Line(geometry, material);
      line.userData = { speed: 0.5 + Math.random() * 0.5, offset: Math.random() };
      this.energyLines.push(line);
      this.scene.add(line);
    }
  }

  updateAlbedo(value) {
    this.albedoData.target = value;
  }

  updateIceConcentration(value) {
    if (this.iceMesh && this.iceMesh.material.uniforms) {
      this.iceMesh.material.uniforms.iceConcentration.value = value;
    }
  }

  animate() {
    this.time += 0.016;
    
    this.albedoData.current += (this.albedoData.target - this.albedoData.current) * 0.05;
    
    if (this.iceMesh && this.iceMesh.material.uniforms) {
      this.iceMesh.material.uniforms.time.value = this.time;
      this.iceMesh.material.uniforms.albedo.value = this.albedoData.current;
    }
    
    if (this.albedoParticles) {
      const positions = this.albedoParticles.geometry.attributes.position.array;
      const velocities = this.albedoParticles.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += velocities[i * 3] * this.albedoData.feedbackStrength;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * this.albedoData.feedbackStrength;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * this.albedoData.feedbackStrength;
        
        const dist = Math.sqrt(
          positions[i * 3] ** 2 + 
          positions[i * 3 + 1] ** 2 + 
          positions[i * 3 + 2] ** 2
        );
        
        if (dist > 2.8 || dist < 2.1) {
          velocities[i * 3] *= -1;
          velocities[i * 3 + 1] *= -1;
          velocities[i * 3 + 2] *= -1;
        }
      }
      
      this.albedoParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    this.energyLines.forEach((line, i) => {
      line.material.opacity = 0.2 + 0.3 * Math.sin(this.time * line.userData.speed + line.userData.offset);
    });
    
    if (this.iceMesh) {
      this.iceMesh.rotation.y += 0.002;
    }
    
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  start() {
    if (!this.animationId) {
      this.animate();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resize() {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  dispose() {
    this.stop();
    this.renderer.dispose();
  }
}

export function calculateAlbedoFeedback(iceConcentration, temperature) {
  const baseAlbedo = 0.8;
  const waterAlbedo = 0.1;
  
  const currentAlbedo = waterAlbedo + (baseAlbedo - waterAlbedo) * iceConcentration;
  
  const feedbackFactor = 1 + (temperature - 273.15) * 0.01;
  
  return {
    albedo: currentAlbedo,
    feedbackStrength: Math.max(0, Math.min(1, feedbackFactor * 0.4)),
    energyAbsorption: (1 - currentAlbedo) * 342
  };
}
