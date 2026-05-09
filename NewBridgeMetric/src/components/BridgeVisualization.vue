<template>
  <div class="three-container" ref="containerRef"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps({
  bridgeData: {
    type: Object,
    required: true
  },
  strainGauges: {
    type: Array,
    default: () => []
  },
  selectedGauge: {
    type: String,
    default: null
  }
})

const containerRef = ref(null)

let scene = null
let camera = null
let renderer = null
let controls = null
let animationId = null
let bridgeGroup = null
let gaugeObjects = []
let waterGroup = null
let clouds = []

const BRIDGE_CONFIG = {
  totalLength: 100,
  spanCount: 5,
  width: 8,
  deckHeight: 0.5,
  pierHeight: 15,
  towerHeight: 25,
  cableCount: 8,
  waterLevel: -5
}

const COLORS = {
  deck: 0x4a90d9,
  pier: 0x888888,
  tower: 0x666666,
  cable: 0xaaaaaa,
  road: 0x333333,
  marking: 0xffff00,
  water: 0x1a5276,
  sky: 0x87ceeb,
  gaugeNormal: 0x4caf50,
  gaugeWarning: 0xff9800,
  gaugeCritical: 0xf44336,
  gaugeSelected: 0x4fc3f7
}

const initScene = () => {
  const container = containerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a1a2e)
  scene.fog = new THREE.Fog(0x0a1a2e, 80, 200)

  const aspect = container.clientWidth / container.clientHeight
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
  camera.position.set(80, 40, 80)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.screenSpacePanning = false
  controls.minDistance = 20
  controls.maxDistance = 200
  controls.maxPolarAngle = Math.PI / 2.2

  createLights()
  createEnvironment()
  createBridge()
  createWater()
  createClouds()

  window.addEventListener('resize', onWindowResize)
  animate()
}

const createLights = () => {
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(50, 100, 50)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 500
  directionalLight.shadow.camera.left = -100
  directionalLight.shadow.camera.right = 100
  directionalLight.shadow.camera.top = 100
  directionalLight.shadow.camera.bottom = -100
  scene.add(directionalLight)

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2c3e50, 0.3)
  scene.add(hemisphereLight)

  const fillLight = new THREE.DirectionalLight(0x4a90d9, 0.3)
  fillLight.position.set(-50, 50, -50)
  scene.add(fillLight)
}

const createEnvironment = () => {
  const groundGeometry = new THREE.PlaneGeometry(500, 500)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2a4a,
    roughness: 0.9,
    metalness: 0.1
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = BRIDGE_CONFIG.waterLevel - 1
  ground.receiveShadow = true
  scene.add(ground)

  const gridHelper = new THREE.GridHelper(200, 40, 0x2a4a7a, 0x1a2a4a)
  gridHelper.position.y = BRIDGE_CONFIG.waterLevel - 0.99
  scene.add(gridHelper)
}

const createBridge = () => {
  bridgeGroup = new THREE.Group()
  scene.add(bridgeGroup)

  const { totalLength, spanCount, width, deckHeight, pierHeight, towerHeight, cableCount } = BRIDGE_CONFIG
  const spanLength = totalLength / spanCount

  createBridgeDeck(spanCount, spanLength, width, deckHeight)
  createPiers(spanCount, spanLength, width, pierHeight)
  createTowers(spanCount, spanLength, width, towerHeight)
  createCables(spanCount, spanLength, width, towerHeight, cableCount)
  createStrainGauges(spanCount, spanLength, width, deckHeight)
}

