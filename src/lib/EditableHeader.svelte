<script lang="ts">
	import { tick } from 'svelte';
	import EditIcon from '$lib/assets/icons/edit.svg?component';
	import pasteAsPlaintext from '$lib/utilities/paste-as-plaintext.js';
	import selectAllContenteditable from '$lib/utilities/select-all-contenteditable.js';

	let {
		value = $bindable(''),
		disabled = false,
		inheritsize = false,
		maxwidth = false,
		input = () => {},
		change = () => {}
	} = $props();

	let input_el: HTMLHeadingElement;

	function handleKeydown(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.target.blur();
		}
	}

	function handleInput(e) {
		const str = e.target.innerText.replace(/(\r\n|\n|\r)/gm, '');
		input({ value: str });
	}

	function handleFocusout(e) {
		const str = e.target.innerText.replace(/(\r\n|\n|\r)/gm, '');
		change({ value: str });
	}

	async function handleEditClick() {
		input_el.focus();
		await tick();
		selectAllContenteditable(input_el);
	}
</script>

<div class="editable-container flex items-center gap-2">
	{#if disabled}
		<h2 bind:this={input_el} class:maxwidth>{value}</h2>
		<div class="edit-icon text-gray-500" class:disabled>
			<EditIcon />
		</div>
	{:else}
		<h2
			class:inheritsize
			class="rounded"
			class:maxwidth
			contenteditable
			bind:this={input_el}
			bind:innerHTML={value}
			onpaste={pasteAsPlaintext}
			onkeydown={handleKeydown}
			oninput={handleInput}
			onfocusout={handleFocusout}
		></h2>
		<button class="edit-icon cursor-pointer text-gray-500" onclick={handleEditClick}>
			<EditIcon />
		</button>
	{/if}
</div>

<style>
	h2 {
		margin: 0;
	}

	h2.inheritsize {
		font-size: inherit;
		display: inline-block;
		overflow: hidden;

		&.maxwidth:not(:focus) {
			max-width: 100%;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.editable-container {
		.edit-icon {
			visibility: hidden;
		}

		&:hover {
			.edit-icon:not(.disabled) {
				visibility: visible;
			}
		}
	}
</style>
