create function private.can_reply(p_listing bigint,p_seeker uuid) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and exists(select 1 from public.messages m join public.listings l on l.id=m.listing_id where l.id=p_listing and l.owner_id=auth.uid() and m.seeker_id=p_seeker)
$$;
revoke all on function private.can_reply(bigint,uuid) from public;
grant execute on function private.can_reply(bigint,uuid) to authenticated;
drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and exists(select 1 from public.listings l where l.id=listing_id and l.owner_id is not null and ((seeker_id=(select auth.uid()) and (select private.account_role())='pencari' and l.status<>'draft') or (l.owner_id=(select auth.uid()) and private.can_reply(l.id,seeker_id)))));
