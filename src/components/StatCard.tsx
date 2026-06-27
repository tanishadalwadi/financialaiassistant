import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'warning';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, hint, tone = 'default' }) => {
  const valueColor =
    tone === 'positive'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : colors.textPrimary;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 2,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  value: {
    ...typography.titleL,
    marginTop: 10,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
  },
});

