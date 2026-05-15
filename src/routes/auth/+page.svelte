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

{#if mode !== 'reset'}
	<form method="POST" action="?/google" class="mb-4">
		<button
			class="flex w-full items-center justify-center gap-3 rounded border border-gray-400 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5">
				<path
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					fill="#4285F4"
				/>
				<path
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					fill="#34A853"
				/>
				<path
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
					fill="#FBBC05"
				/>
				<path
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					fill="#EA4335"
				/>
			</svg>
			Sign in with Google
		</button>
	</form>

	<div class="py-2 text-xs text-gray-400">Or use your username and passord:</div>
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
					class="grow rounded border border-gray-200 bg-gray-100 p-2 text-sm"
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
						class="grow rounded border border-gray-200 bg-gray-100 p-2 text-sm"
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
