<script lang="ts">
	let { form } = $props();

	let mode = $state('login');
	let email = $state(form?.email || '');
	let otp = $state('');
</script>

{#if mode === 'login'}
	<h2>Log In</h2>
{:else}
	<h2>Sign Up</h2>
{/if}
<form method="POST" action="?/login" class="space-y-4">
	{#if form?.error}
		<div class="text-center text-sm text-red-600">{form.error}</div>
	{/if}
	{#if !form?.sent}
		<div>
			<label class="flex items-center">
				<input
					name="email"
					type="email"
					bind:value={email}
					placeholder="name@email.com"
					class="grow rounded border border-gray-200 p-2"
				/>
			</label>
		</div>
		{#if mode !== 'reset'}
			<div>
				<label class="flex items-center">
					<input
						name="password"
						type="password"
						placeholder="password"
						class="grow rounded border border-gray-200 p-2"
					/>
				</label>
			</div>
		{/if}
	{:else}
		<input type="hidden" name="email" value={email} />
	{/if}

	{#if form?.sent}
		<div class="px-4 text-center text-sm">
			A 6-digit code has been sent to the email address you provided. Enter it below to log in.
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
		<div>
			{#if form.action === 'reset'}
				<button class="btn btn-primary w-full" formaction="?/confirm_reset_otp"
					>Confirm 6-digit code</button
				>
			{:else}
				<button class="btn btn-primary w-full" formaction="?/confirm_signup_otp"
					>Confirm 6-digit code</button
				>
			{/if}
		</div>
		<!-- {/if} -->
	{:else}
		<div class="space-y-4">
			{#if mode === 'login'}
				<button class="btn btn-primary w-full">Log in</button>
				<div class="rounded-lg bg-gray-100 p-4 text-sm">
					Forgot your password? <button onclick={() => (mode = 'reset')} class="btn-text"
						>Reset it here</button
					>.
				</div>
			{:else if mode === 'signup'}
				<button class="btn btn-primary w-full" formaction="?/signup">Sign Up</button>
			{:else if mode === 'reset'}
				<button class="btn btn-primary w-full" formaction="?/reset">Reset Password</button>
			{/if}
		</div>

		<div class="flex justify-center">
			{#if mode === 'login'}
				<button class="btn-text" onclick={() => (mode = 'signup')}>Sign up</button>
			{:else if mode === 'signup' || mode === 'reset'}
				<button class="btn-text" onclick={() => (mode = 'login')}>Log in</button>
			{/if}
		</div>
	{/if}
</form>

<style>
	@reference "tailwindcss";

	.loading {
		opacity: 0.5;
	}

	.otp-input {
		@apply rounded border border-gray-300 p-2 font-mono;
		font-size: 2.5rem;
		text-align: left;
		min-width: 0;
		max-width: 100%;
	}
</style>
