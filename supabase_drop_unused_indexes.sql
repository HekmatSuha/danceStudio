-- Drop indexes flagged as unused by the Supabase performance advisor.
-- Use CONCURRENTLY to avoid blocking writes. Run each statement separately (not inside a transaction).
-- Consider validating usage with pg_stat_user_indexes before dropping in production.

drop index concurrently if exists public.idx_messages_created_at;
drop index concurrently if exists public.idx_messages_sender_id;
drop index concurrently if exists public.idx_reviews_booking_id;
drop index concurrently if exists public.idx_reviews_user_id;
drop index concurrently if exists public.idx_room_rentals_renter_id;
drop index concurrently if exists public.idx_rooms_studio_id;
drop index concurrently if exists public.idx_slots_dance_style_id;
drop index concurrently if exists public.idx_slots_room_id;
drop index concurrently if exists public.idx_student_studios_student_id;
drop index concurrently if exists public.idx_bookings_user_id;
drop index concurrently if exists public.idx_finance_entries_booking_id;
drop index concurrently if exists public.idx_finance_entries_student_id;
drop index concurrently if exists public.idx_finance_entries_studio_id;
drop index concurrently if exists public.idx_payments_booking_id;
drop index concurrently if exists public.idx_payments_studio_id;
drop index concurrently if exists public.idx_payments_subscription_id;
drop index concurrently if exists public.idx_payments_user_id;
drop index concurrently if exists public.idx_studios_owner_id;
drop index concurrently if exists public.idx_subscriptions_slot_id;
drop index concurrently if exists public.idx_subscriptions_studio_id;
drop index concurrently if exists public.idx_subscriptions_user_id;
drop index concurrently if exists public.idx_tenant_staff_user_id;
