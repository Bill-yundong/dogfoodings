<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useDroneStore } from '@/stores/droneStore'
import { storeToRefs } from 'pinia'

const containerRef = ref<HTMLDivElement | null>(null)
const droneStore = useDroneStore()
const { droneList, optimizationResults, isSimulating, lastUpdateTime } = storeToRefs(droneStore)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let droneMeshes: Map<string, THREE.Group> = new Map()
let pathLines: Map<string, THREE.Line> = new Map()
let gridHelper: THREE.GridHelper
let lastTime = 0

function initScene() {
  if (!containerRef.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a1a)
  scene.fog = new THREE.Fog(0x0a0a1a, 200, 1000)

  camera = new THREE.PerspectiveCamera(
    60,
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    0.1,
    2000
  )
  camera.position.set(150, 100, 150)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxPolarAngle = Math.PI / 2.1
  controls.minDistance = 20
  controls.maxDistance = 800

  const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(100, 200, 100)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 500
  directionalLight.shadow.camera.left = -300
  directionalLight.shadow.camera.right = 300
  directionalLight.shadow.camera.top = 300
  directionalLight.shadow.camera.bottom = -300
  scene.add(directionalLight)

  const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2d5a27, 0.4)
  scene.add(hemisphereLight)

  gridHelper = new THREE.GridHelper(500, 50, 0x444466, 0x333355)
  scene.add(gridHelper)

  createGround()
  createWindIndicator()

  window.addEventListener('resize', onResize)
}

function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(500, 500)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a3a1a,
    roughness: 0.9,
    metalness: 0.1
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
}

function createWindIndicator() {
  const arrowHelper = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 10, 0),
    20,
    0x00ffff,
    5,
    2
  )
  arrowHelper.name = 'windIndicator'
  scene.add(arrowHelper)
}

function updateWindIndicator() {
  const wind = droneStore.weatherDynamics.getWindAt({ x: 0, y: 50, z: 0 })
  const windRad = (wind.direction * Math.PI) / 180
  const direction = new THREE.Vector3(
    Math.sin(windRad),
    0,
    Math.cos(windRad)
  )
  
  const indicator = scene.getObjectByName('windIndicator') as THREE.ArrowHelper
  if (indicator) {
    indicator.setDirection(direction)
    indicator.setLength(10 + wind.speed * 2, 5, 2)
  }
}

function createDroneMesh(droneId: string): THREE.Group {
  const group = new THREE.Group()

  const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 2)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2196F3,
    metalness: 0.6,
    roughness: 0.3,
    emissive: 0x1976D2,
    emissiveIntensity: 0.2
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.castShadow = true
  group.add(body)

  const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 3, 8)
  const armMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.8,
    roughness: 0.2
  })

  const armPositions = [
    { x: 1.5, z: 1.5, rot: Math.PI / 4 },
    { x: -1.5, z: 1.5, rot: -Math.PI / 4 },
    { x: 1.5, z: -1.5, rot: -Math.PI / 4 },
    { x: -1.5, z: -1.5, rot: Math.PI / 4 }
  ]

  const propellerGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 8)
  const propellerMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.9,
    roughness: 0.1
  })

  armPositions.forEach((pos, index) => {
    const arm = new THREE.Mesh(armGeometry, armMaterial)
    arm.position.set(pos.x, 0, pos.z)
    arm.rotation.z = pos.rot
    group.add(arm)

    const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial)
    propeller.position.set(pos.x, 0.6, pos.z)
    propeller.name = `propeller_${index}`
    group.add(propeller)
  })

  const ledGeometry = new THREE.SphereGeometry(0.2, 16, 16)
  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  const led = new THREE.Mesh(ledGeometry, ledMaterial)
  led.position.set(0, 0.6, 0)
  led.name = 'statusLed'
  group.add(led)

  group.userData = { droneId }
  return group
}

function updateDroneMeshes() {
  droneList.value.forEach(drone => {
    let mesh = droneMeshes.get(drone.id)
    if (!mesh) {
      mesh = createDroneMesh(drone.id)
      droneMeshes.set(drone.id, mesh)
      scene.add(mesh)
    }

    mesh.position.set(drone.position.x, drone.position.y, drone.position.z)
    mesh.rotation.y = (drone.heading * Math.PI) / 180

    const led = mesh.getObjectByName('statusLed') as THREE.Mesh
    if (led) {
      const ledMaterial = led.material as THREE.MeshBasicMaterial
      if (drone.status === 'flying') {
        ledMaterial.color.setHex(0x00ff00)
      } else if (drone.status === 'landing') {
        ledMaterial.color.setHex(0xffff00)
      } else if (drone.status === 'error') {
        ledMaterial.color.setHex(0xff0000)
      } else {
        ledMaterial.color.setHex(0x666666)
      }
    }

    mesh.children.forEach((child, index) => {
      if (child.name.startsWith('propeller_')) {
        child.rotation.y += 0.3
      }
    })
  })

  droneMeshes.forEach((mesh, id) => {
    if (!droneList.value.find(d => d.id === id)) {
      scene.remove(mesh)
      droneMeshes.delete(id)
    }
  })
}

function updatePathLines() {
  optimizationResults.value.forEach((result, missionId) => {
    let line = pathLines.get(missionId)
    if (!line) {
      const geometry = new THREE.BufferGeometry()
      const material = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.6
      })
      line = new THREE.Line(geometry, material)
      pathLines.set(missionId, line)
      scene.add(line)
    }

    const positions = new Float32Array(result.optimizedPath.length * 3)
    result.optimizedPath.forEach((point, index) => {
      positions[index * 3] = point.x
      positions[index * 3 + 1] = point.y
      positions[index * 3 + 2] = point.z
    })
    line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    line.geometry.computeBoundingSphere()
  })

  pathLines.forEach((line, missionId) => {
    if (!optimizationResults.value.has(missionId)) {
      scene.remove(line)
      pathLines.delete(missionId)
    }
  })
}

function animate(currentTime: number) {
  animationId = requestAnimationFrame(animate)

  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1)
  lastTime = currentTime

  if (isSimulating.value) {
    droneStore.simulateStep(deltaTime)
  }

  updateDroneMeshes()
  updatePathLines()
  updateWindIndicator()

  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  if (!containerRef.value) return
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
}

onMounted(() => {
  initScene()
  lastTime = performance.now()
  animate(lastTime)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animationId)
  if (renderer && containerRef.value) {
    containerRef.value.removeChild(renderer.domElement)
    renderer.dispose()
  }
})
</script>

<template>
  <div ref="containerRef" class="scene-container"></div>
</template>

<style scoped>
.scene-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
