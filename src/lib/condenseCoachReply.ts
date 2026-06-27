/**
 * Condense + calm coach replies on the client.
 *
 * The server prompt already asks for short answers, but this is a safety net so
 * chat (and voice) stay brief and friendly even if the model over-explains or the
 * edge function hasn't been redeployed yet. Applied before persisting the message,
 * so both the chat bubble and TTS use the trimmed text.
 */

/** Hard ceilings — keep it scannable in a small bubble. */
const MAX_SENTENCES = 3;
const MAX_CHARS = 360;

function stripMarkdown(input: string): string {
  let s = input.replace(/\r\n/g, '\n');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1$2');
  s = s.replace(/`([^`]+)`/g, '$1');
  // Normalize "* " / "- " bullet markers to a calm dot.
  s = s.replace(/^\s*[-*]\s+/gm, '• ');
  return s;
}

/** Split into sentences while keeping bullet lines intact. */
function takeFirstSentences(text: string, maxSentences: number): string {
  const hasBullets = /(^|\n)•\s/.test(text);
  if (hasBullets) {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.slice(0, maxSentences).join('\n');
  }

  const sentences = text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g);
  if (!sentences) return text.trim();
  return sentences
    .slice(0, maxSentences)
    .map((s) => s.trim())
    .join(' ')
    .trim();
}

function clampChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastStop = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'));
  if (lastStop >= Math.floor(maxChars * 0.5)) {
    return slice.slice(0, lastStop + 1).trim();
  }
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + '\u2026';
}

export function condenseCoachReply(
  raw: string,
  opts: { maxSentences?: number; maxChars?: number } = {},
): string {
  const maxSentences = opts.maxSentences ?? MAX_SENTENCES;
  const maxChars = opts.maxChars ?? MAX_CHARS;

  const cleaned = stripMarkdown(raw).replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return cleaned;

  const trimmed = takeFirstSentences(cleaned, maxSentences);
  return clampChars(trimmed, maxChars);
}
