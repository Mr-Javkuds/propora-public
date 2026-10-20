alter table public.applications add column payment jsonb;
create function private.complete_simulated_payment(p_application uuid,p_method text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.applications; l public.listings; receipt jsonb; stamp text := to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if auth.uid() is null or private.account_role()<>'pencari' then raise exception 'Akses ditolak'; end if;
 if p_method is null or p_method not in ('va','qris','wallet') then raise exception 'Metode pembayaran tidak valid'; end if;
 select * into a from public.applications where id=p_application and seeker_id=auth.uid();
 if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
 select * into l from public.listings where id=a.listing_id for update;
 select * into a from public.applications where id=p_application for update;
 if a.status<>'approved' then raise exception 'Pengajuan belum disetujui'; end if;
 if a.payment is not null then return a.payment; end if;
 if l.status not in ('reserved','rented') then raise exception 'Ruko tidak lagi dipesan'; end if;
 receipt := jsonb_build_object('id','SIM-'||gen_random_uuid()::text,'time',stamp,'method',p_method,'amount',a.offer*a.duration);
 update public.applications set payment=receipt,updated_at=stamp where id=a.id;
 update public.listings set status='rented',updated_at=stamp where id=l.id;
 return receipt;
end $$;
revoke all on function private.complete_simulated_payment(uuid,text) from public,anon;
grant execute on function private.complete_simulated_payment(uuid,text) to authenticated;
create function public.complete_simulated_payment(p_application uuid,p_method text) returns jsonb
language sql security invoker set search_path='' as $$ select private.complete_simulated_payment(p_application,p_method) $$;
revoke all on function public.complete_simulated_payment(uuid,text) from public,anon;
grant execute on function public.complete_simulated_payment(uuid,text) to authenticated;
