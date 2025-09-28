<script lang="ts">
	import Modal from '$lib/Modal.svelte';
	import cloneDeep from 'lodash/cloneDeep';
	import CircleCheckIcon from '$lib/assets/icons/circle-check-filled.svg?component';
	import CircleXIcon from '$lib/assets/icons/circle-x-filled.svg?component';
	import XIcon from '$lib/assets/icons/x-sm.svg?component';
	import XIconLarge from '$lib/assets/icons/x.svg?component';
	import MatchScore from '$lib/MatchScore.svelte';
	import EditIcon from '$lib/assets/icons/edit.svg?component';
	import {
		getMatchCountByRound,
		getMatchCountIndices,
		getRounds,
		getMatches,
		bracketScore
	} from '$lib/bracket-utils';

	let {
		draw_size,
		mode,
		editable,
		pickable,
		viewed_picks,
		viewed_nicknames,
		seeds = $bindable([]),
		results = $bindable([]),
		picks = $bindable([]),
		nicknames = $bindable([])
	} = $props();

	const match_unit = 37;
	const min_spacing = 40;
	const initial_round_spacing = 2;

	const col_width = 192;
	const col_gap = 32;

	let edit_result_el: Modal;
	let first_col_container: HTMLDivElement;
	let height = $state(1);
	let scroll_top = $state(0);
	let active_seed = $state<number | null>(null);

	let edit_nickname_el: Modal;
	let edit_nickname_index = $state(-1);
	let nickname = $state('');

	let edit_match_index = $state(-1);
	let edit_match_winner = $state(0);
	let edit_match_score = $state(null);
	let edit_match_player_a = $state(0);
	let edit_match_player_b = $state(0);

	let match_count_by_round = $derived(getMatchCountByRound(draw_size));
	let round_match_indices = $derived(getMatchCountIndices(match_count_by_round));
	let rounds = $derived(getRounds(draw_size));
	let matches = $derived(getMatches(draw_size, rounds));
	let matches_by_round = $derived(getMatchesByRound(matches, rounds, height));
	let first_col = $derived(matches_by_round[0]);
	let viewed = $derived(viewed_picks || picks);
	let nicks = $derived(viewed_nicknames || nicknames);
	let overall_winner = $derived(getWinner(results, viewed, seeds, mode));
	let overall_winner_nickname = $derived(getWinnerNickname(viewed, mode, nicks));
	let bracket_score = $derived(bracketScore(draw_size, results, viewed));

	type Round = {
		index: number;
		name: string;
		matches: number;
		first_match: number;
	};

	type Match = {
		round: number;
		match_index: number;
	};

	type Result = {
		player_a: number | null;
		player_b: number | null;
		winner: number | null;
		score: any;
	};

	type Seed = {
		name: string;
		seed: number | string | null;
	};

	function getWinner(results: Result[], picks: Result[], seeds: Seed[], mode: string) {
		if (mode === 'view-actual') {
			const r = results[results.length - 1];
			if (r?.winner != null) {
				return seeds[r.winner];
			}
		} else if (mode === 'user-picks') {
			const p = picks[picks.length - 1];
			if (p?.winner != null) {
				return seeds[p.winner];
			}
		}

		return null;
	}

	function getWinnerNickname(picks: Result[], mode: string, nicknames: (string | null)[]) {
		if (mode === 'view-actual') {
			return null;
		} else if (mode === 'user-picks') {
			const p = picks[picks.length - 1];
			if (p?.winner != null) {
				return nicknames?.[p.winner] || null;
			}
		}

		return null;
	}

	function getMatchesByRound(matches: Match[], rounds: Round[], height: number) {
		const ht = height - 40;
		let prev_fits = false;
		let prev_spacing = 0;
		let prev_offset = 0;
		const columns = rounds.map((round, r) => {
			const m = round.matches;

			let spacing = match_unit + initial_round_spacing;
			let offset = 0;
			let fits = false;
			if (r === 0) {
				fits = m * match_unit + (m - 1) * initial_round_spacing <= ht;
				if (fits) {
					const round_height = m * match_unit + (m - 1) * initial_round_spacing;
					offset = (ht - round_height) / 2;
				}
			} else {
				fits = m * match_unit + (m - 1) * min_spacing <= ht;
				if (fits && !prev_fits) {
					spacing = min_spacing + match_unit;
					const round_height = m * match_unit + (m - 1) * min_spacing;
					offset = (ht - round_height) / 2;
				} else {
					spacing = prev_spacing * 2;
					offset = prev_spacing / 2 + prev_offset;
				}
			}

			prev_fits = fits;
			prev_spacing = spacing;
			prev_offset = offset;

			const rm = matches
				.slice(round.first_match, round.first_match + round.matches)
				.map((match, i) => {
					const top = i * spacing + offset;
					const center = top + match_unit / 2;
					return { match, top, center, center_next: null };
				});

			return {
				...round,
				spacing,
				offset,
				fits,
				height: spacing * m + offset,
				matches: rm
			};
		});

		columns.slice(0, -1).forEach((col, i) => {
			const next_col = columns[i + 1];

			col.matches.forEach((m, mi) => {
				const next_match_index = Math.floor(mi / 2);
				const nm = next_col.matches[next_match_index];
				if (nm) {
					m.center_next = nm.center;
				}
			});
		});

		return columns.reduce(
			(cols, round, i) => {
				if (i === 0) {
					cols[0].push(round);
				} else {
					if (round.fits) {
						cols.push([]);
					}

					cols[cols.length - 1].push(round);
				}

				return cols;
			},
			[[]]
		);
	}

	function handleScroll() {
		if (first_col_container) {
			scroll_top = first_col_container.scrollTop;
		}
	}

	function doNotSubmit(e: KeyboardEvent) {
		if (e.code === 'Enter') {
			e.preventDefault();
		}
	}

	function updateSeed(e: Event, index: number) {
		const value = (e.target as HTMLInputElement).value.trim();

		if (!value) {
			seeds[index] = null;
			return;
		}

		if (!seeds[index]) {
			seeds[index] = { name: value, seed: null };
			return;
		}

		seeds[index].name = value;
	}

	function updateSeedNumber(e: Event, index: number) {
		const value = (e.target as HTMLInputElement).value.trim();

		if (value && Number.isFinite(parseInt(value))) {
			seeds[index].seed = parseInt(value);
		} else if (value) {
			seeds[index].seed = value;
		} else {
			seeds[index].seed = null;
		}
	}

	function adjacentMatch(match_index: number) {
		if (match_index % 2 === 0) {
			return match_index + 1;
		} else {
			return match_index - 1;
		}
	}

	function childMatch(match_index: number) {
		const r = Math.log2(draw_size);
		const match = matches[match_index];
		if (match.round >= r - 1) return null;
		const index_in_round = match_index - round_match_indices[match.round];
		const index_in_next_round = Math.floor(index_in_round / 2);
		return round_match_indices[match.round + 1] + index_in_next_round;
	}

	function parentMatch(match_index: number) {
		const r = Math.log2(draw_size);
		const match = matches[match_index];
		if (match.round <= 0) return null;
		const index_in_round = match_index - round_match_indices[match.round];
		const index_in_prev_round = index_in_round * 2;
		return round_match_indices[match.round - 1] + index_in_prev_round;
	}

	function defineWinner(match_index: number, player: 'player_a' | 'player_b') {
		const result = results[match_index];
		result.winner = result[player];
		const adjacent = adjacentMatch(match_index);
		const child = childMatch(match_index);
		if (child != null) {
			const p = adjacent < match_index ? 'player_b' : 'player_a';
			if (!results[child]) {
				results[child] = {
					player_a: null,
					player_b: null,
					winner: null,
					score: null,
					[p]: result[player]
				};
			} else {
				results[child][p] = result[player];
			}
		}

		results = results;
	}

	function pickWinner(match_index: number, player: 'player_a' | 'player_b') {
		const pick = picks[match_index];
		pick.winner = pick[player];
		const adjacent = adjacentMatch(match_index);
		const child = childMatch(match_index);
		if (child != null) {
			const p = adjacent < match_index ? 'player_b' : 'player_a';
			if (!picks[child]) {
				picks[child] = {
					player_a: null,
					player_b: null,
					winner: null,
					score: null,
					[p]: pick[player]
				};
			} else {
				picks[child][p] = pick[player];
			}
		}

		picks = picks;
	}

	function giveNickname(match_index: number, player: 'player_a' | 'player_b') {
		const result = results[match_index];
		const seed = result ? seeds[result[player] ?? -1] : null;
		if (seed == null) return;

		edit_nickname_index = result[player];
		nickname = '';
		edit_nickname_el.open();
	}

	function updateNickname() {
		nicknames[edit_nickname_index] = nickname.trim() || null;
	}

	function unpickWinner(match_index: number, player: 'player_a' | 'player_b') {
		const pick = picks[match_index];
		pick[player] = null;
		const parent = parentMatch(match_index);
		if (parent != null) {
			const parent_pick = picks[parent];
			parent_pick.winner = null;
		}

		picks = picks;
	}

	function unpickOverallWinner() {
		const last_pick = picks[picks.length - 1];
		if (!last_pick) return;
		last_pick.winner = null;
		picks = picks;
	}

	function defineResultModal(match_index: number) {
		const result = results[match_index];
		edit_match_index = match_index;
		edit_match_winner = result.winner ?? null;
		edit_match_player_a = result.player_a;
		edit_match_player_b = result.player_b;
		edit_match_score = cloneDeep(result.score);
		edit_result_el.open();
	}

	function defineResult(result) {
		results[edit_match_index].winner = edit_match_winner;
		results[edit_match_index].score = edit_match_score;
		results = results;
	}
