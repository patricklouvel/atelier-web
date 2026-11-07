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
commit;
