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
  private sensorMarkers: Map<string, THREE.Group> = new Map()
  private animationId: number | null = null
  private currentPose: BridgePose | null = null
  private sensorData: Map<string, NormalizedData> = new Map()
  private initialPositions: Map<string, THREE.Vector3> = new Map()
  
  constructor(config: RendererConfig) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0f1a)
    this.scene.fog = new THREE.Fog(0x0a0f1a, 100, 600)

    this.camera = new THREE.PerspectiveCamera(60, config.width / config.height, 0.1, 1000)
    this.camera.position.set(180, 120, 200)
    this.camera.lookAt(100, 20, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(config.width, config.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    config.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 80
    this.controls.maxDistance = 400
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.target.set(100, 20, 0)

    this.bridgeGroup = new THREE.Group()
    
    this.setupLighting()
    this.createBridge()
    this.createEnvironment()
    this.createSensorMarkers()
    this.startAnimation()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x606080, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
    directionalLight.position.set(150, 200, 150)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    this.scene.add(directionalLight)

    const blueLight = new THREE.PointLight(0x00d4ff, 0.8, 400)
    blueLight.position.set(0, 80, 50)
    this.scene.add(blueLight)

    const greenLight = new THREE.PointLight(0x00ff88, 0.5, 300)
    greenLight.position.set(200, 80, 50)
    this.scene.add(greenLight)
  }

  private createBridge(): void {
    // 主桥面板 - 更大更明显
    const girderGeometry = new THREE.BoxGeometry(200, 4, 20)
    const girderMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      metalness: 0.6,
      roughness: 0.3,
      emissive: 0x1a2a3a,
      emissiveIntensity: 0.3
    })
    const girder = new THREE.Mesh(girderGeometry, girderMaterial)
    girder.position.set(100, 15, 0)
    girder.castShadow = true
    girder.receiveShadow = true
    girder.name = 'girder'
    this.bridgeGroup.add(girder)
    this.initialPositions.set('girder', girder.position.clone())

    // 桥面
    const deckGeometry = new THREE.BoxGeometry(200, 0.8, 30)
    const deckMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      metalness: 0.2,
      roughness: 0.8
    })
    const deck = new THREE.Mesh(deckGeometry, deckMaterial)
    deck.position.set(100, 18, 0)
    deck.castShadow = true
    deck.receiveShadow = true
    deck.name = 'deck'
    this.bridgeGroup.add(deck)
    this.initialPositions.set('deck', deck.position.clone())

    // 桥墩1 - 左边
    const pierGeometry = new THREE.BoxGeometry(12, 30, 16)
    const pierMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a6678,
      metalness: 0.3,
      roughness: 0.6
    })
    const pier1 = new THREE.Mesh(pierGeometry, pierMaterial)
    pier1.position.set(0, -5, 0)
    pier1.castShadow = true
    pier1.receiveShadow = true
    pier1.name = 'pier1'
    this.bridgeGroup.add(pier1)

    // 桥墩2 - 右边
    const pier2 = new THREE.Mesh(pierGeometry, pierMaterial)
    pier2.position.set(200, -5, 0)
    pier2.castShadow = true
    pier2.receiveShadow = true
    pier2.name = 'pier2'
    this.bridgeGroup.add(pier2)

    // 塔1
    const towerGeometry = new THREE.BoxGeometry(8, 55, 8)
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: 0xb0bec5,
      metalness: 0.8,
      roughness: 0.15,
      emissive: 0x42a5f5,
      emissiveIntensity: 0.25
    })
    const tower1 = new THREE.Mesh(towerGeometry, towerMaterial)
    tower1.position.set(50, 32, 0)
    tower1.castShadow = true
    tower1.name = 'tower1'
    this.bridgeGroup.add(tower1)
    this.initialPositions.set('tower1', tower1.position.clone())

    // 塔2
    const tower2 = new THREE.Mesh(towerGeometry, towerMaterial)
    tower2.position.set(150, 32, 0)
    tower2.castShadow = true
    tower2.name = 'tower2'
    this.bridgeGroup.add(tower2)
    this.initialPositions.set('tower2', tower2.position.clone())

    // 创建主缆线
    this.createCables(towerMaterial)

    this.scene.add(this.bridgeGroup)
  }

  private createCables(material: THREE.MeshStandardMaterial): void {
    // 主电缆路径点
    const cablePoints = [
      [new THREE.Vector3(50, 60, 0), new THREE.Vector3(0, 15, 0)],
      [new THREE.Vector3(50, 60, 0), new THREE.Vector3(100, 15, 0)],
      [new THREE.Vector3(150, 60, 0), new THREE.Vector3(100, 15, 0)],
      [new THREE.Vector3(150, 60, 0), new THREE.Vector3(200, 15, 0)]
    ]

    cablePoints.forEach(([start, end], idx) => {
      const curve = new THREE.QuadraticBezierCurve3(
        start,
        new THREE.Vector3(
          (start.x + end.x) / 2,
          Math.min(start.y, end.y) - 10,
          (start.z + end.z) / 2
        ),
        end
      )
      
      const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.35, 12, false)
      const cable = new THREE.Mesh(tubeGeo, material)
      cable.name = `cable${idx}`
      this.bridgeGroup.add(cable)
    })
  }

  private createEnvironment(): void {
    // 地面
    const groundGeometry = new THREE.PlaneGeometry(700, 700)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.9
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -25
    ground.receiveShadow = true
    this.scene.add(ground)

    // 网格辅助线
    const gridHelper = new THREE.GridHelper(500, 50, 0x1e3a5f, 0x0f2137)
    gridHelper.position.y = -24.9
    this.scene.add(gridHelper)

    // 水面 - 蓝色透明平面
    const waterGeometry = new THREE.PlaneGeometry(700, 300)
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1565c0,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.3,
      emissive: 0x0d47a1,
      emissiveIntensity: 0.3
    })
    const water = new THREE.Mesh(waterGeometry, waterMaterial)
    water.rotation.x = -Math.PI / 2
    water.position.y = -22
    this.scene.add(water)
  }

  private createSensorMarkers(): void {
    bridgeSensors.forEach(sensor => {
      const markerGroup = new THREE.Group()
      
      // 发光外环
      const glowGeometry = new THREE.SphereGeometry(4, 24, 24)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.2
      })
      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      markerGroup.add(glow)

      // 核心球体
      const coreGeometry = new THREE.SphereGeometry(1.8, 32, 32)
      const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 1.5,
        metalness: 0.4,
        roughness: 0.2,
        transparent: true,
        opacity: 0.95
      })
      const core = new THREE.Mesh(coreGeometry, coreMaterial)
      core.name = `core_${sensor.id}`
      markerGroup.add(core)

      // 旋转外环
      const ringGeometry = new THREE.RingGeometry(2.5, 3.5, 48)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      ring.name = `ring_${sensor.id}`
      markerGroup.add(ring)

      // 传感器标签
      const labelCanvas = document.createElement('canvas')
      labelCanvas.width = 160
      labelCanvas.height = 40
      const ctx = labelCanvas.getContext('2d')!
      ctx.fillStyle = 'rgba(0, 20, 40, 0.9)'
      ctx.roundRect(0, 0, 160, 40, 8)
      ctx.fill()
      ctx.font = 'bold 16px monospace'
      ctx.fillStyle = '#00ff88'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(sensor.id, 80, 20)

      const labelTexture = new THREE.CanvasTexture(labelCanvas)
      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true
      })
      const label = new THREE.Sprite(labelMaterial)
      label.scale.set(12, 3, 1)
      label.position.y = 6
      markerGroup.add(label)

      // 位置设置
      markerGroup.position.set(
        sensor.location.x,
        sensor.location.y + 15,
        sensor.location.z + 8
      )
      markerGroup.userData = { sensorId: sensor.id }
      markerGroup.name = `sensor_${sensor.id}`

      this.bridgeGroup.add(markerGroup)
      this.sensorMarkers.set(sensor.id, markerGroup)
      this.initialPositions.set(`sensor_${sensor.id}`, markerGroup.position.clone())
    })
  }

  private getStatusColor(status: HealthStatus): number {
    const colors: Record<HealthStatus, number> = {
      normal: 0x00ff88,
      warning: 0xffaa00,
      danger: 0xff6600,
      critical: 0xff0044
    }
    return colors[status] || 0x00ff88
  }

  private updateSensorMarkers(time: number): void {
    this.sensorMarkers.forEach((group, sensorId) => {
      const data = this.sensorData.get(sensorId)
      const core = group.getObjectByName(`core_${sensorId}`) as THREE.Mesh
      const ring = group.getObjectByName(`ring_${sensorId}`) as THREE.Mesh
      const glow = group.children[0] as THREE.Mesh

      if (data && core && ring) {
        const color = this.getStatusColor(data.healthStatus)
        const coreMat = core.material as THREE.MeshStandardMaterial
        const ringMat = ring.material as THREE.MeshBasicMaterial
        const glowMat = glow.material as THREE.MeshBasicMaterial

        coreMat.color.setHex(color)
        coreMat.emissive.setHex(color)
        ringMat.color.setHex(color)
        glowMat.color.setHex(color)

        // 脉冲动画
        const speed = data.healthStatus === 'critical' ? 0.02 : 
                     data.healthStatus === 'danger' ? 0.015 : 0.008
        const pulse = Math.sin(time * speed) * 0.5 + 1
        
        const baseEmissive = data.healthStatus === 'critical' ? 3.0 :
                            data.healthStatus === 'danger' ? 2.2 :
                            data.healthStatus === 'warning' ? 1.6 : 1.0
        coreMat.emissiveIntensity = baseEmissive * pulse
        glow.scale.setScalar(pulse)

        ring.rotation.z += data.healthStatus === 'critical' ? 0.04 : 0.02

        // 根据健康状态改变大小
        let scale = 1.0
        if (data.healthStatus === 'critical') {
          scale = 1.4 + Math.sin(time * 0.03) * 0.3
          coreMat.opacity = 0.8 + Math.sin(time * 0.04) * 0.2
        } else if (data.healthStatus === 'danger') {
          scale = 1.2 + Math.sin(time * 0.02) * 0.2
        } else {
          scale = 1.0 + Math.sin(time * 0.01) * 0.1
        }
        core.scale.setScalar(scale)

        // 传感器轻微上下跳动
        const initPos = this.initialPositions.get(`sensor_${sensorId}`)
        if (initPos) {
          const jump = Math.sin(time * 0.004 + sensorId.charCodeAt(0)) * 0.5
          group.position.y = initPos.y + jump
        }
      } else if (core) {
        (core.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4
        core.scale.setScalar(0.9)
      }
    })
  }

  private updateBridgeDeformation(time: number): void {
    // 基础周期性波动 - 即使没有位姿数据也有动画效果
    const wave = Math.sin(time * 0.002)
    
    // 主梁弯曲
    const girder = this.bridgeGroup.getObjectByName('girder') as THREE.Mesh
    if (girder) {
      const initGirder = this.initialPositions.get('girder')
      if (initGirder) {
        girder.position.y = initGirder.y + wave * 3.0
        girder.rotation.z = Math.sin(time * 0.001) * 0.01
      }
    }

    // 桥面波动
    const deck = this.bridgeGroup.getObjectByName('deck') as THREE.Mesh
    if (deck) {
      const initDeck = this.initialPositions.get('deck')
      if (initDeck) {
        deck.position.y = initDeck.y + wave * 2.5
      }
    }

    // 塔摆动
    const tower1 = this.bridgeGroup.getObjectByName('tower1') as THREE.Mesh
    const tower2 = this.bridgeGroup.getObjectByName('tower2') as THREE.Mesh
    
    if (tower1) {
      const initTower1 = this.initialPositions.get('tower1')
      if (initTower1) {
        const sway = Math.sin(time * 0.0015) * 1.5
        tower1.position.x = initTower1.x + sway * 0.2
        tower1.rotation.z = sway * 0.015
      }
    }
    
    if (tower2) {
      const initTower2 = this.initialPositions.get('tower2')
      if (initTower2) {
        const sway = Math.sin(time * 0.0015 + Math.PI) * 1.5
        tower2.position.x = initTower2.x + sway * 0.2
        tower2.rotation.z = sway * 0.015
      }
    }

    // 如果有位姿数据，应用更明显的变形
    if (this.currentPose) {
      const deformationScale = 1.5
      
      bridgeSensors.forEach(sensor => {
        const deformation = this.currentPose?.deformations[sensor.id]
        if (deformation) {
          const group = this.sensorMarkers.get(sensor.id)
          if (group) {
            const initPos = this.initialPositions.get(`sensor_${sensor.id}`)
            if (initPos) {
              group.position.x = initPos.x + deformation.dx * deformationScale
              group.position.y = initPos.y + deformation.dy * deformationScale
              group.position.z = initPos.z + deformation.dz * deformationScale
            }
          }
        }
      })
    }
  }

  private updateStressVisualization(): void {
    // 更新主梁的应力可视化
    const girder = this.bridgeGroup.getObjectByName('girder') as THREE.Mesh
    if (girder) {
      let avgStress = 0
      let count = 0
      
      this.sensorData.forEach(data => {
        if (data.type === 'strain_gauge') {
          const sensor = bridgeSensors.find(s => s.id === data.sensorId)
          if (sensor) {
            avgStress += Math.abs(data.value) / sensor.thresholds.critical
            count++
          }
        }
      })
      
      if (count > 0) {
        avgStress /= count
        const girderMat = girder.material as THREE.MeshStandardMaterial
        
        // 根据应力水平改变颜色
        const startColor = new THREE.Color(0x4a5568)
        const endColor = new THREE.Color(0xff4444)
        const color = startColor.clone().lerp(endColor, avgStress)
        girderMat.color.copy(color)
        girderMat.emissive.copy(color)
        girderMat.emissiveIntensity = 0.2 + avgStress * 0.8
      }
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    const time = Date.now()

    this.controls.update()
    this.updateSensorMarkers(time)
    this.updateBridgeDeformation(time)
    this.updateStressVisualization()

    // 自动轨道运动
    if (!this.controls.isDragging) {
      const orbitTime = time * 0.00005
      const radius = 220
      this.camera.position.x = 100 + Math.cos(orbitTime) * radius
      this.camera.position.z = Math.sin(orbitTime) * radius
      this.camera.position.y = 120 + Math.sin(orbitTime * 2) * 20
      this.camera.lookAt(100, 20, 0)
    }

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
    this.sensorMarkers.forEach((group, id) => {
      const core = group.getObjectByName(`core_${id}`) as THREE.Mesh
      if (core) {
        const mat = core.material as THREE.MeshStandardMaterial
        if (id === sensorId) {
          mat.emissiveIntensity = 4.0
          core.scale.setScalar(1.8)
        } else {
          const data = this.sensorData.get(id)
          mat.emissiveIntensity = data && (data.healthStatus === 'critical' || data.healthStatus === 'danger') ? 2.0 : 1.0
          core.scale.setScalar(1.0)
        }
      }
    })
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  public dispose(): void {
    this.stopAnimation()
    this.controls.dispose()
    this.renderer.dispose()

    this.bridgeGroup.traverse(child => {
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
  }

  public resetView(): void {
    this.camera.position.set(180, 120, 200)
    this.controls.target.set(100, 20, 0)
    this.controls.update()
  }

  public getHealthColorFromScore(score: number): number {
    if (score >= 80) return 0x00ff88
    if (score >= 60) return 0xffaa00
    if (score >= 40) return 0xff6600
    return 0xff0044
  }
}
