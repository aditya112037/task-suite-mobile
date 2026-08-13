import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  adminAction,
  cleanupConference,
  clearSpeaker,
  endConference,
  joinConference,
  lowerHand,
  raiseHand,
  requestJoinConference,
  reviewJoinRequest,
  setSpeaker,
  setupConferenceListeners,
  toggleSpeakerMode,
  updateMediaState,
  type ConferenceParticipant,
  type ConferenceState,
  type JoinRequest,
} from "@/services/conference-socket";
import { connectSocket, getSocket, initSocket, joinTeamRoom, leaveTeamRoom, whenConnected } from "@/services/socket";
import { getProfile } from "@/services/profile";
import {
  addWebRTCListener,
  cleanupWebRTC,
  createOffer,
  getLocalStreams,
  handleAnswer,
  handleIceCandidate,
  handleOffer,
  removePeer,
  setMicEnabled,
  startCamera,
  stopCamera,
  syncAllPeerTracks,
  webrtcSupported,
} from "@/services/webrtc";

type RemoteStreams = {
  audioStream: { id: string } | null;
  cameraStream: { id: string; toURL: () => string } | null;
};

let cachedRTCView: React.ComponentType<Record<string, unknown>> | null | undefined;

function getRTCView() {
  if (cachedRTCView !== undefined) return cachedRTCView;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedRTCView = require("react-native-webrtc").RTCView as React.ComponentType<Record<string, unknown>>;
  } catch {
    cachedRTCView = null;
  }
  return cachedRTCView;
}

