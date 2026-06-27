/**
 * Coach voice capture: unified mic + transcript via expo-speech-recognition
 * (WebSpeech on web, SFSpeechRecognizer / Android SpeechRecognizer on native).
 *
 * Before starting on native, configures the shared audio session with expo-av
 * so recording / recognition routes cleanly with other app audio.
 *
 * On iOS/Android, optional `recordingOptions.persist` keeps a local audio file
 * of the utterance while recognition runs (see expo-speech-recognition docs).
 */
import React from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import {
  ExpoSpeechRecognitionModule,
  TaskHintIOS,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

export type CoachVoiceUnsupportedReason =
  | null
  | 'native'
  | 'no-api'
  | 'insecure-origin'
  | 'not-configured';

export interface UseCoachVoiceCaptureResult {
  isSupported: boolean;
  unsupportedReason: CoachVoiceUnsupportedReason;
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  requestMicPermission: () => Promise<boolean>;
}

export function useCoachVoiceCapture(): UseCoachVoiceCaptureResult {
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const transcriptRef = React.useRef('');
  const unsupportedReason = React.useMemo<CoachVoiceUnsupportedReason>(() => {
    if (typeof ExpoSpeechRecognitionModule.isRecognitionAvailable !== 'function') {
      return 'not-configured';
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      if (Platform.OS !== 'web') return 'no-api';
      if (typeof window !== 'undefined') {
        const w = window as unknown as { isSecureContext?: boolean };
        if (w.isSecureContext === false) return 'insecure-origin';
      }
      return 'no-api';
    }
    return null;
  }, []);

  const isSupported = unsupportedReason == null;

  React.useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const mergeTranscriptsFromEvent = React.useCallback((ev: ExpoSpeechRecognitionResultEvent): string => {
    const parts = ev.results.map((r) => r.transcript?.trim()).filter((x): x is string => Boolean(x));
    if (!parts.length) return '';
    // Prefer the longest hypothesis (full phrase vs a short alternative) when the engine returns multiple rows.
    return parts.reduce((best, cur) => (cur.length >= best.length ? cur : best), '');
  }, []);

  React.useEffect(() => {
    const subs = [
      ExpoSpeechRecognitionModule.addListener(
        'result',
        (ev: ExpoSpeechRecognitionResultEvent) => {
          const t = mergeTranscriptsFromEvent(ev);
          if (t) {
            transcriptRef.current = t;
            setTranscript(t);
          }
        },
      ),
      ExpoSpeechRecognitionModule.addListener(
        'error',
        (ev: ExpoSpeechRecognitionErrorEvent) => {
          setError(ev.message || ev.error);
          setIsListening(false);
        },
      ),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        setIsListening(false);
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
    };
  }, [mergeTranscriptsFromEvent]);

  const requestMicPermission = React.useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      } catch (e) {
        setError((e as Error).message || 'permission-denied');
        return false;
      }
    }
    try {
      const mic = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
      if (!mic.granted) return false;
      const speech = await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
      return Boolean(speech.granted);
    } catch (e) {
      setError((e as Error).message || 'permission-denied');
      return false;
    }
  }, []);

  const start = React.useCallback(async () => {
    if (!isSupported) return;
    setTranscript('');
    transcriptRef.current = '';
    setError(null);

    if (Platform.OS !== 'web') {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch {
        // Non-fatal — speech module will still attempt to configure the session.
      }
      const mic = await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();
      if (!mic.granted) {
        await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
      }
      const speechPerm = await ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync();
      if (!speechPerm.granted) {
        await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
      }
    }

    try {
      setIsListening(true);
      // `continuous: false` ends the session as soon as the engine emits a final
      // segment — often after a single word on iOS 18+ / Android. Keep listening
      // until the user taps stop (see expo-speech-recognition `continuous` docs).
      const androidApi =
        Platform.OS === 'android'
          ? typeof Platform.Version === 'number'
            ? Platform.Version
            : parseInt(String(Platform.Version), 10)
          : 0;
      const continuousSupported =
        Platform.OS === 'web' || Platform.OS === 'ios' || (Platform.OS === 'android' && androidApi >= 33);

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: continuousSupported,
        addsPunctuation: Platform.OS === 'ios',
        iosTaskHint: Platform.OS === 'ios' ? TaskHintIOS.dictation : undefined,
        requiresOnDeviceRecognition: Platform.OS === 'ios',
        recordingOptions:
          Platform.OS === 'web'
            ? undefined
            : {
                persist: true,
              },
      });
    } catch (e) {
      setIsListening(false);
      setError((e as Error).message || 'start-failed');
    }
  }, [isSupported]);

  const stop = React.useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setIsListening(false);
    }
  }, []);

  const reset = React.useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // ignore
    }
    setTranscript('');
    transcriptRef.current = '';
    setError(null);
    setIsListening(false);
  }, []);

  return React.useMemo(
    () => ({
      isSupported,
      unsupportedReason,
      isListening,
      transcript,
      error,
      start,
      stop,
      reset,
      requestMicPermission,
    }),
    [
      isSupported,
      unsupportedReason,
      isListening,
      transcript,
      error,
      start,
      stop,
      reset,
      requestMicPermission,
    ],
  );
}
