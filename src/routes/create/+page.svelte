<script lang="ts">
	import Bracket from '$lib/Bracket.svelte';

	let name = $state('Bracket Name');
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
	<div class="flex justify-between p-4">
		<div>
			<div class="text-sm">
				<label class="flex">
					<div class="w-24 flex-none text-gray-400 italic">Name:</div>
					<div class="px-1">
						<input name="name" type="text" bind:value={name} />
					</div>
				</label>
			</div>
			<div class="text-sm">
				<label class="flex">
					<div class="w-24 flex-none text-gray-400 italic">Draw Size:</div>
					<select name="draw_size" bind:value={draw_size} onchange={resizeSeeds}>
						<option value={4}>4</option>
						<option value={8}>8</option>
						<option value={16}>16</option>
						<option value={32}>32</option>
						<option value={64}>64</option>
						<option value={128}>128</option>
					</select>
				</label>
			</div>
		</div>
		<input type="hidden" name="seeds" value={JSON.stringify(seeds)} />
		<button type="submit" class="btn btn-primary">Create Bracket</button>
	</div>
	<Bracket bind:seeds {draw_size} mode="create" />
</form>
