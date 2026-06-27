import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop, ClipPath, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type KovaMascotState = 'idle' | 'thinking' | 'active';

type KovaMascotProps = {
  size?: number;
  state?: KovaMascotState;
  glowIntensity?: number;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

const STATE_TUNING: Record<KovaMascotState, { waveAmplitude: number; waveOpacity: number; speedMs: number; pulseScale: number }> = {
  idle: { waveAmplitude: 0.08, waveOpacity: 0.62, speedMs: 5800, pulseScale: 1.008 },
  thinking: { waveAmplitude: 0.115, waveOpacity: 0.74, speedMs: 4200, pulseScale: 1.016 },
  active: { waveAmplitude: 0.13, waveOpacity: 0.82, speedMs: 3400, pulseScale: 1.02 },
};

/**
 * KovaMascot
 * Premium ambient AI orb for:
 * - Coach loading/thinking states
 * - Ask AI modal header
 * - Empty assistive states
 */
export const KovaMascot: React.FC<KovaMascotProps> = ({
  size = 172,
  state = 'idle',
  glowIntensity = 1,
  style,
}) => {
  const cfg = STATE_TUNING[state];
  const phase = useSharedValue(0);
  const breathe = useSharedValue(1);

  const gradId = React.useMemo(() => `kova-wave-${Math.random().toString(36).slice(2, 9)}` , []);
  const glowId = React.useMemo(() => `kova-glow-${Math.random().toString(36).slice(2, 9)}` , []);
  const clipId = React.useMemo(() => `kova-clip-${Math.random().toString(36).slice(2, 9)}` , []);

  React.useEffect(() => {
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, {
        duration: cfg.speedMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    breathe.value = 1;
    breathe.value = withRepeat(
      withSequence(
        withTiming(cfg.pulseScale, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [cfg.pulseScale, cfg.speedMs, breathe, phase]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const waveAnimatedProps = useAnimatedProps(() => {
    const w = size;
    const h = size;
    const baseY = h * 0.56;
    const amp = h * cfg.waveAmplitude;
    const waveLen = w * 0.85;
    const p = phase.value * Math.PI * 2;
    const steps = 30;

    let d = `M ${-w * 0.15} ${baseY}`;
    for (let i = 0; i <= steps; i += 1) {
      const x = -w * 0.15 + (w * 1.3 * i) / steps;
      const y = baseY + Math.sin((x / waveLen) * Math.PI * 2 + p) * amp;
      d += ` L ${x} ${y}`;
    }
    return { d };
  });

  const waveSecondaryProps = useAnimatedProps(() => {
    const w = size;
    const h = size;
    const baseY = h * 0.56;
    const amp = h * (cfg.waveAmplitude * 0.72);
    const waveLen = w * 0.8;
    const p = phase.value * Math.PI * 2 + 1.35;
    const steps = 30;

    let d = `M ${-w * 0.15} ${baseY}`;
    for (let i = 0; i <= steps; i += 1) {
      const x = -w * 0.15 + (w * 1.3 * i) / steps;
      const y = baseY + Math.sin((x / waveLen) * Math.PI * 2 + p) * amp;
      d += ` L ${x} ${y}`;
    }
    return { d };
  });

  const dotsGroupProps = useAnimatedProps(() => {
    const tx = (phase.value - 0.5) * size * 0.28;
    return { transform: `translate(${tx} 0)` } as unknown as { transform: string };
  });

  const glowAlpha = Math.max(0.22, Math.min(1, glowIntensity)) * cfg.waveOpacity;

  return (
    <Animated.View
      style={[
        styles.orbShell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowOpacity: 0.24 * glowIntensity,
          shadowRadius: size * 0.14,
        },
        orbStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.24)',
          'rgba(228,234,248,0.10)',
          'rgba(208,214,232,0.07)',
        ]}
        locations={[0, 0.35, 1]}
        style={styles.fill}
      />

      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={size / 2} cy={size / 2} r={size / 2 - 2} />
          </ClipPath>
          <SvgLinearGradient id={gradId} x1="0%" y1="50%" x2="100%" y2="50%">
            <Stop offset="0%" stopColor="rgba(255,166,210,0.0)" />
            <Stop offset="18%" stopColor={`rgba(255,168,217,${0.58 * glowAlpha})`} />
            <Stop offset="48%" stopColor={`rgba(255,183,160,${0.76 * glowAlpha})`} />
            <Stop offset="78%" stopColor={`rgba(255,210,140,${0.68 * glowAlpha})`} />
            <Stop offset="100%" stopColor="rgba(255,219,176,0.0)" />
          </SvgLinearGradient>
          <SvgLinearGradient id={glowId} x1="0%" y1="50%" x2="100%" y2="50%">
            <Stop offset="0%" stopColor="rgba(255,178,224,0)" />
            <Stop offset="50%" stopColor={`rgba(255,195,170,${0.42 * glowAlpha})`} />
            <Stop offset="100%" stopColor="rgba(255,209,166,0)" />
          </SvgLinearGradient>
        </Defs>

        <G clipPath={`url(#${clipId})`}>
          <AnimatedPath
            animatedProps={waveAnimatedProps}
            stroke={`url(#${gradId})`}
            strokeWidth={size * 0.135}
            strokeLinecap="round"
            fill="none"
          />
          <AnimatedPath
            animatedProps={waveSecondaryProps}
            stroke={`url(#${glowId})`}
            strokeWidth={size * 0.2}
            strokeLinecap="round"
            opacity={0.7 * glowAlpha}
            fill="none"
          />
          <AnimatedPath
            animatedProps={waveAnimatedProps}
            stroke="rgba(255,238,222,0.55)"
            strokeWidth={size * 0.017}
            strokeDasharray={`${size * 0.011} ${size * 0.028}`}
            strokeLinecap="round"
            opacity={0.7 * glowAlpha}
            fill="none"
          />

          <AnimatedG animatedProps={dotsGroupProps}>
            <Circle cx={size * 0.34} cy={size * 0.52} r={size * 0.009} fill="rgba(255,217,196,0.9)" />
            <Circle cx={size * 0.48} cy={size * 0.49} r={size * 0.007} fill="rgba(255,192,214,0.8)" />
            <Circle cx={size * 0.64} cy={size * 0.56} r={size * 0.008} fill="rgba(255,206,162,0.82)" />
          </AnimatedG>
        </G>

        <Circle
          cx={size * 0.35}
          cy={size * 0.18}
          r={size * 0.22}
          fill="rgba(255,255,255,0.15)"
        />
        <Circle
          cx={size * 0.5}
          cy={size * 0.9}
          r={size * 0.3}
          fill="rgba(255,255,255,0.12)"
        />
      </Svg>

      <View
        pointerEvents="none"
        style={[
          styles.rim,
          {
            borderRadius: size / 2,
            borderColor: `rgba(255,255,255,${0.24 + 0.08 * glowIntensity})`,
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  orbShell: {
    overflow: 'hidden',
    backgroundColor: 'rgba(240,244,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#ffd1b4',
    shadowOffset: { width: 0, height: 10 },
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
});
