-- Policy for tenant_staff to manage notifications
drop policy if exists "Staff can manage notifications for their studios" on public.notifications;
create policy "Staff can manage notifications for their studios" on public.notifications for all
  using (
    exists (
      select 1 from public.tenant_staff
      where user_id = auth.uid() and studio_id = notifications.studio_id
    )
  );

-- Policy for users (students, staff, owners) to view notifications
drop policy if exists "Users can view notifications for their studios" on public.notifications;
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
