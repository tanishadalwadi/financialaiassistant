-- Phase 4: allow users to delete individual coach messages they own (conversation-scoped).
-- Full account deletion uses Edge Function delete-account + auth.admin.deleteUser (cascades).

drop policy if exists "ai_messages_delete_via_conversation" on public.ai_messages;

create policy "ai_messages_delete_via_conversation" on public.ai_messages
  for delete using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