const createBridgeDeck = (spanCount, spanLength, width, deckHeight) => {
  const totalLength = spanCount * spanLength
  
  const deckGeometry = new THREE.BoxGeometry(totalLength, deckHeight, width)
  const deckMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.deck,
    roughness: 0.6,
    metalness: 0.3
  })
  const deck = new THREE.Mesh(deckGeometry, deckMaterial)
  deck.position.y = 0
  deck.castShadow = true
  deck.receiveShadow = true
  bridgeGroup.add(deck)

  const roadGeometry = new THREE.BoxGeometry(totalLength, 0.1, width * 0.95)
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.road,
    roughness: 0.8
  })
  const road = new THREE.Mesh(roadGeometry, roadMaterial)
  road.position.y = deckHeight / 2 + 0.05
  road.receiveShadow = true
  bridgeGroup.add(road)

  for (let i = 1; i < spanCount * 4; i++) {
    const markingGeometry = new THREE.BoxGeometry(2, 0.02, 0.15)
    const markingMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.marking,
      emissive: COLORS.marking,
      emissiveIntensity: 0.3
    })
    const marking = new THREE.Mesh(markingGeometry, markingMaterial)
    marking.position.set(-totalLength / 2 + i * (spanLength / 4), deckHeight / 2 + 0.1, 0)
    bridgeGroup.add(marking)
  }

  const sideRailMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.5,
    roughness: 0.5
  })
  
  for (let side of [-1, 1]) {
    const railGeometry = new THREE.BoxGeometry(totalLength, 1, 0.2)
    const rail = new THREE.Mesh(railGeometry, sideRailMaterial)
    rail.position.set(0, deckHeight / 2 + 0.5, side * (width / 2 + 0.1))
    rail.castShadow = true
    bridgeGroup.add(rail)

    for (let i = 0; i <= spanCount * 8; i++) {
      const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8)
      const post = new THREE.Mesh(postGeometry, sideRailMaterial)
      post.position.set(
        -totalLength / 2 + i * (totalLength / (spanCount * 8)),
        deckHeight / 2 + 0.5,
        side * (width / 2 + 0.1)
      )
      post.castShadow = true
      bridgeGroup.add(post)
    }
  }
}

const createPiers = (spanCount, spanLength, width, pierHeight) => {
  const totalLength = spanCount * spanLength
  const pierMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.pier,
    roughness: 0.7,
    metalness: 0.2
  })

  for (let i = 0; i <= spanCount; i++) {
    const pierGeometry = new THREE.BoxGeometry(1.5, pierHeight, 1.5)
    const pier = new THREE.Mesh(pierGeometry, pierMaterial)
    pier.position.set(
      -totalLength / 2 + i * spanLength,
      -pierHeight / 2 - 0.25,
      width * 0.3
    )
    pier.castShadow = true
    pier.receiveShadow = true
    bridgeGroup.add(pier)

    const pier2 = pier.clone()
    pier2.position.z = -width * 0.3
    bridgeGroup.add(pier2)

    const capGeometry = new THREE.BoxGeometry(3, 0.8, 1.8)
    const cap = new THREE.Mesh(capGeometry, pierMaterial)
    cap.position.set(
      -totalLength / 2 + i * spanLength,
      -0.65,
      width * 0.3
    )
    cap.castShadow = true
    bridgeGroup.add(cap)

    const cap2 = cap.clone()
    cap2.position.z = -width * 0.3
    bridgeGroup.add(cap2)

    if (i > 0 && i < spanCount) {
      const footingGeometry = new THREE.BoxGeometry(4, 1, 4)
      const footing = new THREE.Mesh(footingGeometry, pierMaterial)
      footing.position.set(
        -totalLength / 2 + i * spanLength,
        -pierHeight - 0.75,
        0
      )
      footing.receiveShadow = true
      bridgeGroup.add(footing)
    }
  }
}

