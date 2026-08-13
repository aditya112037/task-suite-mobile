import { getSocket, sendAnswer, sendIceCandidate, sendOffer, whenConnected } from "@/services/socket";

export type ConferenceParticipant = {
  userId: string;
  role: string;
  name: string;
  socketId: string;
  micOn: boolean;
  camOn: boolean;
};

export type ConferenceState = {
  active: boolean;
  conference: {
    conferenceId: string;
    teamId: string;
    createdBy?: { _id: string; name: string; role: string };
    startedAt: string;
    speakerMode?: { enabled: boolean; activeSpeaker: string | null };
  } | null;
};

export type JoinRequest = {
  userId: string;
  name: string;
  role: string;
  socketId: string;
  requestedAt: string;
};

export type ConferenceHandlers = {
  onJoined?: (payload: { participants: ConferenceParticipant[] }) => void;
  onUserJoined?: (payload: { socketId: string; userId: string; userName: string }) => void;
  onUserLeft?: (payload: { socketId: string; userId: string; reason: string }) => void;
  onParticipantsUpdate?: (payload: { participants: ConferenceParticipant[]; teamId?: string }) => void;
  onHandsUpdated?: (payload: { raisedHands: string[] }) => void;
  onJoinRequestsUpdate?: (payload: { conferenceId: string; joinRequests: JoinRequest[] }) => void;
  onConferenceEnded?: (payload: { conferenceId: string; teamId: string; reason: string }) => void;
  onConferenceStarted?: (payload: { conferenceId: string; teamId: string }) => void;
  onStateUpdate?: (payload: ConferenceState) => void;
  onJoinPending?: (payload: { conferenceId: string; message: string }) => void;
  onJoinRequested?: (payload: { conferenceId: string; request: JoinRequest; message: string }) => void;
  onJoinApproved?: (payload: { conferenceId: string; teamId: string; autoJoin?: boolean }) => void;
  onJoinRejected?: (payload: { conferenceId: string; teamId: string; reviewedBy?: string }) => void;
  onError?: (payload: { message: string }) => void;
  onActiveSpeakerUpdate?: (payload: { socketId: string | null }) => void;
  onSpeakerModeToggled?: (payload: { enabled: boolean; bySocketId: string }) => void;
  onSpeakerAssigned?: (payload: { socketId: string; bySocketId: string }) => void;
  onMediaUpdate?: (payload: { socketId: string; micOn: boolean; camOn: boolean }) => void;
  onScreenShareUpdate?: (payload: { socketId: string; active: boolean }) => void;
  onForceMute?: () => void;
  onForceCameraOff?: () => void;
  onRemovedByAdmin?: () => void;
  onSessionReplaced?: (payload: { conferenceId: string }) => void;
  onOffer?: (payload: { from: string; offer: unknown }) => void;
  onAnswer?: (payload: { from: string; answer: unknown }) => void;
  onIceCandidate?: (payload: { from: string; candidate: unknown }) => void;
};

const locks = {
  conference: {
    joinInProgress: false,
    joined: false,
    currentConferenceId: null as string | null,
  },
};

let joinAckTimeout: ReturnType<typeof setTimeout> | null = null;

function clearJoinAckTimeout() {
  if (joinAckTimeout) {
    clearTimeout(joinAckTimeout);
    joinAckTimeout = null;
  }
}

function resetConferenceLocks() {
  clearJoinAckTimeout();
  locks.conference.joinInProgress = false;
  locks.conference.joined = false;
  locks.conference.currentConferenceId = null;
}

function getSafeSocket() {
  const socket = getSocket();
  if (!socket || !socket.connected) {
    console.warn("[conference] socket not available or disconnected");
    return null;
  }
  return socket;
}

