import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import AnimatedRN from 'react-native-reanimated';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useChartScrollAnimatedStyle } from '../scroll/useChartScrollAnimatedStyle';
import { SpendingCategorySummary } from '../types/models';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';
import { tokens } from '../theme/tokens';
import { formatCurrency } from '../lib/displayFormat';

interface SpendingChartCardProps {
  data: SpendingCategorySummary[];
  /** When the parent renders its own section title (e.g. Insights + action link). */
  hideTitle?: boolean;
}

/** Inner width of the card (window minus screen padding and card padding). */
function cardContentWidth(windowWidth: number): number {
  return Math.max(0, windowWidth - layout.screenPadding * 2 - layout.cardPadding * 2);
}

/**
 * Donut + legend layout. Never bake width into StyleSheet — on web the first
 * `Dimensions` read at module load can be wrong, which clipped or hid the chart.
 *
 * We size the donut as a square (height = width) and prioritise making it the
 * visual anchor of the card, falling back to a stacked column only when the
 * card is too narrow to fit a meaningful chart next to the legend.
 */
function donutLayout(innerW: number): { pieW: number; useColumn: boolean } {
  const gap = tokens.spacing.md;
  const legendMin = 132;
  const pieMin = 160;
  const pieMax = 220;
  const rowNeeds = pieMin + gap + legendMin;

  if (innerW >= rowNeeds) {
    // Hand the donut ~55% of the remaining row space so it reads as the
    // primary element, not a tiny illustration tucked beside the legend.
    const pie = Math.max(
      pieMin,
      Math.min(Math.round((innerW - gap - legendMin) * 0.58) + pieMin / 2, pieMax),
    );
    return { pieW: pie, useColumn: false };
  }

  const pie = Math.max(pieMin, Math.min(Math.round(innerW * 0.78), 240));
  return { pieW: Math.min(pie, Math.max(innerW - 8, pieMin)), useColumn: true };
}

