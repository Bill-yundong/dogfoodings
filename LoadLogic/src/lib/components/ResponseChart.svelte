<script lang="ts">
	import type { ResponseSnapshot } from '$lib/types';
	import type { Writable } from 'svelte/store';
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';

	export let snapshots: Writable<ResponseSnapshot[]>;

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function updateChart($snapshots: ResponseSnapshot[]) {
		if (!chart) return;

		const responded = $snapshots.filter(s => s.didRespond).length;
		const notResponded = $snapshots.length - responded;

		const avgByProb = Array(10).fill(0);
		const countByProb = Array(10).fill(0);

		for (const s of $snapshots) {
			const bucket = Math.min(Math.floor(s.responseProbability * 10), 9);
			if (s.didRespond) {
				avgByProb[bucket] += s.reducedLoad;
			}
			countByProb[bucket]++;
		}

		for (let i = 0; i < 10; i++) {
			if (countByProb[i] > 0) {
				avgByProb[i] /= countByProb[i];
			}
		}

		chart.data.datasets[0].data = [responded, notResponded];
		chart.data.datasets[1].data = avgByProb;
		chart.update('none');
	}

	onMount(() => {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		chart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: ['已响应', '未响应', '0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'],
				datasets: [
					{
						label: '响应统计',
						data: [0, 0],
						backgroundColor: ['#10B981', '#EF4444'],
						yAxisID: 'y'
					},
					{
						label: '平均负荷削减 (kW)',
						data: Array(10).fill(0),
						backgroundColor: '#3B82F6',
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				plugins: {
					legend: {
						position: 'bottom'
					}
				},
				scales: {
					y: {
						type: 'linear',
						position: 'left',
						title: {
							display: true,
							text: '家庭数量'
						}
					},
					y1: {
						type: 'linear',
						position: 'right',
						title: {
							display: true,
							text: '负荷削减 (kW)'
						},
						grid: {
							drawOnChartArea: false
						}
					}
				}
			}
		});

		const unsubscribe = snapshots.subscribe(updateChart);
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});
</script>

<canvas bind:this={canvas} />
