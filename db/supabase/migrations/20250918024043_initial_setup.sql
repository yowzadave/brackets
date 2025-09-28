create table brackets (
	id char(10) default nanoid(10) primary key,
  slug text unique,
  owner_id uuid references auth.users(id),
	name text,
  draw_size integer not null,
	created_at timestamp with time zone default current_timestamp,
  seeds jsonb not null default '[]'::jsonb,
  results jsonb not null default '[]'::jsonb,
  pickable boolean default true
);

create index brackets_slug_idx on brackets(slug);

alter table brackets enable row level security;

create policy insert_bracket on brackets
  for insert
  to authenticated
  with check ( (select auth.uid()) = owner_id );

create policy update_bracket on brackets
  for update
  to authenticated
  using ( (select auth.uid()) = owner_id );
  
create policy select_bracket on brackets
  for select
  to authenticated, anon
  using ( true );

create table picks (
  id char(10) default nanoid(10) primary key,
  bracket_id char(10) not null references brackets(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_name text,
  created_at timestamp with time zone default current_timestamp,
  entries jsonb not null default '[]'::jsonb,
  nicknames jsonb not null default '[]'::jsonb
);

alter table picks enable row level security;

create policy insert_pick on picks
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy select_pick on picks
  for select
  to authenticated, anon
  using ( true );

create policy update_pick on picks
  for update
  to authenticated
  using ( (select auth.uid()) = user_id and (select pickable from brackets where id = bracket_id) );
