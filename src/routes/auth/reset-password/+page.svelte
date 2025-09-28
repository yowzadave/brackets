<script lang="ts">
	let { data, form } = $props();
	const { user } = data;

	let password = $state('');
	let password2 = $state('');

	let password_valid = $derived(password === password2 && password.length >= 6);
</script>

<h2>Reset Password</h2>
<form method="POST" class="space-y-4">
	{#if form?.error}
		<div class="text-center text-sm text-red-600">{form.error}</div>
	{/if}
	<input
		disabled
		name="email"
		type="email"
		placeholder="name@email.com"
		value={user?.email}
		class="grow rounded border border-gray-200 p-2"
	/>
	<input
		name="password"
		type="password"
		placeholder="password"
		bind:value={password}
		class="grow rounded border border-gray-200 p-2"
	/>
	<input
		name="password2"
		type="password"
		placeholder="confirm password"
		bind:value={password2}
		class="grow rounded border border-gray-200 p-2"
	/>
	<div class="space-y-4">
		<button class="btn btn-primary w-full" disabled={!password_valid}>Update Password</button>
	</div>
</form>

<style>
	input {
		width: 100%;
	}
</style>
