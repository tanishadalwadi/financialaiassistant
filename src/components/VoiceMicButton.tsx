/**
 * Universal "Ask Kova" mic button.
 *
 * Primary placement: center of the main bottom tab bar (`BottomTabBar`).
 * Optional header placement via `AppHeader` when `hideVoiceButton={false}`.
 * Pressing opens the global `KovaVoiceAssistant` modal with the same
 * animated Kova blob used on the Coach screen.
 *
 * Uses only the context bus; never re-subscribes to `useGoalsTransactions`,
 * so adding the button to a screen costs nothing data-wise.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { tokens } from '../theme/tokens';
import { useVoiceAssistant } from '../contexts/VoiceAssistantContext';

export interface VoiceMicButtonProps {
  /** Small variant for tighter headers / nested screens. */
  size?: 'sm' | 'md';
  /**
   * `header`: gradient fill (primary CTA in chrome).
   * `dock`: ring on elevated dark surface — reads as utility next to orange active-tab orbs.
   */
  placement?: 'header' | 'dock';
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({ size = 'md', placement = 'header' }) => {
  const { open, hasActionContext } = useVoiceAssistant();
  const dim = size === 'sm' ? 36 : placement === 'dock' ? 44 : 40;
  const iconSize = size === 'sm' ? 16 : placement === 'dock' ? 20 : 18;
  const isDock = placement === 'dock';

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Ask Kova by voice"
      hitSlop={10}
      style={({ pressed }) => [
        isDock ? styles.wrapDock : styles.wrapHeader,
        { width: dim, height: dim, borderRadius: dim / 2 },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.92 },
      ]}
    >
      {isDock ? (
        <View style={[styles.dockFace, { borderRadius: dim / 2 }]}>
          <Ionicons name="mic" size={iconSize} color={tokens.colors.textPrimary} />
        </View>
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: dim / 2 }]}
        >
          <Ionicons name="mic" size={iconSize} color={colors.primaryForeground} />
        </LinearGradient>
      )}
      {hasActionContext ? null : <View style={styles.unreadyDot} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapHeader: {
    overflow: 'visible',
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  wrapDock: {
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 8,
  },
  dockFace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.bgCardElevated,
    borderWidth: 2,
    borderColor: tokens.colors.accent,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadyDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.warning,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
});
