import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DURATION = 260;

/**
 * Fade + slight lift when a bottom-tab screen gains focus (tabs stay mounted).
 */
export const TabScreenWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0;
      translateY.value = 10;
      opacity.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: DURATION, easing: Easing.out(Easing.cubic) });
    }, [opacity, translateY]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>;
};
