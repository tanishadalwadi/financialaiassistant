import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';
import { typography } from '../theme/typography';
import { mockUser } from '../mock/data';
import { Chip } from '../components/Chip';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import type { MainTabParamList, RootStackParamList } from '../navigation';
import { getDisplayName } from '../lib/displayFormat';
import { setWeeklyCoachNotificationEnabled } from '../hooks/useWeeklyCoachNotification';
import { AppButton } from '../components/ui/AppButton';
import { StaggerChildren } from '../components/StaggerChildren';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const switchTrack = { true: colors.primary, false: colors.muted } as const;

function initialsFromUser(email: string | undefined): string {
  if (!email) return mockUser.avatarInitials;
  const local = email.split('@')[0] ?? '';
  if (local.length >= 2) return (local[0] + local[1]).toUpperCase();
  return (local[0] ?? '?').toUpperCase();
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNav>();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, isConfigured, isLoading, signOut, deleteAccount } = useAuth();
  const { profile, updateProfileFinancials, updateNotificationsEnabled } = useProfile();
  const [deletingAccount, setDeletingAccount] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [savingNotifications, setSavingNotifications] = React.useState(false);
  const [nudgeCadence, setNudgeCadence] = React.useState<'daily' | 'weekly' | 'smart'>('smart');
  const [nudgeTone, setNudgeTone] = React.useState<'gentle' | 'direct'>('gentle');
  const [monthlyIncomeStr, setMonthlyIncomeStr] = React.useState('0');
  const [savingsTargetStr, setSavingsTargetStr] = React.useState('0');
  const [savingFinancials, setSavingFinancials] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setMonthlyIncomeStr(String(profile.monthly_income ?? 0));
      setSavingsTargetStr(String(profile.monthly_savings_target ?? 0));
      setNotificationsEnabled(profile.notifications_enabled ?? true);
    }
  }, [
    profile?.monthly_income,
    profile?.monthly_savings_target,
    profile?.notifications_enabled,
    profile?.id,
  ]);

  const onToggleNotifications = React.useCallback(
    async (enabled: boolean) => {
      if (!isConfigured || !user) {
        setNotificationsEnabled(enabled);
        return;
      }
      const previous = notificationsEnabled;
      setNotificationsEnabled(enabled);
      setSavingNotifications(true);
      const { error } = await updateNotificationsEnabled(enabled);
      if (error) {
        setSavingNotifications(false);
        setNotificationsEnabled(previous);
        Alert.alert('Could not update notifications', error.message);
        return;
      }
      await setWeeklyCoachNotificationEnabled(enabled).catch(() => {});
      setSavingNotifications(false);
    },
    [isConfigured, user, notificationsEnabled, updateNotificationsEnabled],
  );

  const onSaveFinancials = React.useCallback(async () => {
    const parseMoney = (s: string) => Number(String(s).replace(/,/g, '').trim());
    const income = parseMoney(monthlyIncomeStr);
    const savings = parseMoney(savingsTargetStr);
    if (!Number.isFinite(income) || income < 0 || !Number.isFinite(savings) || savings < 0) {
      Alert.alert('Check amounts', 'Use plain numbers for income and savings (0 or more).');
      return;
    }
    setSavingFinancials(true);
    const { error } = await updateProfileFinancials({
      monthlyIncome: income,
      monthlySavingsTarget: savings,
    });
    setSavingFinancials(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    Alert.alert('Saved', 'Your income and savings target are updated.');
  }, [monthlyIncomeStr, savingsTargetStr, updateProfileFinancials]);

  const onDeleteAccount = React.useCallback(() => {
    if (!user) return;
    const runDelete = async () => {
      try {
        setDeletingAccount(true);
        const { error } = await deleteAccount();
        if (error) {
          Alert.alert('Could not delete account', error.message);
          return;
        }
      } finally {
        setDeletingAccount(false);
      }
    };

    if (Platform.OS === 'web') {
      const first = typeof window !== 'undefined'
        ? window.confirm(
            'Delete account? This permanently removes your login and associated app data (goals, transactions, coach history, caps). This cannot be undone.',
          )
        : false;
      if (!first) return;
      const second = typeof window !== 'undefined'
        ? window.confirm(
            'Delete now? Last confirmation. All goals, transactions, coach history, and caps tied to this account will be removed permanently.',
          )
        : false;
      if (!second) return;
      void runDelete();
      return;
    }

    Alert.alert(
      'Delete account?',
      'This permanently removes your login and associated app data (goals, transactions, coach history, caps). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete now?',
              'Last confirmation. All goals, transactions, coach history, and caps tied to this account will be removed permanently.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete my account',
                  style: 'destructive',
                  onPress: () => {
                    void runDelete();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [user, deleteAccount]);

  const roleLabel = (profile?.user_type ?? mockUser.userType)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={styles.container}>
      <AppHeader
        title="Profile"
        subtitle="Your account, numbers the coach uses, and how we reach you."
      />
      <ScreenAnimatedScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + tokens.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <StaggerChildren stagger={36} initialDelay={8}>
        <View style={styles.card}>
          {isLoading ? (
            <>
              <ActivityIndicator color={colors.primary} style={styles.identitySpinner} />
              <Text style={styles.caption}>Checking session…</Text>
            </>
          ) : user ? (
            <>
              <View style={styles.identityRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.email ? initialsFromUser(user.email) : mockUser.avatarInitials}
                  </Text>
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.name}>{getDisplayName(profile, user)}</Text>
                  <Text style={styles.metaLabel}>{roleLabel}</Text>
                  <Text style={styles.emailLine}>{user.email}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.name}>{mockUser.name}</Text>
              <Text style={styles.metaLabel}>{roleLabel}</Text>
              <Text style={styles.caption}>Sign in to sync goals and transactions.</Text>
            </>
          )}
        </View>

        {!isConfigured ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Project setup</Text>
            <Text style={styles.caption}>
              App backend is not configured yet. Add project URL and anon key to `.env` and restart the app.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial preferences</Text>
          <Text style={styles.caption}>We use these numbers to estimate surplus and goal pace.</Text>
          {isConfigured ? (
            <TouchableOpacity
              style={styles.insightsLink}
              onPress={() => navigation.navigate('Insights')}
              accessibilityRole="button"
              accessibilityLabel="Open Insights to set monthly category spending caps"
            >
              <Text style={styles.insightsLinkLabel}>
                Monthly category spending caps — set on the Insights tab
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.financialFields}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Monthly income ($)</Text>
              <TextInput
                value={monthlyIncomeStr}
                onChangeText={setMonthlyIncomeStr}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                style={styles.capInput}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Monthly savings target ($)</Text>
              <TextInput
                value={savingsTargetStr}
                onChangeText={setSavingsTargetStr}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                style={styles.capInput}
              />
            </View>
          </View>
          <AppButton
            label="Save changes"
            onPress={() => void onSaveFinancials()}
            variant="primary"
            size="lg"
            fullWidth
            loading={savingFinancials}
            disabled={savingFinancials || !isConfigured || !user}
            style={styles.financialSaveBtn}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.notifBlock}>
            <View style={styles.notifCopy}>
              <Text style={styles.notifTitle}>Smart nudges & check-ins</Text>
              <Text style={styles.notifDesc}>
                We only send what’s necessary to keep you on track — no marketing noise.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => void onToggleNotifications(value)}
              trackColor={switchTrack}
              style={styles.notifSwitch}
              disabled={savingNotifications}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI nudge settings</Text>
          <Text style={styles.fieldLabel}>Reminder cadence</Text>
          <View style={styles.chipsRow}>
            <Chip label="Daily" selected={nudgeCadence === 'daily'} onPress={() => setNudgeCadence('daily')} />
            <Chip label="Weekly" selected={nudgeCadence === 'weekly'} onPress={() => setNudgeCadence('weekly')} />
            <Chip label="Smart" selected={nudgeCadence === 'smart'} onPress={() => setNudgeCadence('smart')} />
          </View>
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Nudge tone</Text>
          <View style={styles.chipsRow}>
            <Chip label="Gentle" selected={nudgeTone === 'gentle'} onPress={() => setNudgeTone('gentle')} />
            <Chip label="Direct" selected={nudgeTone === 'direct'} onPress={() => setNudgeTone('direct')} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accounts</Text>
          <Text style={styles.accountsSubhead}>Connected accounts</Text>
          <Text style={styles.captionFlat}>
            Statement import and manual entry are supported. Bank linking is coming soon.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy & terms</Text>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('LegalPolicies')}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy and Terms of Service"
          >
            <Text style={styles.linkBtnLabel}>Privacy Policy & Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {isConfigured ? (
          <View style={[styles.card, styles.cardLast]}>
            <Text style={styles.cardTitle}>Account</Text>
            <Text style={styles.accountDescription}>
              Sign out on this device, or permanently delete your data and login.
            </Text>
            {user ? (
              <View style={styles.accountActions}>
                <AppButton
                  label="Sign out"
                  onPress={() => void signOut()}
                  variant="secondary"
                  size="md"
                  fullWidth
                />
                <AppButton
                  label="Delete account"
                  onPress={onDeleteAccount}
                  variant="danger"
                  size="md"
                  fullWidth
                  loading={deletingAccount}
                  disabled={deletingAccount}
                  accessibilityLabel="Delete account"
                />
              </View>
            ) : (
              <Text style={styles.caption}>You are not signed in.</Text>
            )}
          </View>
        ) : null}
        </StaggerChildren>
      </ScreenAnimatedScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: tokens.spacing.xs,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  identitySpinner: {
    marginBottom: tokens.spacing.sm,
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.aiAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  avatarText: {
    ...typography.body,
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  name: {
    ...typography.titleM,
    color: colors.textPrimary,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: tokens.spacing.xs,
  },
  emailLine: {
    ...typography.caption,
    color: colors.textMutedOnDark,
    marginTop: tokens.spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginBottom: layout.sectionGap,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardLast: {
    marginBottom: 0,
  },
  cardTitle: {
    ...typography.titleM,
    color: colors.textPrimary,
    marginBottom: tokens.spacing.sm,
  },
  metaValue: {
    fontWeight: '600',
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: tokens.spacing.xs,
  },
  insightsLink: {
    marginTop: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  insightsLinkLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 13,
  },
  captionFlat: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
  },
  financialFields: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  financialSaveBtn: {
    marginTop: tokens.spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
  },
  inputLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  capInput: {
    width: 112,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    textAlign: 'right',
    color: colors.textPrimary,
    ...typography.body,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: tokens.spacing.xs,
    marginTop: 2,
  },
  fieldLabelSpaced: {
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  notifBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xs,
  },
  notifCopy: {
    flex: 1,
    minWidth: 0,
  },
  notifTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    fontSize: 14,
  },
  notifDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
  },
  notifSwitch: {
    marginTop: 2,
  },
  accountsSubhead: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
    marginBottom: tokens.spacing.xs,
  },
  accountDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: tokens.spacing.xs,
    marginBottom: 0,
    lineHeight: 20,
  },
  accountActions: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  linkBtn: {
    marginTop: tokens.spacing.sm,
    alignSelf: 'stretch',
    paddingVertical: tokens.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkBtnLabel: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});

