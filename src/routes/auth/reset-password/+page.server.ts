import { redirect } from '@sveltejs/kit';

import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const password = formData.get('password') as string;
    console.log("password", password);

    const req = await supabase.auth.updateUser({ password });
    console.log("updated?", req);

    if (req.error) {
      console.error(req.error);
      return { reset_sent: false, error: "Unable to reset password" };
    }

    return redirect(303, '/');
  }
}