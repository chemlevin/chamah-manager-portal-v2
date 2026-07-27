create table public.portal_user_import_mappings (
  user_id uuid not null references public.portal_user_profiles(user_id) on delete cascade,
  import_type varchar(40) not null,
  column_mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, import_type),
  check (import_type in ('EMPLOYEES'))
);

alter table public.portal_user_import_mappings enable row level security;

create policy portal_import_mappings_self_read
  on public.portal_user_import_mappings for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.portal_user_import_mappings from anon, authenticated;
grant select on public.portal_user_import_mappings to authenticated;
grant all on public.portal_user_import_mappings to service_role;

create function public.portal_import_employees(
  target_rows jsonb,
  actor_id uuid,
  source_file_name text,
  column_mapping jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  batch_id uuid;
  source_row jsonb;
  existing_employee public.employees%rowtype;
  saved_employee public.employees%rowtype;
  employee_number text;
  identity_number text;
  first_name_value text;
  last_name_value text;
  email_value text;
  birth_date_value text;
  row_number integer;
  created_count integer := 0;
  updated_count integer := 0;
  skipped_count integer := 0;
  failed_count integer := 0;
  result_rows jsonb := '[]'::jsonb;
  error_text text;
begin
  if jsonb_typeof(target_rows) <> 'array' then
    raise exception 'Employee import rows must be a JSON array';
  end if;

  insert into public.import_batches (
    source_type, source_name, source_file_name, triggered_by_user_id,
    status, total_rows, metadata
  ) values (
    'EMPLOYEE_FILE', 'PORTAL_EMPLOYEE_IMPORT', nullif(btrim(source_file_name), ''),
    actor_id, 'RUNNING', jsonb_array_length(target_rows),
    jsonb_build_object('column_mapping', coalesce(column_mapping, '{}'::jsonb))
  ) returning import_batch_id into batch_id;

  for source_row in select value from jsonb_array_elements(target_rows)
  loop
    row_number := coalesce((source_row->>'source_row_number')::integer, 0);
    employee_number := nullif(btrim(source_row->>'employee_number'), '');
    identity_number := nullif(btrim(source_row->>'identity_number'), '');
    first_name_value := nullif(btrim(source_row->>'first_name'), '');
    last_name_value := nullif(btrim(source_row->>'last_name'), '');
    email_value := nullif(btrim(source_row->>'email'), '');
    birth_date_value := nullif(btrim(source_row->>'birth_date'), '');
    error_text := null;
    existing_employee := null;

    if employee_number is null and identity_number is null then
      error_text := 'Employee Number or Identity Number is required';
    elsif first_name_value is null or last_name_value is null then
      error_text := 'First Name and Last Name are required';
    elsif email_value is not null and email_value !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      error_text := 'Email address is invalid';
    elsif birth_date_value is not null and birth_date_value !~ '^\d{4}-\d{2}-\d{2}$' then
      error_text := 'Birth Date must use YYYY-MM-DD';
    end if;

    if error_text is null and employee_number is not null then
      select * into existing_employee from public.employees
      where employee_code = employee_number limit 1;
    elsif error_text is null then
      select * into existing_employee from public.employees
      where national_id = identity_number limit 1;
    end if;

    if error_text is null and employee_number is not null and identity_number is not null
       and exists (
         select 1 from public.employees
         where national_id = identity_number
           and employee_id <> coalesce(existing_employee.employee_id, gen_random_uuid())
       ) then
      error_text := 'Identity Number belongs to another employee';
    end if;

    if error_text is not null then
      failed_count := failed_count + 1;
      result_rows := result_rows || jsonb_build_array(jsonb_build_object(
        'source_row_number', row_number, 'status', 'FAILED', 'error', error_text
      ));
      continue;
    end if;

    if existing_employee.employee_id is not null then
      update public.employees
      set first_name = first_name_value,
          last_name = last_name_value,
          national_id = coalesce(identity_number, national_id),
          phone = coalesce(nullif(btrim(source_row->>'phone'), ''), phone),
          email = coalesce(email_value, email),
          birth_date = coalesce(birth_date_value::date, birth_date),
          notes = coalesce(nullif(btrim(source_row->>'notes'), ''), notes),
          updated_by_user_id = actor_id
      where employee_id = existing_employee.employee_id
      returning * into saved_employee;

      updated_count := updated_count + 1;
      insert into public.audit_events (
        entity_type, entity_id, operation, previous_values, new_values,
        source_type, actor_user_id
      ) values (
        'employees', saved_employee.employee_id, 'IMPORT_UPDATE',
        to_jsonb(existing_employee), to_jsonb(saved_employee), 'PORTAL_ADMIN', actor_id
      );
      result_rows := result_rows || jsonb_build_array(jsonb_build_object(
        'source_row_number', row_number, 'status', 'UPDATED',
        'employee_id', saved_employee.employee_id
      ));
    else
      insert into public.employees (
        employee_code, national_id, first_name, last_name, phone, email,
        birth_date, lifecycle_status, notes, created_by_user_id, updated_by_user_id
      ) values (
        coalesce(employee_number, identity_number), identity_number,
        first_name_value, last_name_value,
        nullif(btrim(source_row->>'phone'), ''), email_value,
        birth_date_value::date, 'ACTIVE', nullif(btrim(source_row->>'notes'), ''),
        actor_id, actor_id
      ) returning * into saved_employee;

      created_count := created_count + 1;
      insert into public.audit_events (
        entity_type, entity_id, operation, previous_values, new_values,
        source_type, actor_user_id
      ) values (
        'employees', saved_employee.employee_id, 'IMPORT_INSERT',
        null, to_jsonb(saved_employee), 'PORTAL_ADMIN', actor_id
      );
      result_rows := result_rows || jsonb_build_array(jsonb_build_object(
        'source_row_number', row_number, 'status', 'CREATED',
        'employee_id', saved_employee.employee_id
      ));
    end if;
  end loop;

  insert into public.portal_user_import_mappings (user_id, import_type, column_mapping)
  values (actor_id, 'EMPLOYEES', coalesce(column_mapping, '{}'::jsonb))
  on conflict (user_id, import_type) do update
  set column_mapping = excluded.column_mapping,
      updated_at = timezone('utc', now());

  update public.import_batches
  set status = case when failed_count > 0 then 'COMPLETED_WITH_ERRORS' else 'COMPLETED' end,
      completed_at = timezone('utc', now()),
      accepted_rows = created_count + updated_count,
      rejected_rows = failed_count,
      error_summary = case when failed_count > 0 then failed_count || ' rows failed server validation' end
  where import_batch_id = batch_id;

  return jsonb_build_object(
    'import_batch_id', batch_id,
    'new_employees', created_count,
    'updated_employees', updated_count,
    'skipped_employees', skipped_count,
    'failed_employees', failed_count,
    'rows', result_rows
  );
end;
$$;

revoke all on function public.portal_import_employees(jsonb, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.portal_import_employees(jsonb, uuid, text, jsonb) to service_role;
