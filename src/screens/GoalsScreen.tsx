import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Modal,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';
import { GoalCard } from '../components/GoalCard';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { typography } from '../theme/typography';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../navigation';
import { GoalType } from '../types/models';
import { Chip } from '../components/Chip';
import { AppButton } from '../components/ui/AppButton';
import { AddTransactionSheet } from '../components/AddTransactionSheet';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useGoalsTransactions } from '../hooks/useGoalsTransactions';
import { supabase } from '../lib/supabase';
import { analyzeGoalGaps } from '../lib/goalGapEngine';
import { StaggerChildren } from '../components/StaggerChildren';
import { useVoiceContextRegistrar } from '../lib/voice/useVoiceContextRegistrar';

type GoalsNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Goals'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const GoalsScreen: React.FC = () => {
  const navigation = useNavigation<GoalsNav>();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { profile } = useProfile();
  const {
    goals,
    loading,
    error: fetchError,
    refresh,
    monthIncome,
    monthExpenses,
    spendingByCategory,
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
  const monthlySurplus = Math.max(0, incomeSnapshot - monthExpenses);

  const analysisByGoalId = React.useMemo(() => {
    const rows = analyzeGoalGaps({ goals, monthlySurplus, spendingByCategory });
    const m = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      m.set(r.goalId, r);
    }
    return m;
  }, [goals, monthlySurplus, spendingByCategory]);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [targetAmount, setTargetAmount] = React.useState('');
  const [dueDate, setDueDate] = React.useState('2026-01-01');
  const [type, setType] = React.useState<GoalType>('travel');
  const [formError, setFormError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [addSheetOpen, setAddSheetOpen] = React.useState(false);

  const goalTypeOptions: GoalType[] = ['travel', 'emergency', 'education', 'business', 'rent', 'other'];
  const emojiByType: Record<GoalType, string> = {
    travel: '✈️',
    emergency: '🛟',
    education: '📚',
    business: '📈',
    rent: '🏠',
    other: '🎯',
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setTitle('');
    setTargetAmount('');
    setDueDate('2026-01-01');
    setType('travel');
    setFormError('');
  };

  const createGoal = async () => {
    const amount = Number(targetAmount);
    if (!user) {
      setFormError('You must be signed in.');
      return;
    }
    if (!title.trim()) {
      setFormError('Goal title is required.');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setFormError('Enter a valid target amount.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setFormError('Use due date format YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    setFormError('');
    const { error: insertError } = await supabase.from('goals').insert({
      user_id: user.id,
      title: title.trim(),
      type,
      target_amount: amount,
      saved_amount: 0,
      due_date: dueDate,
      priority: 'medium',
      emoji: emojiByType[type],
    });
    setSaving(false);

    if (insertError) {
      setFormError(insertError.message);
      return;
    }

    closeModal();
    await refresh();
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Goals" subtitle="Stay close to what matters." />
      {fetchError && !showCreateModal ? (
        <View style={styles.topError}>
          <Text style={styles.topErrorText}>{fetchError}</Text>
          <TouchableOpacity onPress={() => void refresh()}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <ScreenAnimatedScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: tabBarHeight + tokens.spacing.xxl + 56 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <StaggerChildren stagger={44} initialDelay={12}>
          <View>
            <SectionHeader title="Active goals" />

            {loading && goals.length === 0 ? (
              <View style={styles.centerPad}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : goals.length === 0 ? (
              <EmptyState
                title="No goals yet."
                subtitle="Create your first goal — travel, buffer, tuition, or anything that feels like progress."
              />
            ) : (
              goals.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('GoalDetails', { goalId: g.id })}
                >
                  <GoalCard
                    goal={g}
                    monthlySurplus={monthlySurplus}
                    analysis={analysisByGoalId.get(g.id)}
                    onUpdateDueDate={() =>
                      navigation.navigate('GoalDetails', { goalId: g.id, focusDueDateEditor: true })
                    }
                  />
                </TouchableOpacity>
              ))
            )}

            <AppButton
              label="Create a new goal"
              onPress={() => setShowCreateModal(true)}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>

          <TouchableOpacity
            style={styles.helperBox}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Need ideas? Open coach with prioritization prompt"
            onPress={() =>
              navigation.navigate('Coach', {
                preloadedPrompt:
                  'What goals should I prioritize given my income and expenses?',
              })
            }
          >
            <Text style={styles.helperOverline}>Coach</Text>
            <Text style={styles.helperTitle}>Not sure what to fund first?</Text>
            <Text style={styles.helperBody}>
              Ask the coach to prioritize goals from your income and spending.
            </Text>
            <Text style={styles.helperCta}>Open AI Coach →</Text>
          </TouchableOpacity>
        </StaggerChildren>
      </ScreenAnimatedScrollView>

      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create a goal</Text>

            <Text style={styles.inputLabel}>Goal name</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Tokyo trip"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Goal type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {goalTypeOptions.map((option) => (
                <Chip
                  key={option}
                  label={option.charAt(0).toUpperCase() + option.slice(1)}
                  selected={type === option}
                  onPress={() => setType(option)}
                />
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Target amount</Text>
            <TextInput
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
              placeholder="5000"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Due date (YYYY-MM-DD)</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="2026-01-01"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />

            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Preview</Text>
              <Text style={styles.previewBody}>
                {emojiByType[type]} {title || 'New goal'} • ${targetAmount || '0'} by {dueDate}
              </Text>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <AppButton label="Cancel" onPress={closeModal} variant="secondary" flex disabled={saving} />
              <AppButton
                label="Save goal"
                onPress={() => void createGoal()}
                variant="primary"
                flex
                loading={saving}
                disabled={saving}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Pressable
        style={[styles.fab, { bottom: tokens.spacing.lg + tabBarHeight }]}
        onPress={() => setAddSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </Pressable>

      <AddTransactionSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        tabBarHeight={tabBarHeight}
        onOpenActivity={() => navigation.navigate('Transactions')}
        onSaved={() => void refresh()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: layout.screenPadding,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  topErrorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
    marginRight: 8,
  },
  retry: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: tokens.spacing.xs,
  },
  centerPad: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  helperBox: {
    backgroundColor: colors.cardSky,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginTop: layout.sectionGap,
    borderWidth: 1,
    borderColor: colors.cardSkyBorder,
  },
  helperOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.cardSkyText,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  helperTitle: {
    ...typography.titleM,
    color: colors.cardSkyText,
    marginTop: 8,
  },
  helperBody: {
    ...typography.body,
    color: colors.cardSkyText,
    opacity: 0.85,
    marginTop: 6,
    lineHeight: 20,
  },
  helperCta: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 29, 0.58)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalTitle: {
    ...typography.titleL,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    ...typography.body,
    backgroundColor: colors.surfaceAlt,
  },
  previewBox: {
    marginTop: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  previewTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  previewBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 8,
  },
  modalActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  fab: {
    position: 'absolute',
    right: layout.screenPadding,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
});
