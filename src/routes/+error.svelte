<script lang="ts">
	import { page } from '$app/state';
	const emojis = {
		420: '🫠',
		500: '💥',
		404: '🕵️‍♂️'
	};
</script>

<div class="space-y-4 p-4">
	<h1>{page.status}: {page.error?.message}</h1>
	<span>{emojis[page.status]}</span>
</div>
