export function interpolateColor(value: number, min: number, max: number): string {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  const colors = [
    { pos: 0, r: 0, g: 245, b: 212 },
    { pos: 0.5, r: 255, g: 107, b: 53 },
    { pos: 1, r: 239, g: 68, b: 68 },
  ];
  
  for (let i = 0; i < colors.length - 1; i++) {
    const curr = colors[i];
    const next = colors[i + 1];
    
    if (normalized >= curr.pos && normalized <= next.pos) {
      const range = next.pos - curr.pos;
      const t = (normalized - curr.pos) / range;
      const r = Math.round(curr.r + (next.r - curr.r) * t);
      const g = Math.round(curr.g + (next.g - curr.g) * t);
      const b = Math.round(curr.b + (next.b - curr.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  
  return `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b})`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