function roundedAmount(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Saturated, dark-theme-friendly slice colors (matches `CATEGORY_COLORS` in tokens). */
const COLOR_BY_LABEL: Record<string, string> = {
  Other: '#f4a261',
  Rent: '#7b61ff',
  Groceries: '#4faf8f',
  Transport: '#4da3ff',
  Subscriptions: '#c026d3',
  Shopping: '#ec4899',
  Dining: '#ed7925',
  Health: '#14b8a6',
  Income: '#4faf8f',
};

const PALETTE = [
  '#7b61ff',
  '#4da3ff',
  '#ec4899',
  '#4faf8f',
  '#ed7925',
  '#c026d3',
  '#14b8a6',
  '#f4a261',
  '#3b82f6',
  '#e76f51',
];

function nextNonAdjacentColor(current: string, prev: string, next: string): string {
  const start = Math.max(0, PALETTE.indexOf(current));
  for (let i = 1; i <= PALETTE.length; i++) {
    const c = PALETTE[(start + i) % PALETTE.length];
    if (c !== prev && c !== next) return c;
  }
  return current;
}

function applySliceColorRules(items: SpendingCategorySummary[]): SpendingCategorySummary[] {
  const base = items.map((d) => ({
    ...d,
    color: COLOR_BY_LABEL[d.label] ?? d.color ?? '#7b61ff',
  }));
  if (base.length <= 1) return base;
  const out = [...base];
  for (let pass = 0; pass < out.length + 2; pass++) {
    for (let i = 0; i < out.length; i++) {
      const prev = out[(i - 1 + out.length) % out.length].color;
      const next = out[(i + 1) % out.length].color;
      if (out[i].color === prev || out[i].color === next) {
        out[i] = { ...out[i], color: nextNonAdjacentColor(out[i].color, prev, next) };
      }
    }
  }
  return out;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startDeg: number,
  endDeg: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endDeg);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startDeg);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startDeg);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endDeg);
  const largeArcFlag = endDeg - startDeg <= 180 ? '0' : '1';
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function pieFallbackPath(cx: number, cy: number, radius: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, radius, endDeg);
  const end = polarToCartesian(cx, cy, radius, startDeg);
  const largeArcFlag = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export const SpendingChartCard: React.FC<SpendingChartCardProps> = ({ data, hideTitle }) => {
  const { width: windowW } = useWindowDimensions();
  const innerW = cardContentWidth(windowW);
  const { pieW, useColumn } = donutLayout(innerW);

  const { animatedStyle: scrollRevealStyle, anchorRef, onLayout, hasScrollContext } = useChartScrollAnimatedStyle();
  const [activeLegendId, setActiveLegendId] = React.useState<string | null>(null);
  const dismissGuardRef = React.useRef(false);
  // Square donut: height = width keeps every slice rendering as a true circle
  // segment regardless of card width.
  const pieH = pieW;
  const cx = pieW / 2;
  const cy = pieH / 2;
  const baseR = Math.min(pieW, pieH) * 0.46;
  const innerR = baseR * 0.62;

  const slices = React.useMemo(() => applySliceColorRules(data), [data]);
  const total = React.useMemo(() => slices.reduce((sum, s) => sum + Math.max(0, s.total), 0), [slices]);
  const activeItem = React.useMemo(
    () => (activeLegendId ? slices.find((d) => d.id === activeLegendId) ?? null : null),
    [activeLegendId, slices],
  );

  const arcs = React.useMemo(() => {
    let start = 0;
    return slices.map((s) => {
      const value = Math.max(0, s.total);
      const sweep = total > 0 ? (value / total) * 360 : 0;
      const end = start + sweep;
      const mid = start + sweep / 2;
      const active = activeLegendId === s.id;
      const radius = active ? baseR * 1.05 : baseR;
      const path = sweep > 359.999
        ? pieFallbackPath(cx, cy, radius, start, end)
        : arcPath(cx, cy, radius, innerR, start, end);
      const anchor = polarToCartesian(cx, cy, radius * 0.68, mid);
      const item = {
        ...s,
        path,
        mid,
        anchorX: anchor.x,
        anchorY: anchor.y,
        active,
      };
      start = end;
      return item;
    });
  }, [slices, total, activeLegendId, cx, cy, baseR]);

  const onPressSlice = (id: string) => {
    dismissGuardRef.current = true;
    setActiveLegendId((prev) => (prev === id ? null : id));
    setTimeout(() => {
      dismissGuardRef.current = false;
    }, 0);
  };

  return (
    <AnimatedRN.View style={hasScrollContext ? scrollRevealStyle : undefined}>
      <View
        ref={hasScrollContext ? anchorRef : undefined}
        onLayout={hasScrollContext ? onLayout : undefined}
        collapsable={hasScrollContext ? false : undefined}
        style={styles.container}
      >
        {hideTitle ? null : <Text style={styles.title}>Spending by category</Text>}
        <View style={[styles.contentRow, useColumn && styles.contentRowColumn]}>
        <Pressable
          style={[styles.pieWrap, { width: pieW, height: pieH }, useColumn && styles.pieWrapColumn]}
          onPress={() => {
            if (!dismissGuardRef.current) setActiveLegendId(null);
          }}
        >
          <Svg width={pieW} height={pieH}>
            <G>
              {arcs.map((slice) => (
                <Path
                  key={slice.id}
                  d={slice.path}
                  fill={slice.color}
                  fillOpacity={activeLegendId && activeLegendId !== slice.id ? 0.55 : 1}
                  onPress={() => onPressSlice(slice.id)}
                />
              ))}
              {activeItem ? (
                (() => {
                  const a = arcs.find((x) => x.id === activeItem.id);
                  if (!a) return null;
                  return (
                    <>
                      <Circle cx={a.anchorX} cy={a.anchorY} r={5} fill={activeItem.color} />
                      <Circle cx={a.anchorX} cy={a.anchorY} r={2} fill={colors.textPrimary} />
                    </>
                  );
                })()
              ) : null}
            </G>
          </Svg>
          <View style={styles.centerLabel} pointerEvents="none">
            {activeItem ? (
              <>
                <View style={styles.centerActiveHead}>
                  <View style={[styles.centerActiveDot, { backgroundColor: activeItem.color }]} />
                  <Text style={styles.centerActiveLabel} numberOfLines={1}>
                    {activeItem.label}
                  </Text>
                </View>
                <Text style={[styles.centerValue, { color: activeItem.color }]}>
                  {formatCurrency(activeItem.total, 0)}
                </Text>
                <Text style={styles.centerSubtitle}>
                  {total > 0
                    ? `${((activeItem.total / total) * 100).toFixed(1)}% of spending`
                    : '0% of spending'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.centerValue}>{formatCurrency(total, 0)}</Text>
                <Text style={styles.centerSubtitle}>This month</Text>
              </>
            )}
          </View>
        </Pressable>

        <View style={[styles.legend, useColumn && styles.legendColumn]}>
          {data.map((item, idx) => {
            const amt = roundedAmount(item.total);
            const money = formatCurrency(amt, 0);
            const active = activeLegendId === item.id;
            const swatch = slices.find((x) => x.id === item.id)?.color ?? item.color;
            return (
              <Pressable
                key={item.id}
                style={[styles.legendRow, idx === data.length - 1 && styles.legendRowLast]}
                onPress={() => setActiveLegendId((prev) => (prev === item.id ? null : item.id))}
                onHoverIn={() => setActiveLegendId(item.id)}
                onHoverOut={() => setActiveLegendId((prev) => (prev === item.id ? null : prev))}
              >
                <View style={[styles.legendDot, { backgroundColor: swatch }]} />
                <Text style={[styles.legendCategory, active && styles.legendCategoryActive]} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={[styles.legendAmount, active && { color: swatch, fontWeight: '700' }]}>
                  {money}
                  {active ? ' →' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        </View>
      </View>
    </AnimatedRN.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    marginTop: tokens.spacing.sm,
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
    marginBottom: tokens.spacing.md,
  },
  legend: {
    flex: 1,
    minWidth: 0,
    marginLeft: tokens.spacing.md,
    justifyContent: 'center',
  },
  legendColumn: {
    flex: 0,
    alignSelf: 'stretch',
    width: '100%',
    marginLeft: 0,
    marginTop: tokens.spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contentRowColumn: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  pieWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieWrapColumn: {
    alignSelf: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '62%',
  },
  centerActiveHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    maxWidth: '100%',
  },
  centerActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  centerActiveLabel: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  centerValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  centerSubtitle: {
    fontSize: 11,
    lineHeight: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.sm,
  },
  legendRowLast: {
    marginBottom: 0,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 10,
  },
  legendCategory: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  legendCategoryActive: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
  },
});
