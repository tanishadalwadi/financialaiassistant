import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { AIMessageBubble } from '../components/AIMessageBubble';
import { Chip } from '../components/Chip';
import { AIAnswerCard } from '../components/AIAnswerCard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useGoalsTransactions } from '../hooks/useGoalsTransactions';
import { useCoachThread } from '../hooks/useCoachThread';
import { buildCoachAssistantReply } from '../lib/coachReply';
import { buildCoachLLMContextPayload } from '../lib/coachLLMContext';
import type { MainTabParamList } from '../navigation';
import { formatCurrency } from '../lib/displayFormat';
import { monthlyShortfallForGoal, topFlexibleCategory } from '../lib/coachInsightCopy';
import { AppButton } from '../components/ui/AppButton';
import { useVoiceContextRegistrar } from '../lib/voice/useVoiceContextRegistrar';
import { VoiceAssistant, type VoiceAssistantState } from '../components/VoiceAssistant';
import { useCoachVoiceCapture } from '../lib/voice/useCoachVoiceCapture';
import { clipTextForCoachSpeech } from '../lib/clipCoachSpeech';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

export const CoachScreen: React.FC = () => {
  const route = useRoute<RouteProp<MainTabParamList, 'Coach'>>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile } = useProfile();
  const {
    monthExpenses,
    monthIncome,
    goals,
    spendingByCategory,
    spendingPatterns,
    categoryBudgetCaps,
    statementImports,
    monthlySnapshots,
    monthlyComparison,
    categoryHistory,
    consistentlyHighCategories,
    bestSavingsMonth,
    refresh,
    insertTransaction,
    setCategoryBudgetCap,
  } = useGoalsTransactions();

  useVoiceContextRegistrar({
    goals,
    refresh,
    insertTransaction,
    setCategoryBudgetCap,
  });

  const profileMonthlyIncome = Number(profile?.monthly_income ?? 0);
  const incomeSnapshot = profileMonthlyIncome > 0 ? profileMonthlyIncome : monthIncome;
  const surplus = Math.max(0, incomeSnapshot - monthExpenses);
  const topCategory = spendingByCategory[0]?.label;

  const coachContext = React.useMemo(
    () => ({
      monthExpenses,
      monthIncomeFromTx: monthIncome,
      incomeSnapshot,
      surplus,
      topCategory,
      goalsCount: goals.length,
    }),
    [monthExpenses, monthIncome, incomeSnapshot, surplus, topCategory, goals.length],
  );

  const fallbackReply = React.useCallback(
    (text: string) => buildCoachAssistantReply(text, coachContext),
    [coachContext],
  );

  const buildLLMContext = React.useCallback((): Record<string, unknown> => {
    const payload = buildCoachLLMContextPayload({
      profile,
      goals,
      spendingByCategory,
      monthIncome,
      monthExpenses,
      spendingPatterns,
      categoryBudgetCaps,
      statementImports,
      monthlySnapshots,
      monthlyComparison,
      categoryHistory,
      consistentlyHighCategories,
      bestSavingsMonth,
    });
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  }, [
    profile,
    goals,
    spendingByCategory,
    monthIncome,
    monthExpenses,
    spendingPatterns,
    categoryBudgetCaps,
    statementImports,
    monthlySnapshots,
    monthlyComparison,
    categoryHistory,
    consistentlyHighCategories,
    bestSavingsMonth,
  ]);

  const llmOptions = React.useMemo(
    () => ({
      buildLLMContext,
      fallbackReply,
    }),
    [buildLLMContext, fallbackReply],
  );

  const { messages, loading, error, sending, sendMessage } = useCoachThread(userId, llmOptions);

  const [input, setInput] = React.useState('');
  const preloadedPrompt = route.params?.preloadedPrompt;
  const preloadedSentRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (loading || !userId || !preloadedPrompt?.trim()) return;
    if (messages.length > 0) return;
    if (preloadedSentRef.current === preloadedPrompt) return;
    preloadedSentRef.current = preloadedPrompt;
    void sendMessage(preloadedPrompt.trim());
  }, [loading, userId, preloadedPrompt, messages.length, sendMessage]);

  const primaryGoal = React.useMemo(() => {
    if (!goals.length) return null;
    const pid = profile?.primary_goal_id;
    if (pid) {
      const g = goals.find((x) => x.id === pid);
      if (g) return g;
    }
    return goals[0];
  }, [goals, profile?.primary_goal_id]);

  const flexTop = React.useMemo(() => topFlexibleCategory(spendingByCategory), [spendingByCategory]);

  const suggestionPrompts = React.useMemo(() => {
    const goalA = primaryGoal?.title ?? 'my top goal';
    const goalB = goals.find((g) => g.id !== primaryGoal?.id)?.title ?? goalA;
    const topLabel = flexTop?.label?.toLowerCase() ?? 'discretionary spending';
    const prompts = [
      `How do I fund my ${goalA} goal faster?`,
      `What should I cut first in ${topLabel}?`,
      `Should I prioritize ${goalA} or ${goalB} this month?`,
    ];
    return prompts.slice(0, 3);
  }, [primaryGoal?.title, primaryGoal?.id, goals, flexTop?.label]);

  const focusBullets = React.useMemo(() => {
    const lines: string[] = [];
    const gap = primaryGoal && surplus >= 0 ? monthlyShortfallForGoal(primaryGoal, surplus) : 0;
    const topLabel = flexTop?.label ?? topCategory ?? 'your categories';
    const topAmt = flexTop?.total ?? 0;

    if (!primaryGoal) {
      lines.push('Add a goal with a target date and amount.');
      lines.push('Log a few categorized expenses so we can spot your top flex spend.');
      return lines;
    }
    const behindAmount = Math.max(0, gap);
    if (topAmt > 0) {
      lines.push(
        `About ${formatCurrency(behindAmount)}/mo behind ${primaryGoal.title}. Top flex spend: ${topLabel} (${formatCurrency(topAmt)}).`,
      );
    } else {
      lines.push('Log categorized expenses so we can name your top flex category.');
      lines.push(`About ${formatCurrency(behindAmount)}/mo behind ${primaryGoal.title}.`);
    }
    return lines;
  }, [surplus, topCategory, primaryGoal, flexTop]);

  const openingCoachMessage = React.useMemo(() => {
    const weakness = (profile?.spending_weakness ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        if (p.startsWith('other:')) return p.slice(6).trim();
        return p.replace(/_/g, ' ');
      })
      .filter(Boolean)
      .join(', ');
    if (!primaryGoal) {
      const weaknessPart = weakness ? ` Starting with ${weakness} works if that feels right.` : '';
      return `Add a goal and a few categorized expenses—I'll shape a simple plan.${weaknessPart}\n\nWhat should we tackle first?`;
    }
    const gap = monthlyShortfallForGoal(primaryGoal, surplus);
    const topLabel = flexTop?.label ?? topCategory ?? 'discretionary spending';
    const topAmt = flexTop?.total ?? 0;
    const topPart =
      topAmt > 0
        ? ` Top flex spend: ${topLabel} (${formatCurrency(topAmt)}).`
        : weakness
          ? ` You noted ${weakness}—we can lean there first.`
          : ' Log a few expenses so I can name your top flex category.';
    return `You're about ${formatCurrency(Math.max(0, gap))}/mo behind ${primaryGoal.title} right now.${topPart}\n\nWhat do you want to adjust first?`;
  }, [primaryGoal, surplus, flexTop, topCategory, profile?.spending_weakness]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !userId) return;
    void Haptics.selectionAsync();
    await sendMessage(text);
    setInput('');
  };

  // ── Voice/Chat mode ─────────────────────────────────────────────────
  const [coachMode, setCoachMode] = React.useState<'voice' | 'chat'>('chat');
  const voice = useCoachVoiceCapture();
  const [voiceState, setVoiceState] = React.useState<VoiceAssistantState>('idle');
  const [voiceResponse, setVoiceResponse] = React.useState<string>('');
  const idleResetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakFallbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset voice state when leaving voice mode so we don't carry stale UI.
  React.useEffect(() => {
    if (coachMode !== 'voice') {
      if (voice.isListening) voice.stop();
      void Speech.stop();
      voice.reset();
      setVoiceState('idle');
      setVoiceResponse('');
      if (idleResetTimerRef.current) {
        clearTimeout(idleResetTimerRef.current);
        idleResetTimerRef.current = null;
      }
      if (speakFallbackTimerRef.current) {
        clearTimeout(speakFallbackTimerRef.current);
        speakFallbackTimerRef.current = null;
      }
    }
  }, [coachMode, voice]);

  const processVoiceTranscript = React.useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text || !userId) {
        setVoiceState('idle');
        return;
      }
      setVoiceState('thinking');
      const { assistantText } = await sendMessage(text);
      const reply = assistantText ?? '\u2026';
      setVoiceResponse(reply);
      setVoiceState('speaking');

      if (idleResetTimerRef.current) {
        clearTimeout(idleResetTimerRef.current);
        idleResetTimerRef.current = null;
      }
      if (speakFallbackTimerRef.current) {
        clearTimeout(speakFallbackTimerRef.current);
        speakFallbackTimerRef.current = null;
      }

      void Speech.stop();
      const toSpeak = clipTextForCoachSpeech(reply);

      const scheduleIdleAfterPause = () => {
        if (idleResetTimerRef.current) clearTimeout(idleResetTimerRef.current);
        idleResetTimerRef.current = setTimeout(() => {
          idleResetTimerRef.current = null;
          void Speech.stop();
          setVoiceState('idle');
          setVoiceResponse('');
        }, 3000);
      };

      const onSpeakFinished = () => {
        if (speakFallbackTimerRef.current) {
          clearTimeout(speakFallbackTimerRef.current);
          speakFallbackTimerRef.current = null;
        }
        scheduleIdleAfterPause();
      };

      Speech.speak(toSpeak, {
        language: 'en-US',
        rate: 1.0,
        onDone: onSpeakFinished,
        onError: onSpeakFinished,
      });

      speakFallbackTimerRef.current = setTimeout(onSpeakFinished, 20000);
    },
    [userId, sendMessage],
  );

  const handleVoicePress = React.useCallback(() => {
    if (idleResetTimerRef.current) {
      clearTimeout(idleResetTimerRef.current);
      idleResetTimerRef.current = null;
    }
    if (speakFallbackTimerRef.current) {
      clearTimeout(speakFallbackTimerRef.current);
      speakFallbackTimerRef.current = null;
    }
    if (voiceState === 'idle') {
      if (!voice.isSupported) {
        return;
      }
      setVoiceResponse('');
      setVoiceState('listening');
      void voice.start().catch(() => {
        setVoiceState('idle');
      });
      return;
    }
    if (voiceState === 'listening') {
      voice.stop();
      return;
    }
    if (voiceState === 'speaking') {
      if (idleResetTimerRef.current) {
        clearTimeout(idleResetTimerRef.current);
        idleResetTimerRef.current = null;
      }
      if (speakFallbackTimerRef.current) {
        clearTimeout(speakFallbackTimerRef.current);
        speakFallbackTimerRef.current = null;
      }
      void Speech.stop();
      setVoiceState('idle');
      setVoiceResponse('');
      return;
    }
  }, [voiceState, voice]);

  const prevListeningRef = React.useRef(false);
  React.useEffect(() => {
    if (voiceState !== 'listening') {
      prevListeningRef.current = voice.isListening;
      return;
    }
    if (prevListeningRef.current && !voice.isListening) {
      void processVoiceTranscript(voice.transcript);
    }
    prevListeningRef.current = voice.isListening;
  }, [voice.isListening, voice.transcript, voiceState, processVoiceTranscript]);

  React.useEffect(() => {
    return () => {
      if (idleResetTimerRef.current) clearTimeout(idleResetTimerRef.current);
      if (speakFallbackTimerRef.current) clearTimeout(speakFallbackTimerRef.current);
      void Speech.stop();
    };
  }, []);

  const submitVoiceTyped = React.useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    void processVoiceTranscript(text);
  }, [input, processVoiceTranscript]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(245, 138, 31, 0.16)', 'rgba(7, 17, 29, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glow}
      />
      <AppHeader
        title="AI Coach"
        subtitle="Ask questions like you would a friend."
        hideVoiceButton
        rightElement={
          <View style={styles.modeToggleRow}>
            <Pressable
              style={[
                styles.modeToggleSegment,
                coachMode === 'voice' && styles.modeToggleSegmentActive,
              ]}
              onPress={() => setCoachMode('voice')}
              accessibilityRole="button"
              accessibilityLabel="Voice mode"
            >
              <Ionicons
                name="mic"
                size={14}
                color={coachMode === 'voice' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeToggleLabel,
                  coachMode === 'voice' && styles.modeToggleLabelActive,
                ]}
              >
                Voice
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeToggleSegment,
                coachMode === 'chat' && styles.modeToggleSegmentActive,
              ]}
              onPress={() => setCoachMode('chat')}
              accessibilityRole="button"
              accessibilityLabel="Chat mode"
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={14}
                color={coachMode === 'chat' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeToggleLabel,
                  coachMode === 'chat' && styles.modeToggleLabelActive,
                ]}
              >
                Chat
              </Text>
            </Pressable>
          </View>
        }
      />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {coachMode === 'voice' ? (
          <View style={styles.voiceMode}>
            <VoiceAssistant
              state={voiceState}
              onPress={handleVoicePress}
              responseText={voiceResponse}
            />
            {!voice.isSupported && voiceState === 'idle' ? (
              <View style={styles.voiceFallbackCard}>
                <Text style={styles.voiceFallbackTitle}>Voice capture isn’t available here</Text>
                <Text style={styles.voiceFallbackBody}>
                  Type a question and Kova will reply with the same voice persona.
                </Text>
                <View style={styles.voiceFallbackInputRow}>
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask Kova anything…"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    returnKeyType="send"
                    onSubmitEditing={submitVoiceTyped}
                    editable={!sending && Boolean(userId)}
                  />
                  <AppButton
                    label="Ask"
                    onPress={submitVoiceTyped}
                    variant="primary"
                    size="sm"
                    disabled={sending || !userId || !input.trim()}
                    loading={sending}
                    style={styles.sendButton}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <ScreenAnimatedScrollView
              style={styles.messages}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.centerPad}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingCaption}>Loading your coach thread…</Text>
                </View>
              ) : (
                <>
                  <AIAnswerCard title="Today's focus" bullets={focusBullets} />
                  {messages.length === 0 && !primaryGoal ? (
                    <AIMessageBubble
                      message={{
                        id: 'coach-opening',
                        role: 'assistant',
                        content: openingCoachMessage,
                        createdAt: new Date().toISOString(),
                      }}
                    />
                  ) : null}
                  {messages.map((m) => (
                    <AIMessageBubble key={m.id} message={m} />
                  ))}
                </>
              )}
            </ScreenAnimatedScrollView>

            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>Try asking</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: layout.screenPadding }}
              >
                {suggestionPrompts.map((prompt) => (
                  <Chip key={prompt} label={prompt} onPress={() => void handleSend(prompt)} />
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask anything about your money…"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={() => void handleSend(input)}
                editable={!sending && Boolean(userId)}
              />
              <AppButton
                label="Send"
                onPress={() => void handleSend(input)}
                variant="primary"
                size="sm"
                disabled={sending || !userId}
                loading={sending}
                style={styles.sendButton}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 220,
  },
  errorBanner: {
    marginHorizontal: layout.screenPadding,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 16,
  },
  messages: {
    flex: 1,
  },
  centerPad: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingCaption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 10,
  },
  suggestions: {
    marginTop: 8,
    marginBottom: 12,
  },
  suggestionsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 6,
  },
  sendButton: {
    marginLeft: 8,
    minWidth: 72,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1D27',
    borderRadius: 999,
    padding: 3,
    gap: 3,
  },
  modeToggleSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modeToggleSegmentActive: {
    backgroundColor: '#F97316',
  },
  modeToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeToggleLabelActive: {
    color: '#FFFFFF',
  },
  voiceMode: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: layout.screenPadding,
    paddingTop: 12,
  },
  voiceFallbackCard: {
    width: '100%',
    maxWidth: 460,
    marginTop: 24,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  voiceFallbackTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  voiceFallbackBody: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  voiceFallbackInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
