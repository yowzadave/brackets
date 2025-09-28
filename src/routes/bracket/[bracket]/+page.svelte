<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/Modal.svelte';
	import Bracket from '$lib/Bracket.svelte';
	import totalMatches from '$lib/total-matches';
	import { alerts } from '$lib/stores/alerts';
	import { bracketScore } from '$lib/bracket-utils';

	let { data } = $props();
	let { bracket, picks, all_picks, user, supabase } = $derived(data);

	let view_mode = $state('user-picks'); // 'view-actual' | 'user-picks' | 'all-scores';
	let current_pick: string | null = $state(picks?.id ?? null);
	let bracket_results = $state(bracket.results);
	let pick_entries = $state(picks?.entries ?? setFirstRoundMatches(bracket.draw_size));
	let nicknames = $state(picks?.nicknames ?? []);
	let my_bracket = $derived(user && bracket?.owner_id === user.id);
	let user_name = $state(picks?.user_name);
	let bracket_update_el: Modal;
	let viewed_picks = $derived(getViewedPicks(current_pick, all_picks, picks));
	let viewed_nicknames = $derived(getViewedNicknames(current_pick, all_picks, picks));
	let scores = $derived(getScoreList(picks, all_picks));

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
			alerts.add({ type: 'error', message: 'Please enter a name!', timeout: 5000 });
			return;
		}

		if (!user) {
			const s = await supabase.auth.signInAnonymously();
			if (s.error) {
				alerts.add({ type: 'error', message: 'Error saving picks' });
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
				alerts.add({ type: 'ok', message: 'Picks saved', timeout: 2500 });
			} else {
				alerts.add({ type: 'error', message: 'Error saving picks' });
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
	<div class="p-4">
		<div class="flex items-center justify-between space-y-4">
			<div>
				<h1 class="mb-2">{bracket.name}</h1>
				{#if bracket.pickable}
					<div class="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
						<input
							type="text"
							bind:value={user_name}
							placeholder="Enter your name"
							class="w-40 rounded border border-gray-200 bg-gray-100 px-1 py-0.5"
						/>
					</div>
				{:else}
					<div class="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
						<div class="flex items-center gap-2">
							<label class="flex gap-2">
								<div class="text-gray-400 italic">User Picks</div>
								<input type="radio" bind:group={view_mode} value="user-picks" />
							</label>
							<select name="current_pick" class="w-48" bind:value={current_pick}>
								{#if user && picks}
									<option value={picks.id}>{picks.user_name}</option>
								{/if}
								{#each all_picks as p}
									<option value={p.id}>{p.user_name || '<Anonymous>'}</option>
								{/each}
							</select>
						</div>
						<div class="flex gap-4">
							<label class="flex gap-2">
								<div class="text-gray-400 italic">Actual Results</div>
								<input type="radio" bind:group={view_mode} value="view-actual" />
							</label>
						</div>
						<div class="flex gap-4">
							<label class="flex gap-2">
								<div class="text-gray-400 italic">All Scores</div>
								<input type="radio" bind:group={view_mode} value="all-scores" />
							</label>
						</div>
					</div>
				{/if}
			</div>
			<div>
				{#if bracket.pickable}
					<button class="btn btn-primary" onclick={savePicks}> Save&nbsp;Picks </button>
				{:else if my_bracket && view_mode === 'view-actual'}
					<button class="btn btn-primary" onclick={saveResults}> Save&nbsp;Results </button>
				{/if}
			</div>
		</div>
		{#if my_bracket && bracket.pickable}
			<div class="flex gap-2 text-sm">
				<div>Bracket is currently open for picks.</div>
				<button class="btn-text" onclick={confirmLock}>Lock Bracket</button>
			</div>
		{/if}
	</div>

	{#if view_mode === 'all-scores'}
		<div class="relative grow overflow-y-auto border-t border-gray-400 bg-gray-100 p-4">
			<table>
				<tbody>
					{#each scores as score}
						{@const mine = picks && picks.id === score.id}
						<tr>
							<td>
								{#if mine}
									*
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
		<Bracket
			draw_size={bracket.draw_size}
			editable={my_bracket && !bracket.pickable}
			pickable={bracket.pickable}
			mode={view_mode}
			seeds={bracket.seeds}
			bind:results={bracket_results}
			bind:picks={pick_entries}
			bind:nicknames
			{viewed_picks}
			{viewed_nicknames}
		/>
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
