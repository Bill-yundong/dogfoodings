import * as THREE from 'three';

export class AlbedoFeedbackRenderer {
  constructor(canvas) {
    console.log('AlbedoFeedbackRenderer constructor called');
    console.log('Canvas:', canvas);
    
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1525);
    
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 400;
    console.log('Canvas size:', width, 'x', height);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    );
    this.camera.position.z = 5;
    this.camera.position.y = 1;
    
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(width, height);
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
    
    try {
      this.init();
      console.log('AlbedoFeedbackRenderer initialized successfully');
    } catch (e) {
      console.error('Error during init:', e);
    }
  }

  init() {
    const ambientLight = new THREE.AmbientLight(0x4080c0, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x4da6ff, 0.5);
    pointLight.position.set(-3, 2, 3);
    this.scene.add(pointLight);
    
    this.createPoleSphere();
    this.createAlbedoParticles();
    this.createEnergyFlowLines();
    
    this.camera.lookAt(0, 0, 0);
    
    this.renderer.render(this.scene, this.camera);
    console.log('Initial render done');
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
          float noise = sin(pos.x * 2.0 + pos.y * 3.0) * 0.05;
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
          float polarFactor = pow(abs(lat) / 1.5708, 2.0);
          
          vec3 iceColor = vec3(0.75, 0.88, 1.0);
          vec3 waterColor = vec3(0.1, 0.25, 0.45);
          
          float iceMask = smoothstep(0.3, 0.7, iceConcentration * polarFactor);
          
          vec3 baseColor = mix(waterColor, iceColor, iceMask);
          
          float albedoEffect = albedo * 0.5 + 0.5;
          baseColor *= albedoEffect;
          
          vec3 lightDir = normalize(vec3(0.5, 0.7, 0.5));
          float diff = max(dot(vNormal, lightDir), 0.0);
          
          vec3 finalColor = baseColor * (0.4 + 0.6 * diff);
          
          float glow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
          finalColor += vec3(0.2, 0.4, 0.8) * glow * 0.4;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    
    this.iceMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.iceMesh);
    console.log('Pole sphere created');
  }

  createAlbedoParticles() {
    const particleCount = 1500;
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
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
      
      const t = Math.random();
      colors[i * 3] = 0.3 + t * 0.4;
      colors[i * 3 + 1] = 0.5 + t * 0.3;
      colors[i * 3 + 2] = 0.8 + t * 0.2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    this.albedoParticles = new THREE.Points(geometry, material);
    this.scene.add(this.albedoParticles);
    console.log('Particles created:', particleCount);
  }

  createEnergyFlowLines() {
    const lineCount = 30;
    this.energyLines = [];
    
    for (let i = 0; i < lineCount; i++) {
      const points = [];
      const startTheta = Math.random() * Math.PI * 2;
      const startPhi = Math.acos(2 * Math.random() - 1);
      
      for (let j = 0; j < 15; j++) {
        const t = j / 14;
        const radius = 2.1 + t * 1.5;
        points.push(new THREE.Vector3(
          radius * Math.sin(startPhi + t * 0.2) * Math.cos(startTheta + t * 0.3),
          radius * Math.sin(startPhi + t * 0.2) * Math.sin(startTheta + t * 0.3),
          radius * Math.cos(startPhi + t * 0.2)
        ));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.8, 0.6),
        transparent: true,
        opacity: 0.5
      });
      
      const line = new THREE.Line(geometry, material);
      line.userData = { speed: 0.8 + Math.random() * 0.7, offset: Math.random() * Math.PI * 2 };
      this.energyLines.push(line);
      this.scene.add(line);
    }
    console.log('Energy lines created:', lineCount);
  }

  updateAlbedo(value) {
    this.albedoData.target = value;
  }

  updateIceConcentration(value) {
    if (this.iceMesh && this.iceMesh.material && this.iceMesh.material.uniforms) {
      this.iceMesh.material.uniforms.iceConcentration.value = value;
    }
  }

  animate() {
    this.time += 0.016;
    
    this.albedoData.current += (this.albedoData.target - this.albedoData.current) * 0.05;
    
    if (this.iceMesh && this.iceMesh.material && this.iceMesh.material.uniforms) {
      this.iceMesh.material.uniforms.time.value = this.time;
      this.iceMesh.material.uniforms.albedo.value = this.albedoData.current;
    }
    
    if (this.albedoParticles) {
      const positions = this.albedoParticles.geometry.attributes.position.array;
      const velocities = this.albedoParticles.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += velocities[i * 3] * (0.5 + this.albedoData.feedbackStrength);
        positions[i * 3 + 1] += velocities[i * 3 + 1] * (0.5 + this.albedoData.feedbackStrength);
        positions[i * 3 + 2] += velocities[i * 3 + 2] * (0.5 + this.albedoData.feedbackStrength);
        
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
    
    this.energyLines.forEach((line) => {
      line.material.opacity = 0.3 + 0.4 * Math.abs(Math.sin(this.time * line.userData.speed + line.userData.offset));
    });
    
    if (this.iceMesh) {
      this.iceMesh.rotation.y += 0.003;
      this.iceMesh.rotation.x = Math.sin(this.time * 0.1) * 0.1;
    }
    
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  start() {
    console.log('Starting animation');
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
    const width = this.canvas.clientWidth || 600;
    const height = this.canvas.clientHeight || 400;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    console.log('Disposing renderer');
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
