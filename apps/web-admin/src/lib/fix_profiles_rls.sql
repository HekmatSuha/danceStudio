-- Allow all authenticated users to read profiles (needed for owner to see students)
-- Adjust this if you need stricter privacy (e.g., only see students linked to your studio)

create policy "Enable read access for all users"
on "public"."profiles"
as PERMISSIVE
for SELECT
to authenticated
using (true);
