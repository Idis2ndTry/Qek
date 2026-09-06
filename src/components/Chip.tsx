import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, type as typography } from '@/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  small?: boolean;
};

/** Merkmal-Chip - anwählbar bei der Eingabe, reine Anzeige in der Liste. */
export function Chip({ label, selected = false, onPress, icon, small = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={{ checked: selected }}
      style={[
        styles.chip,
        small && styles.small,
        selected ? styles.selected : styles.unselected,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={small ? 12 : 14}
          color={selected ? colors.white : colors.inkSoft}
        />
      )}
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          { color: selected ? colors.white : colors.ink },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  small: {
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  selected: {
    backgroundColor: colors.red,
    borderColor: colors.ink,
  },
  unselected: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
  },
  labelSmall: {
    fontSize: 11,
  },
});
