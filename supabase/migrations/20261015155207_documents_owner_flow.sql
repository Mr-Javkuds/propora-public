create table public.application_documents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),listing_id bigint not null references public.listings(id),
 application_id uuid references public.applications(id),kind text not null check(kind in ('ktp','npwp')),name text not null check(length(name) between 1 and 200),
 path text unique not null,mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),size integer not null check(size between 1 and 5242880),created_at timestamptz not null default now()
);
create index documents_user on public.application_documents(user_id);
create index documents_listing on public.application_documents(listing_id);
create unique index documents_application_kind on public.application_documents(application_id,kind) where application_id is not null;
alter table public.application_documents enable row level security;
grant select,insert,update,delete on public.application_documents to authenticated;
create policy documents_read on public.application_documents for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.applications a join public.listings l on l.id=a.listing_id where a.id=application_id and l.owner_id=(select auth.uid())));
create policy documents_insert on public.application_documents for insert to authenticated with check(user_id=(select auth.uid()) and (select private.account_role())='pencari' and path like (select auth.uid())::text||'/'||id::text||'/%' and exists(select 1 from public.listings l where l.id=listing_id and l.status='available') and (application_id is null or exists(select 1 from public.applications a where a.id=application_id and a.seeker_id=(select auth.uid()) and a.listing_id=application_documents.listing_id and a.status='pending')));
create policy documents_attach on public.application_documents for update to authenticated using(user_id=(select auth.uid()) and application_id is null) with check(user_id=(select auth.uid()) and exists(select 1 from public.applications a where a.id=application_id and a.seeker_id=(select auth.uid()) and a.listing_id=application_documents.listing_id and a.status='pending'));
-- Only attachment may change; document identity and storage path are immutable.
revoke update on public.application_documents from authenticated;
grant update(application_id) on public.application_documents to authenticated;
create policy documents_delete on public.application_documents for delete to authenticated using(user_id=(select auth.uid()) and application_id is null);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('rental-documents','rental-documents',false,5242880,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
create policy rental_documents_upload on storage.objects for insert to authenticated with check(bucket_id='rental-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.account_role())='pencari');
create policy rental_documents_read on storage.objects for select to authenticated using(bucket_id='rental-documents' and exists(select 1 from public.application_documents d where d.path=name));
create policy rental_documents_delete on storage.objects for delete to authenticated using(bucket_id='rental-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.application_documents d where d.path=name and d.application_id is not null));
create function public.submit_application(p_application jsonb,p_document_ids uuid[] default '{}') returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_count integer;
begin
 if auth.uid() is null or cardinality(p_document_ids)>2 then raise exception 'Dokumen tidak valid'; end if;
 if cardinality(p_document_ids)>0 and not exists(select 1 from public.application_documents where id=any(p_document_ids) and kind='ktp' and user_id=auth.uid() and listing_id=(p_application->>'listing_id')::bigint and application_id is null) then raise exception 'Dokumen KTP belum tersedia'; end if;
 insert into public.applications(id,listing_id,seeker_id,tenant_json,start_date,duration,offer,proposal,status,created_at,updated_at) values((p_application->>'id')::uuid,(p_application->>'listing_id')::bigint,auth.uid(),p_application->>'tenant_json',p_application->>'start_date',(p_application->>'duration')::integer,(p_application->>'offer')::bigint,p_application->>'proposal','pending',p_application->>'created_at',p_application->>'updated_at') returning id into v_id;
 update public.application_documents set application_id=v_id where id=any(p_document_ids) and user_id=auth.uid() and listing_id=(p_application->>'listing_id')::bigint and application_id is null;
 get diagnostics v_count=row_count;
 if v_count<>cardinality(p_document_ids) then raise exception 'Dokumen tidak valid atau sudah dipakai'; end if;
 return v_id;
end $$;
revoke all on function public.submit_application(jsonb,uuid[]) from public,anon;
grant execute on function public.submit_application(jsonb,uuid[]) to authenticated;
create or replace function private.can_reply(p_listing bigint,p_seeker uuid) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and exists(select 1 from public.listings l where l.id=p_listing and l.owner_id=auth.uid() and (exists(select 1 from public.messages m where m.listing_id=l.id and m.seeker_id=p_seeker) or exists(select 1 from public.applications a where a.listing_id=l.id and a.seeker_id=p_seeker) or exists(select 1 from public.surveys s where s.listing_id=l.id and s.seeker_id=p_seeker)))
$$;
create function private.set_rental_status(p_listing bigint,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_listing public.listings; v_now text := to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if auth.uid() is null or private.account_role()<>'pemilik' then raise exception 'Akses ditolak'; end if;
 select * into v_listing from public.listings where id=p_listing and owner_id=auth.uid() for update;
 if not found then raise exception 'Listing tidak ditemukan'; end if;
 if not ((v_listing.status='reserved' and p_status='rented') or (v_listing.status in ('reserved','rented') and p_status='available')) then raise exception 'Perubahan status sewa tidak valid'; end if;
 if p_status='rented' and not exists(select 1 from public.applications where listing_id=p_listing and status='approved') then raise exception 'Pengajuan disetujui belum tersedia'; end if;
 if p_status='available' then update public.applications set status='withdrawn',owner_note=case when v_listing.status='rented' then 'Masa sewa diakhiri pemilik.' else 'Reservasi dibatalkan pemilik.' end,updated_at=v_now where listing_id=p_listing and status='approved'; end if;
 update public.listings set status=p_status,updated_at=v_now where id=p_listing;
end $$;
revoke all on function private.set_rental_status(bigint,text) from public;
grant execute on function private.set_rental_status(bigint,text) to authenticated;
create function public.set_rental_status(p_listing bigint,p_status text) returns void language sql security invoker set search_path='' as $$ select private.set_rental_status(p_listing,p_status) $$;
revoke all on function public.set_rental_status(bigint,text) from public,anon;
grant execute on function public.set_rental_status(bigint,text) to authenticated;
