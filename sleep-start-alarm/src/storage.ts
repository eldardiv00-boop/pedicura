import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, Session, Settings } from './types';

const SETTINGS_KEY = 'ssa.settings.v1';
const SESSION_KEY = 'ssa.session.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session | null): Promise<void> {
  if (session === null) {
    await AsyncStorage.removeItem(SESSION_KEY);
  } else {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}
