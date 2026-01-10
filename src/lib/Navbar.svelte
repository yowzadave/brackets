<script lang="ts">
	import { clickOutside } from '$lib/utilities/click-outside';
	import ExitIcon from '$lib/assets/icons/exit.svg?component';
	import ProfileIcon from '$lib/assets/icons/profile.svg?component';
	let { user } = $props();

	let show_menu = $state(false);
</script>

<div class="flex items-center justify-between bg-zinc-700 px-4 py-2 text-sm text-gray-200">
	<div class="flex items-center gap-8">
		<a href="/"><div class="text-lg font-bold">BKTS</div></a>
		<div id="title-container"></div>
	</div>
	<div class="text-xs">
		{#if user}
			<div class="relative" use:clickOutside onoutclick={() => (show_menu = false)}>
				<button onclick={() => (show_menu = !show_menu)}>
					{#if user.is_anonymous}
						Anonymous User
					{:else}
						{user.email}
					{/if}
				</button>
				{#if show_menu}
					<div
						class="absolute top-full right-0 mt-2 rounded border border-gray-300 bg-white p-2 text-nowrap text-black shadow-lg"
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
