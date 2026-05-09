import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import type { BridgePose, NormalizedData, HealthStatus } from '../types'
import { bridgeSensors } from '../data/sensorConfig'

export interface RendererConfig {
  container: HTMLElement
  width: number
  height: number
}

export class BridgeRenderer {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private bridgeGroup: THREE.Group
  private sensorMarkers: Map<string, THREE.Mesh>
  private animationId: number | null
  private currentPose: BridgePose | null
  private sensorData: Map<string, NormalizedData>
  private onSensorClick?: (sensorId: string) => void

  constructor(config: RendererConfig) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0f1a)
    this.scene.fog = new THREE.Fog(0x0a0f1a, 100, 500)

    this.camera = new THREE.PerspectiveCamera(60, config.width / config.height, 0.1, 1000)
    this.camera.position.set(150, 80, 150)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setSize(config.width, config.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    config.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 50
    this.controls.maxDistance = 400
    this.controls.maxPolarAngle = Math.PI / 2.1

    this.bridgeGroup = new THREE.Group()
    this.sensorMarkers = new Map()
    this.animationId = null
    this.currentPose = null
    this.sensorData = new Map()

    this.setupLighting()
    this.createBridge()
    this.createEnvironment()
    this.createSensorMarkers()
    this.startAnimation()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(100, 150, 100)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 500
    directionalLight.shadow.camera.left = -200
    directionalLight.shadow.camera.right = 200
    directionalLight.shadow.camera.top = 200
    directionalLight.shadow.camera.bottom = -200
    this.scene.add(directionalLight)

    const blueLight = new THREE.PointLight(0x00d4ff, 0.5, 300)
    blueLight.position.set(0, 50, 0)
    this.scene.add(blueLight)

    const greenLight = new THREE.PointLight(0x00ff88, 0.3, 200)
    greenLight.position.set(200, 50, 0)
    this.scene.add(greenLight)
  }

  private createBridge(): void {
    const bridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x1a202c,
      emissiveIntensity: 0.2
    })

    const girderGeometry = new THREE.BoxGeometry(200, 2, 15)
    const mainGirder = new THREE.Mesh(girderGeometry, bridgeMaterial)
    mainGirder.position.y = 10
    mainGirder.position.x = 100
    mainGirder.castShadow = true
    mainGirder.receiveShadow = true
    mainGirder.name = 'main_girder'
    this.bridgeGroup.add(mainGirder)

    const deckGeometry = new THREE.BoxGeometry(200, 0.5, 25)
    const deckMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      metalness: 0.3,
      roughness: 0.8,
      emissive: 0x0a0f1a,
      emissiveIntensity: 0.1
    })
    const deck = new THREE.Mesh(deckGeometry, deckMaterial)
    deck.position.y = 11.25
    deck.position.x = 100
    deck.castShadow = true
    deck.receiveShadow = true
    deck.name = 'deck'
    this.bridgeGroup.add(deck)

    const pierGeometry = new THREE.BoxGeometry(8, 20, 8)
    const pierMaterial = new THREE.MeshStandardMaterial({
      color: 0x718096,
      metalness: 0.2,
      roughness: 0.7
    })

    const pier1 = new THREE.Mesh(pierGeometry, pierMaterial)
    pier1.position.set(0, -5, 0)
    pier1.castShadow = true
    pier1.receiveShadow = true
    pier1.name = 'pier_1'
    this.bridgeGroup.add(pier1)

    const pier2 = new THREE.Mesh(pierGeometry, pierMaterial)
    pier2.position.set(200, -5, 0)
    pier2.castShadow = true
    pier2.receiveShadow = true
    pier2.name = 'pier_2'
    this.bridgeGroup.add(pier2)

    const towerGeometry = new THREE.BoxGeometry(4, 40, 4)
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: 0xa0aec0,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x3182ce,
      emissiveIntensity: 0.15
    })

    const tower1 = new THREE.Mesh(towerGeometry, towerMaterial)
    tower1.position.set(50, 25, 0)
    tower1.castShadow = true
    tower1.name = 'tower_1'
    this.bridgeGroup.add(tower1)

    const tower2 = new THREE.Mesh(towerGeometry, towerMaterial)
    tower2.position.set(150, 25, 0)
    tower2.castShadow = true
    tower2.name = 'tower_2'
    this.bridgeGroup.add(tower2)

    const cableMaterial = new THREE.MeshStandardMaterial({
      color: 0xcbd5e0,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x4299e1,
      emissiveIntensity: 0.2
    })

    this.createCables(cableMaterial)

    this.scene.add(this.bridgeGroup)
  }

  private createCables(material: THREE.MeshStandardMaterial): void {
    const cablePoints: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(50, 45, 0), new THREE.Vector3(0, 10, 0)],
      [new THREE.Vector3(50, 45, 0), new THREE.Vector3(25, 10, 0)],
      [new THREE.Vector3(50, 45, 0), new THREE.Vector3(50, 10, 0)],
      [new THREE.Vector3(50, 45, 0), new THREE.Vector3(75, 10, 0)],
      [new THREE.Vector3(50, 45, 0), new THREE.Vector3(100, 10, 0)],
      [new THREE.Vector3(150, 45, 0), new THREE.Vector3(100, 10, 0)],
      [new THREE.Vector3(150, 45, 0), new THREE.Vector3(125, 10, 0)],
      [new THREE.Vector3(150, 45, 0), new THREE.Vector3(150, 10, 0)],
      [new THREE.Vector3(150, 45, 0), new THREE.Vector3(175, 10, 0)],
      [new THREE.Vector3(150, 45, 0), new THREE.Vector3(200, 10, 0)]
    ]

    cablePoints.forEach(([start, end], index) => {
      const curve = new THREE.QuadraticBezierCurve3(
        start,
        new THREE.Vector3(
          (start.x + end.x) / 2,
          Math.min(start.y, end.y) - 5,
          (start.z + end.z) / 2
        ),
        end
      )

      const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.15, 8, false)
      const cable = new THREE.Mesh(tubeGeometry, material)
      cable.name = `cable_${index}`
      this.bridgeGroup.add(cable)
    })
  }

  private createEnvironment(): void {
    const groundGeometry = new THREE.PlaneGeometry(600, 600)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.9,
      metalness: 0.1
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -20
    ground.receiveShadow = true
    this.scene.add(ground)

    const gridHelper = new THREE.GridHelper(400, 40, 0x1e3a5f, 0x0f2137)
    gridHelper.position.y = -19.9
    this.scene.add(gridHelper)

    const waterGeometry = new THREE.PlaneGeometry(600, 200)
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4a6a,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.3,
      emissive: 0x0a2a4a,
      emissiveIntensity: 0.3
    })
    const water = new THREE.Mesh(waterGeometry, waterMaterial)
    water.rotation.x = -Math.PI / 2
    water.position.y = -18
    this.scene.add(water)
  }

  private createSensorMarkers(): void {
    bridgeSensors.forEach(sensor => {
      const geometry = new THREE.SphereGeometry(0.8, 16, 16)
      const material = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
      })

      const marker = new THREE.Mesh(geometry, material)
      marker.position.set(
        sensor.location.x,
        sensor.location.y + 10,
        sensor.location.z
      )
      marker.userData = { sensorId: sensor.id }
      marker.name = `sensor_${sensor.id}`

      const ringGeometry = new THREE.RingGeometry(1, 1.2, 32)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      marker.add(ring)

      this.bridgeGroup.add(marker)
      this.sensorMarkers.set(sensor.id, marker)
    })
  }

  private getStatusColor(status: HealthStatus): number {
    const colors: Record<HealthStatus, number> = {
      normal: 0x00ff88,
      warning: 0xffaa00,
      danger: 0xff4444,
      critical: 0xff0000
    }
    return colors[status] || 0x00ff88
  }

  private updateSensorMarkers(): void {
    this.sensorMarkers.forEach((marker, sensorId) => {
      const data = this.sensorData.get(sensorId)
      if (data) {
        const color = this.getStatusColor(data.healthStatus)
        const material = marker.material as THREE.MeshStandardMaterial
        material.color.setHex(color)
        material.emissive.setHex(color)

        const ring = marker.children[0] as THREE.Mesh
        const ringMaterial = ring.material as THREE.MeshBasicMaterial
        ringMaterial.color.setHex(color)

        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 1
        marker.scale.setScalar(pulse)

        if (data.healthStatus === 'critical' || data.healthStatus === 'danger') {
          material.emissiveIntensity = 0.8 + Math.sin(Date.now() * 0.01) * 0.4
        }
      }
    })
  }

  private updateBridgeDeformation(): void {
    if (!this.currentPose) return

    this.bridgeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name.includes('main_girder')) {
        const deformation = this.currentPose.deformations['SG-001']
        if (deformation) {
          child.position.y = 10 + deformation.dy * 0.01
        }
      }
    })
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)

    this.controls.update()
    this.updateSensorMarkers()
    this.updateBridgeDeformation()

    const time = Date.now() * 0.0001
    this.camera.position.x = 150 + Math.cos(time) * 50
    this.camera.position.z = 150 + Math.sin(time) * 50

    this.renderer.render(this.scene, this.camera)
  }

  private startAnimation(): void {
    if (this.animationId === null) {
      this.animate()
    }
  }

  public stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  public updatePose(pose: BridgePose): void {
    this.currentPose = pose
  }

  public updateSensorData(data: NormalizedData[]): void {
    data.forEach(d => {
      this.sensorData.set(d.sensorId, d)
    })
  }

  public highlightSensor(sensorId: string): void {
    this.sensorMarkers.forEach((marker, id) => {
      const material = marker.material as THREE.MeshStandardMaterial
      if (id === sensorId) {
        material.emissiveIntensity = 1.5
      } else {
        material.emissiveIntensity = 0.5
      }
    })
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  public setOnSensorClick(callback: (sensorId: string) => void): void {
    this.onSensorClick = callback
  }

  public dispose(): void {
    this.stopAnimation()

    this.controls.dispose()
    this.renderer.dispose()

    this.bridgeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        } else if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        }
      }
    })

    this.scene.clear()

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }

  public resetView(): void {
    this.camera.position.set(150, 80, 150)
    this.controls.target.set(100, 10, 0)
    this.controls.update()
  }

  public getHealthColorFromScore(score: number): number {
    if (score >= 80) return 0x00ff88
    if (score >= 60) return 0xffaa00
    if (score >= 40) return 0xff4444
    return 0xff0000
  }
}
