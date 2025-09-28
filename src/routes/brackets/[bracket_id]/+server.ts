import { json } from '@sveltejs/kit';

export async function PATCH({ params, request, locals: { supabase } }) {
  const { bracket_id } = params;
  const update = await request.json();

  const bracket = await supabase
    .from("brackets")
    .update(update)
    .eq("id", bracket_id)
    .select('*');

  if (bracket.error || !bracket.data) {
    console.error('Error updating bracket:', bracket.error);
    return json({ ok: false }, { status: 500 });
  }

  return json({ ok: true, data: bracket.data });
}
