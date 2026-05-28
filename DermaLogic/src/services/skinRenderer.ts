import * as THREE from 'three'
import type { SkinFeatures } from '../types'

export class SkinRenderer {
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private skinMesh: THREE.Mesh | null = null
  private container: HTMLElement | null = null
  private animationId: number | null = null
  private isDragging = false
  private previousMousePosition = { x: 0, y: 0 }

  init(container: HTMLElement): void {
    this.container = container
    const width = container.clientWidth
    const height = container.clientHeight

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf8fafc)

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    this.camera.position.set(0, 0, 5)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    this.setupLighting()
    this.createSkinMesh()
    this.setupEventListeners()
    this.animate()
  }

  private setupLighting(): void {
    if (!this.scene) return

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
    mainLight.position.set(5, 5, 5)
    this.scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-5, 0, 5)
    this.scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4)
    rimLight.position.set(0, -5, -5)
    this.scene.add(rimLight)
  }

  private createSkinMesh(): void {
    if (!this.scene) return

    const geometry = new THREE.SphereGeometry(2, 128, 128)
    
    const positions = geometry.attributes.position
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      
      const noise = this.perlinNoise(vertex.x * 2, vertex.y * 2, vertex.z * 2) * 0.05
      vertex.normalize().multiplyScalar(2 + noise)
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    geometry.computeVertexNormals()

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf5cba7,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide
    })

    this.skinMesh = new THREE.Mesh(geometry, material)
    this.scene.add(this.skinMesh)

    const wireframe = new THREE.WireframeGeometry(geometry)
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x0ea5e9, 
      transparent: true, 
      opacity: 0.1 
    })
    const wireframeLines = new THREE.LineSegments(wireframe, lineMaterial)
    this.skinMesh.add(wireframeLines)
  }

  private perlinNoise(x: number, y: number, z: number): number {
    const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180]

    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)

    const u = this.fade(x)
    const v = this.fade(y)
    const w = this.fade(z)

    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z

    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z)),
        this.lerp(u, this.grad(p[AB], x, y - 1, z), this.grad(p[BB], x - 1, y - 1, z))),
      this.lerp(v,
        this.lerp(u, this.grad(p[AA + 1], x, y, z - 1), this.grad(p[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(p[AB + 1], x, y - 1, z - 1), this.grad(p[BB + 1], x - 1, y - 1, z - 1))))
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  updateTexture(imageData: ImageData): void {
    if (!this.skinMesh) return

    const texture = new THREE.CanvasTexture(this.createCanvasFromImageData(imageData))
    texture.needsUpdate = true

    const material = this.skinMesh.material as THREE.MeshPhysicalMaterial
    material.map = texture
    material.needsUpdate = true
  }

  private createCanvasFromImageData(imageData: ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  setHighlight(features: SkinFeatures): void {
    if (!this.skinMesh) return

    const material = this.skinMesh.material as THREE.MeshPhysicalMaterial
    
    const roughness = 0.2 + (features.roughness / 100) * 0.6
    material.roughness = roughness

    const healthFactor = (features.moisture + features.elasticity) / 200
    const baseColor = new THREE.Color(0xf5cba7)
    const healthyColor = new THREE.Color(0xffe4d0)
    const unhealthyColor = new THREE.Color(0xe0a890)
    
    material.color = healthFactor > 0.5 
      ? baseColor.lerp(healthyColor, (healthFactor - 0.5) * 2)
      : baseColor.lerp(unhealthyColor, (0.5 - healthFactor) * 2)

    material.emissive = new THREE.Color(0x0ea5e9)
    material.emissiveIntensity = (100 - features.roughness) / 500
  }

  private setupEventListeners(): void {
    if (!this.container || !this.renderer) return

    const canvas = this.renderer.domElement

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.skinMesh) return

      const deltaX = e.clientX - this.previousMousePosition.x
      const deltaY = e.clientY - this.previousMousePosition.y

      this.skinMesh.rotation.y += deltaX * 0.01
      this.skinMesh.rotation.x += deltaY * 0.01

      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false
    })

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false
    })

    canvas.addEventListener('wheel', (e) => {
      if (!this.camera) return
      e.preventDefault()
      this.camera.position.z += e.deltaY * 0.01
      this.camera.position.z = Math.max(3, Math.min(10, this.camera.position.z))
    })
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate())

    if (this.skinMesh && !this.isDragging) {
      this.skinMesh.rotation.y += 0.002
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  resize(): void {
    if (!this.container || !this.camera || !this.renderer) return

    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }

    if (this.renderer) {
      this.renderer.dispose()
      if (this.container && this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement)
      }
    }

    this.scene = null
    this.camera = null
    this.renderer = null
    this.skinMesh = null
    this.container = null
  }
}

export const skinRenderer = new SkinRenderer()
