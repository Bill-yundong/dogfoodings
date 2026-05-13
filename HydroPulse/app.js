const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
    setup() {
        const currentTime = ref('');
        const efficiencyChart = ref(null);
        const waterChart = ref(null);
        
        const reservoirs = ref([
            { id: 1, name: '上游水库', level: 856.5, maxLevel: 900, capacity: 12.5 },
            { id: 2, name: '中游水库', level: 642.3, maxLevel: 680, capacity: 8.2 },
            { id: 3, name: '下游水库', level: 428.8, maxLevel: 450, capacity: 5.6 }
        ]);

        const powerUnits = ref([
            { id: 1, name: '1号机组', output: 285.5, maxOutput: 350, efficiency: 94.2 },
            { id: 2, name: '2号机组', output: 278.2, maxOutput: 350, efficiency: 93.8 },
            { id: 3, name: '3号机组', output: 292.1, maxOutput: 350, efficiency: 95.1 },
            { id: 4, name: '4号机组', output: 267.8, maxOutput: 350, efficiency: 92.5 }
        ]);

        const gates = ref([
            { id: 1, name: '1号闸门', opening: 25, maxFlow: 500 },
            { id: 2, name: '2号闸门', opening: 20, maxFlow: 500 },
            { id: 3, name: '3号闸门', opening: 30, maxFlow: 500 },
            { id: 4, name: '4号闸门', opening: 15, maxFlow: 500 }
        ]);

        const syncStatus = ref({
            powerGrid: true,
            dispatchCenter: true,
            powerGridLatency: 12,
            dispatchLatency: 8
        });

        const snapshots = ref([]);
        let efficiencyChartInstance = null;
        let waterChartInstance = null;
        let efficiencyHistory = [];
        let allocationHistory = [];
        let timeLabels = [];

        const overallEfficiency = computed(() => {
            const totalEfficiency = powerUnits.value.reduce((sum, unit) => sum + unit.efficiency, 0);
            return totalEfficiency / powerUnits.value.length;
        });

        const totalCapacity = computed(() => {
            return powerUnits.value.reduce((sum, unit) => sum + unit.maxOutput, 0);
        });

        const allocationEfficiency = computed(() => {
            const totalWater = reservoirs.value.reduce((sum, r) => sum + r.level, 0);
            const totalPower = powerUnits.value.reduce((sum, u) => sum + u.output, 0);
            return Math.min(98, (totalPower / totalWater) * 150);
        });

        const dailyGeneration = computed(() => {
            const totalPower = powerUnits.value.reduce((sum, u) => sum + u.output, 0);
            return totalPower * 24;
        });

        function updateTime() {
            const now = new Date();
            currentTime.value = now.toLocaleString('zh-CN');
        }

        function getEfficiencyColor(efficiency) {
            if (efficiency >= 94) return 'linear-gradient(90deg, #00ff88, #00cc6a)';
            if (efficiency >= 90) return 'linear-gradient(90deg, #ffaa00, #ff8800)';
            return 'linear-gradient(90deg, #ff6b6b, #cc5555)';
        }

        function updateGate(gate) {
            console.log(`闸门 ${gate.name} 开度更新为 ${gate.opening}%`);
            syncWithCenters();
        }

        async function syncWithCenters() {
            syncStatus.value.powerGridLatency = Math.floor(Math.random() * 20) + 5;
            syncStatus.value.dispatchLatency = Math.floor(Math.random() * 15) + 3;
            
            await new Promise(resolve => setTimeout(resolve, 100));
            syncStatus.value.powerGrid = true;
            syncStatus.value.dispatchCenter = true;
        }

        async function runOptimization() {
            console.log('执行异步多目标闸门联调算法...');
            
            const targets = {
                powerDemand: 1100,
                waterLevel: [860, 645, 430],
                floodControl: 0.3
            };

            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 200));
                
                gates.value.forEach((gate, index) => {
                    const target = 20 + index * 5 + Math.sin(Date.now() / 1000) * 10;
                    gate.opening = Math.max(0, Math.min(100, Math.round(target)));
                });

                reservoirs.value.forEach((reservoir, index) => {
                    reservoir.level += (targets.waterLevel[index] - reservoir.level) * 0.1;
                });

                const totalOutput = powerUnits.value.reduce((sum, u) => sum + u.output, 0);
                const adjustment = (targets.powerDemand - totalOutput) / powerUnits.value.length;
                powerUnits.value.forEach(unit => {
                    unit.output = Math.max(unit.maxOutput * 0.5, Math.min(unit.maxOutput, unit.output + adjustment));
                    unit.efficiency = 90 + Math.random() * 6;
                });
            }

            console.log('优化调度完成！');
            syncWithCenters();
        }

        async function simulateFlood() {
            console.log('开始泄洪模拟...');
            
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 300));
                
                gates.value.forEach(gate => {
                    gate.opening = Math.min(100, gate.opening + 8);
                });

                reservoirs.value.forEach((reservoir, index) => {
                    const drainRate = index === 0 ? 2.5 : index === 1 ? 1.8 : 1.2;
                    reservoir.level = Math.max(reservoir.maxLevel * 0.3, reservoir.level - drainRate);
                    reservoir.capacity = Math.max(1, reservoir.capacity - 0.05);
                });

                powerUnits.value.forEach(unit => {
                    unit.output = Math.max(unit.maxOutput * 0.3, unit.output - 15);
                    unit.efficiency = Math.max(80, unit.efficiency - 1.5);
                });
            }

            console.log('泄洪模拟完成，水位已安全下降！');
            syncWithCenters();
        }

        let db = null;
        const DB_NAME = 'HydroPulseDB';
        const STORE_NAME = 'snapshots';

        async function initIndexedDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    db = request.result;
                    resolve(db);
                };
                
                request.onupgradeneeded = (event) => {
                    const database = event.target.result;
                    if (!database.objectStoreNames.contains(STORE_NAME)) {
                        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    }
                };
            });
        }

        async function saveSnapshot() {
            const snapshot = {
                time: new Date().toLocaleString('zh-CN'),
                reservoirs: JSON.parse(JSON.stringify(reservoirs.value)),
                powerUnits: JSON.parse(JSON.stringify(powerUnits.value)),
                gates: JSON.parse(JSON.stringify(gates.value)),
                totalLevel: reservoirs.value.reduce((sum, r) => sum + r.level, 0),
                totalPower: powerUnits.value.reduce((sum, u) => sum + u.output, 0),
                efficiency: overallEfficiency.value,
                timestamp: Date.now()
            };

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.add(snapshot);
            
            await loadSnapshots();
            console.log('快照已保存到 IndexedDB');
        }

        async function loadSnapshots() {
            return new Promise((resolve) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    snapshots.value = request.result.reverse().slice(0, 20);
                    resolve(snapshots.value);
                };
            });
        }

        function loadSnapshot(snapshot) {
            reservoirs.value = snapshot.reservoirs;
            powerUnits.value = snapshot.powerUnits;
            gates.value = snapshot.gates;
            console.log('已加载历史快照:', snapshot.time);
        }

        async function clearHistory() {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.clear();
            snapshots.value = [];
            console.log('历史快照已清空');
        }

        function simulateRealTimeData() {
            reservoirs.value.forEach(reservoir => {
                reservoir.level += (Math.random() - 0.5) * 0.5;
                reservoir.level = Math.max(reservoir.maxLevel * 0.5, Math.min(reservoir.maxLevel, reservoir.level));
            });

            powerUnits.value.forEach(unit => {
                unit.output += (Math.random() - 0.5) * 10;
                unit.output = Math.max(unit.maxOutput * 0.5, Math.min(unit.maxOutput, unit.output));
                unit.efficiency = 90 + Math.random() * 6;
            });

            syncStatus.value.powerGridLatency = Math.floor(Math.random() * 20) + 5;
            syncStatus.value.dispatchLatency = Math.floor(Math.random() * 15) + 3;
        }

        function updateCharts() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            
            timeLabels.push(timeStr);
            efficiencyHistory.push(overallEfficiency.value);
            allocationHistory.push(allocationEfficiency.value);

            if (timeLabels.length > 20) {
                timeLabels.shift();
                efficiencyHistory.shift();
                allocationHistory.shift();
            }

            if (efficiencyChartInstance) {
                efficiencyChartInstance.data.labels = timeLabels;
                efficiencyChartInstance.data.datasets[0].data = efficiencyHistory;
                efficiencyChartInstance.update('none');
            }

            if (waterChartInstance) {
                waterChartInstance.data.labels = timeLabels;
                waterChartInstance.data.datasets[0].data = allocationHistory;
                waterChartInstance.update('none');
            }
        }

        function initCharts() {
            const effCtx = efficiencyChart.value.getContext('2d');
            efficiencyChartInstance = new Chart(effCtx, {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: '水能利用率 (%)',
                        data: efficiencyHistory,
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#e0e6ed' } }
                    },
                    scales: {
                        x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                        y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' }, min: 80, max: 100 }
                    }
                }
            });

            const waterCtx = waterChart.value.getContext('2d');
            waterChartInstance = new Chart(waterCtx, {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: '水资源调配效率 (%)',
                        data: allocationHistory,
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#e0e6ed' } }
                    },
                    scales: {
                        x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                        y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' }, min: 70, max: 100 }
                    }
                }
            });
        }

        onMounted(async () => {
            updateTime();
            setInterval(updateTime, 1000);
            
            try {
                await initIndexedDB();
                await loadSnapshots();
                console.log('IndexedDB 初始化成功');
            } catch (e) {
                console.error('IndexedDB 初始化失败:', e);
            }

            setTimeout(() => {
                initCharts();
            }, 100);

            setInterval(() => {
                simulateRealTimeData();
                updateCharts();
                syncWithCenters();
            }, 3000);
        });

        return {
            currentTime,
            reservoirs,
            powerUnits,
            gates,
            syncStatus,
            snapshots,
            efficiencyChart,
            waterChart,
            overallEfficiency,
            totalCapacity,
            allocationEfficiency,
            dailyGeneration,
            getEfficiencyColor,
            updateGate,
            runOptimization,
            simulateFlood,
            saveSnapshot,
            loadSnapshot,
            clearHistory
        };
    }
}).mount('#app');