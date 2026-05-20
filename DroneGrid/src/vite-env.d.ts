/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  export class OrbitControls {
    constructor(camera: any, domElement: HTMLElement)
    enableDamping: boolean
    dampingFactor: number
    maxPolarAngle: number
    minDistance: number
    maxDistance: number
    update(): void
    dispose(): void
  }
}
