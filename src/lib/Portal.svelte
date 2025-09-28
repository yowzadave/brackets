<script>
	import { onMount, onDestroy } from 'svelte';

	export let target = null;
	export let parent = null;

	let portal;
	let ref;
	let clone;

	onMount(() => {
		const t = target || document.body;

		if (typeof t === 'string') {
			const targetEl = document.querySelector(t);
			if (targetEl instanceof HTMLElement) {
				portal = document.createElement('div');
				targetEl.appendChild(portal);
				portal.appendChild(ref);
				parent = clone.parentNode;
			}
		} else if (t instanceof HTMLElement) {
			portal = document.createElement('div');
			t.appendChild(portal);
			portal.appendChild(ref);
			parent = clone.parentNode;
		}
	});

	onDestroy(() => {
		if (portal && portal.parentNode) {
			portal.parentNode.removeChild(portal);
		}
	});
</script>

<div class="portal-clone" bind:this={clone}>
	<div bind:this={ref}>
		<slot />
	</div>
</div>

<style>
	.portal-clone {
		display: none;
	}
</style>
