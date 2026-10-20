drop policy rental_documents_read on storage.objects;
create policy rental_documents_read on storage.objects for select to authenticated using(bucket_id='rental-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.application_documents d where d.path=storage.objects.name)));
drop policy rental_documents_delete on storage.objects;
create policy rental_documents_delete on storage.objects for delete to authenticated using(bucket_id='rental-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.application_documents d where d.path=storage.objects.name and d.application_id is not null));
