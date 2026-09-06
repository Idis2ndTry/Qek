import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Props = {
  /** Gesamtnote von 1 bis 5, null wenn noch nicht bewertet. */
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
};

/** Die Gesamtnote als Retro-Plakette. Die Farbe folgt der Note. */
export function ScoreBadge({ score, size = 'md' }: Props) {
  const dimension = size === 'lg' ? 76 : size === 'md' ? 54 : 42;
  const fontSize = size === 'lg' ? 26 : size === 'md' ? 19 : 15;
  const background = score === null ? colors.line : scoreColor(score);
  const textColor = score === null ? colors.inkSoft : colors.white;

  return (
    <View
      style={[
        styles.badge,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius.md,
          backgroundColor: background,
        },
      ]}
      accessibilityLabel={score === null ? 'Noch nicht bewertet' : `Note ${score.toFixed(1)} von 5`}
    >
      <Text style={[styles.value, { fontSize, color: textColor }]}>
        {score === null ? '–' : score.toFixed(1)}
      </Text>
      {size !== 'sm' && score !== null && <Text style={styles.max}>von 5</Text>}
    </View>
  );
}

/** Von Rot (schlecht) über Gold (mittel) nach Grün (top). */
export function scoreColor(score: number): string {
  if (score >= 4.2) return colors.mint;
  if (score >= 3.4) return '#7BA05B';
  if (score >= 2.6) return colors.gold;
  if (score >= 1.8) return colors.redLight;
  return colors.redDark;
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
  value: {
    fontFamily: fonts.monoBold,
    color: colors.white,
  },
  max: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.white,
    opacity: 0.85,
    marginTop: -2,
  },
});
