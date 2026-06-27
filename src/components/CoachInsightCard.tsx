import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';

type Props = {
  lines: [string, string] | null;
  onPressCoach: () => void;
};

export const CoachInsightCard: React.FC<Props> = ({ lines, onPressCoach }) => {
  if (!lines) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.overline}>Coach insight</Text>
      <View style={styles.body}>
        {lines.map((line, i) => (
          <View key={i} style={styles.lineRow}>
            <Text style={styles.dot}>●</Text>
            <Text style={styles.lineText}>{line}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={onPressCoach} hitSlop={{ top: 8, bottom: 8 }}>
        <Text style={styles.footer}>Ask coach how to fix this →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.coachSurface,
    borderRadius: 18,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: tokens.spacing.lg,
    marginBottom: layout.blockGap,
    borderWidth: 1,
    borderColor: colors.coachBorder,
  },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.coachText,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    fontSize: 6,
    color: colors.coachAccent,
    marginTop: 5,
    width: 10,
    textAlign: 'center',
  },
  lineText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: colors.coachText,
    lineHeight: 20,
  },
  footer: {
    marginTop: tokens.spacing.md,
    fontSize: 12,
    fontWeight: '600',
    color: colors.coachAccent,
  },
});