export function joinConference(conferenceId: string): boolean {
  if (locks.conference.joined && locks.conference.currentConferenceId === conferenceId) {
    return true;
  }
  if (locks.conference.joinInProgress) {
    if (locks.conference.currentConferenceId === conferenceId) return true;
    console.warn("[conference] join in progress for another conference, skipping");
    return false;
  }

  const socket = getSocket();
  if (!socket) return false;

  locks.conference.joinInProgress = true;
  locks.conference.currentConferenceId = conferenceId;

  whenConnected((connected) => {
    const handleJoined = () => {
      locks.conference.joined = true;
      locks.conference.joinInProgress = false;
      clearJoinAckTimeout();
      connected.off("conference:joined", handleJoined);
      connected.off("conference:error", handleError);
      connected.off("conference:state", handleState);
    };

    const handleError = () => {
      resetConferenceLocks();
      connected.off("conference:joined", handleJoined);
      connected.off("conference:error", handleError);
      connected.off("conference:state", handleState);
    };

    const handleState = (payload: ConferenceState) => {
      if (!payload?.conference?.conferenceId || payload.conference.conferenceId !== conferenceId) return;
      locks.conference.joined = true;
      locks.conference.joinInProgress = false;
      clearJoinAckTimeout();
      connected.off("conference:joined", handleJoined);
      connected.off("conference:error", handleError);
      connected.off("conference:state", handleState);
    };

    connected.once("conference:joined", handleJoined);
    connected.once("conference:error", handleError);
    connected.on("conference:state", handleState);

    clearJoinAckTimeout();
    joinAckTimeout = setTimeout(() => {
      handleError();
    }, 8000);

    connected.emit("conference:join", { conferenceId });
  });

  return true;
}

export function leaveConference() {
  if (!locks.conference.joined && !locks.conference.currentConferenceId) {
    resetConferenceLocks();
    return;
  }

  const socket = getSafeSocket();
  const conferenceId = locks.conference.currentConferenceId;
  if (socket && conferenceId) {
    socket.emit("conference:leave", { conferenceId });
  }
  resetConferenceLocks();
}

export function requestConferenceCreation(teamId: string): boolean {
  const socket = getSocket();
  if (!socket) {
    console.warn("[conference] socket unavailable, cannot create conference");
    return false;
  }
  whenConnected((connected) => connected.emit("conference:create", { teamId }));
  return true;
}

export function setupConferenceCreationListeners(handlers: {
  onCreated?: (payload: { conferenceId: string; teamId: string }) => void;
  onCreateError?: (payload: { message: string }) => void;
}) {
  const cleanups: Array<() => void> = [];
  whenConnected((connected) => {
    if (handlers.onCreated) {
      connected.on("conference:started", handlers.onCreated);
      cleanups.push(() => connected.off("conference:started", handlers.onCreated));
    }
    if (handlers.onCreateError) {
      connected.on("conference:error", handlers.onCreateError);
      cleanups.push(() => connected.off("conference:error", handlers.onCreateError));
    }
  });

  return () => {
    cleanups.forEach((off) => off());
    cleanups.length = 0;
  };
}

export function checkConference(teamId: string) {
  const socket = getSafeSocket();
  if (!socket) return;
  socket.emit("conference:check", { teamId });
}

export function requestJoinConference(conferenceId: string) {
  const socket = getSafeSocket();
  if (!socket) return false;
  socket.emit("conference:request-join", { conferenceId });
  return true;
}

export function reviewJoinRequest(conferenceId: string, userId: string, approved: boolean) {
  const socket = getSafeSocket();
  if (!socket) return;
  socket.emit("conference:review-request", { conferenceId, userId, approved });
}

export function updateMediaState(conferenceId: string, micOn: boolean, camOn: boolean) {
  const socket = getSafeSocket();
  if (!socket) return;
  socket.emit("conference:media-update", { conferenceId, micOn, camOn });
}

export function raiseHand(conferenceId: string) {
  const socket = getSafeSocket();
  if (!socket) return false;
  socket.emit("conference:raise-hand", { conferenceId });
  return true;
}

export function lowerHand(conferenceId: string) {
  const socket = getSafeSocket();
  if (!socket) return false;
  socket.emit("conference:lower-hand", { conferenceId });
  return true;
}

