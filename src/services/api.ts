import AsyncStorage from "@react-native-async-storage/async-storage";

export const TOKEN_STORAGE_KEY = "token";

const FALLBACK_API_URL = "https://task-manager-8vth.onrender.com";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_URL).replace(/\/$/, "");

type ApiErrorData =
  | string
  | {
      error?: string;
      message?: string;
      [key: string]: unknown;
    }
  | null;

export class ApiError extends Error {
  status: number;
  data: ApiErrorData;

  constructor(message: string, status: number, data: ApiErrorData = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Your session expired. Please sign in again.", data: ApiErrorData = null) {
    super(message, 401, data);
    this.name = "UnauthorizedError";
  }
}

function getErrorMessage(data: ApiErrorData, fallback: string) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const message = data.message || data.error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const { auth = false, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type") && rest.body) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      throw new UnauthorizedError();
    }

    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_URL}${normalizedPath}`, {
    ...rest,
    headers: requestHeaders,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = getErrorMessage(data as ApiErrorData, "Request failed");

    if (response.status === 401) {
      throw new UnauthorizedError(message, data as ApiErrorData);
    }

    throw new ApiError(message, response.status, data as ApiErrorData);
  }

  return data as T;
}

export async function clearStoredToken() {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

export type HealthcheckResponse = {
  status: string;
  message: string;
  timestamp: string;
  environment?: string;
  socketConnections?: number;
  activeConferences?: number;
};

export async function testConnection() {
  return apiRequest<HealthcheckResponse>("/");
}
