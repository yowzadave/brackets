import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  request_otp: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const normalized_email = email.trim().toLowerCase();

    const req = await supabase.auth.updateUser({ email: normalized_email });

    if (req.error) {
      if (req.error.status === 422) {
        // User already exists
        return { otp_sent: false, error: "Email already in use" };
      }

      console.error(req.error);
      return { otp_sent: false, error: "Unable to link email address" };
    }

    return { otp_sent: true, email: normalized_email };
  },
  confirm_otp: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const otp = formData.get('otp') as string;
    const normalized_email = email.trim().toLowerCase();
    const req = await supabase.auth.verifyOtp({
      email: normalized_email,
      token: otp,
      type: 'email_change',
    });
    if (req.error) {
      console.error(req.error);
      return { otp_confirmed: false, error: "Unable to confirm OTP", email: normalized_email };
    } else {
      redirect(303, '/');
    }
  },
}