const createTowers = (spanCount, spanLength, width, towerHeight) => {
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.tower,
    roughness: 0.6,
    metalness: 0.4
  })

  const positions = [
    -spanCount * spanLength / 2 + spanLength,
    spanCount * spanLength / 2 - spanLength
  ]

  positions.forEach((xPos) => {
    for (let zOffset of [-width * 0.35, width * 0.35]) {
      const towerGeometry = new THREE.BoxGeometry(1.2, towerHeight, 1.2)
      const tower = new THREE.Mesh(towerGeometry, towerMaterial)
      tower.position.set(xPos, towerHeight / 2, zOffset)
      tower.castShadow = true
      tower.receiveShadow = true
      bridgeGroup.add(tower)

      const capGeometry = new THREE.BoxGeometry(2, 0.8, 2)
      const cap = new THREE.Mesh(capGeometry, towerMaterial)
      cap.position.set(xPos, towerHeight + 0.4, zOffset)
      cap.castShadow = true
      bridgeGroup.add(cap)

      for (let i = 0; i < 4; i++) {
        const lightGeometry = new THREE.SphereGeometry(0.15, 16, 16)
        const lightMaterial = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 0.8
        })
        const light = new THREE.Mesh(lightGeometry, lightMaterial)
        light.position.set(xPos, towerHeight - 2 + i * 5, zOffset)
        bridgeGroup.add(light)
      }
    }

    const topBeamGeometry = new THREE.BoxGeometry(1.5, 0.8, width * 0.9)
    const topBeam = new THREE.Mesh(topBeamGeometry, towerMaterial)
    topBeam.position.set(xPos, towerHeight + 0.4, 0)
    topBeam.castShadow = true
    bridgeGroup.add(topBeam)
  })
}

const createCables = (spanCount, spanLength, width, towerHeight, cableCount) => {
  const cableMaterial = new THREE.LineBasicMaterial({
    color: COLORS.cable,
    linewidth: 1
  })

  const towerPositions = [
    -spanCount * spanLength / 2 + spanLength,
    spanCount * spanLength / 2 - spanLength
  ]

  towerPositions.forEach((towerX, towerIndex) => {
    for (let side = 0; side < 2; side++) {
      const direction = towerIndex === 0 ? 1 : -1
      for (let i = 0; i < cableCount; i++) {
        const cableZ = side === 0 ? -width * 0.35 : width * 0.35
        const startPoint = new THREE.Vector3(
          towerX,
          towerHeight - 2 + (i / cableCount) * 5,
          cableZ
        )
        
        const endX = towerX + direction * (i + 1) * (spanLength / cableCount)
        const endPoint = new THREE.Vector3(
          Math.max(-spanCount * spanLength / 2, Math.min(spanCount * spanLength / 2, endX)),
          0.5,
          cableZ
        )

        const cableGeometry = new THREE.BufferGeometry().setFromPoints([
          startPoint,
          endPoint
        ])
        const cable = new THREE.Line(cableGeometry, cableMaterial)
        bridgeGroup.add(cable)
      }
    }
  })

  const hangerMaterial = new THREE.LineBasicMaterial({
    color: 0xcccccc,
    linewidth: 1
  })
  
  for (let i = 0; i <= spanCount * 10; i++) {
    const xPos = -spanCount * spanLength / 2 + i * (spanLength / 10)
    for (let zOffset of [-width * 0.3, width * 0.3]) {
      const hangerGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xPos, 8, zOffset),
        new THREE.Vector3(xPos, 0.5, zOffset)
      ])
      const hanger = new THREE.Line(hangerGeometry, hangerMaterial)
      bridgeGroup.add(hanger)
    }
  }
}

const createStrainGauges = (spanCount, spanLength, width, deckHeight) => {
  const totalLength = spanCount * spanLength
  
  props.strainGauges.forEach((gauge, index) => {
    const xPos = -totalLength / 2 + (gauge.span - 1) * spanLength + gauge.position * spanLength
    const zOffset = (index % 2 === 0 ? -1 : 1) * (width * 0.25 + index * 0.1)
    
    const gaugeGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16)
    const gaugeMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.gaugeNormal,
      emissive: COLORS.gaugeNormal,
      emissiveIntensity: 0.3
    })
    const gaugeObject = new THREE.Mesh(gaugeGeometry, gaugeMaterial)
    gaugeObject.position.set(xPos, -deckHeight / 2 - 0.3, zOffset)
    gaugeObject.rotation.x = Math.PI / 2
    gaugeObject.castShadow = true
    gaugeObject.userData = { gaugeId: gauge.id, index }
    
    bridgeGroup.add(gaugeObject)
    gaugeObjects.push({ object: gaugeObject, gauge })

    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.gaugeNormal,
      transparent: true,
      opacity: 0.2
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.copy(gaugeObject.position)
    gaugeObject.userData.glow = glow
    bridgeGroup.add(glow)
  })
}

