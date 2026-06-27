import React from 'react';
import { Alert, ActivityIndicator, Text, TouchableOpacity, View, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  NavigatorScreenParams,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { BottomTabBar } from './BottomTabBar';
import { withTabTransition } from './tabTransition';
import { OnboardingFlow } from '../screens/Onboarding/OnboardingFlow';
import { HomeScreen } from '../screens/HomeScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { CoachScreen } from '../screens/CoachScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { GoalDetailsScreen } from '../screens/GoalDetailsScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { LegalPoliciesScreen } from '../screens/LegalPoliciesScreen';
import { ConfigureSupabaseScreen } from '../screens/ConfigureSupabaseScreen';
import { AuthNavigator } from '../screens/auth/AuthNavigator';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';

export type MainTabParamList = {
  Home: undefined;
  Goals: undefined;
  Insights: undefined;
  Coach: { preloadedPrompt?: string };
  Profile: undefined;
};

export type RootStackParamList = {
  ConfigureSupabase: undefined;
  Auth: undefined;
  Boot: undefined;
  ProfileError: undefined;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  GoalDetails: { goalId: string; focusDueDateEditor?: boolean };
  Transactions: undefined;
  LegalPolicies: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Module-level ref so non-screen components (e.g. the global voice action
 * bridge) can navigate without being inside a `<Stack.Screen>`.
 */
export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: 'transparent',
  },
};

const mainStackOptions = {
  headerShown: false as const,
  animation: 'slide_from_right' as const,
  animationDuration: 280,
  fullScreenGestureEnabled: true,
};

const Tabs = () => (
  <Tab.Navigator tabBar={(props) => <BottomTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home" component={withTabTransition(HomeScreen)} />
    <Tab.Screen name="Goals" component={withTabTransition(GoalsScreen)} />
    <Tab.Screen name="Insights" component={withTabTransition(InsightsScreen)} />
    <Tab.Screen name="Coach" component={withTabTransition(CoachScreen)} />
    <Tab.Screen name="Profile" component={withTabTransition(ProfileScreen)} />
  </Tab.Navigator>
);

const BootSpinnerScreen: React.FC = () => {
  const pulse = useSharedValue(1);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 760 }), withTiming(1, { duration: 760 })),
      -1,
      true,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={bootStyles.fill}>
      <Animated.View style={pulseStyle} entering={FadeIn.duration(260)}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(90).duration(300)} style={{ marginTop: 14 }}>
        <Text style={bootStyles.caption}>Loading…</Text>
      </Animated.View>
    </View>
  );
};

const ProfileErrorScreen: React.FC<{ message: string; onRetry: () => Promise<void> }> = ({ message, onRetry }) => (
  <View style={bootStyles.fill}>
    <Text style={bootStyles.title}>Could not load your profile</Text>
    <Text style={bootStyles.body}>{message}</Text>
    <TouchableOpacity style={bootStyles.btn} onPress={() => void onRetry()}>
      <Text style={bootStyles.btnLabel}>Try again</Text>
    </TouchableOpacity>
  </View>
);

export const RootNavigation: React.FC = () => {
  const { session, isLoading: authLoading, isConfigured } = useAuth();
  const { profile, isLoading: profileLoading, error: profileError, refresh, completeOnboarding } = useProfile();

  const onOnboardingDone = React.useCallback(
    async (payload: {
      userType: string;
      monthlyIncome: number;
      firstGoalName: string;
      firstGoalTargetAmount: number;
      spendingWeakness: string;
      coachTone: string;
    }) => {
      const { error } = await completeOnboarding(payload);
      if (error) {
        Alert.alert('Could not finish onboarding', error.message);
        return;
      }
      await refresh();
    },
    [completeOnboarding, refresh],
  );

  const onboardingDone = Boolean(profile?.onboarding_completed_at);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RNStatusBar barStyle="light-content" />
      <NavigationContainer ref={rootNavigationRef} theme={navTheme}>
        {!isConfigured ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ConfigureSupabase" component={ConfigureSupabaseScreen} />
          </Stack.Navigator>
        ) : authLoading ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Boot" component={BootSpinnerScreen} />
          </Stack.Navigator>
        ) : !session ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={AuthNavigator} />
          </Stack.Navigator>
        ) : profileLoading ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Boot" component={BootSpinnerScreen} />
          </Stack.Navigator>
        ) : profileError ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProfileError">
              {() => <ProfileErrorScreen message={profileError} onRetry={refresh} />}
            </Stack.Screen>
          </Stack.Navigator>
        ) : !onboardingDone ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding">
              {() => <OnboardingFlow onComplete={(p) => void onOnboardingDone(p)} />}
            </Stack.Screen>
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={mainStackOptions}>
            <Stack.Screen name="MainTabs" component={Tabs} />
            <Stack.Screen name="GoalDetails" component={GoalDetailsScreen} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} />
            <Stack.Screen name="LegalPolicies" component={LegalPoliciesScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </View>
  );
};

const bootStyles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  caption: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 14,
  },
  title: {
    ...typography.titleL,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  btnLabel: {
    ...typography.bodyStrong,
    color: colors.primaryForeground,
  },
});
