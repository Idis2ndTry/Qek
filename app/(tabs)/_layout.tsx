import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

/** Untere Navigation: Tagebuch, Karte, Statistik, Einstellungen. */
export default function TabsLayout() {
  // Ohne den unteren Sicherheitsabstand verschwinden die Beschriftungen
  // hinter der Gestensteuerung von Android und iOS.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 22 : 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: [styles.bar, { height: 58 + bottomInset, paddingBottom: bottomInset }],
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.cream },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tagebuch',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'book' : 'book-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Karte',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'map' : 'map-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Statistik',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Mehr',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: ColorValue;
}) {
  return (
    <View style={styles.icon}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.paper,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 6,
    elevation: 0,
  },
  item: {
    paddingVertical: 2,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
