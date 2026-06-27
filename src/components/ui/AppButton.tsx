import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors } from '../../theme/colors';
import { tokens } from '../../theme/tokens';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  fullWidth?: boolean;
  /** Use in horizontal button rows (e.g. modal actions). */
  flex?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const sizeMap = {
  sm: { minH: 40, padH: 16, font: 14 as const, weight: '600' as const },
  md: { minH: 48, padH: 20, font: 15 as const, weight: '600' as const },
  lg: { minH: 52, padH: 22, font: 16 as const, weight: '700' as const },
};

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  flex = false,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}) => {
  const s = sizeMap[size];
  const busy = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: busy }}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: s.minH,
          paddingHorizontal: s.padH,
          borderRadius: tokens.radius.full,
        },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        fullWidth && styles.fullWidth,
        flex && styles.flex,
        variant === 'primary' && !busy && styles.primaryShadow,
        pressed && !busy && styles.pressed,
        busy && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'secondary' || variant === 'ghost'
              ? colors.primary
              : variant === 'danger'
                ? colors.danger
                : colors.primaryForeground
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            {
              fontSize: s.font,
              fontWeight: s.weight,
            },
            variant === 'primary' && styles.labelOnPrimary,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'ghost' && styles.labelGhost,
            variant === 'danger' && styles.labelDanger,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  flex: {
    flex: 1,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryShadow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    textAlign: 'center',
  },
  labelOnPrimary: {
    color: colors.primaryForeground,
  },
  labelSecondary: {
    color: colors.textPrimary,
  },
  labelGhost: {
    color: colors.primary,
    fontWeight: '600',
  },
  labelDanger: {
    color: colors.danger,
  },
});
