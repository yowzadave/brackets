import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, user } }) => {
  let bracket;
  const id_bracket_req = supabase
    .from('brackets')
    .select('*')
    .eq('id', params.bracket)
    .single();

  const slug_bracket_req = supabase
    .from('brackets')
    .select('*')
    .eq('slug', params.bracket)
    .single();

  const results = await Promise.all([id_bracket_req, slug_bracket_req]);
  const [id_bracket, slug_bracket] = results;

  if (id_bracket.error || !id_bracket.data) {
    if (slug_bracket.error || !slug_bracket.data) {
      console.error('Error loading bracket:', id_bracket.error);
      throw error(404, 'Not found');
    } else {
      bracket = slug_bracket;
    }
  } else {
    bracket = id_bracket;
  }

  let picks = null;
  let all_picks = null;
  if (user) {
    const p = await supabase
      .from('picks')
      .select('*')
      .eq('bracket_id', bracket.data.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (p.error) {
      console.error('Error loading picks:', p.error);
      throw error(404, 'Not found');
    }

    if (p.data) {
      picks = p.data;
    }

    const ap = await supabase
      .from('picks')
      .select('*')
      .eq('bracket_id', bracket.data.id)
      .neq('user_id', user?.id)
      .order('user_name', { ascending: true });

    if (ap.error) {
      console.error('Error loading all picks:', ap.error);
      throw error(404, 'Not found');
    }

    all_picks = ap.data;
  }

  return {
    bracket: bracket.data,
    picks,
    all_picks: all_picks || [],
  };
};
