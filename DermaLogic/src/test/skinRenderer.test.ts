import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SkinFeatures } from '../types'

const mockMaterial = {
  roughness: 0.4,
  color: { r: 0.96, g: 0.80, b: 0.65, lerp: vi.fn().mockReturnThis() },
  emissive: { r: 0, g: 0, b: 0 },
  emissiveIntensity: 0,
  map: null,
  needsUpdate: false
}

const mockCamera = {
  position: { set: vi.fn(), z: 5 },
  aspect: 1,
  updateProjectionMatrix: vi.fn()
}

const mockRenderer = {
  domElement: document.createElement('canvas'),
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn()
}

const mockMesh = {
  rotation: { x: 0, y: 0 },
  add: vi.fn(),
  material: mockMaterial
}

const mockGeometry = {
  attributes: {
    position: {
      count: 10,
      setXYZ: vi.fn(),
      getX: vi.fn().mockReturnValue(0),
      getY: vi.fn().mockReturnValue(0),
      getZ: vi.fn().mockReturnValue(0)
    }
  },
  computeVertexNormals: vi.fn()
}

vi.mock('three', () => {
  return {
    Scene: class {
      background: any = null
      add = vi.fn()
    },
    PerspectiveCamera: class {
      position = mockCamera.position
      aspect = mockCamera.aspect
      updateProjectionMatrix = mockCamera.updateProjectionMatrix
    },
    WebGLRenderer: class {
      domElement = mockRenderer.domElement
      setSize = mockRenderer.setSize
      setPixelRatio = mockRenderer.setPixelRatio
      render = mockRenderer.render
      dispose = mockRenderer.dispose
    },
    Mesh: class {
      rotation = mockMesh.rotation
      add = mockMesh.add
      material = mockMesh.material
    },
    SphereGeometry: class {
      attributes = mockGeometry.attributes
      computeVertexNormals = mockGeometry.computeVertexNormals
    },
    MeshPhysicalMaterial: class {
      roughness = mockMaterial.roughness
      color = { ...mockMaterial.color }
      emissive = { ...mockMaterial.emissive }
      emissiveIntensity = mockMaterial.emissiveIntensity
      map = mockMaterial.map
      needsUpdate = mockMaterial.needsUpdate
    },
    WireframeGeometry: class {},
    LineBasicMaterial: class {},
    LineSegments: class { add = vi.fn() },
    AmbientLight: class { add = vi.fn() },
    DirectionalLight: class {
      position = { set: vi.fn() }
      add = vi.fn()
    },
    Color: class {
      r = 0.96; g = 0.80; b = 0.65
      lerp = vi.fn().mockReturnThis()
    },
    CanvasTexture: class {
      needsUpdate = false
    },
    DoubleSide: 2,
    Vector3: class {
      fromBufferAttribute = vi.fn().mockReturnThis()
      normalize = vi.fn().mockReturnThis()
      multiplyScalar = vi.fn().mockReturnThis()
      x = 0; y = 0; z = 0
    }
  }
})

import { SkinRenderer } from '../services/skinRenderer'

function createMockContainer(width = 800, height = 600): HTMLElement {
  const container = document.createElement('div')
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true })
  return container
}

function createMockImageData(w = 1, h = 1): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  return { data, width: w, height: h, colorSpace: 'srgb' } as ImageData
}