function formatElapsed(startedAt: string | null) {
  if (!startedAt) return "00:00";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ConferenceRoomScreen() {
  const params = useLocalSearchParams<{ conferenceId: string; teamId?: string; teamName?: string }>();
  const conferenceId = params.conferenceId;
  const teamId = params.teamId || "";
  const teamName = params.teamName || "Team conference";
  const theme = useTheme();
  const RTCViewComponent = getRTCView();

  const [phase, setPhase] = useState<"connecting" | "joining" | "waiting-approval" | "joined" | "ended">("connecting");
  const [participants, setParticipants] = useState<ConferenceParticipant[]>([]);
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [speakerMode, setSpeakerMode] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [handUp, setHandUp] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, RemoteStreams>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [mediaAvailable, setMediaAvailable] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [elapsed, setElapsed] = useState("00:00");
  const socketRef = useRef(getSocket());
  const endedHandledRef = useRef(false);

  const [mySocketId, setMySocketId] = useState("");

  useEffect(() => {
    const mediaOk = webrtcSupported();
    setTimeout(() => setMediaAvailable(mediaOk), 0);
    void getProfile().then((profile) => {
      if (profile.identity?.teams?.length) {
        const membership = profile.identity.teams.find((t) => String(t.id) === String(teamId));
        if (membership) {
          setIsAdmin(membership.role === "admin" || membership.role === "manager");
        }
      }
    });
  }, [teamId]);

  useEffect(() => {
    initSocket();
    connectSocket();
    if (teamId) joinTeamRoom(teamId);

    whenConnected((connected) => {
      socketRef.current = connected;
      setMySocketId(connected.id || "");
    });

    const removed = addWebRTCListener((event) => {
      if (event.type === "remote-media") {
        setRemoteStreams((current) => ({
          ...current,
          [event.socketId]: {
            audioStream: (event.audioStream as RemoteStreams["audioStream"]) || null,
            cameraStream: (event.cameraStream as RemoteStreams["cameraStream"]) || null,
          },
        }));
      }
    });

    return () => {
      removed();
      if (teamId) leaveTeamRoom(teamId);
    };
  }, [teamId]);

  const handleConferenceEnded = useCallback(
    (payload: { conferenceId: string }) => {
      if (payload.conferenceId !== conferenceId) return;
      if (endedHandledRef.current) return;
      endedHandledRef.current = true;
      setPhase("ended");
      void cleanupWebRTC();
      setTimeout(() => router.back(), 2500);
    },
    [conferenceId]
  );

  useEffect(() => {
    const cleanupListeners = setupConferenceListeners({
      onJoined: (payload) => {
        setParticipants(payload.participants || []);
        setPhase("joined");
        void syncAllPeerTracks();
      },
      onUserJoined: (payload) => {
        if (payload.socketId !== socketRef.current?.id) {
          void createOffer(payload.socketId);
        }
      },
      onUserLeft: (payload) => {
        setParticipants((current) => current.filter((p) => p.socketId !== payload.socketId));
        removePeer(payload.socketId);
      },
      onParticipantsUpdate: (payload) => {
        setParticipants(payload.participants || []);
        const known = new Set((payload.participants || []).map((p) => p.socketId));
        setRemoteStreams((current) => {
          const stale = Object.keys(current).filter((id) => !known.has(id));
          if (!stale.length) return current;
          const next = { ...current };
          stale.forEach((id) => delete next[id]);
          return next;
        });
      },
      onHandsUpdated: (payload) => setRaisedHands(payload.raisedHands || []),
      onJoinRequestsUpdate: (payload) => setJoinRequests(payload.joinRequests || []),
      onConferenceEnded: handleConferenceEnded,
      onStateUpdate: (payload: ConferenceState) => {
        if (!payload.active) return;
        setStartedAt(payload.conference?.startedAt || null);
        setSpeakerMode(Boolean(payload.conference?.speakerMode?.enabled));
        setActiveSpeaker(payload.conference?.speakerMode?.activeSpeaker || null);
      },
      onJoinPending: () => setPhase("waiting-approval"),
      onJoinRequested: () => setPhase("waiting-approval"),
      onJoinApproved: () => {
        setPhase("joining");
        setTimeout(() => joinConference(conferenceId), 300);
      },
      onJoinRejected: () => {
        Alert.alert("Join rejected", "The host declined your join request.");
        setTimeout(() => router.back(), 1500);
      },
      onError: (payload) => {
        if (phase === "joining") {
          setPhase("connecting");
        }
        Alert.alert("Conference", payload.message || "Something went wrong.");
      },
      onActiveSpeakerUpdate: (payload) => setActiveSpeaker(payload.socketId),
      onSpeakerModeToggled: (payload) => setSpeakerMode(payload.enabled),
      onSpeakerAssigned: (payload) => setActiveSpeaker(payload.socketId),
      onMediaUpdate: (payload) => {
        setParticipants((current) =>
          current.map((p) =>
            p.socketId === payload.socketId ? { ...p, micOn: payload.micOn, camOn: payload.camOn } : p
          )
        );
        if (payload.socketId === socketRef.current?.id) {
          setMicOn(payload.micOn);
          setCamOn(payload.camOn);
        }
      },
      onForceMute: () => {
        setMicOn(false);
        void setMicEnabled(false);
        updateMediaState(conferenceId, false, camOn);
        Alert.alert("Muted", "The host muted your microphone.");
      },
      onForceCameraOff: () => {
        setCamOn(false);
        void stopCamera();
        updateMediaState(conferenceId, micOn, false);
        Alert.alert("Camera off", "The host turned off your camera.");
      },
      onRemovedByAdmin: () => {
        cleanupConference();
        void cleanupWebRTC();
        Alert.alert("Removed", "The host removed you from the conference.");
        setTimeout(() => router.back(), 1500);
      },
      onSessionReplaced: () => {
        cleanupConference();
        void cleanupWebRTC();
        setTimeout(() => router.back(), 500);
      },
      onOffer: (payload) => void handleOffer(payload),
      onAnswer: (payload) => void handleAnswer(payload),
      onIceCandidate: (payload) => void handleIceCandidate(payload),
    });

    setTimeout(() => setPhase("joining"), 0);
    joinConference(conferenceId);

    return cleanupListeners;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conferenceId, teamId]);

  useEffect(() => {
    if (phase !== "joined") return;
    const timer = setInterval(() => setElapsed(formatElapsed(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  useEffect(() => {
    if (phase !== "joined" || !socketRef.current?.id) return;
    const myParticipants = participants.filter((p) => p.socketId === socketRef.current?.id);
    if (myParticipants.length && myParticipants[0].micOn !== micOn) {
      updateMediaState(conferenceId, micOn, camOn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micOn, camOn, phase]);

  const toggleMic = useCallback(async () => {
    if (!mediaAvailable) return;
    setMediaBusy(true);
    try {
      const next = !micOn;
      const applied = await setMicEnabled(next);
      setMicOn(applied);
      updateMediaState(conferenceId, applied, camOn);
    } finally {
      setMediaBusy(false);
    }
  }, [mediaAvailable, micOn, camOn, conferenceId]);

  const toggleCamera = useCallback(async () => {
    if (!mediaAvailable) return;
    setMediaBusy(true);
    try {
      if (camOn) {
        await stopCamera();
        setCamOn(false);
      } else {
        const stream = await startCamera();
        if (stream) setCamOn(true);
      }
      updateMediaState(conferenceId, micOn, camOn);
    } finally {
      setMediaBusy(false);
    }
  }, [mediaAvailable, camOn, micOn, conferenceId]);

  const toggleHand = useCallback(() => {
    if (handUp) {
      lowerHand(conferenceId);
      setHandUp(false);
    } else {
      raiseHand(conferenceId);
      setHandUp(true);
    }
  }, [handUp, conferenceId]);

  const handleLeave = useCallback(() => {
    cleanupConference();
    void cleanupWebRTC();
    router.back();
  }, []);

  const handleEnd = useCallback(() => {
    endConference(conferenceId);
    void cleanupWebRTC();
  }, [conferenceId]);

  const isHost = useMemo(
    () => Boolean(participants.find((p) => p.socketId === mySocketId)?.role === "admin") || isAdmin,
    [participants, mySocketId, isAdmin]
  );

  const localCameraStream = useMemo(() => {
    if (!camOn) return null;
    return getLocalStreams().cameraStream;
  }, [camOn]);

  const timerElapsed = startedAt ? elapsed : "—";

  const actionChipStyle = (active: boolean) => [
    styles.controlChip,
    {
      backgroundColor: active ? theme.primary : theme.backgroundElement,
      borderColor: active ? theme.primary : theme.cardBorder,
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: "#050b12" }]}>
      <View style={styles.header}>
        <Pressable onPress={handleLeave} style={styles.headerButton}>
          <ThemedText type="captionBold" themeColor="textSecondary">
            ✕ Leave
          </ThemedText>
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText type="cardTitle" style={styles.headerTitle}>
            {teamName}
          </ThemedText>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, phase === "joined" && { backgroundColor: "#4ade80" }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {phase === "joined" ? `${participants.length} in room · ${timerElapsed}` : phase}
            </ThemedText>
          </View>
        </View>
        <Pressable onPress={() => setPanelOpen((open) => !open)} style={styles.headerButton}>
          <ThemedText type="captionBold" themeColor="textSecondary">
            {panelOpen ? "✕ Panel" : `☰ ${participants.length}`}
          </ThemedText>
        </Pressable>
      </View>

      {phase === "connecting" || phase === "joining" ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="caption" themeColor="textSecondary" style={styles.stateText}>
            {phase === "connecting" ? "Connecting to the room…" : "Joining the conference…"}
          </ThemedText>
        </View>
      ) : null}

      {phase === "waiting-approval" ? (
        <View style={styles.centerState}>
          <GlassView style={styles.approvalCard}>
            <ThemedText type="cardTitle">Room needs host approval</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              The host has to let you in before you can join this call.
            </ThemedText>
            <Pressable
              onPress={() => requestJoinConference(conferenceId)}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
              <ThemedText type="captionBold" style={styles.onPrimaryLabel}>
                Request to join
              </ThemedText>
            </Pressable>
          </GlassView>
        </View>
      ) : null}

      {phase === "ended" ? (
        <View style={styles.centerState}>
          <ThemedText type="section" style={styles.endedTitle}>
            Call ended
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Heading back to the team…
          </ThemedText>
        </View>
      ) : null}

      {phase === "joined" ? (
        <>
          <ScrollView contentContainerStyle={styles.tileGrid}>
            {participants.map((participant) => {
              const streams = remoteStreams[participant.socketId];
              const remoteCameraUrl = streams?.cameraStream?.toURL?.();
              const isSelf = participant.socketId === mySocketId;
              return (
                <View
                  key={participant.socketId}
                  style={[
                    styles.tile,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                    activeSpeaker === participant.socketId && styles.activeTile,
                  ]}>
                  {RTCViewComponent && isSelf && camOn && localCameraStream ? (
                    <RTCViewComponent
                      style={StyleSheet.absoluteFill}
                      objectFit="cover"
                      mirror
                      zOrder={1}
                      streamURL={(localCameraStream as unknown as { toURL: () => string }).toURL()}
                    />
                  ) : null}
                  {RTCViewComponent && !isSelf && remoteCameraUrl ? (
                    <RTCViewComponent style={StyleSheet.absoluteFill} objectFit="cover" zOrder={1} streamURL={remoteCameraUrl} />
                  ) : null}
                  {(!isSelf && !remoteCameraUrl) || (isSelf && !camOn) ? (
                    <View style={styles.avatarCircle}>
                      <ThemedText type="cardTitle">{(participant.name || "?").charAt(0).toUpperCase()}</ThemedText>
                    </View>
                  ) : null}
                  <View style={styles.tileFooter}>
                    <ThemedText type="smallBold" style={styles.tileName}>
                      {participant.name}
                      {isSelf ? " (you)" : ""}
                    </ThemedText>
                    <ThemedText type="small">
                      {raisedHands.includes(participant.socketId) ? "✋ " : ""}
                      {activeSpeaker === participant.socketId ? "🎤 " : ""}
                      {participant.micOn ? "🔊" : "🔇"}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.controls}>
            {!mediaAvailable ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.mediaHint}>
                Voice & video need the dev build — presence works everywhere.
              </ThemedText>
            ) : null}
            <View style={styles.controlRow}>
              <Pressable
                onPress={() => void toggleMic()}
                disabled={!mediaAvailable || mediaBusy}
                style={actionChipStyle(micOn)}>
                <ThemedText type="captionBold" style={micOn ? styles.onPrimaryLabel : undefined}>
                  {micOn ? "Mic on" : "Mic off"}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => void toggleCamera()}
                disabled={!mediaAvailable || mediaBusy}
                style={actionChipStyle(camOn)}>
                <ThemedText type="captionBold" style={camOn ? styles.onPrimaryLabel : undefined}>
                  {camOn ? "Camera" : "Camera off"}
                </ThemedText>
              </Pressable>
              <Pressable onPress={toggleHand} style={actionChipStyle(handUp)}>
                <ThemedText type="captionBold" style={handUp ? styles.onPrimaryLabel : undefined}>
                  ✋ {handUp ? "Lower" : "Raise"}
                </ThemedText>
              </Pressable>
              {isHost ? (
                <Pressable
                  onPress={() => toggleSpeakerMode(conferenceId, !speakerMode)}
                  style={actionChipStyle(speakerMode)}>
                  <ThemedText type="captionBold" style={speakerMode ? styles.onPrimaryLabel : undefined}>
                    🎤 {speakerMode ? "Speaker on" : "Speaker"}
                  </ThemedText>
                </Pressable>
              ) : null}
              {isHost ? (
                <Pressable onPress={handleEnd} style={[styles.controlChip, { backgroundColor: "#b91c1c" }]}>
                  <ThemedText type="captionBold" style={styles.onPrimaryLabel}>
                    End call
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable onPress={handleLeave} style={[styles.controlChip, { backgroundColor: "#b91c1c" }]}>
                  <ThemedText type="captionBold" style={styles.onPrimaryLabel}>
                    Hang up
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        </>
      ) : null}

      {panelOpen && phase === "joined" ? (
        <GlassView style={styles.panel}>
          <ThemedText type="cardTitle">Participants</ThemedText>
          <ScrollView style={styles.panelScroll}>
            {participants.map((participant) => (
              <View key={participant.socketId} style={[styles.participantRow, { borderColor: theme.divider }]}>
                <View style={styles.participantInfo}>
                  <ThemedText type="body">
                    {participant.name}
                    {participant.socketId === mySocketId ? " (you)" : ""}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {raisedHands.includes(participant.socketId) ? "✋ hand raised · " : ""}
                    {participant.micOn ? "mic on" : "muted"}
                    {participant.camOn ? " · camera" : ""}
                  </ThemedText>
                </View>
                {isHost && participant.socketId !== mySocketId ? (
                  <View style={styles.adminRow}>
                    <Pressable onPress={() => adminAction(conferenceId, "mute", participant.socketId)} style={styles.adminChip}>
                      <ThemedText type="small">Mute</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => adminAction(conferenceId, "camera-off", participant.socketId)} style={styles.adminChip}>
                      <ThemedText type="small">Cam</ThemedText>
                    </Pressable>
                    {speakerMode ? (
                      <Pressable onPress={() => setSpeaker(conferenceId, participant.socketId)} style={styles.adminChip}>
                        <ThemedText type="small">🎤</ThemedText>
                      </Pressable>
                    ) : null}
                    {raisedHands.includes(participant.socketId) ? (
                      <Pressable onPress={() => adminAction(conferenceId, "lower-hand", participant.socketId)} style={styles.adminChip}>
                        <ThemedText type="small">✋↓</ThemedText>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => adminAction(conferenceId, "remove-from-conference", participant.socketId)} style={styles.adminChipDanger}>
                      <ThemedText type="small">Remove</ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
            {isHost && joinRequests.length ? (
              <View style={styles.joinRequests}>
                <ThemedText type="captionBold">Join requests</ThemedText>
                {joinRequests.map((request) => (
                  <View key={request.userId} style={[styles.participantRow, { borderColor: theme.divider }]}>
                    <View style={styles.participantInfo}>
                      <ThemedText type="body">{request.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {request.role} · wants in
                      </ThemedText>
                    </View>
                    <View style={styles.adminRow}>
                      <Pressable onPress={() => reviewJoinRequest(conferenceId, request.userId, true)} style={[styles.adminChip, { borderColor: "#4ade80" }]}>
                        <ThemedText type="small" style={{ color: "#4ade80" }}>
                          Approve
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={() => reviewJoinRequest(conferenceId, request.userId, false)} style={[styles.adminChip, { borderColor: "#f87171" }]}>
                        <ThemedText type="small" style={{ color: "#f87171" }}>
                          Reject
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            {isHost && speakerMode ? (
              <Pressable onPress={() => clearSpeaker(conferenceId)} style={styles.clearSpeaker}>
                <ThemedText type="small" themeColor="textSecondary">
                  Clear speaker
                </ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </GlassView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four + 12,
    paddingBottom: Spacing.three,
  },
  headerButton: {
    padding: Spacing.two,
    minWidth: 64,
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.three,
  },
  stateText: {
    marginTop: Spacing.two,
  },
  approvalCard: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.two,
    maxWidth: 340,
  },
  primaryButton: {
    marginTop: Spacing.two,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  onPrimaryLabel: {
    color: "#fff",
  },
  endedTitle: {
    color: "#fff",
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  tile: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  activeTile: {
    borderColor: "#4ade80",
    borderWidth: 2,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tileFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  tileName: {
    color: "#fff",
    flexShrink: 1,
  },
  controls: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  mediaHint: {
    textAlign: "center",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  controlChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  panel: {
    position: "absolute",
    right: Spacing.two,
    top: 120,
    bottom: 110,
    width: 280,
    padding: Spacing.three,
    borderRadius: 16,
  },
  panelScroll: {
    marginTop: Spacing.two,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  participantInfo: {
    flexShrink: 1,
  },
  adminRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  adminChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  adminChipDanger: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f87171",
  },
  joinRequests: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  clearSpeaker: {
    marginTop: Spacing.three,
    padding: Spacing.two,
    alignItems: "center",
  },
});