import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://task-manager-8vth.onrender.com";

async function authHeaders() {
  const token = await AsyncStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getTasks() {
  const response = await fetch(`${API_URL}/api/tasks`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to load tasks");
  }

  return response.json();
}

export async function createTask(title: string) {
  const response = await fetch(`${API_URL}/api/tasks`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      title,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create task");
  }

  return response.json();
}
