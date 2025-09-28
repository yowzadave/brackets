import { json } from '@sveltejs/kit';

export async function POST({ request, locals: { supabase, user } }) {
  const record = await request.json();

  if (!user) {
    return json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  record.user_id = user.id;

  const picks = await supabase
    .from("picks")
    .insert(record)
    .select('*')
    .single();

  if (picks.error || !picks.data) {
    console.error('Error creating picks:', picks.error);
    return json({ ok: false }, { status: 500 });
  }

  return json({ ok: true, data: picks.data });
}
