import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

const API_URL = "https://task-manager-8vth.onrender.com";

let configured = false;

export async function signInWithGoogle() {
  if (!configured) {
    GoogleSignin.configure({
      webClientId: "204475000208-sjtd05brlf11g2o4p0ipovjnreghucoa.apps.googleusercontent.com",
    });
    configured = true;
  }

  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();

  const idToken = response.data?.idToken;

  if (!idToken) {
    throw new Error("No ID token from Google");
  }

  const apiResponse = await fetch(`${API_URL}/api/auth/google/mobile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const user = await apiResponse.json();

  if (!apiResponse.ok) {
    throw new Error(user.message || "Google sign-in failed");
  }

  await AsyncStorage.setItem("token", user.token);

  return user;
}
