-- À exécuter dans le SQL Editor du projet Supabase.
create table if not exists public.atelier_members (
 email text primary key check (email = lower(email)),
 created_at timestamptz not null default now()
);
alter table public.atelier_members enable row level security;
revoke all on table public.atelier_members from anon, authenticated;
-- Aucune policy client : seul le backend avec service_role gère cette liste.
insert into storage.buckets(id,name,public,file_size_limit)
 values('atelier-private','atelier-private',false,209715200)
 on conflict(id) do update set public=false,file_size_limit=209715200;
-- Ne créer aucune policy publique sur storage.objects pour ce bucket.

-- Défense supplémentaire : même une autre policy permissive ne doit pas ouvrir ce bucket.
grant all on table public.atelier_members to service_role;
drop policy if exists atelier_private_guard on storage.objects;
create policy atelier_private_guard on storage.objects as restrictive
 for all to anon, authenticated
 using (bucket_id <> 'atelier-private')
 with check (bucket_id <> 'atelier-private');
