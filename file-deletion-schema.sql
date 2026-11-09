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
 if item.state<>'ready' then raise exception 'Transfert en cours' using errcode='40001'; end if;
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
