/**
 * Thin React wrapper around the Web Speech API.
 *
 * On web (Chrome / Edge / Safari) this hook drives live transcription.
 * On Firefox, insecure origins, or native (Expo Go) the API isn't usable,
 * so `isSupported` is false and `unsupportedReason` explains why. The modal
 * falls back to a text-input affordance with the same parser.
 *
 * When we ship a dev build, we can drop in `@react-native-voice/voice` or
 * `expo-speech-recognition` and keep the same surface — no caller changes.
 */
import React from 'react';
import { Platform } from 'react-native';

type WebSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type WebSpeechCtor = new () => WebSpeechRecognition;

export type SpeechUnsupportedReason =
  | null
  | 'native'           // running in React Native (not web)
  | 'no-api'           // browser doesn't expose SpeechRecognition (e.g. Firefox)
  | 'insecure-origin'; // page is not served over HTTPS/localhost

interface SupportProbe {
  ctor: WebSpeechCtor | null;
  reason: SpeechUnsupportedReason;
}

function probeSupport(): SupportProbe {
  if (Platform.OS !== 'web') return { ctor: null, reason: 'native' };
  if (typeof window === 'undefined') return { ctor: null, reason: 'no-api' };
  const w = window as unknown as {
    SpeechRecognition?: WebSpeechCtor;
    webkitSpeechRecognition?: WebSpeechCtor;
    isSecureContext?: boolean;
  };
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  if (!ctor) return { ctor: null, reason: 'no-api' };
  // Most browsers expose the constructor but throw on `.start()` outside a
  // secure context. Treat that as unsupported up-front so we don't crash on
  // first tap.
  if (w.isSecureContext === false) return { ctor: null, reason: 'insecure-origin' };
  return { ctor, reason: null };
}

export interface UseSpeechRecognitionResult {
  /** True only when a usable browser API exists in this runtime. */
  isSupported: boolean;
  /** When `isSupported` is false, explains why so the UI can guide the user. */
  unsupportedReason: SpeechUnsupportedReason;
  isListening: boolean;
  /** Live transcript while listening; finalized transcript after stop. */
  transcript: string;
  /** Most recent error code/message ("not-allowed", "no-speech", etc.). */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
  /**
   * Request mic permission via `getUserMedia`. Many browsers gate
   * SpeechRecognition behind a user-granted mic permission, so this is a
   * useful nudge before the first listen. No-op when the API isn't
   * available.
   */
  requestMicPermission: () => Promise<boolean>;
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const recognitionRef = React.useRef<WebSpeechRecognition | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const probe = React.useMemo(probeSupport, []);
  const isSupported = probe.ctor != null;

  React.useEffect(() => {
    if (__DEV__) {
      // One-time diagnostic — helps users surface why voice may be unavailable.
      // eslint-disable-next-line no-console
      console.log('[Kova Voice] speech support probe', {
        platform: Platform.OS,
        isSupported,
        unsupportedReason: probe.reason,
        isSecureContext:
          typeof window !== 'undefined'
            ? (window as unknown as { isSecureContext?: boolean }).isSecureContext
            : null,
        userAgent:
          typeof navigator !== 'undefined' && 'userAgent' in navigator
            ? (navigator as Navigator).userAgent
            : null,
      });
    }
  }, [isSupported, probe.reason]);

  React.useEffect(() => {
    if (!probe.ctor) return;
    const rec = new probe.ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        const alt = event.results[i][0];
        if (alt && typeof alt.transcript === 'string') text += alt.transcript;
      }
      setTranscript(text.trim());
    };
    rec.onerror = (event) => {
      setError(event.error || 'speech-error');
      setIsListening(false);
    };
    rec.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        // ignore — recognizer may already be detached
      }
      recognitionRef.current = null;
    };
  }, [probe.ctor]);

  const start = React.useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setError(null);
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      setError((err as Error).message);
      setIsListening(false);
    }
  }, []);

  const stop = React.useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore — calling stop while not started throws
    }
    setIsListening(false);
  }, []);

  const reset = React.useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  const requestMicPermission = React.useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web') return false;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the mic immediately — we just wanted the permission grant.
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      setError((err as Error).message || 'permission-denied');
      return false;
    }
  }, []);

  return {
    isSupported,
    unsupportedReason: probe.reason,
    isListening,
    transcript,
    error,
    start,
    stop,
    reset,
    requestMicPermission,
  };
}
