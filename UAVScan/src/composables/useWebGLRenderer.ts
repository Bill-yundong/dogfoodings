import { ref, reactive, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { PointCloudData, RenderSettings, BoundingBox, LODLevel } from '@/types'

export function useWebGLRenderer() {
  const container = ref<HTMLDivElement | null>(null)
  const isInitialized = ref(false)
  const currentPointCloud = ref<PointCloudData | null>(null)
  const lodLevels = ref<LODLevel[]>([])

  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let controls: OrbitControls | null = null
  let animationId: number | null = null
  let pointCloudObject: THREE.Points | null = null
  let gridHelper: THREE.GridHelper | null = null
  let axesHelper: THREE.AxesHelper | null = null

  const renderSettings = reactive<RenderSettings>({
    pointSize: 1.5,
    opacity: 1.0,
    colorMap: {
      mode: 'elevation',
      colorScale: ['#0000ff', '#00ff00', '#ffff00', '#ff0000']
    },
    showAxes: true,
    showGrid: true,
    backgroundColor: '#0a0e17'
  })

  const stats = reactive({
    fps: 0,
    frameCount: 0,
    lastTime: performance.now(),
    renderTime: 0
  })

  const cameraPosition = reactive({
    x: 0,
    y: 0,
    z: 0
  })

  function init(containerElement: HTMLDivElement): void {
    if (isInitialized.value) return

    container.value = containerElement
    const width = containerElement.clientWidth
    const height = containerElement.clientHeight

    scene = new THREE.Scene()
    scene.background = new THREE.Color(renderSettings.backgroundColor)

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000)
    camera.position.set(50, 50, 50)

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    containerElement.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = true
    controls.minDistance = 1
    controls.maxDistance = 1000

    gridHelper = new THREE.GridHelper(100, 100, 0x1e3a5f, 0x0a1929)
    scene.add(gridHelper)

    axesHelper = new THREE.AxesHelper(10)
    scene.add(axesHelper)

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)

    setupShaderMaterial()

    window.addEventListener('resize', handleResize)

    isInitialized.value = true
    animate()
  }

  function setupShaderMaterial(): void {
    const vertexShader = `
      attribute float size;
      attribute float intensity;
      attribute vec3 color;
      
      varying vec3 vColor;
      varying float vIntensity;
      
      void main() {
        vColor = color;
        vIntensity = intensity;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `

    const fragmentShader = `
      varying vec3 vColor;
      varying float vIntensity;
      uniform float opacity;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float alpha = (1.0 - dist * 2.0) * opacity;
        
        gl_FragColor = vec4(vColor, alpha);
      }
    `

    return { vertexShader, fragmentShader }
  }

  function loadPointCloud(data: PointCloudData, lod?: LODLevel[]): void {
    if (!scene) return

    clearPointCloud()
    currentPointCloud.value = data

    if (lod) {
      lodLevels.value = lod
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(data.points, 3))

    const colors = new Float32Array(data.pointCount * 3)
    const sizes = new Float32Array(data.pointCount)
    const intensities = new Float32Array(data.pointCount)

    const bounds = data.bounds
    const zRange = bounds.maxZ - bounds.minZ || 1

    for (let i = 0; i < data.pointCount; i++) {
      const z = data.points[i * 3 + 2]
      const normalizedZ = (z - bounds.minZ) / zRange

      let r, g, b

      if (data.colors) {
        r = data.colors[i * 4] / 255
        g = data.colors[i * 4 + 1] / 255
        b = data.colors[i * 4 + 2] / 255
      } else {
        const c = getElevationColor(normalizedZ)
        r = c[0]
        g = c[1]
        b = c[2]
      }

      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      sizes[i] = renderSettings.pointSize
      intensities[i] = data.intensities ? data.intensities[i] : 0.5
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1))

    const { vertexShader, fragmentShader } = setupShaderMaterial()

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        opacity: { value: renderSettings.opacity }
      },
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    pointCloudObject = new THREE.Points(geometry, material)
    scene.add(pointCloudObject)

    fitCameraToBounds(bounds)
    updateGridSize(bounds)
  }

  function getElevationColor(t: number): [number, number, number] {
    const colors = [
      [0.0, 0.5, 1.0],
      [0.0, 1.0, 0.5],
      [1.0, 1.0, 0.0],
      [1.0, 0.3, 0.0]
    ]

    const scaledT = t * (colors.length - 1)
    const index = Math.floor(scaledT)
    const fraction = scaledT - index

    if (index >= colors.length - 1) {
      return colors[colors.length - 1] as [number, number, number]
    }

    const c1 = colors[index]
    const c2 = colors[index + 1]

    return [
      c1[0] + (c2[0] - c1[0]) * fraction,
      c1[1] + (c2[1] - c1[1]) * fraction,
      c1[2] + (c2[2] - c1[2]) * fraction
    ]
  }

  function clearPointCloud(): void {
    if (pointCloudObject && scene) {
      scene.remove(pointCloudObject)
      pointCloudObject.geometry.dispose()
      if (Array.isArray(pointCloudObject.material)) {
        pointCloudObject.material.forEach(m => m.dispose())
      } else {
        pointCloudObject.material.dispose()
      }
      pointCloudObject = null
    }
    currentPointCloud.value = null
  }

  function fitCameraToBounds(bounds: BoundingBox): void {
    if (!camera || !controls) return

    const center = new THREE.Vector3(
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2,
      (bounds.minZ + bounds.maxZ) / 2
    )

    const size = new THREE.Vector3(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      bounds.maxZ - bounds.minZ
    )

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    const distance = Math.max(maxDim / 2 / Math.tan(fov / 2), maxDim * 1.5)

    camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7
    )

    controls.target.copy(center)
    controls.update()
  }

  function updateGridSize(bounds: BoundingBox): void {
    if (!scene || !gridHelper) return

    scene.remove(gridHelper)

    const size = Math.max(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY
    ) * 1.5

    const divisions = Math.min(100, Math.max(10, Math.floor(size / 10)))

    gridHelper = new THREE.GridHelper(size, divisions, 0x1e3a5f, 0x0a1929)
    gridHelper.position.y = bounds.minZ - (bounds.maxZ - bounds.minZ) * 0.1
    scene.add(gridHelper)
  }

  function updateSettings(newSettings: Partial<RenderSettings>): void {
    Object.assign(renderSettings, newSettings)

    if (renderer) {
      renderer.setClearColor(new THREE.Color(renderSettings.backgroundColor))
    }

    if (gridHelper) {
      gridHelper.visible = renderSettings.showGrid
    }

    if (axesHelper) {
      axesHelper.visible = renderSettings.showAxes
    }

    if (pointCloudObject) {
      const geometry = pointCloudObject.geometry
      const sizes = geometry.attributes.size as THREE.BufferAttribute

      for (let i = 0; i < sizes.count; i++) {
        sizes.setX(i, renderSettings.pointSize)
      }
      sizes.needsUpdate = true

      const material = pointCloudObject.material as THREE.ShaderMaterial
      material.uniforms.opacity.value = renderSettings.opacity
    }
  }

  function resetCamera(): void {
    if (currentPointCloud.value) {
      fitCameraToBounds(currentPointCloud.value.bounds)
    }
  }

  function setCameraView(view: 'top' | 'front' | 'side' | 'iso'): void {
    if (!camera || !controls || !currentPointCloud.value) return

    const bounds = currentPointCloud.value.bounds
    const center = new THREE.Vector3(
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2,
      (bounds.minZ + bounds.maxZ) / 2
    )

    const maxDim = Math.max(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      bounds.maxZ - bounds.minZ
    )

    const distance = maxDim * 1.5

    switch (view) {
      case 'top':
        camera.position.set(center.x, center.y, center.z + distance)
        break
      case 'front':
        camera.position.set(center.x, center.y - distance, center.z)
        break
      case 'side':
        camera.position.set(center.x + distance, center.y, center.z)
        break
      case 'iso':
        camera.position.set(
          center.x + distance * 0.7,
          center.y + distance * 0.7,
          center.z + distance * 0.7
        )
        break
    }

    controls.target.copy(center)
    controls.update()
  }

  function handleResize(): void {
    if (!container.value || !camera || !renderer) return

    const width = container.value.clientWidth
    const height = container.value.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  function animate(): void {
    animationId = requestAnimationFrame(animate)

    const now = performance.now()
    stats.frameCount++

    if (now - stats.lastTime >= 1000) {
      stats.fps = stats.frameCount
      stats.frameCount = 0
      stats.lastTime = now
    }

    if (camera) {
      cameraPosition.x = camera.position.x
      cameraPosition.y = camera.position.y
      cameraPosition.z = camera.position.z
    }

    controls?.update()

    const renderStart = performance.now()
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
    stats.renderTime = performance.now() - renderStart
  }

  function getScreenshot(): string | null {
    if (!renderer) return null
    return renderer.domElement.toDataURL('image/png')
  }

  function dispose(): void {
    window.removeEventListener('resize', handleResize)

    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    clearPointCloud()

    if (renderer) {
      renderer.dispose()
      if (container.value && renderer.domElement.parentNode === container.value) {
        container.value.removeChild(renderer.domElement)
      }
      renderer = null
    }

    scene = null
    camera = null
    controls = null
    gridHelper = null
    axesHelper = null

    isInitialized.value = false
  }

  onUnmounted(() => {
    dispose()
  })

  return {
    container,
    isInitialized,
    currentPointCloud,
    lodLevels,
    renderSettings,
    stats,
    cameraPosition,
    init,
    loadPointCloud,
    clearPointCloud,
    updateSettings,
    resetCamera,
    setCameraView,
    fitCameraToBounds,
    getScreenshot,
    dispose
  }
}
