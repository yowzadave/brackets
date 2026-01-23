<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/Modal.svelte';
	import EditableHeader from '$lib/EditableHeader.svelte';
	import HamburgerIcon from '$lib/assets/icons/hamburger.svg?component';
	import Bracket from '$lib/Bracket.svelte';
	import Portal from '$lib/Portal.svelte';
	import totalMatches from '$lib/total-matches';
	import { alerts } from '$lib/stores/alerts';
	import { bracketScore } from '$lib/bracket-utils';

	let { data } = $props();
	let { bracket, picks, all_picks, user, supabase } = $derived(data);

	let view_mode = $state('user-picks'); // 'view-actual' | 'user-picks' | 'all-scores' | 'edit-seeds'
	let current_pick: string | null = $state(picks?.id ?? null);
	let bracket_results = $state(bracket.results);
	let bracket_seeds = $state(bracket.seeds);
	let pick_entries = $state(picks?.entries ?? setFirstRoundMatches(bracket.draw_size));
	let nicknames = $state(picks?.nicknames ?? []);
	let my_bracket = $derived(user && bracket?.owner_id === user.id);
	let user_name = $state(picks?.user_name);
	let welcome_el: Modal;
	let bracket_update_el: Modal;
	let viewed_picks = $derived(getViewedPicks(current_pick, all_picks, picks));
	let viewed_nicknames = $derived(getViewedNicknames(current_pick, all_picks, picks));
	let scores = $derived(getScoreList(picks, all_picks));
	let show_menu = $state(false);

	function setFirstRoundMatches(draw_size: number) {
		const matches = Array(totalMatches(bracket.draw_size)).fill(null);

		const first_round_matches = draw_size / 2;
		for (let i = 0; i < first_round_matches; i++) {
			matches[i] = {
				player_a: i * 2,
				player_b: i * 2 + 1,
				winner: null,
				score: null
			};
		}

		return matches;
	}

	function getScoreList(picks: any, all_picks: any[]) {
		let p = picks ? [picks, ...all_picks] : [all_picks];
		return p
			.map((pick) => ({
				...pick,
				score: bracketScore(bracket.draw_size, bracket_results, pick.entries)
			}))
			.sort((a, b) => b.score - a.score);
	}

	function getViewedPicks(current_pick: string | null, all_picks: any[], picks: any) {
		if (!current_pick) return null;
		if (picks && picks.id === current_pick) return null;

		return all_picks?.find((p) => p.id === current_pick)?.entries ?? null;
	}

	function getViewedNicknames(current_pick: string | null, all_picks: any[], picks: any) {
		if (!current_pick) return null;
		if (picks && picks.id === current_pick) return null;

		return all_picks?.find((p) => p.id === current_pick)?.nicknames ?? null;
	}

	async function savePicks() {
		if (!user_name || user_name.trim() === '') {
			alerts.add({ type: 'error', message: 'Please enter your name!', timeout: 5000 });
			return;
		}

		if (!user) {
			const s = await supabase.auth.signInAnonymously();
			if (s.error) {
				alerts.add({ type: 'error', message: 'Error saving picks' });
				console.log('Error signing in anonymously:', s.error);
				return;
			}
		}

		if (!picks) {
			const saved = await fetch(`/picks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bracket_id: bracket.id,
					entries: pick_entries,
					user_name,
					nicknames
				})
			});
			const data = await saved.json();
			if (data.ok) {
				invalidateAll();
				current_pick = data.data.id;
				welcome_el.open();
			} else {
				alerts.add({ type: 'error', message: 'Error saving picks' });
				console.log('Error saving picks:', data.error);
			}
		} else {
			const saved = await fetch(`/picks/${picks.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ entries: pick_entries, user_name, nicknames })
			});
			const data = await saved.json();
			if (data.ok) {
				alerts.add({ type: 'ok', message: 'Picks saved', timeout: 2500 });
			} else {
				alerts.add({ type: 'error', message: 'Error saving picks' });
				console.log('Error updating picks:', data.error);
			}
		}
	}

	function confirmLock() {
		bracket_update_el.open();
	}

	async function saveResults() {
		const update = { results: bracket_results };

		const saved = await fetch(`/brackets/${bracket.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(update)
		});

		const data = await saved.json();
		if (!data.ok) {
			alerts.add({ type: 'error', message: 'Error saving results' });
		} else {
			alerts.add({ type: 'ok', message: 'Results saved', timeout: 2500 });
			invalidateAll();
		}
	}

	async function updateBracketName({ value }: { value: string }) {
		const update = { name: value };

		const saved = await fetch(`/brackets/${bracket.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(update)
		});

		const data = await saved.json();
		if (!data.ok) {
			alerts.add({ type: 'error', message: 'Error updating bracket name' });
		}
	}

	async function saveSeeds() {
		const update = { seeds: bracket_seeds };

		const saved = await fetch(`/brackets/${bracket.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(update)
		});

		const data = await saved.json();
		if (!data.ok) {
			alerts.add({ type: 'error', message: 'Error saving seeds' });
		} else {
			alerts.add({ type: 'ok', message: 'Seeds saved', timeout: 2500 });
			invalidateAll();
		}
	}

	async function lockBracket() {
		const saved = await fetch(`/brackets/${bracket.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pickable: false })
		});

		const data = await saved.json();
		if (!data.ok) {
			alerts.add({ type: 'error', message: 'Error locking bracket' });
		} else {
			alerts.add({ type: 'ok', message: 'Bracket locked', timeout: 2500 });
			invalidateAll();
		}
	}
