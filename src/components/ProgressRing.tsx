import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0–1
  label?: string;
  trackColor?: string;
  fillColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 72,
  strokeWidth = 8,
  progress,
  label,
  trackColor,
  fillColor,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - circumference * clamped;
  const percentStyle = React.useMemo(() => {
    if (size <= 56) {
      return { fontSize: 14, fontWeight: '800' as const };
    }
    if (size <= 72) {
      return { fontSize: 18, fontWeight: '800' as const };
    }
    return { fontSize: 28, fontWeight: '800' as const };
  }, [size]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          stroke={trackColor ?? colors.progressRingTrack}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={fillColor ?? colors.primary}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.percent, percentStyle]}>{Math.round(clamped * 100)}%</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  percent: {
    color: colors.textPrimary,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

