import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import type { AIMessage } from '../types/models';
import { condenseCoachReply } from '../lib/condenseCoachReply';

type MsgRow = Database['public']['Tables']['ai_messages']['Row'];

function mapMessage(row: MsgRow): AIMessage {
  return {
    id: row.id,
    role: row.role as AIMessage['role'],
    content: row.content,
    createdAt: row.created_at,
  };
}

export type CoachThreadLLMOptions = {
  buildLLMContext: () => Record<string, unknown>;
  fallbackReply: (userText: string) => string;
};

export function useCoachThread(userId: string | null, llmOptions: CoachThreadLLMOptions) {
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<AIMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  const llmRef = React.useRef(llmOptions);
  llmRef.current = llmOptions;

  const loadThread = React.useCallback(async () => {
    if (!userId) {
      setConversationId(null);
      setMessages([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: existing, error: convErr } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convErr) {
      setError(convErr.message);
      setLoading(false);
      return;
    }

    let cid = existing?.id as string | undefined;
    if (!cid) {
      const { data: created, error: insErr } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title: 'AI Coach' })
        .select('id')
        .single();
      if (insErr || !created) {
        setError(insErr?.message ?? 'Could not start conversation');
        setLoading(false);
        return;
      }
      cid = created.id;
    }

    setConversationId(cid);

    const { data: rows, error: msgErr } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', cid)
      .order('created_at', { ascending: true });

    if (msgErr) {
      setError(msgErr.message);
      setMessages([]);
      setLoading(false);
      return;
    }

    setMessages(((rows ?? []) as MsgRow[]).map(mapMessage));
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      void loadThread();
    }, [loadThread]),
  );

  const sendMessage = React.useCallback(
    async (text: string): Promise<{ assistantText: string | null; error: string | null }> => {
      const trimmed = text.trim();
      if (!trimmed || !userId) return { assistantText: null, error: 'Not signed in' };

      setSending(true);
      setError(null);
      const opt = llmRef.current;

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let cid = existing?.id as string | undefined;
      if (!cid) {
        const { data: created, error: insErr } = await supabase
          .from('conversations')
          .insert({ user_id: userId, title: 'AI Coach' })
          .select('id')
          .single();
        if (insErr || !created) {
          const msg = insErr?.message ?? 'Could not start conversation';
          setError(msg);
          setSending(false);
          return { assistantText: null, error: msg };
        }
        cid = created.id;
        setConversationId(cid);
      }

      const { error: userMsgErr } = await supabase.from('ai_messages').insert({
        conversation_id: cid,
        role: 'user',
        content: trimmed,
      });

      if (userMsgErr) {
        setError(userMsgErr.message);
        setSending(false);
        return { assistantText: null, error: userMsgErr.message };
      }

      let assistantText = opt.fallbackReply(trimmed);
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session) {
        const coachBody = {
          conversation_id: cid,
          context: opt.buildLLMContext(),
        };
        // Let fetchWithAuth attach JWT from getSession(); do not pass React-cached access_token.
        const { data, error: fnErr } = await supabase.functions.invoke<{ reply?: string }>('coach-chat', {
          body: coachBody,
        });
        if (!fnErr && data?.reply && typeof data.reply === 'string' && data.reply.trim().length > 0) {
          assistantText = data.reply.trim();
        }
      }

      // Safety net: keep replies short + calm even if the model over-explains
      // or the edge function still has an older, wordier prompt.
      const longRequested = /\b(more detail|longer|explain|step by step|in depth|break\s*down)\b/i.test(trimmed);
      assistantText = condenseCoachReply(assistantText, longRequested ? { maxSentences: 5, maxChars: 620 } : {});

      const { error: asstErr } = await supabase.from('ai_messages').insert({
        conversation_id: cid,
        role: 'assistant',
        content: assistantText,
      });

      if (asstErr) {
        setError(asstErr.message);
        setSending(false);
        return { assistantText: null, error: asstErr.message };
      }

      const { data: rows, error: reloadErr } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', cid)
        .order('created_at', { ascending: true });

      if (reloadErr) {
        setError(reloadErr.message);
      } else {
        setMessages(((rows ?? []) as MsgRow[]).map(mapMessage));
      }
      setSending(false);
      return { assistantText, error: null };
    },
    [userId],
  );

  return {
    conversationId,
    messages,
    loading,
    error,
    sending,
    sendMessage,
    reload: loadThread,
  };
}
