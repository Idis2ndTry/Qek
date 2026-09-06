import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Versatz des harten Schattens in Punkten. 0 schaltet ihn ab. */
  offset?: number;
  background?: string;
  borderColor?: string;
  cornerRadius?: number;
  shadowColor?: string;
};

/**
 * Eigenschaften, die die Karte im umgebenden Layout platzieren. Sie muessen
 * an den aeusseren Container gehen - sonst spannt sich der Schatten ueber die
 * volle Breite, waehrend die Karte darin schrumpft.
 */
const LAYOUT_KEYS = [
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'zIndex',
] as const;

/**
 * Karte mit hartem Offset-Schatten - das visuelle Grundelement der App.
 *
 * Der Schatten ist eine eigene View hinter dem Inhalt statt `elevation`
 * oder `shadowRadius`: nur so sieht er auf Android und iOS gleich scharf
 * aus, wie ein aufgeklebter Retro-Sticker.
 */
export function Surface({
  children,
  style,
  offset = 4,
  background = colors.paper,
  borderColor = colors.ink,
  cornerRadius = radius.lg,
  shadowColor = colors.ink,
}: Props) {
  const flat = StyleSheet.flatten(style) ?? {};
  const layout: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    if ((LAYOUT_KEYS as readonly string[]).includes(key)) layout[key] = value;
    else inner[key] = value;
  }

  return (
    <View style={[styles.wrapper, layout as ViewStyle]}>
      {offset > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            // Der Schatten liegt vollstaendig um `offset` versetzt hinter der
            // Karte: oben/links eingerueckt, unten/rechts entsprechend heraus.
            top: offset,
            left: offset,
            right: -offset,
            bottom: -offset,
            backgroundColor: shadowColor,
            borderRadius: cornerRadius,
          }}
        />
      )}
      <View
        style={[
          styles.card,
          { backgroundColor: background, borderColor, borderRadius: cornerRadius },
          inner as ViewStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  card: {
    borderWidth: 2,
    overflow: 'hidden',
  },
});
