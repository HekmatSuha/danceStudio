-- Create Advertisements Table
create table if not exists public.advertisements (
  id uuid default gen_random_uuid() primary key,
  studio_id uuid references public.studios(uuid) on delete cascade not null,
  title text not null,
  description text,
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default now() not null
);

-- Create Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  studio_id uuid references public.studios(uuid) on delete cascade not null,
  title text not null,
  body text not null,
  target_audience text default 'all', -- 'all', 'active', 'instructors'
  created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.advertisements enable row level security;
alter table public.notifications enable row level security;

-- Policies for Advertisements

-- Owners can manage their ads
create policy "Owners can manage their advertisements" on public.advertisements for all
  using ( exists (select 1 from public.studios where uuid = advertisements.studio_id and owner_id = auth.uid()) );

-- Public read for active ads (or authenticated users)
create policy "Everyone can view active advertisements" on public.advertisements for select
  using ( is_active = true );

-- Policies for Notifications

-- Owners can manage their notifications
create policy "Owners can manage their notifications" on public.notifications for all
  using ( exists (select 1 from public.studios where uuid = notifications.studio_id and owner_id = auth.uid()) );

-- Students/Instructors can view notifications for their studio
-- This is a bit complex as we need to link student -> studio.
-- For now, let's allow authenticated users to view notifications if they have a relationship with the studio.
-- But since we don't have a direct 'student_studios' RLS helper easily available here without recursion risk,
-- we'll assume for now that if you are authenticated you can read notifications,
-- or we can restrict it to users who have a booking or are staff.

-- Simpler approach: Allow read if you are linked to the studio via student_studios or tenant_staff
create policy "Users can view notifications for their studios" on public.notifications for select
  using (
    exists (
      select 1 from public.student_studios
      where student_id = auth.uid() and studio_id = notifications.studio_id
    )
    or
    exists (
      select 1 from public.tenant_staff
      where user_id = auth.uid() and studio_id = notifications.studio_id
    )
    or
    exists (
      select 1 from public.studios
      where uuid = notifications.studio_id and owner_id = auth.uid()
    )
  );
