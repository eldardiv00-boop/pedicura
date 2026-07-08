import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initAudio } from './src/audio';
import { configureNotifications, requestNotificationPermissions } from './src/notifications';
import { ActiveSessionScreen } from './src/screens/ActiveSessionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { loadSettings, saveSettings } from './src/storage';
import { colors } from './src/theme';
import { DEFAULT_SETTINGS, Settings } from './src/types';
import { useSleepSession } from './src/useSleepSession';

type Screen = 'home' | 'settings';

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [permissionsGranted, setPermissionsGranted] = useState(true);

  const { session, sessionLoaded, now, start, imAwake, stop, snooze } = useSleepSession(settings);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setSettingsLoaded(true);
    });
    initAudio();
    configureNotifications();
    requestNotificationPermissions().then(setPermissionsGranted);
  }, []);

  // Persist settings whenever they change (skipping the initial load).
  const firstSave = useRef(true);
  useEffect(() => {
    if (!settingsLoaded) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    saveSettings(settings);
  }, [settings, settingsLoaded]);

  if (!settingsLoaded || !sessionLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <StatusBar style="light" />
          <Text style={styles.loadingText}>Sleep Start Alarm</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        {session ? (
          <ActiveSessionScreen
            session={session}
            settings={settings}
            now={now}
            onImAwake={imAwake}
            onStop={stop}
            onSnooze={snooze}
          />
        ) : screen === 'settings' ? (
          <SettingsScreen settings={settings} onChange={setSettings} onBack={() => setScreen('home')} />
        ) : (
          <HomeScreen
            settings={settings}
            permissionsGranted={permissionsGranted}
            onStart={start}
            onOpenSettings={() => setScreen('settings')}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 18,
    letterSpacing: 2,
  },
});
