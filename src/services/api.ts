const API_URL = "https://task-manager-8vth.onrender.com";

export async function testConnection() {
  const response = await fetch(API_URL);

  const data = await response.json();

  return data;
}