import { redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

export const actions: Actions = {
  signup: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const normalized_email = email.trim().toLowerCase();

    const { error } = await supabase.auth.signUp({ email: normalized_email, password })
    if (error) {
      console.error(error);
      redirect(303, '/auth/error');
    } else {
      return { sent: true, email: normalized_email, action: 'signup' };
    }
  },
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const normalized_email = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({ email: normalized_email, password });
    if (error) {
      console.error(error);
      redirect(303, '/auth/error');
    } else {
      redirect(303, '/');
    }
  },
  reset: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const normalized_email = email.trim().toLowerCase();

    const baseUrl = import.meta.env.PUBLIC_BASE_URL || 'http://localhost:5173';

    const req = await supabase.auth.resetPasswordForEmail(normalized_email, {
      redirectTo: `${baseUrl}/auth/reset-password`
    });

    if (req.error) {
      console.error(req.error);
      redirect(303, '/auth/error');
    } else {
      return { sent: true, email: normalized_email, action: 'reset' };
    }
  },
  confirm_signup_otp: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const otp = formData.get('otp') as string;
    const normalized_email = email.trim().toLowerCase();

    const req = await supabase.auth.verifyOtp({
      email: normalized_email,
      token: otp,
      type: 'signup',
    });

    if (req.error) {
      console.error(req.error);
      redirect(303, '/auth/error');
    } else {
      redirect(303, '/');
    }
  },
  confirm_reset_otp: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const otp = formData.get('otp') as string;
    const normalized_email = email.trim().toLowerCase();

    const req = await supabase.auth.verifyOtp({
      email: normalized_email,
      token: otp,
      type: 'recovery',
    });

    if (req.error) {
      console.error(req.error);
      redirect(303, '/auth/error');
    } else {
      redirect(303, '/auth/reset-password');
    }
  },
  logout: async ({ locals: { supabase } }) => {
    await supabase.auth.signOut();
    redirect(303, '/');
  },
}
