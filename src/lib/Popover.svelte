<script>
	import { onMount } from 'svelte';
	import Portal from './Portal.svelte';

	let { container, z = 210, width = null, align = 'left', fit = false } = $props();

	let el = $state();
	let parent = $state();
	let ticking = $state(false);
	let bbox = $state(null);

	$effect(() => {
		getBbox(container, el, parent);
	});

	function getBbox(container, el, parent) {
		const cont = container || parent || document.body;
		const c = cont.getBoundingClientRect();
		const wh = window.innerHeight;
		const ww = window.innerWidth;
		const e = el ? el.getBoundingClientRect() : c;

		const a = c.top - 3;
		const b = wh - c.top - c.height - 3;

		const w = width || (fit ? c.width : e.width);

		let l;
		if (align === 'right') {
			l = w > c.right ? 0 : c.right - w - 1;
		} else {
			l = c.left + w > ww ? ww - w : c.left;
		}

		const fitsBelow = e.height <= b;
		const fitsAbove = e.height <= a;

		let t;
		let maxH;
		if (fitsBelow) {
			t = c.top + c.height + 3;
			maxH = b;
		} else if (fitsAbove) {
			t = c.top - e.height - 3;
			maxH = a;
		} else if (b > a) {
			t = c.top + c.height + 3;
			maxH = b;
		} else {
			t = 0;
			maxH = a;
		}

		bbox = { l, t, w, maxH };
	}

	function scroll() {
		if (!ticking) {
			window.requestAnimationFrame(() => {
				getBbox(container, el, parent);
				ticking = false;
			});

			ticking = true;
		}
	}

	onMount(() => {
		window.addEventListener('scroll', scroll, true);

		return () => {
			window.removeEventListener('scroll', scroll, true);
		};
	});
</script>

<Portal bind:parent>
	{#if bbox}
		<div
			style="
      border-radius: 0.25rem;
      filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1));
      background: white;
      border: 1px solid #e2e8f0;
      position: fixed;
      z-index: {z};
      top: {bbox.t}px;
      left: {bbox.l}px;
      width: {fit ? `${bbox.w}px` : 'fit-content'};
      max-height: {bbox.maxH}px;
      overflow-y: auto;
    "
		>
			<div bind:this={el}>
				<slot />
			</div>
		</div>
	{/if}
</Portal>
