import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { layout } from '../theme/layout';

interface ChipProps {
  label: string;
  onPress?: () => void;
  selected?: boolean;
}

export const Chip: React.FC<ChipProps> = ({ label, onPress, selected }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.touch} activeOpacity={0.85}>
      <Text
        style={[
          styles.container,
          styles.label,
          selected ? styles.selected : styles.unselected,
          { color: selected ? colors.primaryForeground : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touch: {
    marginRight: 8,
  },
  container: {
    borderRadius: layout.chipRadius,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  selected: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unselected: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});

