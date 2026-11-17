-- TRACK136: safe request-origin evidence for MCP lifecycle operations.
create table if not exists public.mcp_request_origin_audit (
 request_origin_id uuid primary key default gen_random_uuid(), actor_user_id uuid not null references auth.users(id),
 client_application text not null default 'Unknown', connector_id text not null default 'Unknown', session_id text not null default 'Unknown',
 request_id uuid not null, correlation_id uuid not null, mcp_endpoint text not null default 'Unknown', deployment_commit text not null default 'Unknown',
 operation text not null check (operation in ('PREVIEW','APPROVAL','COMMIT','ARCHIVE','DELETE')), tool_name text not null, recorded_at timestamptz not null default now()
);
alter table public.mcp_request_origin_audit enable row level security;
revoke all on public.mcp_request_origin_audit from public, anon;
create or replace function public.portal_mcp_record_request_origin(p_origin jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare r uuid:=coalesce(nullif(p_origin->>'request_id','')::uuid,gen_random_uuid()); c uuid:=coalesce(nullif(p_origin->>'correlation_id','')::uuid,r); saved uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_origin is null or p_origin->>'operation' not in ('PREVIEW','APPROVAL','COMMIT','ARCHIVE','DELETE') then raise exception 'Invalid request origin operation' using errcode='22023'; end if;
 insert into public.mcp_request_origin_audit(actor_user_id,client_application,connector_id,session_id,request_id,correlation_id,mcp_endpoint,deployment_commit,operation,tool_name)
 values(auth.uid(),left(coalesce(nullif(p_origin->>'client_application',''),'Unknown'),80),left(coalesce(nullif(p_origin->>'connector_id',''),'Unknown'),160),left(coalesce(nullif(p_origin->>'session_id',''),'Unknown'),160),r,c,left(coalesce(nullif(p_origin->>'mcp_endpoint',''),'Unknown'),500),left(coalesce(nullif(p_origin->>'deployment_commit',''),'Unknown'),120),p_origin->>'operation',left(coalesce(nullif(p_origin->>'tool_name',''),'Unknown'),120)) returning request_origin_id into saved;
 return jsonb_build_object('request_origin_id',saved,'request_id',r,'correlation_id',c,'recorded',true);
end $$;
revoke all on function public.portal_mcp_record_request_origin(jsonb) from public, anon;
grant execute on function public.portal_mcp_record_request_origin(jsonb) to authenticated;
