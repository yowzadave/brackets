-- Add a scoring method to brackets so each bracket can pick how picks are
-- scored. Existing brackets and new ones default to the current "standard"
-- behavior; "served" applies the round-weighted method with upset bonuses.
alter table public.brackets
  add column scoring_method text not null default 'standard'
    check (scoring_method in ('standard', 'served'));
