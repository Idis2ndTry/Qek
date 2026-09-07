import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { AwningStripes } from '@/components/AwningStripes';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { CATEGORIES } from '@/constants/categories';
import { getStats, type Stats } from '@/db/repository';
import { exportBackup, importBackup } from '@/services/backup';
import { shareSummary } from '@/services/share';
import { colors, fonts, spacing, type as typography } from '@/theme';

/** Sicherung, Kategorien-Übersicht und Infos zur App. */
export default function SettingsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats);
    }, []),
  );

  const runExport = (includePhotos: boolean) => async () => {
    setBusy('export');
    try {
      const result = await exportBackup(includePhotos);
      Alert.alert(
        'Sicherung erstellt',
        `${result.fileName} (${result.sizeLabel})\n\nLeg die Datei irgendwo ab, wo sie sicher ist – zum Beispiel in deiner Cloud oder per Mail an dich selbst.`,
      );
    } catch {
      Alert.alert('Sicherung fehlgeschlagen', 'Die Datei konnte nicht erstellt werden.');
    } finally {
      setBusy(null);
    }
  };

  const runImport = () => {
    Alert.alert(
      'Sicherung einlesen',
      'Sollen die vorhandenen Einträge ersetzt oder die Sicherung zusätzlich eingefügt werden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Zusätzlich einfügen', onPress: () => doImport(false) },
        { text: 'Alles ersetzen', style: 'destructive', onPress: () => doImport(true) },
      ],
    );
  };

  const doImport = async (replace: boolean) => {
    setBusy('import');
    try {
      const result = await importBackup(replace);
      if (result.status === 'ok') {
        Alert.alert(
          'Sicherung eingelesen',
          `${result.places} ${result.places === 1 ? 'Platz' : 'Plätze'} und ${result.photos} ${result.photos === 1 ? 'Foto' : 'Fotos'} wiederhergestellt.`,
        );
        getStats().then(setStats);
      } else if (result.status === 'error') {
        Alert.alert('Einlesen fehlgeschlagen', result.message);
      }
    } catch {
      Alert.alert('Einlesen fehlgeschlagen', 'Die Sicherung konnte nicht gelesen werden.');
    } finally {
      setBusy(null);
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <AppHeader title="Mehr" display />
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.brandCard} offset={5}>
          <AwningStripes height={12} stripeWidth={20} scalloped />
          <View style={styles.brandBody}>
            <Text style={styles.brandTitle}>REISE-TAGEBUCH</Text>
            <Text style={styles.brandBy}>by @Qek_to_the_Future</Text>
            <Text style={styles.brandText}>
              Dein persönliches Camping-Reisetagebuch. Alle Einträge, Bewertungen und Fotos
              bleiben auf diesem Gerät – nichts wird irgendwohin hochgeladen.
            </Text>
            <Text style={styles.version}>Version {version}</Text>
          </View>
        </Surface>

        <Section title="Info & Feedback">
          <Row
            icon="information-circle-outline"
            title="Über die App"
            subtitle="Wie die Note entsteht und was mit deinen Daten passiert"
            onPress={() => router.push('/info')}
          />
          <Row
            icon="logo-instagram"
            title="Entwickler kontaktieren"
            subtitle="@Qek_to_the_Future – Ideen, Fehler und Platz-Tipps"
            onPress={() => router.push('/info')}
          />
          <Row
            icon="share-social-outline"
            title="Meine Reisebilanz teilen"
            subtitle="Kurze Übersicht für WhatsApp, Mail und andere"
            onPress={() =>
              stats &&
              shareSummary({
                placeCount: stats.placeCount,
                totalNights: stats.totalNights,
                averageOverall: stats.averageOverall,
                bestPlaceName: stats.bestPlace?.name ?? null,
              }).catch(() => {})
            }
            last
          />
        </Section>

        <Section title="Sicherung">
          <Row
            icon="cloud-upload-outline"
            title="Alles sichern (mit Fotos)"
            subtitle="Vollständige Kopie zum Wiederherstellen"
            onPress={runExport(true)}
            loading={busy === 'export'}
          />
          <Row
            icon="document-text-outline"
            title="Nur Daten sichern"
            subtitle="Kleine Datei ohne Bilder"
            onPress={runExport(false)}
            loading={busy === 'export'}
          />
          <Row
            icon="cloud-download-outline"
            title="Sicherung einlesen"
            subtitle="Aus einer zuvor erstellten Datei wiederherstellen"
            onPress={runImport}
            loading={busy === 'import'}
            last
          />
        </Section>
        <Text style={styles.hint}>
          Mach die Sicherung regelmäßig – zum Beispiel nach jeder Reise. Geht das Handy verloren,
          sind sonst alle Einträge weg.
        </Text>

        {stats && (
          <Section title="Dein Tagebuch">
            <InfoRow label="Plätze" value={String(stats.placeCount)} />
            <InfoRow label="Bewertet" value={String(stats.ratedCount)} />
            <InfoRow label="Fotos" value={String(stats.photoCount)} />
            <InfoRow label="Nächte" value={String(stats.totalNights)} last />
          </Section>
        )}

        <Section title={`Bewertungskategorien (${CATEGORIES.length})`}>
          {CATEGORIES.map((category, index) => (
            <View
              key={category.key}
              style={[styles.categoryRow, index === CATEGORIES.length - 1 && styles.rowLast]}
            >
              <Ionicons name={category.icon} size={17} color={colors.red} />
              <View style={styles.categoryText}>
                <Text style={styles.categoryLabel}>{category.label}</Text>
                <Text style={styles.categoryHint} numberOfLines={1}>
                  {category.hint}
                </Text>
              </View>
              <Text style={styles.weight}>×{category.defaultWeight}</Text>
            </View>
          ))}
        </Section>
        <Text style={styles.hint}>
          Der Faktor zeigt, wie stark eine Kategorie in die Gesamtnote einfließt. Sanitär, Preis
          und Lage zählen anderthalbfach, WLAN nur halb – übersprungene Kategorien zählen gar
          nicht.
        </Text>

        <Section title="Karten & Daten">
          <Row
            icon="globe-outline"
            title="Kartendaten von OpenStreetMap"
            subtitle="Freie Karten, ohne Konto und ohne Tracking"
            onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
            last
          />
        </Section>
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
  loading = false,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.row, last && styles.rowLast]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <Ionicons name={icon} size={20} color={colors.red} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons
        name={loading ? 'hourglass-outline' : 'chevron-forward'}
        size={17}
        color={colors.inkFaint}
      />
    </Pressable>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowTitle}>{label}</Text>
      <View style={styles.spacer} />
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  brandCard: {
    overflow: 'hidden',
  },
  brandBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  brandTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.red,
    letterSpacing: 0.4,
  },
  brandBy: {
    ...typography.caption,
    fontSize: 12,
    color: colors.red,
    marginTop: -4,
  },
  brandText: {
    ...typography.body,
    color: colors.inkSoft,
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
  rowSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
  },
  spacer: {
    flex: 1,
  },
  infoValue: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    color: colors.red,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  categoryText: {
    flex: 1,
  },
  categoryLabel: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.ink,
  },
  categoryHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.inkFaint,
  },
  weight: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.inkSoft,
  },
  hint: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: -spacing.md,
  },
});
