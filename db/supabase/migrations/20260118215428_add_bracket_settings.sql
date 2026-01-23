alter table public.brackets
  add column public boolean not null default false,
  add column end_date timestamp with time zone;
