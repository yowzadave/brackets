<script lang="ts">
	let { data } = $props();
	let { user } = $derived(data);
</script>

<div
	class="flex h-full grow flex-col items-center justify-center gap-8 bg-gray-100 py-4 md:flex-row"
>
	{#if user}
		<a href="/create" class="homepage-link"> Create a new bracket </a>
	{:else}
		<a href="/auth" class="homepage-link"> Log In </a>
	{/if}
	<a href="/find" class="homepage-link"> Find a bracket </a>
</div>

<style>
	@reference "tailwindcss";

	.homepage-link {
		@apply w-48 rounded border border-gray-400 bg-white py-8 text-center text-base;

		&:hover {
			@apply border-black shadow-lg;
		}
	}
</style>
