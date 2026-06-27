import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Animated, Platform } from 'react-native';
import AnimatedRN from 'react-native-reanimated';
import { useChartScrollAnimatedStyle } from '../scroll/useChartScrollAnimatedStyle';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';
import { formatCurrency } from '../lib/displayFormat';

interface LineChartCardProps {
  title?: string;
  labels: string[];
  values: number[];
}

function chartWidthFor(windowWidth: number): number {
  // Card sits inside scroll padding; chart must fit inside card padding too.
  return Math.max(168, windowWidth - layout.screenPadding * 2 - layout.cardPadding * 2 - 8);
}

export const LineChartCard: React.FC<LineChartCardProps> = ({ title, labels, values }) => {
  const { animatedStyle: scrollRevealStyle, anchorRef, onLayout, hasScrollContext } = useChartScrollAnimatedStyle();
  const { width: windowW } = useWindowDimensions();
  const width = chartWidthFor(windowW);
  /** react-native-chart-kit puts `onPress` on SVG circles for dots; on web that forwards responder props the DOM rejects. */
  const withDots = Platform.OS !== 'web';
  const fade = React.useRef(new Animated.Value(0)).current;
  const [tip, setTip] = React.useState<{
    x: number;
    y: number;
    value: number;
    label: string;
  } | null>(null);

  React.useEffect(() => {
    Animated.timing(fade, {
      toValue: tip ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [tip, fade]);

  const tipLayout = React.useMemo(() => {
    if (!tip) return null;
    const tooltipW = 120;
    const tooltipH = 58;
    const leftZone = width * 0.3;
    const rightZone = width * 0.7;
    let left = tip.x - tooltipW / 2;
    if (tip.x <= leftZone) left = tip.x - 12;
    if (tip.x >= rightZone) left = tip.x - tooltipW + 12;
    left = Math.max(8, Math.min(left, width - tooltipW - 8));
    const top = Math.max(8, tip.y - tooltipH - 20);
    return { left, top, tooltipW, tooltipH };
  }, [tip, width]);

  return (
    <AnimatedRN.View style={hasScrollContext ? scrollRevealStyle : undefined}>
      <View
        ref={hasScrollContext ? anchorRef : undefined}
        onLayout={hasScrollContext ? onLayout : undefined}
        collapsable={hasScrollContext ? false : undefined}
        style={styles.container}
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <LineChart
        data={{
          labels,
          datasets: [{ data: values }],
        }}
        width={width}
        height={180}
        withShadow={false}
        withDots={withDots}
        bezier
        chartConfig={{
          backgroundGradientFrom: 'transparent',
          backgroundGradientTo: 'transparent',
          color: (opacity = 1) => `rgba(245, 138, 31, ${opacity})`,
          labelColor: () => colors.textSecondary,
          propsForBackgroundLines: {
            stroke: 'rgba(159, 176, 192, 0.12)',
            strokeWidth: 1,
            strokeDasharray: '4 5',
          },
          propsForDots: {
            r: '3.5',
            strokeWidth: '2',
            stroke: colors.cardElevated,
          },
          decimalPlaces: 0,
        }}
        formatYLabel={(v) => {
          const n = Number(v);
          return formatCurrency(Number.isFinite(n) ? n : 0, 0);
        }}
        {...(withDots
          ? {
              onDataPointClick: ({
                value,
                index,
                x,
                y,
              }: {
                value: number;
                index: number;
                x: number;
                y: number;
              }) => {
                setTip((prev) => {
                  if (prev && prev.x === x && prev.y === y) return null;
                  return { x, y, value, label: labels[index] ?? '' };
                });
              },
            }
          : {})}
        style={styles.chart}
        />
        {tip && tipLayout ? (
        <Animated.View style={[styles.overlay, { opacity: fade }]}>
          <View
            style={[
              styles.connector,
              {
                left: tip.x - 0.5,
                top: tipLayout.top + tipLayout.tooltipH,
                height: Math.max(8, tip.y - (tipLayout.top + tipLayout.tooltipH)),
              },
            ]}
          />
          <View style={[styles.pointOuter, { left: tip.x - 3, top: tip.y - 3 }]}>
            <View style={styles.pointInner} />
          </View>
          <View style={[styles.tooltip, { left: tipLayout.left, top: tipLayout.top }]}>
            <Text style={styles.tooltipLabel}>{`${tip.label.toUpperCase()} ${new Date().getFullYear()}`}</Text>
            <Text style={[styles.tooltipValue, tip.value >= 0 ? styles.tooltipPositive : styles.tooltipNegative]}>
              {formatCurrency(tip.value, 0)}
            </Text>
          </View>
        </Animated.View>
        ) : null}
      </View>
    </AnimatedRN.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 2,
  },
  title: {
    ...typography.titleM,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  chart: {
    marginTop: 6,
    borderRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  tooltipLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  tooltipPositive: {
    color: colors.success,
  },
  tooltipNegative: {
    color: colors.danger,
  },
  connector: {
    position: 'absolute',
    width: 1,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(245, 138, 31, 0.4)',
    borderStyle: 'dashed',
  },
  pointOuter: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointInner: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textPrimary,
  },
});
