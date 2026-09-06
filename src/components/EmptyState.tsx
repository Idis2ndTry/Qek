import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RetroButton } from './RetroButton';
import { colors, spacing, type as typography } from '@/theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Freundlicher Platzhalter, wenn eine Liste noch leer ist. */
export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconRing}>
        <Ionicons name={icon} size={38} color={colors.red} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <RetroButton label={actionLabel} onPress={onAction} icon="add" style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    backgroundColor: colors.redWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.inkSoft,
    textAlign: 'center',
    maxWidth: 300,
  },
  action: {
    marginTop: spacing.lg,
  },
});