const createWater = () => {
  waterGroup = new THREE.Group()
  scene.add(waterGroup)

  const waterGeometry = new THREE.PlaneGeometry(400, 400, 50, 50)
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.water,
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
    metalness: 0.3
  })
  
  const water = new THREE.Mesh(waterGeometry, waterMaterial)
  water.rotation.x = -Math.PI / 2
  water.position.y = BRIDGE_CONFIG.waterLevel
  water.receiveShadow = true
  waterGroup.add(water)

  const edgeGeometry = new THREE.RingGeometry(150, 160, 64)
  const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0x1a5276,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  })
  const edge = new THREE.Mesh(edgeGeometry, edgeMaterial)
  edge.rotation.x = -Math.PI / 2
  edge.position.y = BRIDGE_CONFIG.waterLevel + 0.01
  waterGroup.add(edge)
}

const createClouds = () => {
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3
  })

  for (let i = 0; i < 15; i++) {
    const cloudGroup = new THREE.Group()
    
    const cloudCount = 3 + Math.floor(Math.random() * 3)
    for (let j = 0; j < cloudCount; j++) {
      const cloudGeometry = new THREE.SphereGeometry(5 + Math.random() * 5, 8, 8)
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial)
      cloud.position.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 10
      )
      cloud.scale.y = 0.6
      cloudGroup.add(cloud)
    }
    
    cloudGroup.position.set(
      (Math.random() - 0.5) * 300,
      60 + Math.random() * 30,
      (Math.random() - 0.5) * 100
    )
    
    clouds.push(cloudGroup)
    scene.add(cloudGroup)
  }
}

const updateGaugeVisualization = () => {
  gaugeObjects.forEach(({ object, gauge }) => {
    const strainData = props.strainGauges.find(g => g.id === gauge.id)
    if (!strainData) return

    const data = props.bridgeData
    if (!data) return

    let color = COLORS.gaugeNormal
    let emissiveIntensity = 0.3

    if (props.selectedGauge === gauge.id) {
      color = COLORS.gaugeSelected
      emissiveIntensity = 0.8
    } else {
      const currentData = window.__strainData?.[gauge.id]
      if (currentData) {
        const absValue = Math.abs(currentData.value)
        if (absValue > 100) {
          color = COLORS.gaugeCritical
          emissiveIntensity = 0.6 + Math.sin(Date.now() * 0.01) * 0.3
        } else if (absValue > 70) {
          color = COLORS.gaugeWarning
          emissiveIntensity = 0.4 + Math.sin(Date.now() * 0.005) * 0.2
        }
      }
    }

    object.material.color.setHex(color)
    object.material.emissive.setHex(color)
    object.material.emissiveIntensity = emissiveIntensity

    if (object.userData.glow) {
      object.userData.glow.material.color.setHex(color)
      object.userData.glow.material.opacity = 0.1 + emissiveIntensity * 0.3
      const scale = 1 + emissiveIntensity * 0.5
      object.userData.glow.scale.set(scale, scale, scale)
    }
  })
}

