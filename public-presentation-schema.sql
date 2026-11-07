-- Publication publique explicite, indépendante de la vitrine privée des invités.
-- Exécuter après setup.sql. Réexécutable et sans suppression des données.
begin;
create table if not exists public.atelier_presentations (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null unique references public.atelier_projects(id) on delete cascade,
 slug text not null unique check(length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 draft jsonb not null check(jsonb_typeof(draft)='object'),
 live jsonb check(live is null or jsonb_typeof(live)='object'),
 revision integer not null default 0 check(revision>=0), live_version integer not null default 0 check(live_version>=0),
 was_published boolean not null default false, published_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.atelier_presentations enable row level security;
revoke all on public.atelier_presentations from public,anon,authenticated;
grant select,insert,update on public.atelier_presentations to service_role;
create index if not exists atelier_presentations_public_idx on public.atelier_presentations(id) where was_published;

create or replace function public.atelier_save_presentation(p_project_id uuid,p_revision integer,p_draft jsonb,p_live jsonb,p_command text,p_actor text)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare saved public.atelier_presentations;
begin
 if p_command not in ('save','publish','unpublish') then raise exception 'Action invalide' using errcode='22023'; end if;
 if p_command <> 'unpublish' then
  insert into public.atelier_presentations(project_id,slug,draft)
   values(p_project_id,p_draft->>'slug',p_draft) on conflict(project_id) do nothing;
 end if;
 select * into saved from public.atelier_presentations where project_id=p_project_id for update;
 if not found or saved.revision<>p_revision then raise exception 'Version concurrente' using errcode='40001'; end if;
 if p_command <> 'unpublish' and saved.was_published and saved.slug<>p_draft->>'slug' then
  raise exception 'Adresse déjà publiée' using errcode='22023';
 end if;
 update public.atelier_presentations set
  slug=case when p_command='unpublish' then slug else p_draft->>'slug' end,
  draft=case when p_command='unpublish' then draft else p_draft end,
  live=case when p_command='publish' then p_live when p_command='unpublish' then null else live end,
  revision=revision+1,
  live_version=live_version+case when p_command in ('publish','unpublish') then 1 else 0 end,
  was_published=was_published or p_command='publish',
  published_at=case when p_command='publish' then now() else published_at end, updated_at=now()
 where project_id=p_project_id returning * into saved;
 insert into public.atelier_events(project_id,author,text) values(p_project_id,p_actor,
  case p_command when 'publish' then 'Présentation publiée sur le site public.' when 'unpublish' then 'Présentation retirée du site public.' else 'Brouillon de présentation publique enregistré.' end);
 return to_jsonb(saved);
end $$;
revoke all on function public.atelier_save_presentation(uuid,integer,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.atelier_save_presentation(uuid,integer,jsonb,jsonb,text,text) to service_role;
commit;
