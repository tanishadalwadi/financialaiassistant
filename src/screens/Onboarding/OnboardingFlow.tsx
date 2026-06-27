import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ScreenAnimatedScrollView } from '../../components/ScreenAnimatedScrollView';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { layout } from '../../theme/layout';
import { Chip } from '../../components/Chip';
import { AppButton } from '../../components/ui/AppButton';
import { KovaMascot } from '../../components/KovaMascot';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Style: undefined;
  UserType: undefined;
  IncomeGoal: undefined;
  SpendingWeakness: undefined;
  HowAIHelps: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

type UserType = 'student' | 'individual' | 'freelancer' | 'business';
type SpendingWeaknessKey = 'dining' | 'shopping' | 'subscriptions' | 'coffee' | 'transport' | 'other';

const StepShell: React.FC<{
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  primaryCta: { label: string; onPress: () => void };
  secondaryCta?: { label: string; onPress: () => void };
}> = ({ eyebrow, title, subtitle, children, primaryCta, secondaryCta }) => {
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <LinearGradient
        colors={['rgba(237, 121, 37, 0.16)', 'rgba(15, 23, 32, 0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.glow}
      />
      <ScreenAnimatedScrollView
        contentContainerStyle={[styles.scrollContent, styles.scrollContentGrow]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={{ marginTop: 22 }}>{children}</View>

        <View style={styles.footer}>
          {secondaryCta ? (
            <AppButton
              label={secondaryCta.label}
              onPress={secondaryCta.onPress}
              variant="ghost"
              size="sm"
              fullWidth
              style={styles.secondaryBtn}
            />
          ) : null}
          <AppButton
            label={primaryCta.label}
            onPress={primaryCta.onPress}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.primaryBtn}
          />
          <Text style={styles.disclaimer}>Sample data only. No bank connections yet.</Text>
        </View>
      </ScreenAnimatedScrollView>
    </KeyboardAvoidingView>
  );
};

const WelcomeIntroScreen: React.FC<{ onContinue: () => void }> = ({ onContinue }) => {
  return (
    <LinearGradient
      colors={[colors.backgroundSecondary, colors.background]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.welcomeRoot}
    >
      <Animated.View entering={FadeIn.duration(420)} style={styles.welcomeContent}>
        <Text style={styles.welcomeEyebrow}>Welcome</Text>
        <Text style={styles.welcomeTitle}>Meet Kova your calm financial co pilot</Text>
        <Text style={styles.welcomeSubtitle}>I turn your money into clear next steps.</Text>

        <View style={styles.welcomeOrbWrap}>
          <View style={styles.welcomeOrbGlow} />
          <KovaMascot size={198} state="idle" glowIntensity={0.92} />
        </View>
      </Animated.View>

      <View style={styles.welcomeFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={onContinue}
          style={({ pressed }) => [
            styles.welcomeCta,
            pressed ? styles.welcomeCtaPressed : null,
          ]}
        >
          <Text style={styles.welcomeCtaLabel}>Continue</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
};

export const OnboardingFlow: React.FC<{
  onComplete: (payload: {
    userType: string;
    monthlyIncome: number;
    firstGoalName: string;
    firstGoalTargetAmount: number;
    spendingWeakness: string;
    coachTone: string;
  }) => void | Promise<void>;
}> = ({ onComplete }) => {
  const [userType, setUserType] = React.useState<UserType>('individual');
  const [coachTone, setCoachTone] = React.useState<'just_starting' | 'optimizing' | 'freedom' | 'stability'>(
    'just_starting',
  );
  const [monthlyIncome, setMonthlyIncome] = React.useState('');
  const [firstGoalName, setFirstGoalName] = React.useState('');
  const [firstGoalTarget, setFirstGoalTarget] = React.useState('');
  const [spendingWeaknesses, setSpendingWeaknesses] = React.useState<SpendingWeaknessKey[]>(['dining']);
  const [customWeakness, setCustomWeakness] = React.useState('');

  const toggleWeakness = React.useCallback((value: SpendingWeaknessKey) => {
    setSpendingWeaknesses((prev) => {
      if (prev.includes(value)) {
        return prev.filter((x) => x !== value);
      }
      return [...prev, value];
    });
  }, []);

  const spendingWeaknessPayload = React.useMemo(() => {
    const selected = [...new Set(spendingWeaknesses)];
    const parts: string[] = selected.filter((x) => x !== 'other');
    if (selected.includes('other') && customWeakness.trim()) {
      parts.push(`other:${customWeakness.trim().toLowerCase()}`);
    }
    return parts.join(',');
  }, [spendingWeaknesses, customWeakness]);

  const onContinueToWeakness = (navigation: any) => {
    const income = Number(String(monthlyIncome).replace(/,/g, '').trim());
    if (!Number.isFinite(income) || income < 0) {
      Alert.alert('Monthly income', 'Enter a valid monthly income amount.');
      return;
    }
    navigation.navigate('SpendingWeakness');
  };

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 280, fullScreenGestureEnabled: true }}
    >
      <Stack.Screen name="Welcome">
        {({ navigation }: any) => (
          <WelcomeIntroScreen onContinue={() => navigation.navigate('Style')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Style">
        {({ navigation }: any) => (
          <StepShell
            eyebrow="Your style"
            title="How do you want to feel about money?"
            subtitle="Pick one. We’ll persist this as your coach tone preference."
            primaryCta={{ label: 'Next', onPress: () => navigation.navigate('UserType') }}
            secondaryCta={{ label: 'Back', onPress: () => navigation.goBack() }}
          >
            <View style={styles.chipRow}>
              <Chip
                label="I’m just getting started"
                selected={coachTone === 'just_starting'}
                onPress={() => setCoachTone('just_starting')}
              />
              <Chip
                label="I’m optimizing"
                selected={coachTone === 'optimizing'}
                onPress={() => setCoachTone('optimizing')}
              />
            </View>
            <View style={styles.chipRow}>
              <Chip
                label="I want more freedom"
                selected={coachTone === 'freedom'}
                onPress={() => setCoachTone('freedom')}
              />
              <Chip
                label="I want stability"
                selected={coachTone === 'stability'}
                onPress={() => setCoachTone('stability')}
              />
            </View>
          </StepShell>
        )}
      </Stack.Screen>

      <Stack.Screen name="UserType">
        {({ navigation }: any) => (
          <StepShell
            eyebrow="About you"
            title="Choose your profile"
            subtitle="We’ll adapt language, goals, and insights for your life."
            primaryCta={{ label: 'Next', onPress: () => navigation.navigate('IncomeGoal') }}
            secondaryCta={{ label: 'Back', onPress: () => navigation.goBack() }}
          >
            <View style={styles.chipRow}>
              <Chip label="Student" selected={userType === 'student'} onPress={() => setUserType('student')} />
              <Chip
                label="Individual"
                selected={userType === 'individual'}
                onPress={() => setUserType('individual')}
              />
            </View>
            <View style={styles.chipRow}>
              <Chip
                label="Freelancer"
                selected={userType === 'freelancer'}
                onPress={() => setUserType('freelancer')}
              />
              <Chip label="Business" selected={userType === 'business'} onPress={() => setUserType('business')} />
            </View>
            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>You can change this later</Text>
              <Text style={styles.noteBody}>Your assistant stays flexible as your life shifts.</Text>
            </View>
          </StepShell>
        )}
      </Stack.Screen>

      <Stack.Screen name="IncomeGoal">
        {({ navigation }: any) => (
          <StepShell
            eyebrow="Step 3"
            title="Let’s personalize your first month."
            subtitle="Add your monthly income. First savings goal is optional."
            primaryCta={{ label: 'Next', onPress: () => onContinueToWeakness(navigation) }}
            secondaryCta={{ label: 'Back', onPress: () => navigation.goBack() }}
          >
            <Text style={styles.fieldLabel}>What's your monthly income?</Text>
            <TextInput
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
              keyboardType="decimal-pad"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="next"
              placeholder="e.g. 4200"
              placeholderTextColor={colors.textSecondary}
              style={styles.field}
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>What's your first savings goal? Optional</Text>
            <TextInput
              value={firstGoalName}
              onChangeText={setFirstGoalName}
              autoCorrect={false}
              returnKeyType="next"
              placeholder="e.g. SF Trip"
              placeholderTextColor={colors.textSecondary}
              style={styles.field}
            />
            <TextInput
              value={firstGoalTarget}
              onChangeText={setFirstGoalTarget}
              keyboardType="decimal-pad"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="done"
              placeholder="Target amount optional (e.g. 1800)"
              placeholderTextColor={colors.textSecondary}
              style={styles.field}
            />
          </StepShell>
        )}
      </Stack.Screen>

      <Stack.Screen name="SpendingWeakness">
        {({ navigation }: any) => (
          <StepShell
            eyebrow="Step 4"
            title="What’s your biggest spending weakness?"
            subtitle="Pick all that apply so the coach can suggest your first realistic cut."
            primaryCta={{
              label: 'Next',
              onPress: () => {
                if (spendingWeaknesses.length === 0) {
                  Alert.alert('Pick at least one', 'Select one or more spending areas to continue.');
                  return;
                }
                if (spendingWeaknesses.includes('other') && !customWeakness.trim()) {
                  Alert.alert('Add your custom weakness', 'Type your custom spending weakness for Other.');
                  return;
                }
                navigation.navigate('HowAIHelps');
              },
            }}
            secondaryCta={{ label: 'Back', onPress: () => navigation.goBack() }}
          >
            <View style={styles.chipRow}>
              <Chip label="Dining out" selected={spendingWeaknesses.includes('dining')} onPress={() => toggleWeakness('dining')} />
              <Chip label="Shopping" selected={spendingWeaknesses.includes('shopping')} onPress={() => toggleWeakness('shopping')} />
            </View>
            <View style={styles.chipRow}>
              <Chip
                label="Subscriptions"
                selected={spendingWeaknesses.includes('subscriptions')}
                onPress={() => toggleWeakness('subscriptions')}
              />
              <Chip label="Coffee" selected={spendingWeaknesses.includes('coffee')} onPress={() => toggleWeakness('coffee')} />
            </View>
            <View style={styles.chipRow}>
              <Chip
                label="Transport"
                selected={spendingWeaknesses.includes('transport')}
                onPress={() => toggleWeakness('transport')}
              />
              <Chip label="Other" selected={spendingWeaknesses.includes('other')} onPress={() => toggleWeakness('other')} />
            </View>
            {spendingWeaknesses.includes('other') ? (
              <TextInput
                value={customWeakness}
                onChangeText={setCustomWeakness}
                placeholder="Add your own (e.g. impulse online buys)"
                placeholderTextColor={colors.textSecondary}
                autoCorrect={false}
                style={styles.field}
              />
            ) : null}
          </StepShell>
        )}
      </Stack.Screen>

      <Stack.Screen name="HowAIHelps">
        {({ navigation }: any) => (
          <StepShell
            eyebrow="How AI helps"
            title="Coaching that feels human."
            subtitle="You’ll get insights and action steps — never a wall of numbers."
            primaryCta={{
              label: 'Enter the app',
              onPress: () => {
                const income = Number(String(monthlyIncome).replace(/,/g, '').trim());
                const target = Number(String(firstGoalTarget).replace(/,/g, '').trim());
                void onComplete({
                  userType,
                  monthlyIncome: Number.isFinite(income) ? income : 0,
                  firstGoalName: firstGoalName.trim(),
                  firstGoalTargetAmount: Number.isFinite(target) && target > 0 ? target : 0,
                  spendingWeakness: spendingWeaknessPayload,
                  coachTone,
                });
              },
            }}
            secondaryCta={{ label: 'Back', onPress: () => navigation.goBack() }}
          >
            <View style={styles.bullets}>
              <Text style={styles.bullet}>• Tracks goals + savings in real time.</Text>
              <Text style={styles.bullet}>• Spots overspending early.</Text>
              <Text style={styles.bullet}>• Builds a simple plan for next month.</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.restartLink}>
              <Text style={styles.restartText}>Restart onboarding</Text>
            </TouchableOpacity>
          </StepShell>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  welcomeRoot: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 56,
    paddingBottom: 28,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeEyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  welcomeTitle: {
    ...typography.hero,
    color: colors.textPrimary,
    maxWidth: 320,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.85,
    marginTop: 14,
    maxWidth: 320,
  },
  welcomeOrbWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  welcomeOrbGlow: {
    position: 'absolute',
    width: 248,
    height: 248,
    borderRadius: 124,
    backgroundColor: 'rgba(237, 121, 37, 0.12)',
  },
  welcomeFooter: {
    paddingTop: 8,
  },
  welcomeCta: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  welcomeCtaPressed: {
    transform: [{ scale: 0.985 }],
  },
  welcomeCtaLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 56,
  },
  scrollContent: {
    paddingBottom: 22,
  },
  scrollContentGrow: {
    flexGrow: 1,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    marginTop: 12,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
  footer: {
    paddingTop: 22,
  },
  primaryBtn: {
    marginTop: 4,
  },
  secondaryBtn: {
    marginBottom: 8,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  mascotWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  heroLine: {
    ...typography.titleM,
    color: colors.textOnDark,
  },
  heroSub: {
    ...typography.body,
    color: colors.textMutedOnDark,
    marginTop: 10,
  },
  visualWrap: {
    marginTop: 14,
  },
  visualCard: {
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  orbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  miniStats: {
    marginTop: 14,
    flexDirection: 'row',
  },
  miniPill: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  miniLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  miniValue: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.textPrimary,
    ...typography.body,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginTop: 16,
  },
  noteTitle: {
    ...typography.titleM,
    color: colors.textPrimary,
  },
  noteBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  bullets: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
  },
  bullet: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  restartLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  restartText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

