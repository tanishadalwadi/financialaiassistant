/**
 * KovaVoiceAssistant
 *
 * Premium, dark, full-screen modal that runs Kova's voice action pipeline:
 *   Listen -> Transcribe -> Parse -> Confirm -> Execute -> Feedback.
 *
 * Uses the same animated `VoiceAssistant` blob as Coach voice mode so the
 * Kova character is consistent anywhere the header mic opens this modal.
 */
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppButton } from './ui/AppButton';
import { VoiceAssistant, type VoiceAssistantState } from './VoiceAssistant';
import { colors } from '../theme/colors';
import { tokens } from '../theme/tokens';
import { typography } from '../theme/typography';
import { parseVoiceCommand } from '../lib/voice/parseVoiceCommand';
import { executeVoiceAction } from '../lib/voice/executeVoiceAction';
import { useCoachVoiceCapture, type CoachVoiceUnsupportedReason } from '../lib/voice/useCoachVoiceCapture';
import type {
  ParsedVoiceCommand,
  VoiceActionContext,
  VoiceActionResult,
  VoiceModalState,
} from '../lib/voice/types';

export interface KovaVoiceAssistantProps {
  visible: boolean;
  onClose: () => void;
  /** Context for executing actions. Returned by the parent provider. */
  actionContext: VoiceActionContext | null;
}

