-- ─────────────────────────────────────────────────────────────────────────────
-- VALOR EM REDE — Schema SQL para o Supabase
-- Cole este arquivo no SQL Editor do Supabase (https://app.supabase.com)
-- em: Project → SQL Editor → New Query → cole e execute
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensão de UUIDs ────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Tabela de usuários/membros ───────────────────────────────────────────────
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid references auth.users(id) on delete set null,
  name        text not null,
  email       text unique not null,
  role        text not null default 'member' check (role in ('member', 'manager')),
  status      text not null default 'active' check (status in ('active', 'inactive')),
  joined_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Tabela unificada de transações ───────────────────────────────────────────
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('payment', 'donation', 'expense', 'income')),
  name        text,
  description text,
  value       numeric(12,2) not null default 0,
  category    text,
  date        date not null default current_date,
  status      text not null default 'confirmed' check (status in ('confirmed', 'pending', 'cancelled')),
  synced      boolean not null default true,
  member_id   uuid references public.members(id) on delete set null,
  created_by  uuid references auth.users(id) on delete set null,
  nf_url      text,
  receipt_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Tabela de log Amazon People ──────────────────────────────────────────────
create table if not exists public.amazon_people_log (
  id          uuid primary key default gen_random_uuid(),
  payload     jsonb not null,
  sent_by     uuid references auth.users(id) on delete set null,
  action      text,
  sent_at     timestamptz not null default now()
);

-- ── Índices para performance ─────────────────────────────────────────────────
create index if not exists idx_tx_type     on public.transactions(type);
create index if not exists idx_tx_date     on public.transactions(date desc);
create index if not exists idx_tx_member   on public.transactions(member_id);
create index if not exists idx_tx_created  on public.transactions(created_at desc);

-- ── Trigger: updated_at automático ──────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_members_updated
  before update on public.members
  for each row execute function public.set_updated_at();

create or replace trigger trg_transactions_updated
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ── Row Level Security (RLS) ─────────────────────────────────────────────────
alter table public.members      enable row level security;
alter table public.transactions enable row level security;
alter table public.amazon_people_log enable row level security;

-- Membros: todos os autenticados leem; cada um edita o próprio perfil
create policy "members_select" on public.members
  for select using (auth.role() = 'authenticated');

-- INSERT: autenticados podem inserir, MAS somente com role = 'member'
-- (o gestor fixo é criado manualmente via SQL, nunca pelo app)
create policy "members_insert" on public.members
  for insert with check (
    auth.role() = 'authenticated'
    and role = 'member'
  );

create policy "members_update" on public.members
  for update using (auth_id = auth.uid());

-- Transações: todos os autenticados leem; gestor insere/atualiza/deleta
create policy "tx_select" on public.transactions
  for select using (auth.role() = 'authenticated');

create policy "tx_insert" on public.transactions
  for insert with check (auth.role() = 'authenticated');

create policy "tx_update" on public.transactions
  for update using (auth.role() = 'authenticated');

create policy "tx_delete" on public.transactions
  for delete using (
    exists (
      select 1 from public.members
      where auth_id = auth.uid() and role = 'manager'
    )
  );

-- Log Amazon People: somente gestores
create policy "log_select" on public.amazon_people_log
  for select using (
    exists (
      select 1 from public.members
      where auth_id = auth.uid() and role = 'manager'
    )
  );

create policy "log_insert" on public.amazon_people_log
  for insert with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- FIM DO SCHEMA
-- Após executar, acesse Authentication → Providers e ative "Email"
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- GESTOR FIXO DA COMUNIDADE
-- Execute este bloco SEPARADAMENTE após criar a conta do gestor em:
--   Supabase → Authentication → Users → "Add user" → confirm email
--
-- Substitua os valores abaixo com os dados reais antes de executar:
--   <AUTH_ID_DO_GESTOR> → cole o UUID do usuário criado acima
--   <EMAIL_DO_GESTOR>   → e-mail usado no cadastro
--   <NOME_DO_GESTOR>    → nome completo do gestor
-- ─────────────────────────────────────────────────────────────────────────────
/*
insert into public.members (auth_id, name, email, role, status)
values (
  '<AUTH_ID_DO_GESTOR>',
  '<NOME_DO_GESTOR>',
  '<EMAIL_DO_GESTOR>',
  'manager',
  'active'
)
on conflict (email) do update set
  auth_id = excluded.auth_id,
  role    = 'manager';
*/
