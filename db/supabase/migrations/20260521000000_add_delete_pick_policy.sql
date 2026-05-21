create policy delete_pick on picks
  for delete
  to authenticated
  using ( (select auth.uid()) = user_id and (select pickable from brackets where id = bracket_id) );
