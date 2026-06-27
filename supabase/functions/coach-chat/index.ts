import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are Kova, the in-app coach for a personal finance app (goals, spending, income in Supabase). Replies appear in a small bubble and may be read aloud—**brevity is required**.

Length (hard):
- **45–60 words** for almost every answer. Only if they clearly ask for "more detail", "longer", or "explain step by step": up to **85 words**—never more.
- **At most 2 short sentences**, OR **at most 2 lines** each starting with "• "—never dense paragraphs plus bullets.
- Optional: **one** brief empathy clause (e.g. "That can feel tight.") then **one** practical suggestion—do not stack multiple empathy lines.

Calm voice:
- Steady, kind, never shaming. Plain words; "you could" beats "you should". **One** clear next step only.
- No guilt about spending. Hopeful when money is tight.

Format:
- Plain text only. No markdown (#, **, tables). Put a blank line **only** between two bullets if you use bullets.

Context:
- Hi / thanks / tiny chat: **one** warm sentence + **one** short question—**no** numbers from the JSON unless they asked how they're doing or for figures.
- Substantive questions: use the JSON snapshot; cite **at most one dollar amount** unless they asked for a breakdown.

Guardrails: No medical or legal advice. No stock/crypto buy/sell picks. USD.`;

type GeminiPart = { text: string };
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

type MsgRow = { role: string; content: string };

/** Gemini requires alternating user/model; merge consecutive same-role rows. */
function buildGeminiContents(rows: MsgRow[] | null): GeminiContent[] {
  const mapped: GeminiContent[] = [];
  for (const r of rows ?? []) {
    const text = String(r.content ?? '').trim();
    if (!text) continue;
    const role: 'user' | 'model' = r.role === 'assistant' ? 'model' : 'user';
    mapped.push({ role, parts: [{ text }] });
  }
  const merged: GeminiContent[] = [];
  for (const item of mapped) {
    const last = merged[merged.length - 1];
    if (last && last.role === item.role) {
      last.parts[0].text += '\n\n' + item.parts[0].text;
    } else {
      merged.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
    }
  }
  while (merged.length > 0 && merged[0].role === 'model') {
    merged.shift();
  }
  if (merged.length === 0) {
    merged.push({ role: 'user', parts: [{ text: 'Help me with my finances.' }] });
  }
  return merged;
}

function summarizeGeminiError(status: number, errText: string): { llm_status: number; llm_message: string } {
  try {
    const j = JSON.parse(errText) as { error?: { message?: string } };
    const msg = j?.error?.message ?? errText;
    return { llm_status: status, llm_message: String(msg).slice(0, 500) };
  } catch {
    return { llm_status: status, llm_message: errText.slice(0, 500) };
  }
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Map env model id to a name that exists on generativelanguage.googleapis.com v1beta today.
 * Many 1.5 / *-latest strings return 404 for generateContent; prefer stable 2.5 ids.
 */
function resolveGeminiModel(envId: string | undefined): string {
  const raw = (envId ?? DEFAULT_GEMINI_MODEL).trim();
  if (raw === 'gemini-flash-latest') return DEFAULT_GEMINI_MODEL;
  if (raw.startsWith('gemini-1.5-flash')) return DEFAULT_GEMINI_MODEL;
  if (raw.startsWith('gemini-1.5-pro')) return 'gemini-2.5-pro';
  const aliases: Record<string, string> = {
    'gemini-1.5-flash-latest': DEFAULT_GEMINI_MODEL,
    'gemini-1.5-pro-latest': 'gemini-2.5-pro',
    'gemini-1.5-flash': DEFAULT_GEMINI_MODEL,
    'gemini-1.5-pro': 'gemini-2.5-pro',
    'gemini-2.0-flash': DEFAULT_GEMINI_MODEL,
    'gemini-2.0-flash-lite': 'gemini-2.5-flash-lite',
  };
  return aliases[raw] ?? raw;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured', reply: null }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'LLM not configured', code: 'NO_GEMINI', reply: null }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { conversation_id?: string; context?: Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const conversationId = body.conversation_id;
  if (!conversationId || typeof conversationId !== 'string') {
    return new Response(JSON.stringify({ error: 'conversation_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (convErr || !conv) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: rows, error: msgErr } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(24);

  if (msgErr) {
    return new Response(JSON.stringify({ error: msgErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const contents = buildGeminiContents(rows ?? []);

  const contextBlock =
    body.context && typeof body.context === 'object'
      ? `\n\nUser financial snapshot (JSON):\n${JSON.stringify(body.context)}`
      : '';

  const model = resolveGeminiModel(Deno.env.get('GEMINI_MODEL'));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT + contextBlock }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.52,
      },
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error('Gemini error', geminiRes.status, errText);
    const hint = summarizeGeminiError(geminiRes.status, errText);
    return new Response(
      JSON.stringify({
        error: 'LLM request failed',
        reply: null,
        llm_status: hint.llm_status,
        llm_message: hint.llm_message,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const geminiJson = (await geminiRes.json()) as {
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
    promptFeedback?: { blockReason?: string };
  };
  const candidate = geminiJson.candidates?.[0];
  const reply =
    candidate?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? '';

  if (!reply) {
    const fr = candidate?.finishReason ?? 'unknown';
    const block = geminiJson.promptFeedback?.blockReason;
    return new Response(
      JSON.stringify({
        error: 'Empty model response',
        reply: null,
        finish_reason: fr,
        block_reason: block ?? null,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(JSON.stringify({ reply }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
