<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { BatteryPack, CellData } from '@/types'
import { getTemperatureColor } from '@/utils/arrhenius'

const props = defineProps<{
  pack: BatteryPack
  selectedCellId?: string
  highlightCellId?: string
}>()

const emit = defineEmits<{
  cellClick: [cell: CellData]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationFrameId: number
let cellMeshes: Map<string, THREE.Mesh> = new Map()
let cellGlowMeshes: Map<string, THREE.Mesh> = new Map()

const CELL_WIDTH = 0.15
const CELL_HEIGHT = 0.2
const CELL_DEPTH = 0.02
const CELL_GAP = 0.005
const MODULE_GAP = 0.08

const colors = {
  cellNormal: new THREE.Color(0x2c3e50),
  cellWarning: new THREE.Color(0xf39c12),
  cellDanger: new THREE.Color(0xe74c3c),
  moduleFrame: new THREE.Color(0x34495e),
  packFrame: new THREE.Color(0x2c3e50)
}

function initScene() {
  if (!containerRef.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)
  scene.fog = new THREE.Fog(0x1a1a2e, 5, 20)

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(2.5, 2, 2.5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 1
  controls.maxDistance = 10
  controls.maxPolarAngle = Math.PI / 2.1

  setupLighting()
  createBatteryPack()
  animate()
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
  mainLight.position.set(5, 10, 5)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.width = 2048
  mainLight.shadow.mapSize.height = 2048
  mainLight.shadow.camera.near = 0.5
  mainLight.shadow.camera.far = 50
  mainLight.shadow.camera.left = -10
  mainLight.shadow.camera.right = 10
  mainLight.shadow.camera.top = 10
  mainLight.shadow.camera.bottom = -10
  scene.add(mainLight)

  const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.3)
  fillLight.position.set(-5, 3, -5)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xff6b35, 0.2)
  rimLight.position.set(0, 5, -5)
  scene.add(rimLight)
}

function createBatteryPack() {
  const group = new THREE.Group()
  const modules = props.pack.modules
  const modulesPerRow = 4
  const rows = Math.ceil(modules.length / modulesPerRow)

  const moduleWidth = 4 * (CELL_WIDTH + CELL_GAP) + CELL_GAP
  const moduleHeight = CELL_HEIGHT + 0.05
  const moduleDepth = 3 * (CELL_DEPTH + CELL_GAP) + CELL_GAP

  const packWidth = modulesPerRow * (moduleWidth + MODULE_GAP) + MODULE_GAP
  const packDepth = rows * (moduleDepth + MODULE_GAP) + MODULE_GAP
  const packHeight = moduleHeight + 0.1

  const packGeometry = new THREE.BoxGeometry(packWidth, packHeight, packDepth)
  const packMaterial = new THREE.MeshStandardMaterial({
    color: colors.packFrame,
    metalness: 0.8,
    roughness: 0.3,
    transparent: true,
    opacity: 0.3
  })
  const packMesh = new THREE.Mesh(packGeometry, packMaterial)
  packMesh.position.y = packHeight / 2
  packMesh.receiveShadow = true
  group.add(packMesh)

  modules.forEach((module, moduleIndex) => {
    const moduleGroup = new THREE.Group()

    const row = Math.floor(moduleIndex / modulesPerRow)
    const col = moduleIndex % modulesPerRow

    const moduleX = -packWidth / 2 + MODULE_GAP + col * (moduleWidth + MODULE_GAP) + moduleWidth / 2
    const moduleZ = -packDepth / 2 + MODULE_GAP + row * (moduleDepth + MODULE_GAP) + moduleDepth / 2

    const frameGeometry = new THREE.BoxGeometry(moduleWidth, moduleHeight, moduleDepth)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: colors.moduleFrame,
      metalness: 0.7,
      roughness: 0.4
    })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    frameMesh.position.set(moduleX, moduleHeight / 2, moduleZ)
    frameMesh.castShadow = true
    frameMesh.receiveShadow = true
    moduleGroup.add(frameMesh)

    module.cells.forEach(cell => {
      const cellGroup = new THREE.Group()

      const cellX = -moduleWidth / 2 + CELL_GAP + cell.col * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2
      const cellZ = -moduleDepth / 2 + CELL_GAP + cell.row * (CELL_DEPTH + CELL_GAP) + CELL_DEPTH / 2

      const cellGeometry = new THREE.BoxGeometry(CELL_WIDTH, CELL_HEIGHT, CELL_DEPTH)
      const cellMaterial = new THREE.MeshStandardMaterial({
        color: getCellColor(cell),
        metalness: 0.5,
        roughness: 0.3,
        emissive: getCellEmissive(cell),
        emissiveIntensity: getCellEmissiveIntensity(cell)
      })
      const cellMesh = new THREE.Mesh(cellGeometry, cellMaterial)
      cellMesh.position.set(cellX, 0.025 + CELL_HEIGHT / 2, cellZ)
      cellMesh.castShadow = true
      cellMesh.receiveShadow = true
      cellMesh.userData = { cellId: cell.id, cellData: cell }
      cellGroup.add(cellMesh)
      cellMeshes.set(cell.id, cellMesh)

      if (cell.status === 'thermal_runaway') {
        const glowGeometry = new THREE.BoxGeometry(
          CELL_WIDTH * 1.2,
          CELL_HEIGHT * 1.2,
          CELL_DEPTH * 1.2
        )
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xff4444,
          transparent: true,
          opacity: 0.3
        })
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
        glowMesh.position.copy(cellMesh.position)
        cellGroup.add(glowMesh)
        cellGlowMeshes.set(cell.id, glowMesh)
      }

      cellGroup.position.set(moduleX, 0, moduleZ)
      moduleGroup.add(cellGroup)
    })

    group.add(moduleGroup)
  })

  const planeGeometry = new THREE.PlaneGeometry(packWidth * 1.5, packDepth * 1.5)
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x16213e,
    metalness: 0.9,
    roughness: 0.1
  })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -0.01
  plane.receiveShadow = true
  group.add(plane)

  scene.add(group)
}

