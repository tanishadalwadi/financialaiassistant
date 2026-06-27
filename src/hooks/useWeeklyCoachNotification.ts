import React from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import type { HomeNudgeInput } from '../lib/goalGapEngine';
import { buildWeeklyCoachNotificationBody } from '../lib/goalGapEngine';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const WEEKLY_NOTIFICATION_ID = 'weekly-coach-checkin';
const DEFAULT_WEEKLY_BODY = 'Open your weekly check-in to see where your money should go next.';

type Params = HomeNudgeInput & { enabled: boolean };

export async function setWeeklyCoachNotificationEnabled(enabled: boolean, body?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!enabled) {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_NOTIFICATION_ID).catch(() => {});
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Coach',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;
  if (status !== 'granted') {
    const ask = await Notifications.requestPermissionsAsync();
    finalStatus = ask.status;
  }
  if (finalStatus !== 'granted') return;

  await Notifications.cancelScheduledNotificationAsync(WEEKLY_NOTIFICATION_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_NOTIFICATION_ID,
    content: {
      title: 'Weekly coach check-in',
      body: body?.trim() || DEFAULT_WEEKLY_BODY,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour: 9,
      minute: 0,
    },
  });
}

/**
 * Re-schedules a weekly local notification (Monday 9:00) when Home has fresh context.
 * Runs from HomeScreen so it shares the same loaded data as the dashboard.
 */
export function useWeeklyCoachNotification(params: Params): void {
  const {
    enabled,
    goals,
    monthlySurplus,
    monthExpenses,
    incomeSnapshot,
    savingsTarget,
    spendingByCategory,
    hasTransactions,
  } = params;

  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    const run = async () => {
      const body = buildWeeklyCoachNotificationBody({
        goals,
        monthlySurplus,
        monthExpenses,
        incomeSnapshot,
        savingsTarget,
        spendingByCategory,
        hasTransactions,
      });

      await setWeeklyCoachNotificationEnabled(enabled, body);
    };

    void run();
  }, [
    enabled,
    goals,
    monthlySurplus,
    monthExpenses,
    incomeSnapshot,
    savingsTarget,
    spendingByCategory,
    hasTransactions,
  ]);
}
