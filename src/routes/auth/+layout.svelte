<script>
	let { children } = $props();
</script>

<div class="flex grow items-center justify-center bg-gray-100">
	<div class="w-96 rounded-lg border border-gray-300 bg-white p-4 shadow-lg">
		{@render children()}
	</div>
</div>