</script>

{#snippet seed_input(index: number)}
	<div class="flex h-full w-full gap-1" class:bg-amber-200={active_seed === index}>
		<input
			type="text"
			class="min-w-0 grow border-0 px-1 outline-0"
			placeholder="--"
			value={seeds[index]?.name}
			onkeydown={doNotSubmit}
			oninput={(e) => updateSeed(e, index)}
			onfocus={() => (active_seed = index)}
			onblur={() => (active_seed = null)}
		/>
		{#if seeds[index]}
			<input
				class="w-8 min-w-0 flex-none border-0 px-1 text-right outline-0"
				type="text"
				placeholder="-"
				value={seeds[index]?.seed}
				onkeydown={doNotSubmit}
				oninput={(e) => updateSeedNumber(e, index)}
				onfocus={() => (active_seed = index)}
				onblur={() => (active_seed = null)}
			/>
		{/if}
	</div>
{/snippet}

{#snippet result_actual(match_index: number, player: 'player_a' | 'player_b')}
	{@const result = results[match_index]}
	{@const seed = result ? seeds[result[player] ?? -1] : null}
	{@const is_winner = result && result.winner != null && result.winner === result[player]}
	<div
		class="relative flex h-full w-full items-center justify-between"
		class:bg-teal-100={is_winner}
	>
		{#if editable && seed && result && result.winner == null}
			<button
				class="flex h-full w-full items-center gap-2 text-left hover:bg-teal-200"
				onclick={() => defineWinner(match_index, player)}
			>
				<div class="truncate px-1">{seed?.name}</div>
				{#if seed?.seed != undefined}
					<div class="text-gray-400 italic">
						{seed.seed}
					</div>
				{/if}
			</button>
		{:else}
			<div class="flex grow justify-between">
				<div class="flex grow gap-2">
					<div class="truncate px-1" class:font-bold={is_winner}>
						{seed?.name}
					</div>
					{#if seed?.seed != undefined}
						<div class="text-gray-400 italic">
							{seed.seed}
						</div>
					{/if}
				</div>
				{#if result?.score && player === 'player_b'}
					<div class="absolute right-4 bottom-0 flex gap-1.5" style="height: {match_unit - 2}px;">
						{#each result.score.sets as set}
							<div>
								<div class="border-b border-transparent">
									{set.player_a}
								</div>
								<div>
									{set.player_b}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			<div class="flex w-4 flex-none items-center justify-center text-right">
				{#if player === 'player_a' && editable}
					<button class="edit-button" onclick={() => defineResultModal(match_index)}>
						<EditIcon />
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet user_pick(match_index: number, player: 'player_a' | 'player_b')}
	{@const match = matches[match_index]}
	{@const result = results[match_index]}
	{@const pick = viewed[match_index]}
	{@const pick_seed = pick ? seeds[pick[player] ?? -1] : null}
	{@const nickname = pick ? nicks?.[pick[player] ?? -1] : null}
	{@const is_pick_winner = pick && pick.winner != null && pick.winner === pick[player]}
	{@const is_pick_correct = result?.winner != null && pick?.winner === result.winner}
	{@const is_pick_incorrect =
		result?.winner != null && pick?.winner != null && pick.winner !== result.winner}
	<div class="relative flex h-full w-full items-center justify-between">
		{#if pickable && pick_seed && pick && pick.winner == null}
			<div
				class="match-container flex h-full w-full items-center justify-between gap-2 hover:bg-teal-200"
			>
				<button
					class="flex grow gap-2 truncate px-1 text-left"
					onclick={() => pickWinner(match_index, player)}
				>
					<div class="truncate">
						{nickname ? nickname : pick_seed?.name}
					</div>

					{#if pick_seed?.seed != undefined}
						<div class="text-gray-400 italic">
							{pick_seed.seed}
						</div>
					{/if}
				</button>
				{#if match.round === 0}
					<div
						class="edit-button flex w-4 flex-none items-center justify-center text-right text-gray-500 hover:text-black"
					>
						<button onclick={() => giveNickname(match_index, player)}>
							<EditIcon />
						</button>
					</div>
				{:else}
					<div
						class="edit-button flex w-4 flex-none items-center justify-center text-right text-gray-500 hover:text-black"
					>
						<button onclick={() => unpickWinner(match_index, player)}>
							<XIcon />
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex grow justify-between">
				<div class="flex grow gap-2">
					<div class="truncate px-1" class:font-bold={is_pick_winner}>
						{nickname ? nickname : pick_seed?.name}
					</div>
					{#if pick_seed?.seed != undefined}
						<div class="text-gray-400 italic">
							{pick_seed.seed}
						</div>
					{/if}
				</div>
			</div>
			<div class="flex w-4 flex-none items-center justify-center text-right">
				{#if player === 'player_a' && is_pick_correct}
					<div class="text-green-500">
						<CircleCheckIcon />
					</div>
				{:else if player === 'player_a' && is_pick_incorrect}
					<div class="text-red-500">
						<CircleXIcon />
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet col_section(col, mode = 'view', scroll_top = 0)}
	{#each col as round, ri}
		<div class="flex h-full flex-col pt-4">
			<div class="p-1 font-bold uppercase">
				{round.name}
			</div>
			<div class="relative grow" style="width: {col_width + col_gap}px">
				{#each round.matches as match, m}
					<div
						class="match-container absolute overflow-hidden rounded border border-gray-500 shadow"
						style="top: {match.top}px; height: {match_unit}px; width: {col_width}px"
					>
						<div
							class="absolute top-0 flex w-full items-center border-b border-gray-300 bg-white"
							style="height: {Math.floor((match_unit - 1) / 2)}px"
						>
							{#if mode === 'create' && round.index === 0}
								{@render seed_input(m * 2)}
							{:else if mode === 'view-actual'}
								{@render result_actual(match.match.match_index, 'player_a')}
							{:else if mode === 'user-picks'}
								{@render user_pick(match.match.match_index, 'player_a')}
							{/if}
						</div>
						<div
							class="absolute bottom-0 flex w-full items-center bg-white"
							style="height: {Math.floor((match_unit - 2) / 2)}px"
						>
							{#if mode === 'create' && round.index === 0}
								{@render seed_input(m * 2 + 1)}
							{:else if mode === 'view-actual'}
								{@render result_actual(match.match.match_index, 'player_b')}
							{:else if mode === 'user-picks'}
								{@render user_pick(match.match.match_index, 'player_b')}
							{/if}
						</div>
					</div>
				{/each}
				{#if round.index < rounds.length - 1}
					{@const offset = ri === col.length - 1 ? scroll_top : 0}
					<div
						class="absolute top-0 right-0 h-full"
						style="width: {col_gap}px; height: {round.height}px"
					>
						{#each round.matches as match}
							{@const cn = match.center_next + offset}
							<svg class="absolute top-0 left-0 h-full w-full" height="100%" width={col_gap}>
								<path
									d={`M 0 ${match.center} C ${col_gap / 2} ${match.center} ${col_gap - col_gap / 2} ${cn} ${col_gap} ${cn}`}
									stroke="#98A1AE"
									stroke-width="1"
									fill="none"
								/>
							</svg>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/each}
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative flex grow overflow-x-auto overflow-y-hidden border-t border-gray-400 bg-gray-100 px-4 text-xs"
	bind:clientHeight={height}
>
	<div
		class="flex-none overflow-hidden"
		style="width: {first_col.length * (col_width + col_gap)}px"
	>
		<div
			class="inner-container"
			bind:this={first_col_container}
			onscroll={handleScroll}
			onmousemove={handleScroll}
		>
			{@render col_section(first_col, mode, scroll_top)}
		</div>
	</div>
	{#each matches_by_round.slice(1) as col}
		<div class="flex-none overflow-hidden" style="width: {col.length * (col_width + col_gap)}px">
			<div class="inner-container">
				{@render col_section(col, mode)}
			</div>
		</div>
	{/each}

	{#if overall_winner}
		<div class="sticky right-4 flex flex-col items-center justify-center">
			<div class="relative top-28 z-50 min-w-36 border border-gray-400 bg-white p-4 shadow-lg">
				<div class="text-lg text-gray-400 italic">Winner:</div>
				<div class="text-3xl font-bold">{overall_winner_nickname || overall_winner?.name}</div>
				{#if pickable && mode === 'user-picks'}
					<button
						class="absolute top-0 right-0 rounded p-1 text-gray-400 hover:text-black"
						onclick={unpickOverallWinner}
					>
						<XIconLarge />
					</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if mode === 'user-picks' && !pickable}
		<div class="absolute bottom-4 left-4 text-sm font-bold">
			Total score: {bracket_score}
		</div>
	{/if}
</div>

<Modal
	bind:this={edit_result_el}
	closeable
	buttons={[
		{ label: 'Cancel', type: 'cancel' },
		{ label: 'Update', type: 'confirm', style: 'primary' }
	]}
	confirm={defineResult}
>
	<div slot="title">Edit Match Result</div>
	<div slot="content" class="space-y-4">
		<label for="winner" class="flex items-center">
			<div class="w-24 flex-none text-gray-400 italic">Winner</div>
			<select name="winner" bind:value={edit_match_winner}>
				<option value={edit_match_player_a}>{seeds[edit_match_player_a].name}</option>
				<option value={edit_match_player_b}>{seeds[edit_match_player_b].name}</option>
			</select>
		</label>
		<label for="score" class="space-y-2">
			<div class="text-gray-400 italic">Score</div>
			<MatchScore
				player_a={seeds[edit_match_player_a]}
				player_b={seeds[edit_match_player_b]}
				bind:score={edit_match_score}
			/>
		</label>
	</div>
</Modal>

<Modal
	bind:this={edit_nickname_el}
	closeable
	buttons={[
		{ label: 'Cancel', type: 'cancel' },
		{ label: 'Update', type: 'confirm', style: 'primary' }
	]}
	confirm={updateNickname}
>
	<div slot="title">Edit Nickname</div>
	<div slot="content" class="space-y-4">
		{@const seed = seeds[edit_nickname_index]}
		<div class="flex items-center">
			<div class="w-24 flex-none text-gray-400 italic">Name</div>
			<div class="grow truncate">
				{seed.name}
			</div>
		</div>
		<label for="nickname" class="flex items-center">
			<div class="w-24 flex-none text-gray-400 italic">Nickname</div>
			<input
				type="text"
				name="nickname"
				placeholder="Enter nickname"
				class="w-full rounded border border-gray-300 p-1"
				bind:value={nickname}
			/>
		</label>
	</div>
</Modal>

<style>
	@reference "tailwindcss";

	.inner-container {
		@apply relative flex h-full overflow-x-hidden overflow-y-scroll;

		width: calc(100% + 50px);
		padding-right: 50px;
	}

	.edit-button {
		@apply invisible;
	}

	.match-container:hover .edit-button {
		@apply visible;
	}
</style>
