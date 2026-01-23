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

  const pub = supabase
    .from('brackets')
    .select('*')
    .is('public', true)
    .is('pickable', true)
    .gt('end_date', new Date().toISOString());

  const [brackets, picks, public_brackets] = await Promise.all([b, p, pub]);

  if (brackets.error || !brackets.data) {
    console.error('Error loading bracket:', brackets.error);
    throw error(404, 'Not found');
  }

  if (picks.error || !picks.data) {
    console.error('Error loading picks:', picks.error);
    throw error(404, 'Not found');
  }

  if (public_brackets.error || !public_brackets.data) {
    console.error('Error loading public brackets:', public_brackets.error);
    throw error(404, 'Not found');
  }

  return {
    public_brackets: public_brackets.data,
    brackets: brackets.data,
    picks: picks.data,
  };
};
