/**
 * VoiceAssistant
 *
 * Premium, character-driven voice surface for Kova's Coach screen.
 *
 * Four animated states:
 *   idle       — slow floating blob, mic indicator, "Ask Kova" CTA.
 *   listening  — fast morph + pink waveform + two ripple rings.
 *   thinking   — medium morph + three pulsing dots.
 *   speaking   — fast bounce + response bubble.
 *
 * Pure presentational component. The parent drives state transitions via
 * `onPress` (tap behavior depends on state — see CoachScreen and
 * `KovaVoiceAssistant` for wiring).
 *
 * Implementation notes:
 *   - Morphing blob uses four interpolated corner radii computed from the
 *     blob size so we don't depend on multi-value CSS borderRadius (RN can't
 *     parse the elliptical "a / b" form).
 *   - All loops are stopped on unmount and reset when state changes so we
 *     never leak animations between states.
 */
import React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export type VoiceAssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceAssistantProps {
  state: VoiceAssistantState;
  onPress: () => void;
  responseText?: string;
  /** When set, replaces the default title for this `state` (animation unchanged). */
  labelOverride?: string;
  /**
   * When set, replaces the default sublabel. Pass `''` to hide the sublabel row.
   * When omitted, the config default for `state` is used.
   */
  sublabelOverride?: string;
}

interface StateConfig {
  gradient: [string, string, string];
  morphDuration: number;
  glowColor: string;
  eyeGradient: [string, string];
  label: string;
  sublabel: string;
  labelColor: string;
  smileWidth: number;
  smileHeight: number;
  smileColor: string;
}

const CONFIGS: Record<VoiceAssistantState, StateConfig> = {
  idle: {
    gradient: ['#2D1F6E', '#4A3F8C', '#7B6FFF'],
    morphDuration: 6000,
    glowColor: 'rgba(123,111,255,0.30)',
    eyeGradient: ['#FF6B9D', '#FFD93D'],
    label: 'Ask Kova',
    sublabel: 'Tap to speak with your coach',
    labelColor: '#FFFFFF',
    smileWidth: 28,
    smileHeight: 14,
    smileColor: 'rgba(255,255,255,0.75)',
  },
  listening: {
    gradient: ['#3D1F6E', '#7B2FBE', '#FF6B9D'],
    morphDuration: 1200,
    glowColor: 'rgba(255,107,157,0.35)',
    eyeGradient: ['#FFFFFF', '#FFFFFF'],
    label: 'Listening...',
    sublabel: "Go ahead, I'm all ears",
    labelColor: '#FF6B9D',
    smileWidth: 32,
    smileHeight: 16,
    smileColor: 'rgba(255,255,255,0.92)',
  },
  thinking: {
    gradient: ['#1F3A8C', '#4D9EFF', '#B06FFF'],
    morphDuration: 2000,
    glowColor: 'rgba(77,158,255,0.30)',
    eyeGradient: ['#4D9EFF', '#B06FFF'],
    label: 'Thinking...',
    sublabel: 'Checking your goals & spending',
    labelColor: '#4D9EFF',
    smileWidth: 28,
    smileHeight: 14,
    smileColor: 'rgba(255,255,255,0.75)',
  },
  speaking: {
    gradient: ['#2D6E1F', '#00C896', '#FFD93D'],
    morphDuration: 700,
    glowColor: 'rgba(0,200,150,0.30)',
    eyeGradient: ['#00C896', '#FFD93D'],
    label: 'Kova says',
    sublabel: '',
    labelColor: '#00C896',
    smileWidth: 32,
    smileHeight: 16,
    smileColor: 'rgba(255,255,255,0.92)',
  },
};

