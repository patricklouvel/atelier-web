-- Atelier web autonome. Réexécutable, sans suppression des données existantes.
-- Prérequis : setup.sql (comptes, rôles, bucket privé).
begin;
create table if not exists public.atelier_collections (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 200),
 description text not null default '', revision integer not null default 1 check(revision>0), created_at timestamptz not null default now()
);
create table if not exists public.atelier_projects (
 id uuid primary key default gen_random_uuid(), collection_id uuid not null references public.atelier_collections(id),
 assignees text[] not null default '{}', client_emails text[] not null default '{}', published boolean not null default false,
 payload jsonb not null check(jsonb_typeof(payload)='object'), revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists atelier_projects_collection_idx on public.atelier_projects(collection_id);
create index if not exists atelier_projects_assignees_idx on public.atelier_projects using gin(assignees);
create index if not exists atelier_projects_clients_idx on public.atelier_projects using gin(client_emails) where published;
create table if not exists public.atelier_files (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.atelier_projects(id) on delete cascade,
 metadata jsonb not null check(jsonb_typeof(metadata)='object'), storage_path text not null unique,
 uploader text not null, state text not null default 'pending' check(state in ('pending','ready')), created_at timestamptz not null default now()
);
create index if not exists atelier_files_project_idx on public.atelier_files(project_id,state);
create table if not exists public.atelier_events (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.atelier_projects(id) on delete cascade,
 author text not null, text text not null, created_at timestamptz not null default now()
);
create index if not exists atelier_events_project_idx on public.atelier_events(project_id,created_at desc);

-- Les API vérifient le compte et ses affectations avant chaque lecture/écriture.
-- Les tables ne sont jamais exposées aux clés navigateur, même à un membre connecté.
alter table public.atelier_collections enable row level security;
alter table public.atelier_projects enable row level security;
alter table public.atelier_files enable row level security;
alter table public.atelier_events enable row level security;
revoke all on public.atelier_collections,public.atelier_projects,public.atelier_files,public.atelier_events from anon,authenticated;
grant all on public.atelier_collections,public.atelier_projects,public.atelier_files,public.atelier_events to service_role;

-- Une transaction pour le dossier, le partage des fichiers et la trace d'audit.
-- La révision empêche l'écrasement du travail d'un autre utilisateur.
create or replace function public.atelier_save_project(p_id uuid,p_revision integer,p_data jsonb,p_files jsonb,p_event text,p_actor text)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare saved public.atelier_projects; f jsonb;
begin
 update public.atelier_projects set payload=p_data->'payload', collection_id=(p_data->>'collection_id')::uuid,
  assignees=array(select jsonb_array_elements_text(p_data->'assignees')),
  client_emails=array(select jsonb_array_elements_text(p_data->'client_emails')),
  published=(p_data->>'published')::boolean, revision=revision+1, updated_at=now()
 where id=p_id and revision=p_revision returning * into saved;
 if not found then raise exception 'Version concurrente' using errcode='40001'; end if;
 for f in select * from jsonb_array_elements(p_files) loop
  update public.atelier_files set metadata=f->'metadata' where id=(f->>'id')::uuid and project_id=p_id and state='ready';
  if not found then raise exception 'Fichier modifié' using errcode='40001'; end if;
 end loop;
 insert into public.atelier_events(project_id,author,text) values(p_id,p_actor,p_event);
 return to_jsonb(saved);
end $$;
revoke all on function public.atelier_save_project(uuid,integer,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.atelier_save_project(uuid,integer,jsonb,jsonb,text,text) to service_role;

-- Public product presentations
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
 perform 1 from public.atelier_projects where id=p_project_id for update;
 if p_command <> 'unpublish' and exists(
  select 1 from (
   select photo->>'fileId' as id from jsonb_array_elements(coalesce(p_draft->'gallery','[]'::jsonb)) photo
   union select p_draft->>'modelId'
  ) selected where coalesce(selected.id,'')<>'' and not exists(
   select 1 from public.atelier_files f where f.project_id=p_project_id and f.id::text=selected.id and f.state='ready'
  )
 ) then raise exception 'Un fichier s?lectionn? a ?t? supprim?' using errcode='23503'; end if;

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

-- Suppression de fichiers administrateur. Exécuter après public-presentation-schema.sql.
-- Réexécutable ; conserve les fichiers dont le nettoyage doit être réessayé.
begin;
create or replace function public.atelier_prepare_file_deletion(p_project_id uuid,p_file_id uuid,p_revision integer,p_payload jsonb,p_actor text)
returns void language plpgsql set search_path=public,pg_temp as $$
declare project public.atelier_projects; item public.atelier_files; presentation public.atelier_presentations;
begin
 select * into project from public.atelier_projects where id=p_project_id for update;
 if not found then raise exception 'Pièce introuvable' using errcode='22023'; end if;
 select * into item from public.atelier_files where id=p_file_id and project_id=p_project_id for update;
 if not found then raise exception 'Fichier introuvable' using errcode='22023'; end if;
 if item.metadata->>'deleting'='true' then return; end if;
 if project.revision<>p_revision then raise exception 'Version concurrente' using errcode='40001'; end if;
 select * into presentation from public.atelier_presentations where project_id=p_project_id for update;
 if presentation.draft->>'modelId'=p_file_id::text or presentation.live->>'modelId'=p_file_id::text
  or exists(select 1 from jsonb_array_elements(coalesce(presentation.draft->'gallery','[]'::jsonb)||coalesce(presentation.live->'gallery','[]'::jsonb)) photo where photo->>'fileId'=p_file_id::text)
 then raise exception 'Fichier utilisé dans une présentation publique' using errcode='23503'; end if;
 update public.atelier_projects set payload=p_payload,revision=revision+1,updated_at=now() where id=p_project_id;
 update public.atelier_files set state='pending',metadata=metadata||'{"deleting":true}'::jsonb where id=p_file_id;
 insert into public.atelier_events(project_id,author,text) values(p_project_id,p_actor,'Fichier supprimé : '||(item.metadata->>'name'));
end $$;
revoke all on function public.atelier_prepare_file_deletion(uuid,uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.atelier_prepare_file_deletion(uuid,uuid,integer,jsonb,text) to service_role;
commit;
