import { useCallback, useContext, useEffect, useRef } from 'react';
import { useWindowDimensions, type View as RNView } from 'react-native';
import {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { ScreenScrollContext } from './screenScrollContext';

/**
 * Scroll-driven reveal + subtle motion for chart blocks. Measures layout only on
 * layout / resize / delayed pass (after stagger), not per scroll frame.
 */
export function useChartScrollAnimatedStyle() {
  const ctx = useContext(ScreenScrollContext);
  const layoutTop = useSharedValue(Number.NaN);
  const { height: windowH } = useWindowDimensions();
  const viewportH = useSharedValue(windowH);
  const anchorRef = useRef<RNView>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    viewportH.value = windowH;
  }, [windowH, viewportH]);

  /**
   * Cross-platform measurement using `measureInWindow` (web + native).
   * `findNodeHandle` is not supported by react-native-web, so we avoid
   * `measureLayout` entirely. Both anchor and content shift together when
   * the ScrollView scrolls, so `anchorY - contentY` is invariant to scroll
   * and gives the stable layout offset we need.
   */
  const measure = useCallback(() => {
    if (!ctx?.contentRef?.current || !anchorRef.current) return;
    const anchor = anchorRef.current;
    const content = ctx.contentRef.current;
    anchor.measureInWindow((_ax, ay) => {
      if (!Number.isFinite(ay)) return;
      content.measureInWindow((_cx, cy) => {
        if (!Number.isFinite(cy)) return;
        layoutTop.value = ay - cy;
      });
    });
  }, [ctx, layoutTop]);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      measure();
    });
  }, [measure]);

  const onLayout = useCallback(() => {
    scheduleMeasure();
  }, [scheduleMeasure]);

  useEffect(() => {
    scheduleMeasure();
    const t = setTimeout(scheduleMeasure, 480);
    return () => {
      clearTimeout(t);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleMeasure, windowH]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!ctx || Number.isNaN(layoutTop.value)) {
      return {};
    }
    const sy = ctx.scrollY.value;
    const y = layoutTop.value;
    const H = viewportH.value;
    const enterStart = y - H * 0.92;
    const enterEnd = y - H * 0.18;
    const t = interpolate(sy, [enterStart, enterEnd], [0, 1], Extrapolate.CLAMP);
    const p = t * t * (3 - 2 * t);
    const wobble = Math.sin(sy * 0.0115) * 1.65 * p;
    return {
      opacity: 0.56 + 0.44 * p,
      transform: [{ translateY: (1 - p) * 18 }, { scale: 0.965 + 0.035 * p }, { rotate: `${wobble}deg` }],
    };
  }, [ctx]);

  return { animatedStyle, anchorRef, onLayout, hasScrollContext: Boolean(ctx) };
}
