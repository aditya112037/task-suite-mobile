import AsyncStorage from "@react-native-async-storage/async-storage";

export type IntentTarget = {
  pathname: string;
  params?: Record<string, string>;
};

const PENDING_INTENT_KEY = "task-suite-pending-intent";

export async function savePendingIntent(target: IntentTarget) {
  await AsyncStorage.setItem(PENDING_INTENT_KEY, JSON.stringify(target));
}

export async function consumePendingIntent() {
  const raw = await AsyncStorage.getItem(PENDING_INTENT_KEY);
  if (!raw) return null;

  await AsyncStorage.removeItem(PENDING_INTENT_KEY);

  try {
    return JSON.parse(raw) as IntentTarget;
  } catch {
    return null;
  }
}

export async function clearPendingIntent() {
  await AsyncStorage.removeItem(PENDING_INTENT_KEY);
}
