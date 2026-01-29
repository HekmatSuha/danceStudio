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
drop policy if exists "Users can update messages in their conversations" on messages;

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

-- Messages: Update read status if you are a participant
create policy "Users can update messages in their conversations"
  on messages for update
  using ( public.is_conversation_participant(conversation_id) )
  with check ( public.is_conversation_participant(conversation_id) );

-- Conversations: Allow authenticated users to create new conversations
drop policy if exists "Users can create conversations" on conversations;
create policy "Users can create conversations"
  on conversations for insert
  to authenticated
  with check (auth.uid() is not null);

-- Participants: Allow creators to add themselves and then others
drop policy if exists "Users can add conversation participants" on conversation_participants;
create policy "Users can add conversation participants"
  on conversation_participants for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or public.is_conversation_participant(conversation_id)
  );

-- Ensure authenticated role can insert into chat tables (RLS still applies)
grant insert on conversations to authenticated;
grant insert on conversation_participants to authenticated;
grant insert on messages to authenticated;

-- Helper RPC to create a conversation with the current user + target user
-- Runs with elevated privileges but enforces authenticated access explicitly
create or replace function public.create_conversation_with_participants(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into conversations default values
  returning id into new_conversation_id;

  insert into conversation_participants (conversation_id, user_id)
  values (new_conversation_id, auth.uid());

  if target_user_id is not null and target_user_id <> auth.uid() then
    insert into conversation_participants (conversation_id, user_id)
    values (new_conversation_id, target_user_id);
  end if;

  return new_conversation_id;
end;
$$;

grant execute on function public.create_conversation_with_participants(uuid) to authenticated;
