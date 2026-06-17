import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

const API_URL = "https://task-manager-8vth.onrender.com";

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  await AsyncStorage.setItem("token", data.token);

  return data;
}

export async function register(name: string, email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }

  await AsyncStorage.setItem("token", data.token);

  return data;
}

export async function getToken() {
  return AsyncStorage.getItem("token");
}

export async function logout() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google — that's fine
  }
  await AsyncStorage.removeItem("token");
}
