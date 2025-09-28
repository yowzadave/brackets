import { redirect } from '@sveltejs/kit';
import totalMatches from '$lib/total-matches';

export const actions = {
  create_bracket: async ({ request, locals: { user, supabase } }) => {
    if (!user) {
      return { success: false };
    }

    const data = await request.formData();

    const name = data.get('name') as string;
    const draw_size = parseInt(data.get('draw_size') as string);
    const seeds = JSON.parse(data.get('seeds') as string);
    const results = Array(totalMatches(draw_size)).fill(null);

    const first_round_matches = draw_size / 2;
    for (let i = 0; i < first_round_matches; i++) {
      results[i] = {
        player_a: i * 2,
        player_b: i * 2 + 1,
        winner: null,
        score: null,
      }
    }

    const bracket = await supabase.from("brackets")
      .insert({
        name,
        owner_id: user?.id,
        draw_size,
        seeds,
        results,
      })
      .select('*')
      .single();

    if (bracket.error || !bracket.data) {
      console.error(bracket.error);
      return { success: false };
    }

    redirect(303, `/bracket/${bracket.data.id}`);
  },
};
