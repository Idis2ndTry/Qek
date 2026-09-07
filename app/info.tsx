import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { AppHeader } from '@/components/AppHeader';
import { AwningStripes } from '@/components/AwningStripes';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { CATEGORIES } from '@/constants/categories';
import { openFeedbackMail, openInstagram } from '@/services/links';
import { colors, fonts, radius, spacing, type as typography } from '@/theme';

/** Info über die App, Kontakt zum Entwickler und Feedback-Wege. */
export default function InfoScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <AppHeader title="Info & Feedback" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.hero} offset={5}>
          <AwningStripes height={14} stripeWidth={22} scalloped />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>REISE-TAGEBUCH</Text>
            <Text style={styles.heroBy}>by @Qek_to_the_Future</Text>
            <Text style={styles.heroText}>
              Ein Camping-Tagebuch aus dem Wohnwagen heraus entstanden: Plätze festhalten, ehrlich
              bewerten und beim nächsten Mal wissen, wo es sich wirklich gelohnt hat.
            </Text>
            <View style={styles.versionRow}>
              <Text style={styles.version}>Version {version}</Text>
            </View>
          </View>
        </Surface>

        <Section title="Kontakt">
          <Pressable
            style={styles.instagram}
            onPress={() => openInstagram().catch(() => {})}
            accessibilityRole="button"
            accessibilityLabel="Instagram-Profil Qek to the Future öffnen"
          >
            <View style={styles.instagramIcon}>
              <Ionicons name="logo-instagram" size={24} color={colors.white} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.instagramHandle}>@Qek_to_the_Future</Text>
              <Text style={styles.rowSub}>
                Schreib mir eine Nachricht – Ideen, Fehler oder einfach ein Platz-Tipp
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.inkSoft} />
          </Pressable>
        </Section>

        <Section title="Feedback">
          <Row
            icon="bug-outline"
            title="Fehler melden"
            subtitle="Per Mail, mit App-Version und Gerät im Text"
            onPress={() => openFeedbackMail(version).catch(() => {})}
          />
          <Row
            icon="bulb-outline"
            title="Idee vorschlagen"
            subtitle="Was fehlt dir? Was würdest du anders machen?"
            onPress={() => openInstagram().catch(() => {})}
            last
          />
        </Section>
        <Text style={styles.note}>
          Jede Rückmeldung hilft – gerade in dieser frühen Fassung. Am schnellsten geht es über
          Instagram.
        </Text>

        <Section title="So funktioniert die Note">
          <View style={styles.explainRow}>
            <Text style={styles.explainText}>
              Jeder Platz wird in {CATEGORIES.length} Kategorien mit ein bis fünf Sternen bewertet.
              Daraus entsteht eine gewichtete Gesamtnote: Sanitär, Preis-Leistung und Lage zählen
              anderthalbfach, WLAN nur halb. Was du überspringst, fließt gar nicht ein – wer
              Internet nicht bewertet, wird dafür auch nicht abgestraft.
            </Text>
          </View>
        </Section>

        <Section title="Deine Daten">
          <View style={styles.explainRow}>
            <Text style={styles.explainText}>
              Alle Einträge, Bewertungen und Fotos bleiben auf diesem Gerät. Es gibt kein Konto,
              keinen Server und keine Werbung. Nach außen geht nur die Suche nach Campingplätzen –
              und die läuft über OpenStreetMap, nicht über mich.
            </Text>
          </View>
          <Row
            icon="globe-outline"
            title="Kartendaten von OpenStreetMap"
            subtitle="Freie Karten, ohne Konto und ohne Tracking"
            onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
            last
          />
        </Section>

        <Text style={styles.footer}>
          Danke fürs Ausprobieren!{'\n'}Gute Fahrt und immer einen ebenen Stellplatz.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <Surface offset={3}>{children}</Surface>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, last && styles.rowLast]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <Ionicons name={icon} size={20} color={colors.red} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  hero: {
    overflow: 'hidden',
  },
  heroBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.red,
    letterSpacing: 0.4,
  },
  heroBy: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: -4,
  },
  heroText: {
    ...typography.body,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  versionRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  version: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.inkFaint,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.inkSoft,
  },
  instagram: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  instagramIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instagramHandle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.ink,
  },
  rowSub: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
  },
  explainRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  explainText: {
    ...typography.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  note: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: -spacing.md,
  },
  footer: {
    ...typography.caption,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
