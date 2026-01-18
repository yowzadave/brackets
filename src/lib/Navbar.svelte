<script lang="ts">
	import BracketIcon from '$lib/assets/icons/bracket.svg?component';
	import { clickOutside } from '$lib/utilities/click-outside';
	import ExitIcon from '$lib/assets/icons/exit.svg?component';
	import ProfileIcon from '$lib/assets/icons/profile.svg?component';
	let { user } = $props();

	let show_menu = $state(false);
	let user_menu_el: HTMLDivElement | undefined = $state();
	let dropdown_el: HTMLDivElement | undefined = $state();

	function outclick(e: MouseEvent) {
		show_menu = false;
	}
</script>

<div class="flex items-center justify-between bg-zinc-700 px-4 py-2 text-sm text-gray-200">
	<div class="flex items-center gap-8 overflow-hidden">
		<a href="/" class="flex items-center gap-1">
			<BracketIcon />
			<div class="text-lg font-bold">BKTS</div>
		</a>
		<div id="title-container" class="grow overflow-hidden"></div>
	</div>
	<div class="text-xs">
		{#if user}
			<div class="relative" bind:this={user_menu_el} use:clickOutside onoutclick={outclick}>
				<button onclick={() => (show_menu = !show_menu)} class="hidden md:block">
					{#if user.is_anonymous}
						Anonymous User
					{:else}
						{user.email}
					{/if}
				</button>
				<button onclick={() => (show_menu = !show_menu)} class="block md:hidden">
					<ProfileIcon />
				</button>
				{#if show_menu}
					<div
						class="absolute top-full right-0 z-50 mt-2 rounded border border-gray-300 bg-white p-1 text-nowrap text-black shadow-lg"
						bind:this={dropdown_el}
					>
						<a href="/auth/link-email">
							{#if user.is_anonymous}
								<button
									type="submit"
									class="flex w-full items-center gap-2 rounded p-1 hover:bg-gray-200"
								>
									<ProfileIcon />
									<div>Link Email</div>
								</button>
							{/if}
						</a>
						<form method="POST" action="/auth?/logout">
							<button
								type="submit"
								class="flex w-full items-center gap-2 rounded p-1 hover:bg-gray-200"
							>
								<ExitIcon />
								<div>Log Out</div>
							</button>
						</form>
					</div>
				{/if}
			</div>
		{:else}
			<a href="/auth">Log In</a>
		{/if}
	</div>
</div>
