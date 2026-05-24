create table public.bracket_admins (
  bracket_id char(10) not null references public.brackets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default current_timestamp,
  primary key (bracket_id, user_id)
);

alter table public.bracket_admins enable row level security;

create policy select_bracket_admin on public.bracket_admins
  for select
  to authenticated
  using ( true );

-- Allow bracket owners to manage admins for their brackets
create policy insert_bracket_admin on public.bracket_admins
  for insert
  to authenticated
  with check (
    (select auth.uid()) = (select owner_id from public.brackets where id = bracket_id)
  );

create policy delete_bracket_admin on public.bracket_admins
  for delete
  to authenticated
  using (
    (select auth.uid()) = (select owner_id from public.brackets where id = bracket_id)
  );

-- Allow bracket admins to update a bracket
create policy update_bracket_as_admin on public.brackets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.bracket_admins
      where bracket_id = id
        and user_id = (select auth.uid())
    )
  );
