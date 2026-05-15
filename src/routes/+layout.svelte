<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';

	import '../app.css';
	import favicon from '$lib/assets/favicon.ico';
	import Navbar from '$lib/Navbar.svelte';
	import Alerts from '$lib/Alerts.svelte';

	let { data, children } = $props();
	let { session, supabase, user } = $derived(data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => data.subscription.unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-full grow flex-col bg-zinc-100">
	<Navbar {user} />
	<Alerts />
	{@render children?.()}
	<footer
		class="mt-auto flex justify-between border-t border-gray-200 px-4 py-2 text-left text-xs text-gray-400"
	>
		<a href="/privacy" class="hover:text-gray-600">Privacy Policy</a>
		<div>&copy; 2026 DCA</div>
	</footer>
</div>
