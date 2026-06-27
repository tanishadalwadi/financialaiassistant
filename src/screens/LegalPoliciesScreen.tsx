import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenAnimatedScrollView } from '../components/ScreenAnimatedScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { LEGAL_DISCLAIMER, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../legal/privacyTermsCopy';

export const LegalPoliciesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScreenAnimatedScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator
      >
        <Text style={styles.banner}>{LEGAL_DISCLAIMER}</Text>

        <Text style={styles.h1}>Privacy Policy</Text>
        {PRIVACY_SECTIONS.map((s) => (
          <View key={s.title} style={styles.block}>
            <Text style={styles.h2}>{s.title}</Text>
            <Text style={styles.p}>{s.body}</Text>
          </View>
        ))}

        <Text style={[styles.h1, styles.h1Spaced]}>Terms of Service</Text>
        {TERMS_SECTIONS.map((s) => (
          <View key={s.title} style={styles.block}>
            <Text style={styles.h2}>{s.title}</Text>
            <Text style={styles.p}>{s.body}</Text>
          </View>
        ))}
      </ScreenAnimatedScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleM,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
  },
  banner: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    borderRadius: layout.cardRadius,
    marginBottom: 20,
    lineHeight: 20,
  },
  h1: {
    ...typography.titleL,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  h1Spaced: {
    marginTop: 28,
  },
  block: {
    marginTop: 16,
  },
  h2: {
    ...typography.titleM,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  p: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
