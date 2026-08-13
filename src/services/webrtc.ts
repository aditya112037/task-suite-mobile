import { sendAnswer, sendIceCandidate, sendOffer } from "@/services/socket";

type RTCPeerConnectionLike = {
  onicecandidate: ((e: { candidate: unknown } | null) => void) | null;
  ontrack: ((e: { track: MediaStreamTrackLike; streams: MediaStreamLike[]; stream: MediaStreamLike }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  signalingState: string;
  connectionState: string;
  iceConnectionState: string;
  addTrack(track: MediaStreamTrackLike, stream: MediaStreamLike): unknown;
  removeTrack(sender: unknown): void;
  addIceCandidate(candidate: unknown): Promise<void>;
  createOffer(options?: unknown): Promise<{ type: string; sdp: string }>;
  setLocalDescription(description: unknown): Promise<void>;
  setRemoteDescription(description: unknown): Promise<void>;
  createAnswer(): Promise<{ type: string; sdp: string }>;
  getSenders(): unknown[];
  getReceivers(): Array<{ track: MediaStreamTrackLike }>;
  close(): void;
};

type MediaStreamTrackLike = {
  id: string;
  kind: "audio" | "video";
  readyState: "live" | "ended";
  enabled: boolean;
  stop(): void;
  onended: (() => void) | null;
};

type MediaStreamLike = {
  id: string;
  getAudioTracks(): MediaStreamTrackLike[];
  getVideoTracks(): MediaStreamTrackLike[];
  getTracks(): MediaStreamTrackLike[];
};

type MediaDeviceInfoLike = { deviceId: string; kind: string; label: string };

type RTCModule = {
  RTCPeerConnection: new (config: { iceServers: Array<{ urls: string }> }) => RTCPeerConnectionLike;
  MediaStream: new (tracks?: MediaStreamTrackLike[]) => MediaStreamLike;
  mediaDevices: {
    getUserMedia(constraints: Record<string, unknown>): Promise<MediaStreamLike>;
    getAudioDevices(): Promise<MediaDeviceInfoLike[]>;
    getVideoDevices(): Promise<MediaDeviceInfoLike[]>;
  };
};

type Listener = (event: EventLike) => void;

type EventLike = { type: string; socketId: string; [key: string]: unknown };

type RemoteMediaDetail = {
  socketId: string;
  audioStream: MediaStreamLike | null;
  cameraStream: MediaStreamLike | null;
};

type Peer = {
  pc: RTCPeerConnectionLike;
  senders: { audio: unknown; camera: unknown };
  makingOffer: boolean;
};

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

const peers = new Map<string, Peer>();
let audioStream: MediaStreamLike | null = null;
let cameraStream: MediaStreamLike | null = null;
let renegotiateTimeout: ReturnType<typeof setTimeout> | null = null;
let rtcModule: RTCModule | null | undefined;

export const webrtcSupported = () => {
  if (rtcModule !== undefined) return rtcModule !== null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rtcModule = require("react-native-webrtc") as RTCModule;
  } catch {
    rtcModule = null;
  }
  return rtcModule !== null;
};

const listeners = new Set<Listener>();

export function addWebRTCListener(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitEvent(event: EventLike) {
  listeners.forEach((listener) => listener(event));
}

function emitRemoteMediaUpdate(socketId: string) {
  const peer = peers.get(socketId);
  const module = rtcModule;
  if (!peer || !module) return;

  const audioStreams: MediaStreamTrackLike[] = [];
  const cameraStreams: MediaStreamTrackLike[] = [];
  peer.pc
    .getReceivers?.()
    .forEach((receiver: { track?: MediaStreamTrackLike }) => {
      const track = receiver.track;
      if (!track) return;
      if (track.kind === "audio") {
        audioStreams.push(track);
      } else if (track.kind === "video") {
        cameraStreams.push(track);
      }
    });

  const makeStream = (tracks: MediaStreamTrackLike[]) =>
    tracks.length ? new module.MediaStream(tracks as never) : null;

  emitEvent({
    type: "remote-media",
    socketId,
    audioStream: makeStream(audioStreams),
    cameraStream: makeStream(cameraStreams),
  } as unknown as EventLike);
}

function createPeerConnection(socketId: string) {
  if (!rtcModule) throw new Error("WebRTC unavailable");
  const pc = new rtcModule.RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (e) => {
    if (!e?.candidate) return;
    sendIceCandidate(socketId, e.candidate);
  };

  pc.ontrack = (e) => {
    emitRemoteMediaUpdate(socketId);
  };

  pc.onconnectionstatechange = () => {
    emitEvent({
      type: "peer-state",
      socketId,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
    } as unknown as EventLike);
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      emitRemoteMediaUpdate(socketId);
    }
  };

  return pc;
}

function getOrCreatePeer(socketId: string): Peer {
  const existing = peers.get(socketId);
  if (existing) return existing;
  const peer: Peer = {
    pc: createPeerConnection(socketId),
    makingOffer: false,
    senders: { audio: null, camera: null },
  };
  peers.set(socketId, peer);
  return peer;
}

async function renegotiatePeer(socketId: string) {
  const peer = peers.get(socketId);
  if (!peer || peer.makingOffer || peer.pc.signalingState !== "stable") return;
  try {
    peer.makingOffer = true;
    const offer = await peer.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    if (peer.pc.signalingState !== "stable") return;
    await peer.pc.setLocalDescription(offer);
    sendOffer(socketId, offer);
  } catch {
    // ignore renegotiation race errors
  } finally {
    peer.makingOffer = false;
  }
}

async function renegotiateAllPeers() {
  await Promise.all(Array.from(peers.keys()).map((id) => renegotiatePeer(id)));
}

function scheduleRenegotiation() {
  if (renegotiateTimeout) clearTimeout(renegotiateTimeout);
  renegotiateTimeout = setTimeout(() => {
    renegotiateTimeout = null;
    void renegotiateAllPeers();
  }, 150);
}

async function upsertSender(peer: Peer, key: "audio" | "camera", track: MediaStreamTrackLike | null, stream: MediaStreamLike | null) {
  const existing = peer.senders[key];
  if (!track) {
    if (existing) {
      try {
        peer.pc.removeTrack(existing);
      } catch {
        // ignore stale sender removal
      }
      peer.senders[key] = null;
    }
    return;
  }
  if (existing) {
    try {
      await (existing as { replaceTrack?: (t: MediaStreamTrackLike) => Promise<void> }).replaceTrack?.(track);
    } catch {
      // ignore
    }
    return;
  }
  if (stream) {
    peer.senders[key] = peer.pc.addTrack(track, stream);
  }
}

async function syncPeerTracks(socketId: string) {
  const peer = peers.get(socketId);
  if (!peer) return;
  const audioTrack = audioStream?.getAudioTracks?.()[0] || null;
  const cameraTrack = cameraStream?.getVideoTracks?.()[0] || null;
  await upsertSender(peer, "audio", audioTrack, audioStream);
  await upsertSender(peer, "camera", cameraTrack, cameraStream);
}

export async function syncAllPeerTracks() {
  await Promise.all(Array.from(peers.keys()).map((id) => syncPeerTracks(id)));
}

export async function createPeer(socketId: string) {
  const peer = getOrCreatePeer(socketId);
  await syncPeerTracks(socketId);
  return peer.pc;
}

export async function createOffer(socketId: string) {
  getOrCreatePeer(socketId);
  await syncPeerTracks(socketId);
  await renegotiatePeer(socketId);
}

export async function handleOffer(payload: { from: string; offer: unknown }) {
  if (!rtcModule) return;
  const peer = getOrCreatePeer(payload.from);
  if (peer.pc.signalingState !== "stable") {
    await Promise.allSettled([
      peer.pc.setLocalDescription({ type: "rollback" }),
      peer.pc.setRemoteDescription(payload.offer),
    ]);
  } else {
    await peer.pc.setRemoteDescription(payload.offer);
  }
  await syncPeerTracks(payload.from);
  const answer = await peer.pc.createAnswer();
  await peer.pc.setLocalDescription(answer);
  sendAnswer(payload.from, answer);
}

export async function handleAnswer(payload: { from: string; answer: unknown }) {
  const peer = peers.get(payload.from);
  if (!peer) return;
  if (peer.pc.signalingState === "have-local-offer") {
    await peer.pc.setRemoteDescription(payload.answer);
  }
}

export async function handleIceCandidate(payload: { from: string; candidate: unknown }) {
  const peer = peers.get(payload.from);
  if (!peer || !payload.candidate) return;
  try {
    await peer.pc.addIceCandidate(payload.candidate);
  } catch {
    // ignore race candidates
  }
}

export function removePeer(socketId: string) {
  const peer = peers.get(socketId);
  if (!peer) return;
  try {
    peer.pc.getSenders().forEach((sender) => {
      try {
        peer.pc.removeTrack(sender);
      } catch {
        // ignore
      }
    });
    peer.pc.close();
  } catch {
    // ignore
  }
  peers.delete(socketId);
  emitEvent({
    type: "remote-media",
    socketId,
    audioStream: null,
    cameraStream: null,
  } as unknown as EventLike);
}

export function closeAllPeers() {
  Array.from(peers.keys()).forEach(removePeer);
}

export function getPeerIds() {
  return Array.from(peers.keys());
}

export async function startAudio() {
  if (!rtcModule) return null;
  if (audioStream) return audioStream;

  let stream: MediaStreamLike | null = null;
  try {
    stream = await rtcModule.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    try {
      stream = await rtcModule.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return null;
    }
  }

  const track = stream.getAudioTracks()[0];
  if (track) {
    track.enabled = true;
    track.onended = () => {
      if (audioStream !== stream) return;
      audioStream = null;
      void syncAllPeerTracks().then(() => scheduleRenegotiation());
    };
  }

  audioStream = stream;
  await syncAllPeerTracks();
  scheduleRenegotiation();
  return audioStream;
}

export async function setMicEnabled(enabled: boolean) {
  if (!audioStream) {
    if (!enabled) return false;
    await startAudio();
  }
  const track = audioStream?.getAudioTracks?.()[0];
  if (!track) return false;
  track.enabled = Boolean(enabled);
  return track.enabled;
}

export async function startCamera() {
  if (!rtcModule) return null;
  if (cameraStream) return cameraStream;

  try {
    cameraStream = await rtcModule.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
      audio: false,
    });
  } catch {
    return null;
  }

  await syncAllPeerTracks();
  scheduleRenegotiation();
  return cameraStream;
}

export async function stopCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((t) => t.stop());
  cameraStream = null;
  await syncAllPeerTracks();
  scheduleRenegotiation();
}

export async function cleanupWebRTC() {
  closeAllPeers();
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  if (audioStream) {
    audioStream.getTracks().forEach((t) => t.stop());
    audioStream = null;
  }
  if (renegotiateTimeout) {
    clearTimeout(renegotiateTimeout);
    renegotiateTimeout = null;
  }
}

export function getLocalStreams() {
  return { audioStream, cameraStream };
}