-- Fix infinite recursion in RLS policies by using a security definer function

-- 1. Create a helper function to check participation without triggering RLS loop
-- 'security definer' allows this function to run with the privileges of the creator
-- bypassing the RLS on conversation_participants table for this specific check.
create or replace function public.is_conversation_participant(c_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from conversation_participants
    where conversation_id = c_id
    and user_id = auth.uid()
  );
$$;

-- 2. Drop existing problematic policies
drop policy if exists "Users can view their conversations" on conversations;
drop policy if exists "Users can view participants of their conversations" on conversation_participants;
drop policy if exists "Users can view messages in their conversations" on messages;
drop policy if exists "Users can insert messages in their conversations" on messages;

-- 3. Re-create policies using the helper function

-- Conversations: View if you are a participant
create policy "Users can view their conversations"
  on conversations for select
  using ( public.is_conversation_participant(id) );

-- Participants: View if you are a participant in that conversation
-- This allows seeing BOTH your own row AND other participants' rows in shared chats
create policy "Users can view participants of their conversations"
  on conversation_participants for select
  using ( public.is_conversation_participant(conversation_id) );

-- Messages: View if you are a participant in the conversation
create policy "Users can view messages in their conversations"
  on messages for select
  using ( public.is_conversation_participant(conversation_id) );

-- Messages: Insert if you are a participant (and sender is you)
create policy "Users can insert messages in their conversations"
  on messages for insert
  with check (
    auth.uid() = sender_id and
    public.is_conversation_participant(conversation_id)
  );
