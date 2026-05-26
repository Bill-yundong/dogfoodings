<script lang="ts">
  import { onMount } from 'svelte';

  let currentRoute: string = $state('workbench');

  const routes = [
    { id: 'workbench', label: '装载工作台', icon: '✈' },
    { id: 'solver', label: '解算控制台', icon: '⚡' },
    { id: 'snapshots', label: '配载快照', icon: '⏱' },
    { id: 'cockpit', label: '机组终端', icon: '🎛' }
  ];

  onMount(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash && routes.some(r => r.id === hash)) {
      currentRoute = hash;
    }
  });

  function navigate(route: string) {
    currentRoute = route;
    window.location.hash = `/${route}`;
  }
</script>

<header class="flex items-center justify-between px-6 py-3 border-b border-brand-700 bg-brand-900">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded bg-gradient-to-br from-accent-gold to-accent-teal flex items-center justify-center font-bold text-brand-900 text-xl">
      AC
    </div>
    <div>
      <h1 class="text-xl font-semibold tracking-tight">AirCargoNexus</h1>
      <p class="text-xs text-brand-300">航空货运装载平衡系统 v0.1</p>
    </div>
  </div>

  <nav class="flex items-center gap-1 bg-brand-800 rounded-lg p-1">
    {#each routes as route}
      <button
        class="px-4 py-2 rounded-md text-sm font-medium transition-all"
        class:bg-brand-700={currentRoute === route.id}
        class:text-accent-gold={currentRoute === route.id}
        class:text-brand-200={currentRoute !== route.id}
        class:hover:bg-brand-700={currentRoute !== route.id}
        onclick={() => navigate(route.id)}
      >
        <span class="mr-2">{route.icon}</span>
        {route.label}
      </button>
    {/each}
  </nav>

  <div class="flex items-center gap-3">
    <div class="text-right">
      <p class="text-sm font-medium">CA-0871</p>
      <p class="text-xs text-brand-300">PEK → JFK</p>
    </div>
    <div class="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-accent-teal font-semibold">
      OP
    </div>
  </div>
</header>

<main class="flex-1 overflow-auto">
  {#if currentRoute === 'workbench'}
    <div class="p-6">
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-brand-800 rounded-xl p-4 border border-brand-700">
          <p class="text-xs text-brand-300 uppercase tracking-wider">总货物</p>
          <p class="text-3xl font-bold text-accent-teal mt-1">47</p>
          <p class="text-xs text-brand-400 mt-1">3 ULD + 44 散货</p>
        </div>
        <div class="bg-brand-800 rounded-xl p-4 border border-brand-700">
          <p class="text-xs text-brand-300 uppercase tracking-wider">总重量</p>
          <p class="text-3xl font-bold text-accent-gold mt-1">12,480</p>
          <p class="text-xs text-brand-400 mt-1">kg / 最大 15,800 kg</p>
        </div>
        <div class="bg-brand-800 rounded-xl p-4 border border-brand-700">
          <p class="text-xs text-brand-300 uppercase tracking-wider">重心 MAC%</p>
          <p class="text-3xl font-bold text-white mt-1">27.4%</p>
          <p class="text-xs text-green-400 mt-1">在容差范围内</p>
        </div>
        <div class="bg-brand-800 rounded-xl p-4 border border-brand-700">
          <p class="text-xs text-brand-300 uppercase tracking-wider">预估节油</p>
          <p class="text-3xl font-bold text-accent-teal mt-1">+3.2%</p>
          <p class="text-xs text-brand-400 mt-1">相对上一版方案</p>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-3 bg-brand-800 rounded-xl border border-brand-700 flex flex-col">
          <div class="px-4 py-3 border-b border-brand-700 flex items-center justify-between">
            <h2 class="font-semibold">货物清单</h2>
            <button class="text-xs text-accent-teal hover:text-white">+ 添加</button>
          </div>
          <div class="flex-1 overflow-auto p-2">
            {#each Array.from({ length: 15 }) as _, i}
              <div class="p-3 mb-2 bg-brand-900 rounded-lg hover:bg-brand-700 transition-colors cursor-pointer">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="font-mono text-sm text-accent-gold">CRG-{String(i + 1).padStart(4, '0')}</p>
                    <p class="text-xs text-brand-300 mt-0.5">电子配件 · 优先 {i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C'}</p>
                  </div>
                  {#if i % 5 === 0}
                    <span class="text-[10px] px-1.5 py-0.5 bg-accent-coral/20 text-accent-coral rounded">危险品</span>
                  {/if}
                </div>
                <div class="flex items-center gap-3 mt-2 text-xs text-brand-300">
                  <span>{(120 + i * 15).toFixed(0)} kg</span>
                  <span>·</span>
                  <span>{(0.8 + i * 0.05).toFixed(2)} m³</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="col-span-6 bg-brand-800 rounded-xl border border-brand-700 flex flex-col">
          <div class="px-4 py-3 border-b border-brand-700 flex items-center justify-between">
            <h2 class="font-semibold">三维装载视图</h2>
            <div class="flex items-center gap-2">
              <button class="text-xs px-3 py-1 bg-brand-700 rounded hover:bg-brand-600">等距</button>
              <button class="text-xs px-3 py-1 bg-brand-900 rounded hover:bg-brand-600">透视</button>
              <button class="text-xs px-3 py-1 bg-brand-900 rounded hover:bg-brand-600">剖切</button>
            </div>
          </div>
          <div class="flex-1 min-h-[420px] relative overflow-hidden bg-gradient-to-b from-brand-900 to-[#041020]">
            <div class="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 600 300" class="w-full h-full max-w-[800px]">
                <defs>
                  <linearGradient id="cargoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#2EC4B6" stop-opacity="0.9" />
                    <stop offset="100%" stop-color="#1e8a7f" stop-opacity="0.9" />
                  </linearGradient>
                  <linearGradient id="uldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#D4A017" stop-opacity="0.9" />
                    <stop offset="100%" stop-color="#a57f11" stop-opacity="0.9" />
                  </linearGradient>
                </defs>

                <path d="M50 150 L120 100 L480 100 L550 150 L480 200 L120 200 Z" fill="none" stroke="#2e5d96" stroke-width="1.5" stroke-dasharray="4 4" />

                <rect x="130" y="115" width="70" height="70" rx="4" fill="url(#uldGrad)" />
                <rect x="210" y="115" width="70" height="70" rx="4" fill="url(#cargoGrad)" />
                <rect x="290" y="115" width="70" height="70" rx="4" fill="url(#cargoGrad)" opacity="0.85" />
                <rect x="370" y="115" width="70" height="70" rx="4" fill="url(#cargoGrad)" opacity="0.7" />
                <rect x="450" y="115" width="50" height="70" rx="4" fill="url(#uldGrad)" opacity="0.9" />

                <line x1="300" y1="150" x2="340" y2="80" stroke="#FF6B6B" stroke-width="3" />
                <polygon points="340,80 332,95 348,95" fill="#FF6B6B" />
                <text x="350" y="85" fill="#FF6B6B" font-size="11" font-family="monospace">CoG (27.4%)</text>

                <g font-family="monospace" font-size="10" fill="#85a5cd">
                  <text x="135" y="110">PMC-001</text>
                  <text x="215" y="110">AKE-032</text>
                  <text x="295" y="110">AKE-033</text>
                  <text x="375" y="110">AKE-034</text>
                  <text x="455" y="110">PMC-002</text>
                </g>

                <g font-size="9" fill="#527fb4">
                  <text x="130" y="195">FWD</text>
                  <text x="500" y="195">AFT</text>
                </g>
              </svg>
            </div>
            <div class="absolute bottom-3 left-3 flex items-center gap-4 text-xs text-brand-300">
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 bg-accent-gold rounded-sm" />
                <span>ULD</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 bg-accent-teal rounded-sm" />
                <span>散货</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-0.5 bg-accent-coral" />
                <span>重心</span>
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-3 bg-brand-800 rounded-xl border border-brand-700 flex flex-col">
          <div class="px-4 py-3 border-b border-brand-700">
            <h2 class="font-semibold">重心包线</h2>
          </div>
          <div class="p-4 flex-1 flex flex-col justify-center">
            <div class="relative bg-brand-900 rounded-lg p-4 aspect-square">
              <svg viewBox="0 0 200 200" class="w-full h-full">
                <polygon points="30,170 60,40 140,40 170,170" fill="#16355e" stroke="#2EC4B6" stroke-width="1.5" />
                <polygon points="50,160 70,60 130,60 150,160" fill="#1f4678" stroke="#D4A017" stroke-width="1" stroke-dasharray="3 2" />
                <circle cx="90" cy="110" r="5" fill="#FF6B6B" />
                <circle cx="90" cy="110" r="9" fill="none" stroke="#FF6B6B" stroke-width="1.5" opacity="0.5" />
                <line x1="20" y1="110" x2="90" y2="110" stroke="#FF6B6B" stroke-width="0.5" stroke-dasharray="2 2" />
                <line x1="90" y1="110" x2="90" y2="180" stroke="#FF6B6B" stroke-width="0.5" stroke-dasharray="2 2" />
                <text x="100" y="105" fill="#FF6B6B" font-size="9" font-family="monospace">27.4%</text>
                <text x="60" y="35" fill="#85a5cd" font-size="9">FORWARD LIMIT</text>
                <text x="110" y="35" fill="#85a5cd" font-size="9">AFT LIMIT</text>
              </svg>
            </div>
            <div class="mt-4 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-brand-300">MAC 范围</span>
                <span class="font-mono text-accent-gold">15% - 35%</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-brand-300">目标重心</span>
                <span class="font-mono text-accent-teal">25%</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-brand-300">偏差</span>
                <span class="font-mono text-white">+2.4%</span>
              </div>
            </div>
          </div>
          <div class="p-4 border-t border-brand-700">
            <button class="w-full py-2.5 bg-gradient-to-r from-accent-gold to-accent-teal text-brand-900 font-semibold rounded-lg hover:opacity-90 transition-opacity">
              ⚡ 开始解算最优方案
            </button>
          </div>
        </div>
      </div>
    </div>
  {:else if currentRoute === 'solver'}
    <div class="p-6">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-4 bg-brand-800 rounded-xl border border-brand-700">
          <div class="px-4 py-3 border-b border-brand-700">
            <h2 class="font-semibold">解算参数</h2>
          </div>
          <div class="p-4 space-y-5">
            <div>
              <label class="block text-sm text-brand-300 mb-2">时间预算</label>
              <input type="range" min="500" max="10000" step="500" value="2000" class="w-full accent-accent-teal" />
              <div class="flex justify-between text-xs text-brand-400 mt-1">
                <span>0.5s</span>
                <span class="font-mono text-accent-gold">2.0s</span>
                <span>10.0s</span>
              </div>
            </div>
            <div>
              <label class="block text-sm text-brand-300 mb-2">启发式权重</label>
              <input type="range" min="0" max="100" value="70" class="w-full accent-accent-teal" />
              <div class="flex justify-between text-xs text-brand-400 mt-1">
                <span>精确</span>
                <span class="font-mono text-accent-gold">70%</span>
                <span>快速</span>
              </div>
            </div>
            <div>
              <label class="block text-sm text-brand-300 mb-2">油耗权重</label>
              <input type="range" min="0" max="100" value="60" class="w-full accent-accent-gold" />
              <div class="flex justify-between text-xs text-brand-400 mt-1">
                <span>空间优先</span>
                <span class="font-mono text-accent-gold">60%</span>
                <span>油耗优先</span>
              </div>
            </div>
            <div>
              <label class="block text-sm text-brand-300 mb-2">MAC 容差</label>
              <input type="range" min="1" max="10" value="3" class="w-full accent-accent-coral" />
              <div class="flex justify-between text-xs text-brand-400 mt-1">
                <span>严格</span>
                <span class="font-mono text-accent-gold">±3%</span>
                <span>宽松</span>
              </div>
            </div>
            <div>
              <label class="block text-sm text-brand-300 mb-2">分支策略</label>
              <select class="w-full bg-brand-900 border border-brand-700 rounded-lg px-3 py-2 text-sm">
                <option>best-first (最佳优先)</option>
                <option>beam search (束搜索)</option>
                <option>dfs (深度优先)</option>
              </select>
            </div>
            <button class="w-full py-3 bg-gradient-to-r from-accent-teal to-accent-gold text-brand-900 font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg">
              ▶ 开始解算
            </button>
          </div>
        </div>

        <div class="col-span-8 space-y-4">
          <div class="bg-brand-800 rounded-xl border border-brand-700">
            <div class="px-4 py-3 border-b border-brand-700 flex items-center justify-between">
              <h2 class="font-semibold">解算进度</h2>
              <span class="text-xs px-2 py-1 bg-accent-teal/20 text-accent-teal rounded font-mono">运行中</span>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-4 gap-4 mb-4">
                <div class="bg-brand-900 rounded-lg p-3">
                  <p class="text-xs text-brand-300">已探索节点</p>
                  <p class="text-2xl font-bold text-white font-mono mt-1">12,480</p>
                </div>
                <div class="bg-brand-900 rounded-lg p-3">
                  <p class="text-xs text-brand-300">剪枝率</p>
                  <p class="text-2xl font-bold text-accent-gold font-mono mt-1">86.4%</p>
                </div>
                <div class="bg-brand-900 rounded-lg p-3">
                  <p class="text-xs text-brand-300">当前上界</p>
                  <p class="text-2xl font-bold text-accent-teal font-mono mt-1">0.924</p>
                </div>
                <div class="bg-brand-900 rounded-lg p-3">
                  <p class="text-xs text-brand-300">当前下界</p>
                  <p class="text-2xl font-bold text-white font-mono mt-1">0.897</p>
                </div>
              </div>
              <div class="bg-brand-900 rounded-lg p-4 h-40">
                <svg viewBox="0 0 400 120" class="w-full h-full">
                  <g stroke="#2e5d96" stroke-width="0.5" opacity="0.4">
                    <line x1="0" y1="30" x2="400" y2="30" />
                    <line x1="0" y1="60" x2="400" y2="60" />
                    <line x1="0" y1="90" x2="400" y2="90" />
                  </g>
                  <polyline
                    points="0,90 50,82 100,75 150,68 200,55 250,48 300,42 350,38 400,36"
                    fill="none"
                    stroke="#2EC4B6"
                    stroke-width="2"
                  />
                  <polyline
                    points="0,20 50,28 100,35 150,42 200,48 250,50 300,52 350,53 400,54"
                    fill="none"
                    stroke="#D4A017"
                    stroke-width="2"
                    stroke-dasharray="4 3"
                  />
                  <g font-size="10" fill="#85a5cd">
                    <text x="5" y="25" class="font-mono">上界</text>
                    <text x="5" y="85" class="font-mono">下界</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-brand-800 rounded-xl border border-brand-700">
            <div class="px-4 py-3 border-b border-brand-700">
              <h2 class="font-semibold">候选方案 Top 5</h2>
            </div>
            <div class="divide-y divide-brand-700">
              {#each [
                { rank: 1, weight: 12480, mac: 27.4, fuel: 3.2, score: 94.2 },
                { rank: 2, weight: 12510, mac: 28.1, fuel: 2.8, score: 91.8 },
                { rank: 3, weight: 12420, mac: 26.8, fuel: 3.0, score: 90.5 },
                { rank: 4, weight: 12560, mac: 29.2, fuel: 2.1, score: 87.3 },
                { rank: 5, weight: 12380, mac: 25.9, fuel: 2.7, score: 85.1 }
              ] as const as item}
                <div class="px-4 py-3 flex items-center gap-4 hover:bg-brand-700/30 transition-colors cursor-pointer">
                  <div class="w-8 h-8 rounded-full bg-brand-900 flex items-center justify-center text-sm font-bold {item.rank === 1 ? 'text-accent-gold' : 'text-brand-300'}">
                    {item.rank}
                  </div>
                  <div class="flex-1 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p class="text-brand-300 text-xs">总重量</p>
                      <p class="font-mono font-medium">{item.weight.toLocaleString()} kg</p>
                    </div>
                    <div>
                      <p class="text-brand-300 text-xs">MAC%</p>
                      <p class="font-mono font-medium {item.mac < 25 || item.mac > 30 ? 'text-accent-coral' : 'text-accent-teal'}">
                        {item.mac}%
                      </p>
                    </div>
                    <div>
                      <p class="text-brand-300 text-xs">节油</p>
                      <p class="font-mono font-medium text-accent-teal">+{item.fuel}%</p>
                    </div>
                    <div>
                      <p class="text-brand-300 text-xs">综合评分</p>
                      <p class="font-mono font-bold {item.score >= 90 ? 'text-accent-gold' : 'text-white'}">
                        {item.score}
                      </p>
                    </div>
                  </div>
                  <button class="text-xs px-3 py-1.5 bg-accent-teal text-brand-900 rounded font-medium hover:opacity-90">
                    应用
                  </button>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else if currentRoute === 'snapshots'}
    <div class="p-6">
      <div class="bg-brand-800 rounded-xl border border-brand-700 mb-4">
        <div class="px-4 py-3 border-b border-brand-700 flex items-center justify-between">
          <h2 class="font-semibold">配载快照时间轴</h2>
          <div class="flex items-center gap-2">
            <input type="text" placeholder="搜索航班/操作员" class="bg-brand-900 border border-brand-700 rounded-lg px-3 py-1.5 text-sm w-60" />
            <button class="text-sm px-3 py-1.5 bg-accent-teal text-brand-900 rounded-lg font-medium hover:opacity-90">
              导出 JSON
            </button>
          </div>
        </div>
        <div class="p-4">
          <div class="relative h-20 bg-brand-900 rounded-lg overflow-hidden">
            <div class="absolute inset-y-0 flex items-center px-4 gap-1">
              {#each Array.from({ length: 30 }) as _, i}
                <div
                  class="w-3 flex-shrink-0 rounded-t-sm cursor-pointer transition-all hover:-translate-y-1"
                  style="height: {20 + Math.random() * 50}px; background: {i % 7 === 0 ? '#D4A017' : i % 5 === 0 ? '#FF6B6B' : '#2EC4B6'}; opacity: 0.7"
                  title={`快照 #${i + 1}`}
                />
              {/each}
            </div>
            <div class="absolute bottom-2 left-4 text-xs text-brand-400 font-mono">
              09:00 &nbsp;&nbsp; 10:00 &nbsp;&nbsp; 11:00 &nbsp;&nbsp; 12:00 &nbsp;&nbsp; 13:00 &nbsp;&nbsp; 14:00
            </div>
          </div>
          <div class="mt-3 flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 bg-accent-teal rounded-sm" />
              <span class="text-brand-300">配载员版本</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 bg-accent-gold rounded-sm" />
              <span class="text-brand-300">机组确认</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 bg-accent-coral rounded-sm" />
              <span class="text-brand-300">告警版本</span>
            </div>
            <span class="ml-auto text-brand-400 font-mono">共 1,247 条快照 · 已用 3.2 MB / 50 MB</span>
          </div>
        </div>
      </div>

      <div class="bg-brand-800 rounded-xl border border-brand-700">
        <div class="px-4 py-3 border-b border-brand-700">
          <h2 class="font-semibold">快照列表</h2>
        </div>
        <div class="divide-y divide-brand-700">
          {#each [
            { id: 'SS-2024-08473', time: '2026-05-26 14:32:18', op: '配载员-ZHANG', status: '机组确认', mac: 27.4, weight: 12480 },
            { id: 'SS-2024-08472', time: '2026-05-26 14:28:05', op: '配载员-ZHANG', status: '已锁定', mac: 28.1, weight: 12510 },
            { id: 'SS-2024-08471', time: '2026-05-26 14:15:42', op: '配载员-LI', status: '草稿', mac: 31.2, weight: 12380 },
            { id: 'SS-2024-08470', time: '2026-05-26 13:58:11', op: '配载员-ZHANG', status: '已废弃', mac: 33.8, weight: 12560 },
            { id: 'SS-2024-08469', time: '2026-05-26 13:42:33', op: '配载员-WANG', status: '机组确认', mac: 26.8, weight: 12420 }
          ] as item}
            <div class="px-4 py-3 flex items-center gap-4 hover:bg-brand-700/30 transition-colors cursor-pointer">
              <div class="font-mono text-sm text-accent-gold">{item.id}</div>
              <div class="text-sm text-brand-300 font-mono">{item.time}</div>
              <div class="text-sm">{item.op}</div>
              <span
                class="text-xs px-2 py-0.5 rounded font-medium {item.status === '机组确认' ? 'bg-accent-teal/20 text-accent-teal' : item.status === '已锁定' ? 'bg-accent-gold/20 text-accent-gold' : item.status === '草稿' ? 'bg-brand-600 text-brand-200' : 'bg-accent-coral/20 text-accent-coral'}"
              >
                {item.status}
              </span>
              <div class="ml-auto flex items-center gap-6 text-sm font-mono">
                <div>
                  <span class="text-brand-400 text-xs mr-1">MAC</span>
                  <span class={item.mac > 30 ? 'text-accent-coral' : 'text-white'}>{item.mac}%</span>
                </div>
                <div>
                  <span class="text-brand-400 text-xs mr-1">重量</span>
                  <span class="text-white">{item.weight.toLocaleString()}kg</span>
                </div>
              </div>
              <button class="text-xs px-3 py-1 bg-brand-700 rounded hover:bg-brand-600">
                回放
              </button>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else if currentRoute === 'cockpit'}
    <div class="p-8 max-w-5xl mx-auto">
      <div class="bg-brand-800 rounded-2xl border border-brand-700 p-8">
        <div class="flex items-start justify-between mb-8">
          <div>
            <p class="text-brand-300 text-sm">CA-0871 · B747-8F</p>
            <h1 class="text-4xl font-bold tracking-tight mt-1">装载配平确认</h1>
            <p class="text-brand-300 mt-2">PEK → JFK · 预计起飞 16:30 LCL</p>
          </div>
          <div class="text-right">
            <p class="text-brand-300 text-sm">机组</p>
            <p class="text-lg font-semibold">CAPT. WANG</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-6 mb-8">
          <div class="bg-brand-900 rounded-xl p-6 text-center">
            <p class="text-brand-300 text-sm">总重 (ZFW)</p>
            <p class="text-5xl font-bold text-white font-mono mt-2">12,480</p>
            <p class="text-accent-gold mt-1 font-mono">kg</p>
          </div>
          <div class="bg-brand-900 rounded-xl p-6 text-center border-2 border-accent-teal">
            <p class="text-brand-300 text-sm">当前重心 MAC%</p>
            <p class="text-5xl font-bold text-accent-teal font-mono mt-2">27.4</p>
            <p class="text-brand-300 mt-1 font-mono">% (范围 15-35%)</p>
          </div>
          <div class="bg-brand-900 rounded-xl p-6 text-center">
            <p class="text-brand-300 text-sm">预估节油</p>
            <p class="text-5xl font-bold text-accent-gold font-mono mt-2">+3.2</p>
            <p class="text-brand-300 mt-1">% ≈ 186 kg</p>
          </div>
        </div>

        <div class="mb-8">
          <div class="flex items-center justify-between mb-3">
            <label class="text-sm text-brand-300">配平微调 (MAC%)</label>
            <span class="font-mono text-accent-gold">27.4%</span>
          </div>
          <input
            type="range"
            min="15"
            max="35"
            step="0.1"
            value="27.4"
            class="w-full h-3 bg-brand-900 rounded-lg appearance-none accent-accent-teal"
          />
          <div class="flex justify-between text-xs text-brand-400 mt-1 font-mono">
            <span>15% FWD</span>
            <span class="text-accent-teal">25% 最优</span>
            <span>35% AFT</span>
          </div>
        </div>

        <div class="bg-brand-900 rounded-xl p-4 mb-8">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-accent-teal/20 flex items-center justify-center text-accent-teal text-xl">
              ✓
            </div>
            <div>
              <p class="font-semibold">配载方案已通过校验</p>
              <p class="text-sm text-brand-300">所有参数在飞行包线内，无重量超限</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <button class="flex-1 py-4 bg-gradient-to-r from-accent-teal to-accent-gold text-brand-900 font-bold text-lg rounded-xl hover:opacity-90 transition-opacity">
            ✓ 确认并锁定配平
          </button>
          <button class="px-8 py-4 bg-brand-700 hover:bg-brand-600 rounded-xl font-medium transition-colors">
            请求调整
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>

<footer class="px-6 py-2 border-t border-brand-700 bg-brand-900 flex items-center justify-between text-xs text-brand-400">
  <div class="flex items-center gap-4">
    <span class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      在线
    </span>
    <span>IndexedDB: 3.2 MB / 50 MB</span>
    <span class="font-mono">svelte 5.1.9</span>
  </div>
  <div class="flex items-center gap-4">
    <span>© 2026 AirCargoNexus</span>
    <span>Build 0.1.0</span>
  </div>
</footer>

<style>
  header {
    min-height: 64px;
  }

  main {
    min-height: calc(100vh - 64px - 36px);
    display: flex;
    flex-direction: column;
  }

  footer {
    min-height: 36px;
  }
</style>
