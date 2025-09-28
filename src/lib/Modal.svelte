<script>
	import Portal from './Portal.svelte';
	import XIcon from '$lib/assets/icons/x.svg?component';

	let {
		isOpen = $bindable(false),
		closeable = false,
		fullframe = false,
		closeOnOutclick = false,
		buttons = [],
		width = '24rem',
		height = null,
		confirm = () => {}
	} = $props();

	let containerStyles = $derived(`width:${width};` + (height ? `height:${height};` : ''));

	export const open = () => {
		isOpen = true;
	};

	export const isModalOpen = () => isOpen;

	export const close = () => {
		isOpen = false;
	};

	async function handleClick(button) {
		if (button.type === 'confirm') {
			await confirm(button);
		}

		if (button.closeOnClick || button.closeOnClick === undefined) {
			close();
		}
	}

	function outclick() {
		if (closeOnOutclick) close();
	}
</script>

{#if isOpen}
	<Portal>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore event_directive_deprecated -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="modal-container fixed top-0 right-0 bottom-0 left-0 flex h-screen w-screen items-center justify-center bg-gray-900/25"
			on:click|stopPropagation={outclick}
			on:mousedown|stopPropagation
		>
			<div
				class="relative flex max-h-full flex-col overflow-hidden rounded bg-white text-sm shadow-lg"
				style={containerStyles}
				on:click|stopPropagation
			>
				<div class="w-full flex-none border-b border-gray-300 px-4 py-2 text-gray-500">
					{#if closeable}
						<div class="flex items-center justify-between">
							<div>
								<slot name="title" />
							</div>
							<div class="cursor-pointer rounded p-1 hover:bg-gray-100" on:click={close}>
								<XIcon />
							</div>
						</div>
					{:else}
						<slot name="title" />
					{/if}
				</div>

				<div class="flex w-full grow flex-col overflow-hidden text-left" class:p-4={!fullframe}>
					<slot name="content" />
				</div>

				{#if buttons.length > 0}
					<div class="mb-4 flex w-full flex-none items-center justify-end space-x-2 px-4">
						{#each buttons as button}
							<button
								class="btn"
								class:btn-danger-minimal={button.style === 'danger'}
								class:btn-primary={button.style === 'primary'}
								class:cursor-not-allowed={button.disabled}
								class:opacity-50={button.disabled}
								disabled={button.disabled}
								on:click={() => handleClick(button)}>{button.label}</button
							>
						{/each}
					</div>
				{/if}

				{#if $$slots.footer}
					<div class="w-full border-t px-4 py-2">
						<slot name="footer" />
					</div>
				{/if}
			</div>
		</div>
	</Portal>
{/if}

<style>
	.modal-container {
		z-index: 200;
	}
</style>
