import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';
import { KovaMascot } from '../components/KovaMascot';

/**
 * Developer preview screen for KovaMascot states.
 * Suggested integration points:
 * - CoachScreen loading/thinking area
 * - AI modal header / ask bar empty state
 * - Assistant empty/help states in Home/Insights
 */
export const KovaMascotDemoScreen: React.FC = () => {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Kova AI Presence</Text>
      <Text style={styles.subtitle}>Premium glass-orb mascot states</Text>

      <View style={styles.row}>
        <StateCard label="Idle" helper="Calm ambient" >
          <KovaMascot size={124} state="idle" glowIntensity={0.85} />
        </StateCard>
        <StateCard label="Thinking" helper="Focused pulse" >
          <KovaMascot size={124} state="thinking" glowIntensity={1} />
        </StateCard>
        <StateCard label="Active" helper="Responsive energy" >
          <KovaMascot size={124} state="active" glowIntensity={1.12} />
        </StateCard>
      </View>

      <View style={styles.heroCard}>
        <KovaMascot size={188} state="thinking" glowIntensity={1} />
      </View>
    </View>
  );
};

const StateCard: React.FC<{ label: string; helper: string; children: React.ReactNode }> = ({ label, helper, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>{label}</Text>
    <View style={styles.mascotSlot}>{children}</View>
    <Text style={styles.helper}>{helper}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 28,
  },
  title: {
    ...typography.titleXL,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 18,
  },
  row: {
    gap: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 10,
  },
  cardLabel: {
    ...typography.label,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  mascotSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  helper: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heroCard: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
});
