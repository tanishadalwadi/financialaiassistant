import React, { useMemo, useRef } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { ScreenScrollContext } from '../scroll/screenScrollContext';

type ScrollProps = React.ComponentProps<typeof Animated.ScrollView>;

export type ScreenAnimatedScrollViewProps = Omit<ScrollProps, 'children' | 'contentContainerStyle' | 'onScroll'> & {
  children?: React.ReactNode;
  contentContainerStyle?: ViewProps['style'];
  onScroll?: ScrollProps['onScroll'];
};

/**
 * Tracks vertical offset on the UI thread and exposes it + scroll content ref to descendants
 * (e.g. charts using useChartScrollAnimatedStyle).
 */
export const ScreenAnimatedScrollView: React.FC<ScreenAnimatedScrollViewProps> = ({
  children,
  contentContainerStyle,
  scrollEventThrottle = 16,
  onScroll: _onScroll,
  ...rest
}) => {
  const scrollY = useSharedValue(0);
  const contentRef = useRef<View>(null);
  const ctxValue = useMemo(() => ({ scrollY, contentRef }), [scrollY, contentRef]);

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        scrollY.value = e.contentOffset.y;
      },
    },
    [],
  );

  return (
    <ScreenScrollContext.Provider value={ctxValue}>
      <Animated.ScrollView
        {...rest}
        onScroll={scrollHandler}
        scrollEventThrottle={scrollEventThrottle}
      >
        <View ref={contentRef} collapsable={false} style={contentContainerStyle}>
          {children}
        </View>
      </Animated.ScrollView>
    </ScreenScrollContext.Provider>
  );
};
