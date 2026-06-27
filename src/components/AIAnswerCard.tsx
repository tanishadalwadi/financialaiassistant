import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';

export const AIAnswerCard: React.FC<{
  title: string;
  bullets: string[];
  footer?: string;
}> = ({ title, bullets, footer }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Coach</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={{ marginTop: 10 }}>
        {bullets.map((b) => (
          <Text key={b} style={styles.bullet}>
            • {b}
          </Text>
        ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.coachSurface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.coachBorder,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coachAccent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.titleM,
    color: colors.coachText,
    marginTop: 6,
  },
  bullet: {
    ...typography.body,
    color: colors.coachText,
    marginTop: 6,
  },
  footer: {
    ...typography.caption,
    color: colors.coachText,
    marginTop: 10,
  },
});
