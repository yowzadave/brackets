<script lang="ts">
	let { data } = $props();
	let { user, public_brackets, brackets, picks } = $derived(data);

	let now = new Date();
	let picks_not_mine = $derived(getPicksNotMine(picks, brackets));
	let active_picks = $derived(picks_not_mine.filter((p) => new Date(p.bracket.end_date) > now));
	let past_picks = $derived(picks_not_mine.filter((p) => new Date(p.bracket.end_date) <= now));
	let my_active_brackets = $derived(brackets.filter((b) => new Date(b.end_date) > now));
	let my_past_brackets = $derived(brackets.filter((b) => new Date(b.end_date) <= now));
	let visible_public_brackets = $derived(
		getPublicBracketsNotMine(public_brackets, brackets, picks)
	);
	let active_brackets = $derived([
		...my_active_brackets,
		...active_picks.map((p) => p.bracket),
		...visible_public_brackets
	]);

	function getPicksNotMine(picks: any[], brackets: any[]) {
		const my_bracket_ids = new Set(brackets.map((b) => b.id));
		return picks.filter((p) => !my_bracket_ids.has(p.bracket_id));
	}

	function getPublicBracketsNotMine(public_brackets: any[], my_brackets: any[], my_picks: any[]) {
		const my_bracket_ids = new Set([
			...my_brackets.map((b) => b.id),
			...my_picks.map((p) => p.bracket_id)
		]);
		return public_brackets.filter((b) => !my_bracket_ids.has(b.id));
	}
</script>

{#snippet bracket_button(bracket)}
	<a href={`/bracket/${bracket.slug || bracket.id}`}>
		<div class="rounded border border-gray-300 p-2 hover:bg-gray-100">
			<div class="text-sm font-bold">{bracket.name}</div>
			<p class="text-xs">
				{#if bracket.pickable}
					Open for Picks
				{:else}
					Ongoing
				{/if}
			</p>
			{#if bracket.end_date}
				<p class="text-xs text-gray-500 italic">
					Ends on: {new Date(bracket.end_date).toLocaleDateString()}
				</p>
			{/if}
		</div>
	</a>
{/snippet}

{#if !user}
	<div
		class="flex h-full grow flex-col items-center justify-center gap-8 bg-gray-100 py-4 md:flex-row"
	>
		<a href="/auth" class="homepage-link"> Log In </a>
	</div>
{:else}
	{#if user.is_anonymous}
		<div class="space-y-2 px-4 pt-4 text-sm text-gray-500">
			<p>You are currently logged in anonymously.</p>
			<p>
				<a href="/auth/link-email" class="btn-text">Link your email address</a>
				to allow logging in from other devices.
			</p>
		</div>
	{/if}
	<div class="space-y-4 p-4">
		{#if active_brackets.length}
			<div>
				<h1 class="mb-2">Active Brackets</h1>
				<div class="flex flex-wrap gap-2">
					{#each active_brackets as bracket}
						{@render bracket_button(bracket)}
					{/each}
				</div>
			</div>
		{/if}
		<div class="flex flex-wrap gap-4">
			{#if past_picks.length}
				<div>
					<h1 class="mb-2">Past Picks</h1>
					<div>
						{#each past_picks as pick}
							<div>
								<a href={`/bracket/${pick.bracket.slug || pick.bracket_id}`} class="btn-text"
									>{pick.bracket.name}</a
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if brackets.length}
				<div>
					<h1 class="mb-2">My Brackets</h1>
					<div>
						{#each my_past_brackets as bracket}
							<div>
								<a href={`/bracket/${bracket.slug || bracket.id}`} class="btn-text"
									>{bracket.name}</a
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
		<div>
			<a href="/create">
				<button class="rounded border border-gray-300 p-2 text-sm hover:bg-gray-100"
					>+ Create a new bracket</button
				>
			</a>
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
