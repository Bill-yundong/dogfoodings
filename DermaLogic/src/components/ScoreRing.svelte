<script lang="ts">
  export let score: number
  export let size = 120
  export let strokeWidth = 8

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  $: color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
</script>

<div class="relative inline-flex items-center justify-center" style="width: {size}px; height: {size}px;">
  <svg class="transform -rotate-90" width={size} height={size}>
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke="#E5E7EB"
      stroke-width={strokeWidth}
    />
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke={color}
      stroke-width={strokeWidth}
      stroke-dasharray={circumference}
      stroke-dashoffset={offset}
      stroke-linecap="round"
      class="transition-all duration-1000 ease-out"
    />
  </svg>
  <div class="absolute inset-0 flex flex-col items-center justify-center">
    <span class="text-3xl font-bold text-gray-800">{score}</span>
    <span class="text-xs text-gray-500">肤质评分</span>
  </div>
</div>
