import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { tokens } from '../theme/tokens';
import { layout } from '../theme/layout';
import { VoiceMicButton } from '../components/VoiceMicButton';

/**
 * Floating bottom navigation (design-system.md §7.3).
 *
 * - Five destinations share the pill evenly (no sixth slot).
 * - Voice sits above the pill on most tabs. Hidden on Coach — that screen has
 *   its own Voice / Chat toggle in the header.
 * - Active tab: orange 56px orb (single “you are here” accent).
 * - Inactives: outline icons at tertiary weight for calmer chrome.
 */

const ACTIVE_SIZE = 56;
const INACTIVE_SIZE = 42;
const ACTIVE_ICON = 24;
const INACTIVE_ICON = 22;
const PILL_PAD_V = 8;
const PILL_PAD_H = 6;
const BOTTOM_OFFSET = 18;
const DOCK_GAP = 8;

function iconName(routeName: string, focused: boolean): string {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Goals':
      return focused ? 'target' : 'target-variant';
    case 'Insights':
      return focused ? 'chart-line' : 'chart-line-variant';
    case 'Coach':
      return focused ? 'message-text' : 'message-text-outline';
    case 'Profile':
      return focused ? 'account' : 'account-outline';
    default:
      return 'circle-outline';
  }
}

function accessibilityLabel(routeName: string): string {
  if (routeName === 'Coach') return 'AI Coach';
  return routeName;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation, insets }) => {
  const bottomPad = Math.max(insets.bottom, BOTTOM_OFFSET);
  const inactiveColor = tokens.colors.textTertiary;
  const currentRouteName = state.routes[state.index]?.name;
  const showDockVoice = currentRouteName !== 'Coach';

  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingBottom: bottomPad, paddingTop: 8 }]}>
      <View style={styles.barColumn} pointerEvents="box-none">
        {showDockVoice ? (
          <>
            <View style={styles.dockRow} pointerEvents="box-none">
              <VoiceMicButton placement="dock" />
            </View>
            <View style={{ height: DOCK_GAP }} />
          </>
        ) : null}
        <View style={styles.pill} pointerEvents="auto">
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const name = iconName(route.name, isFocused);

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel(route.name)}
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                hitSlop={{ top: 4, bottom: 8, left: 4, right: 4 }}
                style={({ pressed }) => [
                  styles.tabSlot,
                  pressed && !isFocused && styles.tabSlotPressed,
                ]}
              >
                {isFocused ? (
                  <View style={styles.activeCircle}>
                    <MaterialCommunityIcons name={name as any} size={ACTIVE_ICON} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.inactiveCircle}>
                    <MaterialCommunityIcons name={name as any} size={INACTIVE_ICON} color={inactiveColor} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingHorizontal: layout.screenPadding,
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  barColumn: {
    width: '100%',
    alignItems: 'center',
  },
  dockRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: PILL_PAD_V,
    paddingHorizontal: PILL_PAD_H,
    borderRadius: 999,
    backgroundColor: tokens.colors.bgCard,
    borderWidth: 1,
    borderColor: tokens.colors.borderHover,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.42,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 22,
      },
      android: {
        elevation: 14,
      },
      default: {
        shadowColor: '#000000',
        shadowOpacity: 0.42,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 22,
      },
    }),
  },
  tabSlot: {
    flex: 1,
    minWidth: 0,
    height: ACTIVE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSlotPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  activeCircle: {
    width: ACTIVE_SIZE,
    height: ACTIVE_SIZE,
    borderRadius: ACTIVE_SIZE / 2,
    backgroundColor: tokens.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: tokens.colors.bgCard,
    ...Platform.select({
      ios: {
        shadowColor: tokens.colors.accent,
        shadowOpacity: 0.42,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      default: {
        shadowColor: tokens.colors.accent,
        shadowOpacity: 0.42,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
      },
    }),
  },
  inactiveCircle: {
    width: INACTIVE_SIZE,
    height: INACTIVE_SIZE,
    borderRadius: INACTIVE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
