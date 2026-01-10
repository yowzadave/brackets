<script lang="ts">
	import { tick } from 'svelte';
	import Popover from '$lib/Popover.svelte';

	type Option = {
		label: string;
		value: string;
	};

	let { options = [] as Option[], value = $bindable(''), placeholder = 'Search' } = $props();

	let container: HTMLDivElement | undefined = $state();
	let input: HTMLInputElement | undefined = $state();
	let focused = $state(false);
	let show_options = $state(false);
	let arrow_counter = $state(-1);

	let visible_options = $derived(getVisibleOptions(options, value));
	let current_option = $derived(getCurrentOption(options, value));

	$effect(() => {
		if (arrow_counter >= visible_options.length) {
			arrow_counter = visible_options.length - 1;
		}
	});

	function getVisibleOptions(options: Option[], value: string) {
		if (!value) return options.slice(0, 10);

		return options
			.filter((option) => option.label.toLowerCase().includes(value?.toLowerCase()))
			.slice(0, 10);
	}

	function getCurrentOption(options: Option[], value: string) {
		return options.find((option) => option.value === value);
	}

	async function focus() {
		focused = true;
		show_options = true;
		await tick();
		input?.focus();
	}

	function chooseOption(option: Option) {
		value = option.value;
		focused = false;
		show_options = false;
	}

	function keydown(e: KeyboardEvent) {
		if (!focused) {
			focused = true;
			show_options = true;
		}
		if (e.key === 'ArrowDown') handleArrowDown(e);
		if (e.key === 'ArrowUp') handleArrowUp(e);
		if (e.key === 'Enter') handleEnter(e);
		if (e.key === 'Escape') handleEscape(e);
	}

	function handleArrowDown(e: KeyboardEvent) {
		e.preventDefault();
		if (arrow_counter < visible_options.length - 1) {
			arrow_counter += 1;
		}
	}

	function handleArrowUp(e: KeyboardEvent) {
		e.preventDefault();
		if (arrow_counter > 0) {
			arrow_counter -= 1;
		}
	}

	function handleEnter(e: KeyboardEvent) {
		e.preventDefault();
		if (arrow_counter >= 0 && arrow_counter < visible_options.length) {
			chooseOption(visible_options[arrow_counter]);
			arrow_counter = -1;
		}
	}

	function handleEscape(e: KeyboardEvent) {
		e.preventDefault();
		focused = false;
		show_options = false;
		arrow_counter = -1;
	}
</script>

<div class="relative" bind:this={container}>
	{#if value && current_option && !focused}
		<button
			class="flex w-full items-center gap-1 overflow-hidden border border-gray-300 bg-white p-1 text-left"
			onclick={focus}
		>
			<div class="flex-none">
				<img
					src={`/flags/${current_option.value}.svg`}
					alt={current_option.value}
					class="h-4 w-6 px-1"
				/>
			</div>
			<div class="grow truncate">
				{current_option.label}
			</div>
		</button>
	{:else}
		<input
			bind:this={input}
			type="text"
			class="w-full border border-gray-300 bg-white p-1 outline-0 focus:border-blue-500"
			bind:value
			{placeholder}
			onkeydown={keydown}
			onfocus={focus}
		/>
	{/if}
	{#if show_options}
		<Popover {container} fit>
			<div class="w-full overflow-hidden py-1 text-sm">
				{#each visible_options as option}
					<button
						class="list-option"
						onclick={() => chooseOption(option)}
						class:selected={arrow_counter === visible_options.indexOf(option)}
					>
						{#if option.value}
							<div>
								<img src={`/flags/${option.value}.svg`} alt={option.value} class="h-4 w-6 px-1" />
							</div>
						{:else}
							<div class="h-4 w-6 px-1"></div>
						{/if}
						<div>
							{option.label}
						</div>
					</button>
				{/each}
			</div>
		</Popover>
	{/if}
</div>

<style>
	@reference "tailwindcss";

	.list-option {
		@apply flex w-full cursor-pointer items-center gap-1 px-2 py-1 text-left;
	}

	.list-option:hover {
		@apply bg-gray-200;
	}

	.list-option.selected,
	.list-option.selected:hover {
		@apply bg-blue-500 text-white;
	}
</style>
