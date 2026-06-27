import React from 'react';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  /** Delay between consecutive children (ms). */
  stagger?: number;
  /** Delay before the first child animates (ms). */
  initialDelay?: number;
  /** Enter animation duration (ms). */
  duration?: number;
};

/**
 * Staggers layout enter animations for vertical scroll content (one pass on mount).
 */
export const StaggerChildren: React.FC<Props> = ({
  children,
  stagger = 44,
  initialDelay = 24,
  duration = 340,
}) => {
  const items = React.Children.toArray(children).filter(React.isValidElement);

  return (
    <>
      {items.map((child, index) => (
        <Animated.View
          key={index}
          entering={FadeInDown.delay(initialDelay + index * stagger)
            .duration(duration)
            .easing(Easing.out(Easing.cubic))}
        >
          {child}
        </Animated.View>
      ))}
    </>
  );
};
