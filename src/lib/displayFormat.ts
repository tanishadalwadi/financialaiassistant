import type { ProfileRow } from '../contexts/ProfileContext';

type AuthUserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null;

/** Normalizes float noise then formats (max 2 fraction digits). Use for any raw numeric UI. */
export function formatNumberDisplay(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const rounded = parseFloat(x.toPrecision(12));
  return parseFloat(rounded.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatCurrency(n: number, decimals = 0): string {
  const x = Number(n);
  if (!Number.isFinite(x)) {
    return (0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals });
  }
  const d = Math.min(2, Math.max(0, decimals));
  const factor = 10 ** d;
  const rounded = Math.round(x * factor) / factor;
  return parseFloat(rounded.toFixed(d)).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: d,
    minimumFractionDigits: d === 0 ? 0 : d,
  });
}

export function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}

function firstNameToken(full: string): string {
  const t = full.trim();
  if (!t) return '';
  return t.split(/\s+/)[0] ?? '';
}

function looksLikeEmailUsername(local: string): boolean {
  const s = local.toLowerCase();
  if (s.length <= 2) return true;
  if (s.includes('.')) return false;
  if (/^\d+$/.test(s)) return true;
  if (s.length > 14 && /\d/.test(s)) return true;
  if (/^[a-z0-9._-]+$/i.test(s) && /\d{2,}/.test(s) && s.length > 8) return true;
  return false;
}

function nameFromEmailLocal(local: string): string {
  const lower = local.toLowerCase();
  if (lower.includes('.')) {
    const seg = lower.split('.')[0] ?? '';
    if (seg.length >= 2 && /^[a-z]+$/i.test(seg)) {
      return seg.charAt(0).toUpperCase() + seg.slice(1);
    }
  }
  if (looksLikeEmailUsername(lower)) return '';
  if (lower.length >= 2 && /^[a-z]+$/i.test(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return '';
}

/**
 * Prefer profile display name (full name), then auth metadata full_name,
 * then a real first name from email (e.g. jane.doe@), never a raw username-like local part.
 */
export function getDisplayName(profile: ProfileRow | null, user: AuthUserLike): string {
  const profileFull = profile?.display_name?.trim() ?? '';
  const fromProfile = firstNameToken(profileFull);
  if (fromProfile && !looksLikeEmailUsername(fromProfile.toLowerCase())) return fromProfile;

  const meta = user?.user_metadata?.full_name;
  const metaFull = typeof meta === 'string' ? meta.trim() : '';
  const fromMeta = firstNameToken(metaFull);
  if (fromMeta) return fromMeta;

  const email = user?.email ?? '';
  const local = email.split('@')[0] ?? '';
  const fromEmail = nameFromEmailLocal(local);
  if (fromEmail) return fromEmail;

  return 'there';
}
