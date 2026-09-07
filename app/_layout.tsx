import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Bungee_400Regular } from '@expo-google-fonts/bungee';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_700Bold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

import { getDatabase } from '@/db/database';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Auf dem Web gibt es keinen Splash - der Fehler ist hier belanglos.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Bungee_400Regular,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_700Bold,
    Archivo_900Black,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch((error: unknown) => {
        setDbError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      });
  }, []);

  // Schriften dürfen die App nicht blockieren: fällt ihr Laden aus,
  // startet die App trotzdem mit den Systemschriften.
  const ready = (fontsLoaded || Boolean(fontError)) && (dbReady || Boolean(dbError));

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  if (dbError) {
    return (
      <View style={styles.errorScreen} onLayout={onLayout}>
        <Text style={styles.errorTitle}>Das Tagebuch lässt sich nicht öffnen</Text>
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      {/*
        Die App zeichnet randlos bis unter die Systemleisten. Android
        verkleinert die Ansicht dann nicht mehr von selbst, wenn die
        Tastatur aufgeht - der KeyboardProvider liefert die dafür nötigen
        Maße an die tastaturbewussten Listen.
      */}
      <KeyboardProvider>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.cream },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="place/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="place/[id]" />
          <Stack.Screen name="place/edit/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="rate/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="info" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
    backgroundColor: colors.cream,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
