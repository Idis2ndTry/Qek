import { type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '@/theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  background?: string;
};

/** Bildschirm-Grundgerüst mit sicherem Bereich und Papier-Hintergrund. */
export function Screen({
  children,
  style,
  edges = ['top', 'left', 'right'],
  background = colors.cream,
}: Props) {
  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style="dark" />
      <SafeAreaView edges={edges} style={[styles.safe, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
});
