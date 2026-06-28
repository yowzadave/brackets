-- Opt the existing public tables into the Data API with explicit grants.
--
-- Supabase is rolling out a breaking change: tables in the `public` schema are
-- no longer exposed to the Data API (REST/GraphQL) automatically. It is the
-- default for new projects as of 2026-05-30 and will be applied to existing
-- projects (including prod) on 2026-10-30. Recent Supabase CLI versions already
-- enforce it locally, which is why these tables returned "permission denied for
-- table ..." (SQLSTATE 42501) on a fresh local stack even though RLS policies
-- exist.
--
-- These grants are the documented opt-in. They are effectively a no-op on prod
-- today (it still auto-grants under the old default) but become load-bearing
-- once the change reaches prod on 2026-10-30. The privileges mirror each table's
-- RLS policies; RLS still governs which rows each role may access.
--
-- Ref: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

-- brackets: public read; owners/admins insert + update (no delete policy)
grant select on public.brackets to anon;
grant select, insert, update on public.brackets to authenticated;

-- picks: public read; authenticated users manage their own picks (incl. delete)
grant select on public.picks to anon;
grant select, insert, update, delete on public.picks to authenticated;

-- bracket_admins: authenticated only (select/insert/delete); no anon access
grant select, insert, delete on public.bracket_admins to authenticated;

-- service_role bypasses RLS and is used only from trusted server-side code
grant select, insert, update, delete
  on public.brackets, public.picks, public.bracket_admins
  to service_role;
