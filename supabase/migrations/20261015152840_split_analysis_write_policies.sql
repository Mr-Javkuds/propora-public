drop policy analysis_write on public.listing_analyses;
create policy analysis_insert on public.listing_analyses for insert to authenticated with check(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=(select auth.uid())));
create policy analysis_update on public.listing_analyses for update to authenticated using(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=(select auth.uid()))) with check(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=(select auth.uid())));
create policy analysis_delete on public.listing_analyses for delete to authenticated using(exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=(select auth.uid())));
