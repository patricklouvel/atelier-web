-- À exécuter dans le SQL Editor du projet Supabase.
-- Réexécutable : conserve les comptes et les fichiers existants.
begin;
create table if not exists public.atelier_members (
 email text primary key check (email = lower(email)),
 created_at timestamptz not null default now()
);
alter table public.atelier_members add column if not exists role text not null default 'guest';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='atelier_members_role_check' and conrelid='public.atelier_members'::regclass) then
  alter table public.atelier_members add constraint atelier_members_role_check check(role in ('admin','participant','guest'));
 end if;
end $$;

create or replace function public.atelier_normalize_member_email() returns trigger
 language plpgsql set search_path=public,pg_temp as $$
begin new.email=lower(btrim(new.email)); return new; end $$;
drop trigger if exists atelier_member_email_normalize on public.atelier_members;
create trigger atelier_member_email_normalize before insert or update of email on public.atelier_members
 for each row execute function public.atelier_normalize_member_email();

-- Sérialise les retraits d'administrateurs pour préserver le dernier compte admin.
create or replace function public.atelier_keep_last_admin() returns trigger
 language plpgsql set search_path=public,pg_temp as $$
begin
 if old.role='admin' and (tg_op='DELETE' or new.role<>'admin') then
  perform pg_advisory_xact_lock(78431,1);
  if not exists(select 1 from public.atelier_members where role='admin' and email<>old.email) then
   raise exception 'Le dernier administrateur ne peut pas être retiré.' using errcode='23514';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
drop trigger if exists atelier_last_admin_guard on public.atelier_members;
create trigger atelier_last_admin_guard before update of role or delete on public.atelier_members
 for each row execute function public.atelier_keep_last_admin();

create table if not exists public.atelier_project_access (
 project_token text not null check(project_token ~ '^[a-f0-9]{48}$'),
 email text not null references public.atelier_members(email) on update cascade on delete cascade,
 created_at timestamptz not null default now(),
 primary key(project_token,email)
);
create index if not exists atelier_project_access_email_idx on public.atelier_project_access(email);

-- Aucun rôle ni partage ne peut être changé directement depuis le navigateur.
alter table public.atelier_members enable row level security;
alter table public.atelier_project_access enable row level security;
revoke all on table public.atelier_members,public.atelier_project_access from anon,authenticated;
grant all on table public.atelier_members,public.atelier_project_access to service_role;
revoke all on function public.atelier_normalize_member_email(),public.atelier_keep_last_admin() from public,anon,authenticated;
grant execute on function public.atelier_normalize_member_email(),public.atelier_keep_last_admin() to service_role;

insert into storage.buckets(id,name,public,file_size_limit)
 values('atelier-private','atelier-private',false,209715200)
 on conflict(id) do update set public=false,file_size_limit=209715200;
drop policy if exists atelier_private_guard on storage.objects;
create policy atelier_private_guard on storage.objects as restrictive
 for all to anon,authenticated using(bucket_id<>'atelier-private') with check(bucket_id<>'atelier-private');
commit;

-- PREMIER ADMINISTRATEUR : exécuter séparément avec votre adresse réelle.
-- insert into public.atelier_members(email,role) values('votre-adresse@example.fr','admin')
-- on conflict(email) do update set role='admin';
-- Les anciens membres deviennent invités, sans partage automatique des projets.
