<script lang="ts">
	type MatchScoreType = {
		type: 'tennis';
		sets: { player_a: string; player_b: string }[];
	};

	type Player = {
		name: string;
		seed: null | number | string;
	};

	interface Props {
		player_a: Player;
		player_b: Player;
		score: MatchScoreType | null;
	}

	let { player_a, player_b, score = $bindable(null) }: Props = $props();

	let s1_a = $state(score?.sets[0]?.player_a ?? '');
	let s1_b = $state(score?.sets[0]?.player_b ?? '');
	let s2_a = $state(score?.sets[1]?.player_a ?? '');
	let s2_b = $state(score?.sets[1]?.player_b ?? '');
	let s3_a = $state(score?.sets[2]?.player_a ?? '');
	let s3_b = $state(score?.sets[2]?.player_b ?? '');
	let s4_a = $state(score?.sets[3]?.player_a ?? '');
	let s4_b = $state(score?.sets[3]?.player_b ?? '');
	let s5_a = $state(score?.sets[4]?.player_a ?? '');
	let s5_b = $state(score?.sets[4]?.player_b ?? '');

	function updateScore(e, set_index: number) {
		const val = e.target.value.trim();
		if (val && !score) {
			score = {
				type: 'tennis',
				sets: []
			};
		}

		if (val && score) {
			if (set_index >= 0) {
				score.sets[0] = { player_a: s1_a, player_b: s1_b };
			}

			if (set_index >= 1) {
				score.sets[1] = { player_a: s2_a, player_b: s2_b };
			}

			if (set_index >= 2) {
				score.sets[2] = { player_a: s3_a, player_b: s3_b };
			}

			if (set_index >= 3) {
				score.sets[3] = { player_a: s4_a, player_b: s4_b };
			}

			if (set_index >= 4) {
				score.sets[4] = { player_a: s5_a, player_b: s5_b };
			}
		} else if (!val && score) {
			if (set_index >= 4 && !s5_a && !s5_b) {
				score.sets.splice(4, 1);
			} else if (set_index >= 3 && !s4_a && !s4_b) {
				score.sets.splice(3, 1);
			} else if (set_index >= 2 && !s3_a && !s3_b) {
				score.sets.splice(2, 1);
			} else if (set_index >= 1 && !s2_a && !s2_b) {
				score.sets.splice(1, 1);
			} else if (set_index >= 0 && !s1_a && !s1_b) {
				score.sets.splice(0, 1);
			}
		}

		score = score;
	}
</script>

<!-- svelte-ignore a11y_positive_tabindex -->
<div class="space-y-2">
	<div class="flex items-center">
		<div class="w-24 flex-none truncate text-xs">{player_a.name}</div>
		<div class="flex items-center gap-4 px-1">
			<input
				class="score-input"
				tabindex="1"
				bind:value={s1_a}
				oninput={(e) => updateScore(e, 0)}
			/>
			<input
				class="score-input"
				disabled={!s1_b || !s1_a}
				tabindex="2"
				bind:value={s2_a}
				oninput={(e) => updateScore(e, 1)}
			/>
			<input
				class="score-input"
				disabled={!s2_b || !s2_a}
				tabindex="3"
				bind:value={s3_a}
				oninput={(e) => updateScore(e, 2)}
			/>
			<input
				class="score-input"
				disabled={!s3_b || !s3_a}
				tabindex="4"
				bind:value={s4_a}
				oninput={(e) => updateScore(e, 3)}
			/>
			<input
				class="score-input"
				disabled={!s4_b || !s4_a}
				tabindex="5"
				bind:value={s5_a}
				oninput={(e) => updateScore(e, 4)}
			/>
		</div>
	</div>
	<div>
		<div class="flex items-center">
			<div class="w-24 flex-none truncate text-xs">{player_b.name}</div>
			<div class="flex items-center gap-4 px-1">
				<input
					class="score-input"
					tabindex="1"
					bind:value={s1_b}
					oninput={(e) => updateScore(e, 0)}
				/>
				<input
					class="score-input"
					disabled={!s1_b || !s1_a}
					tabindex="2"
					bind:value={s2_b}
					oninput={(e) => updateScore(e, 1)}
				/>
				<input
					class="score-input"
					disabled={!s2_b || !s2_a}
					tabindex="3"
					bind:value={s3_b}
					oninput={(e) => updateScore(e, 2)}
				/>
				<input
					class="score-input"
					disabled={!s3_b || !s3_a}
					tabindex="4"
					bind:value={s4_b}
					oninput={(e) => updateScore(e, 3)}
				/>
				<input
					class="score-input"
					disabled={!s4_b || !s4_a}
					tabindex="5"
					bind:value={s5_b}
					oninput={(e) => updateScore(e, 4)}
				/>
			</div>
		</div>
	</div>
</div>

<style>
	@reference "tailwindcss";

	.score-input {
		@apply w-6 border border-gray-400 text-center;
	}

	.score-input:disabled {
		@apply cursor-not-allowed border-gray-300 bg-gray-100;
	}
</style>
