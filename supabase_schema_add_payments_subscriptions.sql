-- Subscriptions (season tickets)
create table if not exists public.subscriptions (
  uuid uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  studio_id uuid references public.studios(uuid),
  slot_id uuid references public.slots(uuid),
  title text,
  total_classes integer default 1,
  remaining_classes integer default 1,
  start_date date,
  end_date date,
  price numeric(10, 2),
  currency text default 'KZT',
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Payments
create table if not exists public.payments (
  uuid uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  studio_id uuid references public.studios(uuid),
  booking_id uuid references public.bookings(uuid),
  subscription_id uuid references public.subscriptions(uuid),
  amount numeric(10, 2) not null,
  currency text default 'KZT',
  method text,
  description text,
  status text default 'paid',
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

-- Policies: users can view own records
drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
  on public.subscriptions
  for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
  on public.payments
  for select
  using ( auth.uid() = user_id );

-- Policies: studio owners can view records for their studios
drop policy if exists "Owners can view studio subscriptions" on public.subscriptions;
create policy "Owners can view studio subscriptions"
  on public.subscriptions
  for select
  using (
    exists (
      select 1
      from public.studios
      where studios.uuid = subscriptions.studio_id
        and studios.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can view studio payments" on public.payments;
create policy "Owners can view studio payments"
  on public.payments
  for select
  using (
    exists (
      select 1
      from public.studios
      where studios.uuid = payments.studio_id
        and studios.owner_id = auth.uid()
    )
  );

-- Policies: studio owners can insert/update records for their studios
drop policy if exists "Owners can insert studio subscriptions" on public.subscriptions;
create policy "Owners can insert studio subscriptions"
  on public.subscriptions
  for insert
  with check (
    exists (
      select 1
      from public.studios
      where studios.uuid = subscriptions.studio_id
        and studios.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update studio subscriptions" on public.subscriptions;
create policy "Owners can update studio subscriptions"
  on public.subscriptions
  for update
  using (
    exists (
      select 1
      from public.studios
      where studios.uuid = subscriptions.studio_id
        and studios.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can insert studio payments" on public.payments;
create policy "Owners can insert studio payments"
  on public.payments
  for insert
  with check (
    exists (
      select 1
      from public.studios
      where studios.uuid = payments.studio_id
        and studios.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update studio payments" on public.payments;
create policy "Owners can update studio payments"
  on public.payments
  for update
  using (
    exists (
      select 1
      from public.studios
      where studios.uuid = payments.studio_id
        and studios.owner_id = auth.uid()
    )
  );
