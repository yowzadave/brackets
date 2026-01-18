<script lang="ts">
	import Bracket from '$lib/Bracket.svelte';

	let name = $state('');
	let draw_size = $state(128);
	let seeds = $state(Array(128).fill(null));

	function resizeSeeds() {
		if (seeds.length < draw_size) {
			seeds = [...seeds, ...Array(draw_size - seeds.length).fill(null)];
		} else if (seeds.length > draw_size) {
			seeds = seeds.slice(0, draw_size);
		}
	}
</script>

<form method="POST" action="?/create_bracket" class="flex grow flex-col">
	<div class="flex items-center justify-between bg-zinc-700">
		<div class="flex items-center gap-2 px-4 py-2">
			<div class="text-sm">
				<input
					class="w-40 rounded border border-gray-200 bg-zinc-200 px-1 py-0.5"
					placeholder="Bracket Name"
					name="name"
					type="text"
					bind:value={name}
				/>
			</div>
			<div class="text-sm">
				<select
					class="rounded border border-gray-200 bg-zinc-200 px-1 py-0.5"
					name="draw_size"
					bind:value={draw_size}
					onchange={resizeSeeds}
				>
					<option value={4}>Draw Size: 4</option>
					<option value={8}>Draw Size: 8</option>
					<option value={16}>Draw Size: 16</option>
					<option value={32}>Draw Size: 32</option>
					<option value={64}>Draw Size: 64</option>
					<option value={128}>Draw Size: 128</option>
				</select>
			</div>
		</div>
		<input type="hidden" name="seeds" value={JSON.stringify(seeds)} />
		<div class="px-4 py-2">
			<button type="submit" class="btn btn-primary-dark">Create Bracket</button>
		</div>
	</div>
	<div class="relative grow overflow-x-hidden overflow-y-hidden border-t border-gray-400">
		<Bracket bind:seeds {draw_size} mode="create" />
	</div>
</form>
