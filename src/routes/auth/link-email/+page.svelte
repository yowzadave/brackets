<script lang="ts">
	let { data, form } = $props();

	let email = $state(form?.email || '');
	let otp = $state('');

	$effect(() => {
		console.log('user', data?.user);
	});
</script>

<h2>Confirm Email Address</h2>
<form method="POST" action="?/request_otp" class="space-y-4">
	{#if form?.error}
		<div class="text-center text-sm text-red-600">{form.error}</div>
	{/if}
	{#if !form?.otp_sent}
		<div>
			<label class="flex items-center">
				<div class="w-24 flex-none text-gray-400">Email</div>
				<input
					name="email"
					type="email"
					bind:value={email}
					class="grow rounded border border-gray-200 bg-gray-100 p-1"
				/>
			</label>
		</div>
	{/if}
	{#if form?.otp_sent}
		<div class="text-center text-sm">
			<p class="mb-2">
				A 6-digit login code has been sent to <span class="font-bold">{form?.email}</span>.
			</p>
			<p>Enter it below to confirm your email address:</p>
		</div>
		<div class="text-center">
			<input
				name="otp"
				class="otp-input"
				autocomplete="one-time-code"
				placeholder="123456"
				maxlength="6"
				size="6"
				bind:value={otp}
			/>
		</div>
		<input type="hidden" name="email" value={form?.email} />
	{/if}
	<div>
		{#if form?.otp_sent}
			<button class="btn btn-primary w-full" formaction="?/confirm_otp">Confirm 6-digit code</button
			>
		{:else}
			<button class="btn btn-primary w-full" type="submit">Send confirmation email</button>
		{/if}
	</div>
</form>

<style>
	@reference "tailwindcss";

	.loading {
		opacity: 0.5;
	}

	.otp-input {
		@apply rounded border p-2 font-mono;
		font-size: 2.5rem;
		text-align: left;
		min-width: 0;
		max-width: 100%;
	}
</style>
