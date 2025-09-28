<script lang="ts">
	let { data } = $props();
	let { brackets, picks } = $derived(data);
</script>

<div>
	<h1 class="mb-2">Picks</h1>
	{#if picks.length}
		<div>
			{#each picks as pick}
				<div>
					<a href={`/bracket/${pick.bracket_id}`} class="btn-text">{pick.bracket.name}</a>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 italic">You have not made any picks</p>
	{/if}
</div>

<div>
	<h1 class="mb-2">Brackets</h1>
	{#if brackets.length}
		<div>
			{#each brackets as bracket}
				<div>
					<a href={`/bracket/${bracket.id}`} class="btn-text">{bracket.name}</a>
				</div>
			{/each}
			<p><a href="/create" class="btn-text">+ Create a new bracket</a></p>
		</div>
	{:else}
		<div>
			<p class="text-sm text-gray-500 italic">You have not created any brackets</p>
			<p><a href="/create" class="btn-text">+ Create a new bracket</a></p>
		</div>
	{/if}
</div>
