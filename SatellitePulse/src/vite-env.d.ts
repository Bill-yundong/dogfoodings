/// <reference types="vite/client" />

declare module '*.worker?worker' {
  const Worker: new () => Worker
  export default Worker
}