export function sendSpeakingStatus(conferenceId: string, speaking: boolean) {
  const socket = getSafeSocket();
  if (!socket) return false;
  socket.emit("conference:speaking", { conferenceId, speaking });
  return true;
}

export function toggleSpeakerMode(conferenceId: string, enabled: boolean) {
  const socket = getSafeSocket();
  if (!socket) return;
  socket.emit("conference:toggle-speaker-mode", { conferenceId, enabled });
}

export function setSpeaker(conferenceId: string, targetSocketId: string) {
  const socket = getSafeSocket();
  if (!socket) return;
  socket.emit("conference:set-speaker", { conferenceId, targetSocketId });
}

export function clearSpeaker(conferenceId: string) {
  const socket = getSafeSocket();
  if (!socket) return;
  socket.emit("conference:clear-speaker", { conferenceId });
}

export function adminAction(conferenceId: string, action: "mute" | "camera-off" | "lower-hand" | "remove-from-conference" | "clear-hands", targetSocketId: string) {
  const socket = getSafeSocket();
  if (!socket) return;
  socket.emit("conference:admin-action", { conferenceId, action, targetSocketId });
}

export function endConference(conferenceId: string) {
  const socket = getSafeSocket();
  if (!socket) return;
  socket.emit("conference:end", { conferenceId });
}

export function setupConferenceListeners(handlers: ConferenceHandlers) {
  const bindings: Array<[string, ((payload: never) => void) | undefined]> = [
    ["conference:joined", handlers.onJoined],
    ["conference:user-joined", handlers.onUserJoined],
    ["conference:user-left", handlers.onUserLeft],
    ["conference:participants", handlers.onParticipantsUpdate],
    ["conference:hands-updated", handlers.onHandsUpdated],
    ["conference:join-requests-updated", handlers.onJoinRequestsUpdate],
    ["conference:ended", handlers.onConferenceEnded],
    ["conference:started", handlers.onConferenceStarted],
    ["conference:state", handlers.onStateUpdate],
    ["conference:join-pending", handlers.onJoinPending],
    ["conference:join-requested", handlers.onJoinRequested],
    ["conference:join-approved", handlers.onJoinApproved],
    ["conference:join-rejected", handlers.onJoinRejected],
    ["conference:error", handlers.onError],
    ["conference:active-speaker", handlers.onActiveSpeakerUpdate],
    ["conference:speaker-mode-toggled", handlers.onSpeakerModeToggled],
    ["conference:speaker-assigned", handlers.onSpeakerAssigned],
    ["conference:media-update", handlers.onMediaUpdate],
    ["conference:screen-share-update", handlers.onScreenShareUpdate],
    ["conference:force-mute", handlers.onForceMute],
    ["conference:force-camera-off", handlers.onForceCameraOff],
    ["conference:removed-by-admin", handlers.onRemovedByAdmin],
    ["conference:session-replaced", handlers.onSessionReplaced],
    ["conference:offer", handlers.onOffer],
    ["conference:answer", handlers.onAnswer],
    ["conference:ice-candidate", handlers.onIceCandidate],
  ];

  const cleanups: Array<() => void> = [];
  whenConnected((connected) => {
    bindings.forEach(([event, handler]) => {
      if (handler) {
        connected.on(event, handler as (...args: any[]) => void);
        cleanups.push(() => connected.off(event, handler as (...args: any[]) => void));
      }
    });
  });

  return () => {
    cleanups.forEach((off) => off());
    cleanups.length = 0;
  };
}

export function getConferenceState() {
  return {
    joined: locks.conference.joined,
    joinInProgress: locks.conference.joinInProgress,
    conferenceId: locks.conference.currentConferenceId,
  };
}

export function isInConference() {
  return locks.conference.joined && locks.conference.currentConferenceId !== null;
}

export function cleanupConference() {
  if (locks.conference.joined || locks.conference.currentConferenceId) {
    leaveConference();
  } else {
    resetConferenceLocks();
  }
}

export function forceResetConferenceLocks() {
  resetConferenceLocks();
}

export { sendOffer, sendAnswer, sendIceCandidate };