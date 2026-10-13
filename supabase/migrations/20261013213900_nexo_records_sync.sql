-- Nexo: armazenamento sincronizado por usuário (um documento JSON por registro local).
-- Aplicada no projeto Supabase em 2026-10-13.
create schema if not exists private;

create table public.nexo_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (
    collection in ('tasks', 'labels', 'projects', 'routines', 'routineLogs', 'methods', 'methodRuns', 'templates', 'posts', 'activity', 'counters')
  ),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id),
  constraint nexo_records_data_present check (deleted or data is not null),
  constraint nexo_records_data_size check (data is null or pg_column_size(data) <= 262144)
);

comment on table public.nexo_records is 'Nexo: registros sincronizados (tarefas, rotinas, métodos, publicações, histórico) de cada usuário.';

-- leitura incremental por usuário: where user_id = ? and updated_at > ? order by updated_at
create index nexo_records_user_updated_idx on public.nexo_records (user_id, updated_at);

-- carimbo de atualização definido pelo servidor (cursor confiável de sincronização)
create or replace function private.nexo_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke execute on function private.nexo_touch_updated_at() from public, anon, authenticated;

create trigger nexo_records_touch
before insert or update on public.nexo_records
for each row execute function private.nexo_touch_updated_at();

-- acesso: só usuários autenticados, e cada um apenas às próprias linhas
alter table public.nexo_records enable row level security;

revoke all on table public.nexo_records from anon, authenticated;
grant select, insert, update, delete on table public.nexo_records to authenticated;

create policy "nexo_records_select_own" on public.nexo_records
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "nexo_records_insert_own" on public.nexo_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "nexo_records_update_own" on public.nexo_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "nexo_records_delete_own" on public.nexo_records
  for delete to authenticated
  using ((select auth.uid()) = user_id);
