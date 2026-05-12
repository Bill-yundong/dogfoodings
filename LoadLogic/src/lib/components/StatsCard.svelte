<script lang="ts">
	export let title: string;
	export let value: string | number;
	export let icon: string;
	export let color: 'blue' | 'green' | 'purple' | 'yellow' | 'red';

	const colorClasses: Record<string, string> = {
		blue: 'bg-blue-50 text-blue-600 border-blue-200',
		green: 'bg-green-50 text-green-600 border-green-200',
		purple: 'bg-purple-50 text-purple-600 border-purple-200',
		yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
		red: 'bg-red-50 text-red-600 border-red-200'
	};
</script>

<div class="p-4 rounded-lg border {colorClasses[color]}">
	<div class="flex items-center gap-3">
		<span class="text-2xl">{icon}</span>
		<div>
			<p class="text-sm opacity-80">{title}</p>
			<p class="text-xl font-bold">{value}</p>
		</div>
	</div>
</div>
