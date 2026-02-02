-- Allow students to link themselves to a studio
alter table public.student_studios enable row level security;

drop policy if exists "Students can insert own studio links" on public.student_studios;
create policy "Students can insert own studio links"
  on public.student_studios
  for insert
  to authenticated
  with check (auth.uid() = student_id);
