export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t
}

export const normalize = (value: number, min: number, max: number): number => {
  return (value - min) / (max - min)
}

export const denormalize = (normalized: number, min: number, max: number): number => {
  return min + normalized * (max - min)
}

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min
}

export const movingAverage = (values: number[], window: number): number => {
  if (values.length === 0) return 0
  const end = Math.min(window, values.length)
  const sum = values.slice(-end).reduce((a, b) => a + b, 0)
  return sum / end
}

export const calculateGradient = (profile: Float32Array, dx: number): Float32Array => {
  const n = profile.length
  const gradient = new Float32Array(n)
  
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      gradient[i] = (profile[1] - profile[0]) / dx
    } else if (i === n - 1) {
      gradient[i] = (profile[n - 1] - profile[n - 2]) / dx
    } else {
      gradient[i] = (profile[i + 1] - profile[i - 1]) / (2 * dx)
    }
  }
  
  return gradient
}

export const maxAbs = (arr: Float32Array): number => {
  let max = 0
  for (let i = 0; i < arr.length; i++) {
    const abs = Math.abs(arr[i])
    if (abs > max) max = abs
  }
  return max
}

export const rungeKutta4 = (
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  dt: number
): number => {
  const k1 = f(t0, y0)
  const k2 = f(t0 + dt / 2, y0 + dt / 2 * k1)
  const k3 = f(t0 + dt / 2, y0 + dt / 2 * k2)
  const k4 = f(t0 + dt, y0 + dt * k3)
  return y0 + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
}

export const gaussianNoise = (mean: number = 0, std: number = 1): number => {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + std * z
}

export const cflCondition = (velocity: number, dx: number, soundSpeed: number): number => {
  return Math.min(dx / Math.abs(velocity), dx / soundSpeed) * 0.5
}
