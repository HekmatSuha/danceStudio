-- Policy for staff or owners to manage notifications
drop policy if exists "Staff or owners can manage notifications" on public.notifications;
drop policy if exists "Owners can manage their notifications" on public.notifications;
drop policy if exists "Staff can manage notifications for their studios" on public.notifications;
create policy "Staff or owners can manage notifications" on public.notifications for insert
  with check (
    exists (
      select 1 from public.studios
      where uuid = notifications.studio_id and owner_id = (select auth.uid())
    )
    or
    exists (
      select 1 from public.tenant_staff
      where user_id = (select auth.uid()) and studio_id = notifications.studio_id
    )
  );
create policy "Staff or owners can manage notifications (update)" on public.notifications for update
  using (
    exists (
      select 1 from public.studios
      where uuid = notifications.studio_id and owner_id = (select auth.uid())
    )
    or
    exists (
      select 1 from public.tenant_staff
      where user_id = (select auth.uid()) and studio_id = notifications.studio_id
    )
  )
  with check (
    exists (
      select 1 from public.studios
      where uuid = notifications.studio_id and owner_id = (select auth.uid())
    )
    or
    exists (
      select 1 from public.tenant_staff
      where user_id = (select auth.uid()) and studio_id = notifications.studio_id
    )
  );
create policy "Staff or owners can manage notifications (delete)" on public.notifications for delete
  using (
    exists (
      select 1 from public.studios
      where uuid = notifications.studio_id and owner_id = (select auth.uid())
    )
    or
    exists (
      select 1 from public.tenant_staff
      where user_id = (select auth.uid()) and studio_id = notifications.studio_id
    )
  );

-- Policy for users (students, staff, owners) to view notifications
drop policy if exists "Users can view notifications for their studios" on public.notifications;
create policy "Users can view notifications for their studios" on public.notifications for select
  using (
    exists (
      select 1 from public.student_studios
      where student_id = (select auth.uid()) and studio_id = notifications.studio_id
    )
    or
    exists (
      select 1 from public.tenant_staff
      where user_id = (select auth.uid()) and studio_id = notifications.studio_id
    )
    or
    exists (
      select 1 from public.studios
      where uuid = notifications.studio_id and owner_id = (select auth.uid())
    )
  );
