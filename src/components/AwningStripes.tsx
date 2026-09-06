import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  height?: number;
  stripeWidth?: number;
  /** Bogenkante unten - wie der Saum einer echten Wohnwagen-Markise. */
  scalloped?: boolean;
  /** Farbe der hellen Streifen. Standard ist Creme, damit die Leiste sich
   *  auch auf weissem Grund abhebt. */
  lightColor?: string;
  darkColor?: string;
};

/**
 * Rot-helle Streifen als Zierleiste. Das Markisen-Muster ist das
 * wiedererkennbare Camping-Motiv der App und taucht in jedem Kopfbereich auf.
 */
export function AwningStripes({
  height = 10,
  stripeWidth = 18,
  scalloped = false,
  lightColor = colors.cream,
  darkColor = colors.red,
}: Props) {
  // Grosszuegig gerechnet, damit die Leiste auch auf breiten Geraeten
  // durchgehend gefuellt ist; ueberstehende Streifen schneidet der
  // Container ab.
  const stripes = Array.from({ length: 48 });
  const radius = scalloped ? Math.min(stripeWidth / 2, height) : 0;

  return (
    <View style={[styles.row, { height }]} pointerEvents="none">
      {stripes.map((_, index) => (
        <View
          key={index}
          style={{
            width: stripeWidth,
            height,
            backgroundColor: index % 2 === 0 ? darkColor : lightColor,
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
});
