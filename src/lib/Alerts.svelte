<script lang="ts">
	import { fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	import WarningIcon from '$lib/assets/icons/warning.svg';
	import InfoIcon from '$lib/assets/icons/info.svg';
	import XIcon from '$lib/assets/icons/x.svg?component';
	import CheckIcon from '$lib/assets/icons/check.svg';

	import { alerts } from '$lib/stores/alerts';

	const icons = {
		info: InfoIcon,
		warning: WarningIcon,
		danger: WarningIcon,
		error: WarningIcon,
		ok: CheckIcon
	};

	const colors = {
		info: 'oklch(76.8% 0.233 130.85)',
		warning: 'oklch(87.9% 0.169 91.605)',
		danger: 'oklch(70.4% 0.191 22.216)',
		error: 'oklch(70.4% 0.191 22.216)',
		ok: 'oklch(70.7% 0.165 254.624)'
	};

	function deleteAlert(id: string) {
		alerts.remove(id);
	}
</script>

<div
	class="pointer-events-none absolute z-50 flex h-full w-full flex-col items-center space-y-2 pt-16 text-sm"
>
	{#each $alerts as alert (alert.id)}
		<div
			class="flex items-center gap-2 rounded px-4 py-2"
			in:fade={{ duration: 300 }}
			out:fade={{ duration: 300 }}
			animate:flip={{ duration: 300 }}
			style={`background-color: ${colors[alert.type]}; color: white;`}
		>
			<div>
				<svelte:component this={icons[alert.type]} />
			</div>
			<div>
				{alert.message}
			</div>
			<button class="pointer-events-auto ml-4" on:click={() => deleteAlert(alert.id)}>
				<XIcon />
			</button>
		</div>
	{/each}
</div>
