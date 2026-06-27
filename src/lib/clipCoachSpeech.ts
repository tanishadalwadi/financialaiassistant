/**
 * Shorten assistant copy for TTS only — keeps chat bubbles full length from the model.
 * Targets a calm, listenable clip if older messages were long.
 */
const DEFAULT_MAX = 520;

export function clipTextForCoachSpeech(text: string, maxChars = DEFAULT_MAX): string {
  const t = text.replace(/\r\n/g, '\n').trim();
  if (t.length <= maxChars) return t;
  const slice = t.slice(0, maxChars);
  const punct = ['.', '!', '?'].map((c) => slice.lastIndexOf(c));
  const lastP = Math.max(...punct);
  if (lastP >= Math.floor(maxChars * 0.45)) {
    return slice.slice(0, lastP + 1).trim();
  }
  const para = slice.lastIndexOf('\n\n');
  if (para >= 72) return slice.slice(0, para).trim() + '\u2026';
  const sp = slice.lastIndexOf(' ');
  if (sp >= 48) return slice.slice(0, sp).trim() + '\u2026';
  return slice.trim() + '\u2026';
}
