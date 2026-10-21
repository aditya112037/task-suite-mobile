import AsyncStorage from "@react-native-async-storage/async-storage";
// import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { TOKEN_STORAGE_KEY, apiRequest, clearStoredToken } from "@/services/api";

type AuthResponse = {
  token: string;
  name?: string;
  email?: string;
};

export async function login(email: string, password: string) {
  const data = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);

  return data;
}


// export async function register(
//   name: string,
//   email: string,
//   password: string,
//   legalConsent: boolean
// ) {
//   const data = await apiRequest<AuthResponse>("/api/auth/register", {
//     method: "POST",
//     body: JSON.stringify({
//       name,
//       email,
//       password,
//       legalConsent,
//     }),
//   });

//   await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
//   return data;
// }

export async function register(
  name: string,
  email: string,
  password: string,
  legalConsent: boolean
) {
  const data = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      legalConsent,
    }),
  });

  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
  return data;
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function logout() {
  try {
    // Load Google Sign-In only when its native module is available.
    const { GoogleSignin } = await import(
      "@react-native-google-signin/google-signin"
    );

    await GoogleSignin.signOut();
  } catch {
    // Google Sign-In may not be available in Expo Go
    // or the user may not be signed in with Google.
  }

  await clearStoredToken();
}
