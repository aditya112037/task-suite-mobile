import { io, type Socket } from "socket.io-client";

import { API_URL } from "@/services/api";
import { getToken } from "@/services/auth";

let socket: Socket | null = null;
let pendingSocket: Promise<Socket | null> | null = null;
let authToken: string | null = null;

async function refreshAuthToken() {
  try {
    authToken = await getToken();
  } catch {
    authToken = null;
  }
  return authToken;
}

async function createSocket(): Promise<Socket | null> {
  await refreshAuthToken();
  if (!authToken) return null;

  const instance = io(API_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    auth: (cb: (auth: { token: string }) => void) => {
      void refreshAuthToken().then((token) => cb({ token: token || "" }));
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 20000,
  });

  instance.on("connect", () => {
    console.log("[socket] connected:", instance.id);
  });

  instance.on("disconnect", (reason) => {
    console.warn("[socket] disconnected:", reason);
  });

  instance.on("connect_error", (err) => {
    console.warn("[socket] connect error:", err.message);
  });

  return instance;
}

function getOrCreate(): Promise<Socket | null> {
  if (socket) return Promise.resolve(socket);
  if (!pendingSocket) {
    pendingSocket = createSocket().then((created) => {
      socket = created;
      pendingSocket = null;
      return created;
    });
  }
  return pendingSocket;
}

export function initSocket(): Socket | null {
  void getOrCreate();
  return socket;
}

export function reconnectSocket(): Socket | null {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  pendingSocket = null;
  void getOrCreate();
  return socket;
}

export function connectSocket() {
  void getOrCreate().then((created) => {
    if (created && !created.connected) created.connect();
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  pendingSocket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

export function whenConnected(callback: (connected: Socket) => void) {
  void getOrCreate().then((created) => {
    if (!created) return;
    if (created.connected) callback(created);
    else created.once("connect", () => callback(created));
  });
}

export function joinTeamRoom(teamId: string) {
  if (!teamId) return;
  whenConnected((connected) => connected.emit("joinTeam", teamId));
}

export function leaveTeamRoom(teamId: string) {
  if (!teamId) return;
  if (socket && socket.connected) {
    socket.emit("leaveTeam", teamId);
  }
}

export function sendOffer(to: string, offer: unknown) {
  socket?.connected && socket.emit("conference:offer", { to, offer });
}

export function sendAnswer(to: string, answer: unknown) {
  socket?.connected && socket.emit("conference:answer", { to, answer });
}

export function sendIceCandidate(to: string, candidate: unknown) {
  socket?.connected && socket.emit("conference:ice-candidate", { to, candidate });
}
