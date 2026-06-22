import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { TOKEN_STORAGE_KEY, apiRequest } from "@/services/api";

let configured = false;

type GoogleAuthResponse = {
  token: string;
  name?: string;
};

export async function signInWithGoogle() {
  if (!configured) {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    configured = true;
  }

  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;

  if (!idToken) {
    throw new Error("No ID token from Google");
  }

  const user = await apiRequest<GoogleAuthResponse>("/api/auth/google/mobile", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });

  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, user.token);

  return user;
}
