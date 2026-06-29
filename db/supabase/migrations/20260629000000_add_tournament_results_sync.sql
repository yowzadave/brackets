-- Associate a bracket with a tennis-api tournament so its results can be synced
-- automatically. `tournament_id` is the API's tournament id (e.g. 21337 for
-- Wimbledon 2026) and `tour` is the API tour segment. Only ATP and WTA are
-- supported by the calendar/results endpoints (ITF is rejected by the API).
--
-- `timezone` is an optional IANA zone (e.g. 'Europe/London') used to gate the
-- automatic sync to the tournament's active hours (11:00–03:00 local). When
-- null, the sync runs whenever the bracket is otherwise eligible.
--
-- `results_synced_at` records the last time the auto-sync touched this bracket.
alter table public.brackets
  add column tournament_id integer,
  add column tour text check (tour in ('atp', 'wta')),
  add column timezone text,
  add column results_synced_at timestamp with time zone;
