-- Finance entries for studio income/expenses
create extension if not exists "uuid-ossp";

create table if not exists finance_entries (
  id uuid default uuid_generate_v4() primary key,
  studio_id uuid references studios(uuid) on delete cascade not null,
  student_id uuid references profiles(id) on delete set null,
  entry_type text not null check (entry_type in ('income', 'expense')),
  amount numeric(12,2) not null,
  currency text default 'KZT' not null,
  payment_date date not null,
  payer_name text,
  receiver_name text,
  payment_source text,
  category text,
  description text,
  created_by uuid default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table finance_entries
  add column if not exists student_id uuid references profiles(id) on delete set null;

alter table finance_entries enable row level security;

create or replace function public.can_access_studio(studio_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from studios
    where uuid = studio_uuid
    and owner_id = auth.uid()
  )
  or exists (
    select 1
    from tenant_staff
    where studio_id = studio_uuid
    and user_id = auth.uid()
  );
$$;

drop policy if exists "Users can read finance entries" on finance_entries;
create policy "Users can read finance entries"
  on finance_entries for select
  to authenticated
  using (public.can_access_studio(studio_id));

drop policy if exists "Users can insert finance entries" on finance_entries;
create policy "Users can insert finance entries"
  on finance_entries for insert
  to authenticated
  with check (
    public.can_access_studio(studio_id)
    and created_by = auth.uid()
  );

drop policy if exists "Users can update finance entries" on finance_entries;
create policy "Users can update finance entries"
  on finance_entries for update
  to authenticated
  using (public.can_access_studio(studio_id))
  with check (
    public.can_access_studio(studio_id)
    and created_by = auth.uid()
  );

drop policy if exists "Users can delete finance entries" on finance_entries;
create policy "Users can delete finance entries"
  on finance_entries for delete
  to authenticated
  using (public.can_access_studio(studio_id));

grant select, insert, update, delete on finance_entries to authenticated;
