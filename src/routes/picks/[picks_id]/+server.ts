import { json } from '@sveltejs/kit';

export async function PATCH({ params, request, locals: { supabase } }) {
  const { picks_id } = params;

  const update = await request.json();

  const picks = await supabase
    .from("picks")
    .update(update)
    .eq("id", picks_id)
    .select('*');

  if (picks.error || !picks.data) {
    console.error('Error updating picks:', picks.error);
    return json({ ok: false }, { status: 500 });
  }

  return json({ ok: true, data: picks.data });
}