const updateBridgePose = () => {
  if (!bridgeGroup || !props.bridgeData) return
  
  const { totalLength, spanCount, deckHeight } = BRIDGE_CONFIG
  const spanLength = totalLength / spanCount

  bridgeGroup.children.forEach((child) => {
    if (child.userData.gaugeId !== undefined) return
    
    const gauge = props.strainGauges.find(g => 
      child.position.x >= -totalLength / 2 + (g.span - 1) * spanLength &&
      child.position.x < -totalLength / 2 + g.span * spanLength
    )
    
    if (gauge && props.bridgeData.deflection) {
      const spanIndex = gauge.span - 1
      if (spanIndex < props.bridgeData.deflection.length) {
        const deflection = props.bridgeData.deflection[spanIndex] * 10
        const originalY = child.userData.originalY || child.position.y
        
        if (!child.userData.originalY) {
          child.userData.originalY = child.position.y
        }
        
        const relPos = (child.position.x + totalLength / 2) % spanLength / spanLength
        const waveDeflection = Math.sin(relPos * Math.PI) * deflection
        
        if (child.geometry?.type === 'BoxGeometry' && 
            child.position.y >= -deckHeight && 
            child.position.y <= deckHeight) {
          child.position.y = originalY + waveDeflection
        }
      }
    }
  })
}

const animateWater = () => {
  if (!waterGroup) return
  
  waterGroup.children.forEach((child, index) => {
    if (child.geometry?.type === 'PlaneGeometry') {
      const positions = child.geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i)
        const z = positions.getZ(i)
        const wave = Math.sin(x * 0.02 + Date.now() * 0.001) * 0.1 +
                    Math.cos(z * 0.03 + Date.now() * 0.0008) * 0.05
        positions.setY(i, wave)
      }
      positions.needsUpdate = true
    }
  })
}

const animateClouds = () => {
  clouds.forEach((cloud, index) => {
    cloud.position.x += 0.02 + index * 0.001
    if (cloud.position.x > 200) {
      cloud.position.x = -200
    }
  })
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (controls) {
    controls.update()
  }

  updateGaugeVisualization()
  animateWater()
  animateClouds()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

const onWindowResize = () => {
  const container = containerRef.value
  if (!container || !camera || !renderer) return

  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

const disposeScene = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  if (renderer) {
    renderer.dispose()
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }

  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }

  window.removeEventListener('resize', onWindowResize)

  scene = null
  camera = null
  renderer = null
  controls = null
  bridgeGroup = null
  gaugeObjects = []
  waterGroup = null
  clouds = []
}

watch(() => props.strainGauges, () => {
  if (bridgeGroup) {
    gaugeObjects.forEach(({ object, glow }) => {
      bridgeGroup.remove(object)
      if (glow) bridgeGroup.remove(glow)
    })
    gaugeObjects = []
    
    const { totalLength, spanCount, width, deckHeight } = BRIDGE_CONFIG
    const spanLength = totalLength / spanCount
    
    props.strainGauges.forEach((gauge, index) => {
      const xPos = -totalLength / 2 + (gauge.span - 1) * spanLength + gauge.position * spanLength
      const zOffset = (index % 2 === 0 ? -1 : 1) * (width * 0.25 + index * 0.1)
      
      const gaugeGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16)
      const gaugeMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.gaugeNormal,
        emissive: COLORS.gaugeNormal,
        emissiveIntensity: 0.3
      })
      const gaugeObject = new THREE.Mesh(gaugeGeometry, gaugeMaterial)
      gaugeObject.position.set(xPos, -deckHeight / 2 - 0.3, zOffset)
      gaugeObject.rotation.x = Math.PI / 2
      gaugeObject.castShadow = true
      gaugeObject.userData = { gaugeId: gauge.id, index }
      
      bridgeGroup.add(gaugeObject)
      
      const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: COLORS.gaugeNormal,
        transparent: true,
        opacity: 0.2
      })
      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      glow.position.copy(gaugeObject.position)
      gaugeObject.userData.glow = glow
      bridgeGroup.add(glow)
      
      gaugeObjects.push({ object: gaugeObject, gauge })
    })
  }
}, { deep: true })

watch(() => props.bridgeData, () => {
  updateBridgePose()
}, { deep: true })

onMounted(() => {
  setTimeout(initScene, 100)
})

onUnmounted(() => {
  disposeScene()
})
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}
</style>