function getCellColor(cell: CellData): THREE.Color {
  if (cell.status === 'thermal_runaway') {
    return new THREE.Color(0xff3333)
  }
  if (cell.status === 'warning') {
    return new THREE.Color(0xffaa00)
  }
  return new THREE.Color(0x3d5a80)
}

function getCellEmissive(cell: CellData): THREE.Color {
  if (cell.status === 'thermal_runaway') {
    return new THREE.Color(0xff2222)
  }
  if (cell.status === 'warning') {
    return new THREE.Color(0xff6600)
  }
  return new THREE.Color(0x000000)
}

function getCellEmissiveIntensity(cell: CellData): number {
  if (cell.status === 'thermal_runaway') {
    return 0.8
  }
  if (cell.status === 'warning') {
    return 0.3
  }
  return 0
}

function updateCellVisuals() {
  const allCells = props.pack.modules.flatMap(m => m.cells)
  
  allCells.forEach(cell => {
    const mesh = cellMeshes.get(cell.id)
    if (mesh) {
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.set(getCellColor(cell))
      material.emissive.set(getCellEmissive(cell))
      material.emissiveIntensity = getCellEmissiveIntensity(cell)
      material.needsUpdate = true
    }

    const glowMesh = cellGlowMeshes.get(cell.id)
    if (glowMesh) {
      const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial
      if (cell.status === 'thermal_runaway') {
        glowMaterial.opacity = 0.2 + Math.sin(Date.now() * 0.005) * 0.2
      } else {
        glowMaterial.opacity = 0
      }
    }
  })
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  controls.update()
  updateCellVisuals()
  renderer.render(scene, camera)
}

function handleResize() {
  if (!containerRef.value) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function handleClick(event: MouseEvent) {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  const meshes = Array.from(cellMeshes.values())
  const intersects = raycaster.intersectObjects(meshes)

  if (intersects.length > 0) {
    const cellData = intersects[0].object.userData.cellData as CellData
    emit('cellClick', cellData)
  }
}

onMounted(() => {
  initScene()
  window.addEventListener('resize', handleResize)
  containerRef.value?.addEventListener('click', handleClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  containerRef.value?.removeEventListener('click', handleClick)
  cancelAnimationFrame(animationFrameId)
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<template>
  <div ref="containerRef" class="w-full h-full rounded-lg overflow-hidden"></div>
</template>
