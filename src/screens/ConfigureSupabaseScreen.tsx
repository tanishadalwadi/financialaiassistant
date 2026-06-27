import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';

/**
 * Shown when EXPO_PUBLIC_SUPABASE_* env vars are missing so the app can still boot.
 */
export const ConfigureSupabaseScreen: React.FC = () => {
  return (
    <View style={styles.root}>
      <ScreenAnimatedScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Connect Supabase</Text>
        <Text style={styles.body}>
          Copy <Text style={styles.mono}>.env.example</Text> to <Text style={styles.mono}>.env</Text> in the project
          root, add your project URL and anon key from the Supabase dashboard (Settings → API), then restart Expo.
        </Text>
        <Text style={styles.body}>
          Run <Text style={styles.mono}>supabase/schema.sql</Text> in the Supabase SQL editor to create tables and
          policies.
        </Text>
      </ScreenAnimatedScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 72,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 32,
  },
  title: {
    ...typography.titleXL,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  mono: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
});