const BLOB_SIZE = 220;
const BLOB_PRESS = BLOB_SIZE + 80;
const GLOW_SIZE = BLOB_SIZE + 40;
const GLOW_INSET = (BLOB_PRESS - GLOW_SIZE) / 2;

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  state,
  onPress,
  responseText,
  labelOverride,
  sublabelOverride,
}) => {
  const cfg = CONFIGS[state];
  const labelText = labelOverride ?? cfg.label;
  const sublabelText = sublabelOverride !== undefined ? sublabelOverride : cfg.sublabel;

  const morphAnim = React.useRef(new Animated.Value(0)).current;
  const glowAnim = React.useRef(new Animated.Value(0.4)).current;
  const blinkAnim = React.useRef(new Animated.Value(1)).current;
  const smileWidthAnim = React.useRef(new Animated.Value(cfg.smileWidth)).current;
  const smileHeightAnim = React.useRef(new Animated.Value(cfg.smileHeight)).current;

  // Morph loop — restarts whenever the state's `morphDuration` changes.
  React.useEffect(() => {
    morphAnim.stopAnimation();
    morphAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(morphAnim, {
          toValue: 1,
          duration: cfg.morphDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(morphAnim, {
          toValue: 0,
          duration: cfg.morphDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [cfg.morphDuration, morphAnim]);

  // Ambient glow ring pulse.
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.9, duration: 1250, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1250, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  // Periodic blink every ~4s.
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(3740),
        Animated.timing(blinkAnim, { toValue: 0.08, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blinkAnim]);

  // Smile width/height transitions on state change.
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(smileWidthAnim, {
        toValue: cfg.smileWidth,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(smileHeightAnim, {
        toValue: cfg.smileHeight,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start();
  }, [cfg.smileWidth, cfg.smileHeight, smileWidthAnim, smileHeightAnim]);

  const cornerTL = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BLOB_SIZE * 0.6, BLOB_SIZE * 0.45],
  });
  const cornerTR = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BLOB_SIZE * 0.4, BLOB_SIZE * 0.55],
  });
  const cornerBR = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BLOB_SIZE * 0.55, BLOB_SIZE * 0.6],
  });
  const cornerBL = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BLOB_SIZE * 0.45, BLOB_SIZE * 0.4],
  });

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Kova voice — ${state}`}
        style={styles.blobPress}
      >
        {/* Glow ring */}
        <RadialGlowRing glowColor={cfg.glowColor} opacity={glowAnim} />

        {/* Ripple rings — listening state only */}
        {state === 'listening' ? <RippleRings color={cfg.glowColor} /> : null}

        {/* Blob */}
        <Animated.View
          style={[
            styles.blob,
            {
              borderTopLeftRadius: cornerTL,
              borderTopRightRadius: cornerTR,
              borderBottomRightRadius: cornerBR,
              borderBottomLeftRadius: cornerBL,
            },
          ]}
        >
          <LinearGradient
            colors={cfg.gradient}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.face} pointerEvents="none">
            <View style={styles.eyesRow}>
              <Eye gradient={cfg.eyeGradient} blinkAnim={blinkAnim} />
              <View style={{ width: 22 }} />
              <Eye gradient={cfg.eyeGradient} blinkAnim={blinkAnim} />
            </View>
            <Animated.View
              style={[
                styles.smile,
                {
                  width: smileWidthAnim,
                  height: smileHeightAnim,
                  borderColor: cfg.smileColor,
                },
              ]}
            />
          </View>
        </Animated.View>
      </Pressable>

      {/* Title + sublabel */}
      <Text style={[styles.label, { color: cfg.labelColor }]}>{labelText}</Text>
      {sublabelText ? <Text style={styles.sublabel}>{sublabelText}</Text> : null}

      {/* State-specific indicator */}
      {state === 'idle' ? <IdleMicButton onPress={onPress} /> : null}
      {state === 'listening' ? <WaveformBars /> : null}
      {state === 'thinking' ? <ThinkingDots /> : null}

      {/* Response bubble — speaking state only */}
      {state === 'speaking' && responseText ? (
        <ResponseBubble text={responseText} accent={cfg.labelColor} borderColor={cfg.glowColor} />
      ) : null}
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────

const RadialGlowRing: React.FC<{
  glowColor: string;
  opacity: Animated.Value;
}> = ({ glowColor, opacity }) => {
  const gid = React.useId().replace(/:/g, '');
  const c = GLOW_SIZE / 2;
  const r = GLOW_SIZE * 0.48;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glowWrap, { width: GLOW_SIZE, height: GLOW_SIZE, opacity }]}
    >
      <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
        <Defs>
          <RadialGradient id={gid} cx={c} cy={c} rx={r} ry={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={glowColor} stopOpacity={0.55} />
            <Stop offset="55%" stopColor={glowColor} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={glowColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={r} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
};

const Eye: React.FC<{ gradient: [string, string]; blinkAnim: Animated.Value }> = ({
  gradient,
  blinkAnim,
}) => (
  <Animated.View style={[styles.eye, { transform: [{ scaleY: blinkAnim }] }]}>
    <LinearGradient
      colors={gradient}
      style={[StyleSheet.absoluteFill, { borderRadius: 7 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
    <View style={styles.eyeHighlight} />
  </Animated.View>
);

const RippleRings: React.FC<{ color: string }> = ({ color }) => {
  const scale1 = React.useRef(new Animated.Value(0.9)).current;
  const opacity1 = React.useRef(new Animated.Value(0.7)).current;
  const scale2 = React.useRef(new Animated.Value(0.9)).current;
  const opacity2 = React.useRef(new Animated.Value(0.7)).current;

  React.useEffect(() => {
    const ring1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale1, { toValue: 2.2, duration: 2000, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale1, { toValue: 0.9, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    const ring2 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale2, { toValue: 2.2, duration: 2000, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale2, { toValue: 0.9, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );

    ring1.start();
    // Phase-offset the second ring so the rings don't overlap.
    const t = setTimeout(() => ring2.start(), 600);
    return () => {
      clearTimeout(t);
      ring1.stop();
      ring2.stop();
    };
  }, [scale1, opacity1, scale2, opacity2]);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { borderColor: color, transform: [{ scale: scale1 }], opacity: opacity1 },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { borderColor: color, transform: [{ scale: scale2 }], opacity: opacity2 },
        ]}
      />
    </>
  );
};

const WAVEFORM_DELAYS = [0, 100, 200, 100, 50, 150, 80];

const WaveformBars: React.FC = () => {
  const bars = React.useMemo(
    () => WAVEFORM_DELAYS.map(() => new Animated.Value(0.3)),
    [],
  );
  React.useEffect(() => {
    const cleanups: Array<() => void> = [];
    bars.forEach((bar, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
      );
      const t = setTimeout(() => {
        loop.start();
      }, WAVEFORM_DELAYS[i]);
      cleanups.push(() => {
        clearTimeout(t);
        loop.stop();
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [bars]);

  return (
    <View style={styles.waveformRow}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[styles.waveBar, { transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
};

const ThinkingDots: React.FC = () => {
  const dots = React.useMemo(
    () => [new Animated.Value(0.4), new Animated.Value(0.4), new Animated.Value(0.4)],
    [],
  );
  React.useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { backgroundColor: '#4D9EFF', opacity: dots[0] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: '#B06FFF', opacity: dots[1] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: '#4D9EFF', opacity: dots[2] }]} />
    </View>
  );
};

const IdleMicButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Tap to start listening"
    style={({ pressed }) => [
      styles.idleMic,
      pressed && { transform: [{ scale: 0.96 }] },
    ]}
  >
    <Ionicons name="mic" size={26} color="#FFFFFF" />
  </Pressable>
);

const ResponseBubble: React.FC<{ text: string; accent: string; borderColor: string }> = ({
  text,
  accent,
  borderColor,
}) => {
  const fade = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [text, fade]);
  return (
    <Animated.View style={[styles.bubble, { opacity: fade, borderColor }]}>
      <Text style={[styles.bubbleLabel, { color: accent }]}>KOVA</Text>
      <Text style={styles.bubbleBody}>{text}</Text>
    </Animated.View>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  blobPress: {
    width: BLOB_PRESS,
    height: BLOB_PRESS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrap: {
    position: 'absolute',
    left: GLOW_INSET,
    top: GLOW_INSET,
    borderRadius: 999,
  },
  ring: {
    position: 'absolute',
    left: (BLOB_PRESS - BLOB_SIZE) / 2,
    top: (BLOB_PRESS - BLOB_SIZE) / 2,
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: 999,
    borderWidth: 2,
  },
  blob: {
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 14,
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eye: {
    width: 14,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  eyeHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  smile: {
    marginTop: 14,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  label: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sublabel: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
  },
  idleMic: {
    marginTop: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  waveformRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
  },
  waveBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#FF6B9D',
  },
  dotsRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bubble: {
    marginTop: 22,
    marginHorizontal: 24,
    maxWidth: 360,
    backgroundColor: '#1A1D27',
    borderWidth: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  bubbleBody: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 20,
  },
});