</script>

<div class="flex grow flex-col">
	<div>
		<div class="flex items-center justify-between bg-zinc-700">
			<div>
				{#if bracket.pickable}
					<div class="flex items-center gap-2 text-sm">
						<div class="px-4 py-2">
							<input
								type="text"
								bind:value={user_name}
								autocomplete="off"
								placeholder="Enter your name"
								class="w-40 rounded border border-gray-200 bg-zinc-200 px-1 py-0.5"
							/>
						</div>
						{#if my_bracket}
							<div class="hidden items-center gap-2 text-sm md:flex">
								<button
									class="nav-tab"
									class:selected={view_mode === 'user-picks'}
									onclick={() => (view_mode = 'user-picks')}
								>
									User Picks
								</button>
								<button
									class="nav-tab"
									class:selected={view_mode === 'edit-seeds'}
									onclick={() => (view_mode = 'edit-seeds')}
								>
									Edit Seeds
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<div class="hidden items-center gap-2 text-sm md:flex">
						<button
							class="nav-tab"
							class:selected={view_mode === 'user-picks'}
							onclick={() => (view_mode = 'user-picks')}
						>
							User Picks
						</button>
						<button
							class="nav-tab"
							class:selected={view_mode === 'view-actual'}
							onclick={() => (view_mode = 'view-actual')}
						>
							Actual Results
						</button>
						{#if my_bracket}
							<button
								class="nav-tab"
								class:selected={view_mode === 'edit-seeds'}
								onclick={() => (view_mode = 'edit-seeds')}
							>
								Edit Seeds
							</button>
						{/if}
						<button
							class="nav-tab"
							class:selected={view_mode === 'all-scores'}
							onclick={() => (view_mode = 'all-scores')}
						>
							All Scores
						</button>
					</div>
					<div class="relative flex text-sm md:hidden">
						<button
							class="px-4 py-2 text-gray-400 hover:text-white"
							onclick={() => (show_menu = !show_menu)}
						>
							<HamburgerIcon />
						</button>
						<div class="nav-tab">
							{#if view_mode === 'user-picks'}
								User Picks
							{:else if view_mode === 'view-actual'}
								Actual Results
							{:else if view_mode === 'edit-seeds'}
								Edit Seeds
							{:else if view_mode === 'all-scores'}
								All Scores
							{/if}
						</div>
						{#if show_menu}
							<div
								class="absolute top-10 left-0 z-50 rounded-2xl border border-gray-300 bg-white p-2 text-nowrap shadow-md"
							>
								<button
									class="nav-tab-menu"
									class:selected={view_mode === 'user-picks'}
									onclick={() => {
										view_mode = 'user-picks';
										show_menu = false;
									}}
								>
									User Picks
								</button>
								<button
									class="nav-tab-menu"
									class:selected={view_mode === 'view-actual'}
									onclick={() => {
										view_mode = 'view-actual';
										show_menu = false;
									}}
								>
									Actual Results
								</button>
								{#if my_bracket}
									<button
										class="nav-tab-menu"
										class:selected={view_mode === 'edit-seeds'}
										onclick={() => {
											view_mode = 'edit-seeds';
											show_menu = false;
										}}
									>
										Edit Seeds
									</button>
								{/if}
								<button
									class="nav-tab-menu"
									class:selected={view_mode === 'all-scores'}
									onclick={() => {
										view_mode = 'all-scores';
										show_menu = false;
									}}
								>
									All Scores
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			<div class="px-4">
				{#if bracket.pickable && view_mode === 'user-picks'}
					<button class="btn btn-primary-dark" onclick={savePicks}> Save&nbsp;Picks </button>
				{:else if my_bracket && view_mode === 'view-actual'}
					<button class="btn btn-primary-dark" onclick={saveResults}> Save&nbsp;Results </button>
				{:else if my_bracket && view_mode === 'edit-seeds'}
					<button class="btn btn-primary-dark" onclick={saveSeeds}> Save&nbsp;Seeds </button>
				{/if}
			</div>
		</div>
	</div>

	{#if view_mode === 'all-scores'}
		<div class="relative grow overflow-y-auto border-t border-gray-400 bg-gray-100 p-4">
			<table>
				<tbody>
					{#each scores as score}
						{@const mine = picks && picks.id === score.id}
						<tr>
							<td class="text-sm">
								{#if mine}
									•
								{/if}
							</td>
							<td
								class="px-4 text-right text-sm italic"
								class:font-bold={mine}
								class:text-black={mine}
								class:text-gray-500={!mine}
							>
								{score.user_name || '<Anonymous>'}
							</td>
							<td class="font-bold">
								{score.score}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="relative grow overflow-x-hidden overflow-y-hidden border-t border-gray-400">
			<Bracket
				draw_size={bracket.draw_size}
				editable={my_bracket && !bracket.pickable}
				pickable={bracket.pickable &&
					view_mode === 'user-picks' &&
					(!user || picks?.id == current_pick)}
				mode={view_mode}
				seeds={bracket_seeds}
				bind:results={bracket_results}
				bind:picks={pick_entries}
				bind:nicknames
				{viewed_picks}
				{viewed_nicknames}
			/>
			{#if view_mode === 'user-picks'}
				{#if user && picks}
					<div class="absolute top-4 right-4 hidden text-sm text-gray-800 md:block">
						<select name="current_pick" class="w-48 bg-white" bind:value={current_pick}>
							{#if user && picks}
								<option value={picks.id} class="font-bold">{picks.user_name}</option>
							{/if}
							{#each all_picks as p}
								<option value={p.id}>{p.user_name || '<Anonymous>'}</option>
							{/each}
						</select>
						{#if bracket.pickable}
							<div class="p-2 text-right text-sm text-gray-500 italic">
								<div>Bracket is open.</div>
								{#if my_bracket}
									<button class="btn-text" onclick={confirmLock}>Lock Bracket</button>
								{/if}
							</div>
						{/if}
					</div>
				{:else if !bracket.pickable}
					<div
						class="absolute top-4 right-4 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-500 italic"
					>
						Bracket is locked.
					</div>
				{/if}
				{#if !bracket.pickable}
					{@const score = scores.find((s) => s.id === current_pick)?.score ?? 0}
					<div
						class="absolute right-4 bottom-4 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-500"
					>
						Total score: <span class="font-bold text-black">{score}</span>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<Modal
	bind:this={bracket_update_el}
	closeable
	buttons={[
		{ label: 'Cancel', type: 'cancel' },
		{ label: 'Lock Bracket', type: 'confirm', style: 'danger' }
	]}
	confirm={lockBracket}
>
	<div slot="title">Lock Bracket</div>
	<div slot="content" class="space-y-4">
		<p>Are you sure you want to lock this bracket? This action cannot be reversed.</p>
		<p>Users will no longer be able to update their picks.</p>
	</div>
</Modal>

<Modal
	bind:this={welcome_el}
	mode="info"
	closeable
	buttons={[{ label: 'OK', type: 'confirm', style: 'primary-alt' }]}
>
	<div slot="content" class="space-y-4">
		<p>Your picks have been saved! You are free to edit and re-save until the bracket is locked.</p>
		<p>You can return to this page to view your results.</p>
		{#if !user || user.is_anonymous}
			<p>
				If you want to log in from another device, <a href="/auth/link-email" class="btn-text"
					>link your account to an email address</a
				>.
			</p>
			<p>
				View all your brackets at the <a href="/" class="btn-text">home page</a>.
			</p>
		{/if}
	</div>
</Modal>

<Portal target="#title-container">
	<div class="w-full overflow-hidden text-lg font-bold text-gray-300">
		<EditableHeader
			disabled={!my_bracket}
			value={bracket.name}
			change={updateBracketName}
			inheritsize
			maxwidth
		/>
	</div>
</Portal>

<style>
	@reference "tailwindcss";

	.nav-tab {
		@apply cursor-pointer border-b-2 border-transparent px-4 py-2 text-gray-400;
	}

	.nav-tab.selected {
		@apply border-b-2 border-orange-400 text-orange-400;
	}

	.nav-tab:hover:not(.selected) {
		@apply text-white;
	}

	.nav-tab-menu {
		@apply block rounded-lg px-2 py-1 text-sm text-gray-500;

		&.selected {
			@apply text-black;
		}

		&:hover {
			@apply bg-gray-100 text-black;
		}
	}
</style>
