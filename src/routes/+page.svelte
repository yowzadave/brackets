<script lang="ts">
	let { data } = $props();
	let { user, brackets, picks } = $derived(data);

	let picks_not_mine = $derived(getPicksNotMine(picks, brackets));

	function getPicksNotMine(picks: any[], brackets: any[]) {
		const my_bracket_ids = new Set(brackets.map((b) => b.id));
		return picks.filter((p) => !my_bracket_ids.has(p.bracket_id));
	}
</script>

{#if !user}
	<div
		class="flex h-full grow flex-col items-center justify-center gap-8 bg-gray-100 py-4 md:flex-row"
	>
		<a href="/auth" class="homepage-link"> Log In </a>
	</div>
{:else}
	<div class="space-y-4 p-4">
		{#if picks_not_mine.length}
			<div>
				<h1 class="mb-2">Picks</h1>
				<div>
					{#each picks_not_mine as pick}
						<div>
							<a href={`/bracket/${pick.bracket_id}`} class="btn-text">{pick.bracket.name}</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if brackets.length}
			<div>
				<h1 class="mb-2">My Brackets</h1>
				<div>
					{#each brackets as bracket}
						<div>
							<a href={`/bracket/${bracket.id}`} class="btn-text">{bracket.name}</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}
		<div>
			<p><a href="/create" class="btn-text">+ Create a new bracket</a></p>
		</div>
	</div>
{/if}

<style>
	@reference "tailwindcss";

	.homepage-link {
		@apply w-48 rounded border border-gray-400 bg-white py-8 text-center text-base;

		&:hover {
			@apply border-black shadow-lg;
		}
	}
</style>