export const KovaVoiceAssistant: React.FC<KovaVoiceAssistantProps> = ({
  visible,
  onClose,
  actionContext,
}) => {
  const voice = useCoachVoiceCapture();
  const [uiState, setUiState] = React.useState<VoiceModalState>('idle');
  const [typedText, setTypedText] = React.useState('');
  const [parsed, setParsed] = React.useState<ParsedVoiceCommand | null>(null);
  const [result, setResult] = React.useState<VoiceActionResult | null>(null);
  const [submittedTranscript, setSubmittedTranscript] = React.useState('');
  const typedInputRef = React.useRef<TextInput | null>(null);
  const prevListeningRef = React.useRef(false);

  React.useEffect(() => {
    if (!visible) return;
    if (!voice.isSupported && uiState === 'idle') {
      const t = setTimeout(() => typedInputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, voice.isSupported, uiState]);

  // Only depend on `visible` + stable `reset` — the full `voice` object changes
  // whenever transcript updates; that would re-run this effect on every partial
  // result and abort an active session (e.g. Coach voice mode uses the same native module).
  React.useEffect(() => {
    if (!visible) {
      setUiState('idle');
      setTypedText('');
      setParsed(null);
      setResult(null);
      setSubmittedTranscript('');
      voice.reset();
    }
  }, [visible, voice.reset]);

  React.useEffect(() => {
    if (!visible) return;
    if (uiState === 'listening' && voice.error) {
      setUiState('error');
      setResult({
        status: 'error',
        intent: 'unknown',
        message:
          voice.error === 'not-allowed'
            ? 'Mic permission is blocked. Enable it in settings and try again.'
            : voice.error === 'no-speech'
              ? 'I didn\u2019t catch any audio. Try again.'
              : `Speech error: ${voice.error}`,
      });
    }
  }, [voice.error, uiState, visible]);

  const beginListening = React.useCallback(async () => {
    setResult(null);
    setParsed(null);
    setSubmittedTranscript('');
    setUiState('listening');
    triggerHaptic('selection');
    try {
      await voice.start();
    } catch {
      setUiState('idle');
    }
  }, [voice]);

  const processTranscript = React.useCallback(
    async (transcript: string) => {
      setSubmittedTranscript(transcript);
      setUiState('processing');
      const command = parseVoiceCommand(transcript);
      setParsed(command);

      if (command.intent === 'unknown' || command.clarificationPrompt) {
        triggerHaptic('warning');
        setResult({
          status: 'clarification_needed',
          intent: command.intent,
          message:
            command.clarificationPrompt ??
            'I didn\u2019t catch that. Try "Add $20 to my SF Trip goal."',
        });
        setUiState('clarification_needed');
        return;
      }

      if (command.requiresConfirmation) {
        triggerHaptic('selection');
        setUiState('confirmation_required');
        return;
      }

      if (!actionContext) {
        setResult({
          status: 'error',
          intent: command.intent,
          message: 'Voice actions aren\u2019t ready yet. Please try again in a moment.',
        });
        setUiState('error');
        return;
      }
      const res = await executeVoiceAction(command, actionContext);
      setResult(res);
      setUiState(mapResultToState(res));
      hapticForResult(res);
    },
    [actionContext],
  );

  const handleBlobPress = React.useCallback(() => {
    if (uiState === 'listening') {
      voice.stop();
      return;
    }
    if (uiState === 'idle' || uiState === 'clarification_needed' || uiState === 'error') {
      if (!voice.isSupported) return;
      void beginListening();
    }
  }, [uiState, voice, beginListening]);

  React.useEffect(() => {
    if (uiState !== 'listening') {
      prevListeningRef.current = voice.isListening;
      return;
    }
    if (prevListeningRef.current && !voice.isListening) {
      const transcript = voice.transcript.trim();
      if (!transcript) {
        setUiState('clarification_needed');
        setResult({
          status: 'clarification_needed',
          intent: 'unknown',
          message: 'I didn\u2019t catch any audio. Try again or type your command.',
        });
      } else {
        void processTranscript(transcript);
      }
    }
    prevListeningRef.current = voice.isListening;
  }, [voice.isListening, voice.transcript, uiState, processTranscript]);

  const handleConfirm = React.useCallback(async () => {
    if (!parsed || !actionContext) return;
    setUiState('processing');
    const res = await executeVoiceAction(parsed, actionContext);
    setResult(res);
    setUiState(mapResultToState(res));
    hapticForResult(res);
  }, [parsed, actionContext]);

  const handleSubmitTyped = React.useCallback(() => {
    const txt = typedText.trim();
    if (!txt) return;
    void processTranscript(txt);
  }, [typedText, processTranscript]);

  const handleTryAgain = React.useCallback(() => {
    setUiState('idle');
    setParsed(null);
    setResult(null);
    setSubmittedTranscript('');
    setTypedText('');
    voice.reset();
  }, [voice]);

  const displayTranscript = uiState === 'listening' ? voice.transcript : submittedTranscript;

  const blobProps = React.useMemo((): {
    state: VoiceAssistantState;
    labelOverride?: string;
    sublabelOverride?: string;
    responseText?: string;
  } => {
    const unsupportedSub = unsupportedVoiceSubtitle(voice.unsupportedReason);
    if (!voice.isSupported) {
      return {
        state: 'idle',
        labelOverride: 'Ask Kova',
        sublabelOverride: unsupportedSub ?? 'Type a command below',
      };
    }
    switch (uiState) {
      case 'listening':
        return { state: 'listening' };
      case 'processing':
        return {
          state: 'thinking',
          labelOverride: 'Working on it...',
          sublabelOverride: 'Parsing what you said',
        };
      case 'confirmation_required':
        return {
          state: 'thinking',
          labelOverride: 'Confirm',
          sublabelOverride: parsed?.confirmationPrompt ?? 'Review the buttons below.',
        };
      case 'success':
        return {
          state: 'speaking',
          responseText: result?.message ?? '',
        };
      case 'error':
        return {
          state: 'idle',
          labelOverride: 'Something went wrong',
          sublabelOverride: '',
        };
      case 'clarification_needed':
        return {
          state: 'thinking',
          labelOverride: 'One more thing',
          sublabelOverride: result?.message ?? '',
        };
      case 'idle':
      default:
        return {
          state: 'idle',
          labelOverride: undefined,
          sublabelOverride: 'Tap the blob or mic, or type a command below',
        };
    }
  }, [uiState, voice.isSupported, voice.unsupportedReason, parsed, result]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['rgba(8,10,22,0.94)', 'rgba(18,12,40,0.94)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <Pressable
          style={styles.dismissCatcher}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close voice assistant"
        />

        <View style={styles.card} pointerEvents="box-none">
          <View style={styles.cardInner} pointerEvents="auto">
            <View style={styles.closeRow}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={12}
              >
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.78)" />
              </Pressable>
            </View>

            <View style={styles.voiceStage}>
              <VoiceAssistant
                state={blobProps.state}
                onPress={handleBlobPress}
                responseText={blobProps.responseText}
                labelOverride={blobProps.labelOverride}
                sublabelOverride={blobProps.sublabelOverride}
              />
            </View>

            {displayTranscript ? (
              <View style={styles.transcriptCard}>
                <Text style={styles.transcriptLabel}>You said</Text>
                <Text style={styles.transcriptText}>{displayTranscript}</Text>
              </View>
            ) : null}

            {uiState === 'confirmation_required' && parsed?.confirmationPrompt ? (
              <View style={styles.confirmCard}>
                <View style={styles.actionRow}>
                  <AppButton label="Cancel" variant="ghost" onPress={handleTryAgain} flex />
                  <AppButton
                    label="Confirm"
                    variant="primary"
                    onPress={() => {
                      void handleConfirm();
                    }}
                    flex
                  />
                </View>
              </View>
            ) : null}

            {uiState === 'error' && result ? (
              <View style={[styles.resultCard, styles.resultCardError]}>
                <View style={styles.resultIconRow}>
                  <Ionicons name="alert-circle" size={20} color={colors.danger} />
                  <Text style={styles.resultLabel}>Couldn\u2019t do that</Text>
                </View>
                <Text style={styles.resultText}>{result.message}</Text>
              </View>
            ) : null}

            <View style={styles.controls}>
              {uiState === 'idle' || uiState === 'clarification_needed' || uiState === 'error' ? (
                <>
                  {voice.isSupported ? (
                    <AppButton
                      label={uiState === 'idle' ? 'Start listening' : 'Try voice again'}
                      onPress={() => {
                        void beginListening();
                      }}
                      variant="primary"
                      fullWidth
                      size="lg"
                    />
                  ) : null}
                  {!voice.isSupported && Platform.OS === 'web' ? (
                    <Pressable
                      onPress={() => {
                        void voice.requestMicPermission();
                      }}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.ghostRow, pressed && { opacity: 0.7 }]}
                    >
                      <Ionicons name="mic-outline" size={16} color="rgba(255,255,255,0.78)" />
                      <Text style={styles.ghostRowLabel}>Check mic permission</Text>
                    </Pressable>
                  ) : null}
                  <View style={styles.typedRow}>
                    <TextInput
                      ref={typedInputRef}
                      placeholder={
                        voice.isSupported
                          ? 'Or type a command\u2026'
                          : 'Type a command (e.g. "Add $20 to my SF Trip goal")'
                      }
                      placeholderTextColor="rgba(255,255,255,0.42)"
                      value={typedText}
                      onChangeText={setTypedText}
                      style={styles.typedInput}
                      onSubmitEditing={handleSubmitTyped}
                      returnKeyType="send"
                      blurOnSubmit={false}
                      autoFocus={!voice.isSupported}
                    />
                    <Pressable
                      style={({ pressed }) => [
                        styles.typedSend,
                        (!typedText.trim() || pressed) && { opacity: 0.6 },
                      ]}
                      onPress={handleSubmitTyped}
                      disabled={!typedText.trim()}
                      accessibilityRole="button"
                      accessibilityLabel="Submit command"
                    >
                      <Ionicons name="arrow-up" size={18} color="#fff" />
                    </Pressable>
                  </View>
                </>
              ) : null}

              {uiState === 'success' ? (
                <View style={styles.actionRow}>
                  <AppButton label="Done" variant="primary" flex onPress={onClose} />
                  <AppButton label="New command" variant="ghost" flex onPress={handleTryAgain} />
                </View>
              ) : null}
            </View>

            <Text style={styles.exampleHint}>
              Try: "Add $20 to my SF Trip goal", "Set dining cap to $150",
              "Why did I overspend this month?"
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function unsupportedVoiceSubtitle(reason: CoachVoiceUnsupportedReason): string | null {
  if (Platform.OS !== 'web') {
    return 'Voice capture needs a dev build with native speech on this device. Type your command instead.';
  }
  switch (reason) {
    case 'insecure-origin':
      return 'Live mic needs HTTPS or localhost. Open the app at http://localhost or type a command below.';
    case 'no-api':
      return 'Live mic isn\u2019t supported in this browser. Try Chrome, Edge, or Safari — or type a command below.';
    case 'not-configured':
      return 'Speech recognition isn\u2019t available. Type your command below.';
    case 'native':
    default:
      return 'Live mic isn\u2019t available right now. Type your command below.';
  }
}

function mapResultToState(res: VoiceActionResult): VoiceModalState {
  if (res.status === 'ok') return 'success';
  if (res.status === 'clarification_needed') return 'clarification_needed';
  return 'error';
}

function hapticForResult(res: VoiceActionResult) {
  if (res.status === 'ok') triggerHaptic('success');
  else if (res.status === 'error') triggerHaptic('error');
  else triggerHaptic('warning');
}

function triggerHaptic(kind: 'selection' | 'success' | 'error' | 'warning') {
  try {
    if (Platform.OS === 'web') return;
    if (kind === 'selection') {
      void Haptics.selectionAsync();
    } else if (kind === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (kind === 'error') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  } catch {
    // ignore
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dismissCatcher: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
  },
  cardInner: {
    backgroundColor: '#0F1024',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  voiceStage: {
    alignItems: 'center',
    marginTop: -4,
    marginBottom: tokens.spacing.xs,
  },
  transcriptCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  transcriptLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.48)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  transcriptText: {
    ...typography.body,
    color: '#FFFFFF',
  },
  confirmCard: {
    backgroundColor: 'rgba(118, 95, 255, 0.12)',
    borderColor: 'rgba(154, 130, 255, 0.32)',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: tokens.spacing.sm,
  },
  resultCard: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: tokens.spacing.sm,
  },
  resultCardError: {
    backgroundColor: 'rgba(232, 92, 88, 0.12)',
    borderColor: 'rgba(232, 92, 88, 0.32)',
  },
  resultIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resultLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  resultText: {
    ...typography.body,
    color: '#FFFFFF',
  },
  controls: {
    marginTop: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  typedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  typedInput: {
    flex: 1,
    color: '#FFFFFF',
    ...typography.body,
    paddingVertical: 8,
  },
  typedSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  exampleHint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.42)',
    marginTop: tokens.spacing.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  ghostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  ghostRowLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.78)',
  },
});