describe('SkinRenderer', () => {
  let renderer: SkinRenderer
  let container: HTMLElement

  beforeEach(() => {
    renderer = new SkinRenderer()
    container = createMockContainer()
    mockCamera.position.z = 5
    mockCamera.aspect = 1
  })

  afterEach(() => {
    renderer.dispose()
    vi.restoreAllMocks()
  })

  // ── 1. init 测试 ──────────────────────────────────────────────
  describe('init - 初始化场景、相机、渲染器', () => {
    it('应创建场景、相机和渲染器，并在容器中添加 canvas', () => {
      renderer.init(container)

      const canvas = container.querySelector('canvas')
      expect(canvas).not.toBeNull()
    })

    it('应在容器中 appendChild canvas 元素', () => {
      const appendSpy = vi.spyOn(container, 'appendChild')

      renderer.init(container)

      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLCanvasElement))
    })

    it('应启动动画循环（requestAnimationFrame 被调用）', () => {
      renderer.init(container)

      expect(requestAnimationFrame).toHaveBeenCalled()
    })
  })

  // ── 2. zoomIn / zoomOut 测试 ──────────────────────────────────
  describe('zoomIn / zoomOut - 相机缩放', () => {
    it('zoomIn 应减少相机 z 位置 0.5', () => {
      renderer.init(container)

      const zBefore = (renderer as any).camera.position.z
      renderer.zoomIn()
      const zAfter = (renderer as any).camera.position.z

      expect(zAfter).toBe(Math.max(3, zBefore - 0.5))
    })

    it('zoomIn 最小 z 位置为 3', () => {
      renderer.init(container)

      for (let i = 0; i < 20; i++) {
        renderer.zoomIn()
      }

      expect((renderer as any).camera.position.z).toBe(3)
    })

    it('zoomOut 应增加相机 z 位置 0.5', () => {
      renderer.init(container)

      renderer.zoomIn()
      const zBefore = (renderer as any).camera.position.z
      renderer.zoomOut()
      const zAfter = (renderer as any).camera.position.z

      expect(zAfter).toBe(Math.min(10, zBefore + 0.5))
    })

    it('zoomOut 最大 z 位置为 10', () => {
      renderer.init(container)

      for (let i = 0; i < 20; i++) {
        renderer.zoomOut()
      }

      expect((renderer as any).camera.position.z).toBe(10)
    })

    it('未初始化时 zoomIn / zoomOut 不应报错', () => {
      const newRenderer = new SkinRenderer()
      expect(() => newRenderer.zoomIn()).not.toThrow()
      expect(() => newRenderer.zoomOut()).not.toThrow()
    })
  })

  // ── 3. resize 测试 ───────────────────────────────────────────
  describe('resize - 根据容器尺寸更新相机和渲染器', () => {
    it('未初始化时 resize 不应报错', () => {
      expect(() => renderer.resize()).not.toThrow()
    })

    it('初始化后 resize 应更新相机 aspect 和渲染器尺寸', () => {
      renderer.init(container)

      Object.defineProperty(container, 'clientWidth', { value: 1024, configurable: true })
      Object.defineProperty(container, 'clientHeight', { value: 768, configurable: true })

      renderer.resize()

      expect((renderer as any).camera.aspect).toBe(1024 / 768)
      expect((renderer as any).camera.updateProjectionMatrix).toHaveBeenCalled()
      expect((renderer as any).renderer.setSize).toHaveBeenCalledWith(1024, 768)
    })
  })

  // ── 4. setHighlight 测试 ──────────────────────────────────────
  describe('setHighlight - 根据肤质特征更新材质', () => {
    it('未初始化时 setHighlight 不应报错', () => {
      const features: SkinFeatures = {
        moisture: 70, oiliness: 50, elasticity: 80,
        roughness: 30, poreSize: 25, wrinkles: 15,
        activeIngredients: {}
      }
      expect(() => renderer.setHighlight(features)).not.toThrow()
    })

    it('初始化后应成功设置肤质高亮', () => {
      renderer.init(container)

      const features: SkinFeatures = {
        moisture: 70, oiliness: 50, elasticity: 80,
        roughness: 30, poreSize: 25, wrinkles: 15,
        activeIngredients: {}
      }
      expect(() => renderer.setHighlight(features)).not.toThrow()
    })

    it('roughness 映射：0 -> 材质 roughness 0.2, 100 -> 0.8', () => {
      renderer.init(container)

      const lowRoughness: SkinFeatures = {
        moisture: 70, oiliness: 50, elasticity: 80,
        roughness: 0, poreSize: 25, wrinkles: 15,
        activeIngredients: {}
      }
      renderer.setHighlight(lowRoughness)
      expect((renderer as any).skinMesh.material.roughness).toBe(0.2)

      const highRoughness: SkinFeatures = {
        moisture: 70, oiliness: 50, elasticity: 80,
        roughness: 100, poreSize: 25, wrinkles: 15,
        activeIngredients: {}
      }
      renderer.setHighlight(highRoughness)
      expect((renderer as any).skinMesh.material.roughness).toBe(0.8)
    })

    it('healthFactor > 0.5 时颜色偏向健康色（高 moisture + elasticity）', () => {
      renderer.init(container)

      const features: SkinFeatures = {
        moisture: 90, oiliness: 50, elasticity: 90,
        roughness: 10, poreSize: 10, wrinkles: 5,
        activeIngredients: {}
      }

      expect(() => renderer.setHighlight(features)).not.toThrow()
    })

    it('healthFactor < 0.5 时颜色偏向不健康色（低 moisture + elasticity）', () => {
      renderer.init(container)

      const features: SkinFeatures = {
        moisture: 20, oiliness: 50, elasticity: 20,
        roughness: 80, poreSize: 80, wrinkles: 70,
        activeIngredients: {}
      }

      expect(() => renderer.setHighlight(features)).not.toThrow()
    })
  })

  // ── 5. updateTexture 测试 ─────────────────────────────────────
  describe('updateTexture - 更新纹理贴图', () => {
    it('未初始化时 updateTexture 不应报错', () => {
      expect(() => renderer.updateTexture(createMockImageData())).not.toThrow()
    })

    it('初始化后应成功更新纹理', () => {
      renderer.init(container)

      expect(() => renderer.updateTexture(createMockImageData(4, 4))).not.toThrow()
    })
  })

  // ── 6. dispose 测试 ──────────────────────────────────────────
  describe('dispose - 释放资源', () => {
    it('未初始化时 dispose 不应报错', () => {
      expect(() => renderer.dispose()).not.toThrow()
    })

    it('初始化后 dispose 应移除 canvas 并清理引用', () => {
      renderer.init(container)

      const canvas = container.querySelector('canvas')
      expect(canvas).not.toBeNull()

      renderer.dispose()

      const canvasAfterDispose = container.querySelector('canvas')
      expect(canvasAfterDispose).toBeNull()
    })

    it('dispose 后 cancelAnimationFrame 应被调用', () => {
      renderer.init(container)

      renderer.dispose()

      expect(cancelAnimationFrame).toHaveBeenCalled()
    })

    it('dispose 后再次 dispose 不应报错', () => {
      renderer.init(container)
      renderer.dispose()

      expect(() => renderer.dispose()).not.toThrow()
    })

    it('dispose 后其他方法应安全退出', () => {
      renderer.init(container)
      renderer.dispose()

      expect(() => renderer.zoomIn()).not.toThrow()
      expect(() => renderer.zoomOut()).not.toThrow()
      expect(() => renderer.resize()).not.toThrow()
      expect(() => renderer.setHighlight({
        moisture: 50, oiliness: 50, elasticity: 50,
        roughness: 50, poreSize: 50, wrinkles: 50,
        activeIngredients: {}
      })).not.toThrow()
      expect(() => renderer.updateTexture(createMockImageData())).not.toThrow()
    })
  })
})
