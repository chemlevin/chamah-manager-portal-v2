-- TRACK135: do not classify legitimate mapping versions such as
-- track130-contracts-v1 as synthetic data. Keep explicit test markers fail-closed.
create or replace function private.portal_mcp_reject_synthetic(
  p_source_name text, p_source_provenance jsonb, p_rows jsonb
) returns void language plpgsql immutable
set search_path=public,private,pg_temp as $$
declare metadata text:=lower(coalesce(p_source_name,'')||' '||coalesce(p_source_provenance::text,''));
        row_markers text:=lower(coalesce(p_rows::text,''));
begin
 if metadata ~ '(^|[^a-z])(internal[_ -]?acceptance|synthetic|test[_ -]?data|example[.]invalid)([^a-z]|$)'
    or row_markers ~ '(^|[^a-z])(internal[_ -]?acceptance|synthetic|test[_ -]?data|example[.]invalid)([^a-z]|$)' then
   raise exception 'Synthetic or test data is not promotable to Production' using errcode='22023';
 end if;
end $$;
