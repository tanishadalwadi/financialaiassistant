import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';

export const GradientCard: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'soft' | 'strong';
}> = ({ children, style, intensity = 'soft' }) => {
  const gradient =
    intensity === 'strong'
      ? ([colors.cardElevated, colors.card, colors.backgroundSecondary] as const)
      : ([
          'rgba(255, 77, 141, 0.14)',
          'rgba(217, 245, 74, 0.08)',
          'rgba(139, 124, 255, 0.12)',
          colors.surface,
        ] as const);

  return (
    <View style={[styles.shadowWrap, style]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.grad}>
        <View style={styles.inner}>{children}</View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: layout.cardRadius,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 3,
  },
  grad: {
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: 'transparent',
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
  },
});

