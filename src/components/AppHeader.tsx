import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { AwningStripes } from './AwningStripes';
import { centeredContent, colors, fonts, spacing, type as typography } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Zurück-Pfeil links. */
  showBack?: boolean;
  right?: React.ReactNode;
  /** Titel in der Retro-Displayschrift statt der Grotesk. */
  display?: boolean;
};

/** Kopfbereich mit Markisen-Streifen - auf jedem Screen gleich aufgebaut. */
export function AppHeader({ title, subtitle, showBack = false, right, display = false }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBack && (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Zurück"
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
        )}
        <View style={styles.titleBlock}>
          <Text
            style={display ? styles.displayTitle : styles.title}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      <AwningStripes height={7} stripeWidth={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paper,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  row: {
    ...centeredContent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  back: {
    marginLeft: -6,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.ink,
  },
  displayTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.red,
    letterSpacing: 0.4,
  },
  subtitle: {
    ...typography.caption,
    color: colors.inkSoft,
    marginTop: 1,
  },
});
