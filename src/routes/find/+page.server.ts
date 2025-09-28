import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
  if (!user) {
    return redirect(303, '/auth');
  }

  const b = supabase
    .from('brackets')
    .select('*')
    .eq('owner_id', user.id);

  const p = supabase
    .from('picks')
    .select('*,bracket: brackets(*)')
    .eq('user_id', user.id);

  const [brackets, picks] = await Promise.all([b, p]);

  if (brackets.error || !brackets.data) {
    console.error('Error loading bracket:', brackets.error);
    throw error(404, 'Not found');
  }

  if (picks.error || !picks.data) {
    console.error('Error loading picks:', picks.error);
    throw error(404, 'Not found');
  }

  return {
    brackets: brackets.data,
    picks: picks.data,
  };
};
