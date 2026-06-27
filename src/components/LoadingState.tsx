import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';

export const LoadingState: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  const t = useSharedValue(0);

  React.useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [t]);

  return (
    <View style={{ marginTop: 8 }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <SkeletonRow key={idx} phase={t} wide={idx % 2 === 0} />
      ))}
    </View>
  );
};

function SkeletonRow({ phase, wide }: { phase: SharedValue<number>; wide: boolean }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.28 + 0.52 * phase.value,
  }));

  return (
    <Animated.View
      style={[
        styles.row,
        style,
        {
          width: wide ? '100%' : '86%',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    height: 16,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
  },
});
