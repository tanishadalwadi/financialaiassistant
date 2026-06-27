import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';
import { VoiceMicButton } from './VoiceMicButton';

interface AppHeaderProps {
  /** Small line above the title (e.g. greeting). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /**
   * Custom slot to the right of the title.
   * The universal mic lives in the bottom tab bar; pass `hideVoiceButton={false}`
   * if a screen needs a header mic (e.g. stack screens without tabs).
   */
  rightElement?: React.ReactNode;
  /** When false, shows the Ask Kova mic in the header (default: hidden; mic is in tab bar). */
  hideVoiceButton?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  rightElement,
  hideVoiceButton = true,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.topRow}>
        <View style={styles.leftRow}>
          <View style={styles.badge}>
            <View style={styles.badgeInner}>
              <Text style={styles.badgeGlyph}>K</Text>
            </View>
          </View>
          <View style={styles.meta}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {rightElement || !hideVoiceButton ? (
          <View style={styles.right}>
            {rightElement}
            {!hideVoiceButton ? <VoiceMicButton size="md" /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlyph: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  title: {
    ...typography.titleL,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    fontWeight: '700',
    flexShrink: 1,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },
  right: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
