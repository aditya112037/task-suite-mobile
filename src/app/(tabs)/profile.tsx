import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/services/auth-context";
import { getProfile, updateProfilePhoto, type ProfileSummary } from "@/services/profile";
import { getTasks, type PersonalTask } from "@/services/tasks";
import { getTeams, type TeamSummary } from "@/services/teams";
import { useThemePreset } from "@/services/theme-context";

const C = { teal: "#087F73", tealLight: "#E0F5F1", ink: "#17212B", muted: "#77818B", border: "#E8EBEA", white: "#FFFFFF", purple: "#8750D6", orange: "#C88719", blue: "#2088D5" };

function Bubble({ icon, tint = C.teal, bg = C.tealLight, size = 42 }: { icon: string; tint?: string; bg?: string; size?: number }) {
  return <View style={[s.bubble, { width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg }]}><ThemedText style={{ color: tint, fontSize: size * 0.47, fontWeight: "700" }}>{icon}</ThemedText></View>;
}
function Heading({ icon, title, badge }: { icon: string; title: string; badge?: string }) {
  return <View style={s.heading}><Bubble icon={icon} size={38} /><ThemedText style={s.headingText}>{title}</ThemedText>{badge ? <View style={s.badge}><ThemedText style={s.badgeText}>{badge}</ThemedText></View> : null}</View>;
}
function Metric({ icon, value, title, subtitle, tint, bg }: { icon: string; value: string | number; title: string; subtitle: string; tint: string; bg: string }) {
  return <View style={s.metric}><Bubble icon={icon} tint={tint} bg={bg} size={44}/><ThemedText style={s.value}>{value}</ThemedText><ThemedText style={s.metricTitle}>{title}</ThemedText><ThemedText style={s.sub}>{subtitle}</ThemedText></View>;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { activeThemeKey, availableThemes, setThemePreset } = useThemePreset();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const p = await getProfile();
      setProfile(p);
      const [t, tm] = await Promise.all([getTasks().catch(() => [] as PersonalTask[]), getTeams(p.id).catch(() => [] as TeamSummary[])]);
      setTasks(t); setTeams(tm); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load profile"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);

  const total = profile?.progress?.personalTotalTasks ?? tasks.length;
  const done = profile?.progress?.personalCompletedTasks ?? tasks.filter(t => t.status === "completed").length;
  const teamCount = profile?.identity?.teams?.length ?? teams.length;
  const rate = total ? Math.round(done / total * 100) : 0;
  const onTime = useMemo(() => {
    const completed = tasks.filter(t => t.status === "completed" && t.dueDate);
    if (!completed.length) return null;
    const timely = completed.filter(t => {
      const due = new Date(t.dueDate as string).getTime();
      const finish = new Date((t as any).completedAt || (t as any).updatedAt || (t as any).updated_at || "").getTime();
      return Number.isFinite(due) && Number.isFinite(finish) && finish <= due;
    });
    return Math.round(timely.length / completed.length * 100);
  }, [tasks]);
  const averageHours = useMemo(() => {
    const durations = tasks.filter(t => t.status === "completed").map(t => {
      const start = new Date((t as any).createdAt || (t as any).created_at || "").getTime();
      const end = new Date((t as any).completedAt || (t as any).updatedAt || (t as any).updated_at || "").getTime();
      return Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 3600000 : null;
    }).filter((n): n is number => n !== null);
    return durations.length ? `${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)}h` : "—";
  }, [tasks]);

  async function pickPhoto() {
    let picker: typeof import("expo-image-picker");
    try { // eslint-disable-next-line @typescript-eslint/no-require-imports
      picker = require("expo-image-picker");
    } catch { Alert.alert("Unavailable", "Photo picking is not installed in this build."); return; }
    let result;
    try { result = await picker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true }); }
    catch { Alert.alert("Unavailable", "Could not open the photo library."); return; }
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setUploading(true);
    try { await updateProfilePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`); await load(true); Alert.alert("Updated", "Profile photo updated."); }
    catch (e) { Alert.alert("Error", e instanceof Error ? e.message : "Photo update failed"); }
    finally { setUploading(false); }
  }

  return <ScreenShell refreshing={refreshing} onRefresh={() => load(true)}>
    <View style={s.container}>
      <View style={s.top}><ThemedText style={s.brand}>Task<ThemedText style={{ color: C.teal }}>Suite</ThemedText><ThemedText style={s.tm}> ™</ThemedText></ThemedText><View style={s.topActions}><Pressable style={s.roundButton} onPress={() => Alert.alert("Notifications", "Notification data is not connected yet.")}><ThemedText style={s.topIcon}>♧</ThemedText></Pressable><Pressable style={s.roundButton} onPress={() => router.push("/")}><ThemedText style={s.topIcon}>☆</ThemedText></Pressable></View></View>
      {loading ? <View style={s.loading}><ActivityIndicator size="large" color={C.teal}/><ThemedText style={s.sub}>Loading profile…</ThemedText></View> : null}
      {error ? <View style={s.card}><ThemedText style={s.headingText}>Couldn’t load profile</ThemedText><ThemedText style={s.sub}>{error}</ThemedText><Pressable onPress={() => load()}><ThemedText style={{ color: C.teal, fontWeight: "700" }}>Try again</ThemedText></Pressable></View> : null}
      {profile ? <>
        <View style={s.profileCard}>
          <Pressable onPress={pickPhoto} style={s.avatarWrap}><View style={s.avatar}>{uploading ? <ActivityIndicator color={C.teal}/> : profile.photo ? <Image source={{ uri: profile.photo }} style={s.avatarImage}/> : <ThemedText style={s.initial}>{profile.name?.[0]?.toUpperCase() || "U"}</ThemedText>}</View><View style={s.camera}><ThemedText style={{ color: C.white, fontSize: 14 }}>▣</ThemedText></View></Pressable>
          <View style={s.identity}><ThemedText numberOfLines={1} style={s.name}>{profile.name || "TaskSuite Member"}</ThemedText><ThemedText numberOfLines={1} style={s.email}>✉  {profile.email || "No email"}</ThemedText><View style={s.member}><ThemedText style={{ color: C.teal }}>♟</ThemedText><ThemedText style={s.memberText}>Member</ThemedText></View></View>
          <Pressable onPress={() => Alert.alert("Edit Profile", "The shared backend service supports profile retrieval and photo upload, but does not currently expose an update endpoint for name/email.")} style={s.edit}><ThemedText style={{ color: C.teal }}>✎</ThemedText><ThemedText style={s.editText}>Edit Profile</ThemedText></Pressable>
        </View>
        <View style={s.summary}>
          <Metric icon="☑" value={total} title="Tasks" subtitle="Assigned to you" tint={C.teal} bg="#E1F6F1"/>
          <Metric icon="◎" value={done} title="Done" subtitle="Tasks completed" tint={C.purple} bg="#F0E8FF"/>
          <Metric icon="♧" value={teamCount} title="Teams" subtitle="Joined teams" tint={C.orange} bg="#FFF0D9"/>
        </View>
        <View style={s.card}><Heading icon="▥" title="Progress" badge={`${rate}%`}/><ThemedText style={s.hint}>{rate === 0 ? "Keep going! Start completing tasks to see your progress here." : "Great work! Keep completing tasks to maintain your progress."}</ThemedText><View style={s.track}><View style={[s.fill, { width: `${rate}%` }]}/></View><ThemedText style={s.foot}>{done} / {total} tasks completed</ThemedText></View>
        <View style={s.card}><Heading icon="↗" title="Performance Snapshot" badge="▣  Last 4 weeks"/><View style={s.performance}><Metric icon="✓" value="—" title="Execution Score" subtitle="Not provided by API" tint={C.teal} bg="#E1F6F1"/><Metric icon="◷" value={onTime === null ? "—" : `${onTime}%`} title="On-time %" subtitle="From available task dates" tint={C.orange} bg="#FFF3D9"/><Metric icon="☷" value="—" title="Subtasks Completed" subtitle="Not provided by API" tint={C.purple} bg="#F0E8FF"/><Metric icon="ϟ" value={averageHours} title="Avg Completion Time" subtitle="Estimated from timestamps" tint={C.blue} bg="#E1F2FF"/></View></View>
        <View style={s.card}><Heading icon="☷" title="Theme"/><ThemedText style={s.themeHint}>Personalize your app experience</ThemedText><View style={s.themeGrid}>{availableThemes.map(option => { const selected = option.key === activeThemeKey; return <Pressable key={option.key} onPress={() => setThemePreset(option.key)} style={[s.themeChip, selected && s.selectedChip]}><ThemedText style={[s.themeText, selected && s.selectedThemeText]}>{option.label}</ThemedText></Pressable>; })}</View></View>
        <Pressable style={s.preferences} onPress={() => Alert.alert("App Preferences", "Notification and language preferences need a settings endpoint to save to the backend.")}><Bubble icon="⚙" size={46}/><View style={{ flex: 1 }}><ThemedText style={s.preferenceTitle}>App Preferences</ThemedText><ThemedText style={s.sub}>Notifications, language and more</ThemedText></View><ThemedText style={s.chevron}>›</ThemedText></Pressable>
        <Pressable style={s.signOut} onPress={() => Alert.alert("Sign out", "Are you sure you want to sign out?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: () => void signOut() }])}><ThemedText style={s.signGlyph}>⇥</ThemedText><ThemedText style={s.signText}>Sign Out</ThemedText></Pressable>
      </> : null}
    </View>
  </ScreenShell>;
}

const s = StyleSheet.create({
  container: { gap: 12, paddingHorizontal: 2, paddingBottom: 24 },
  top: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  brand: { color: C.ink, fontSize: 29, fontWeight: "800", letterSpacing: -1.2 },
  tm: { fontSize: 10, color: C.ink, fontWeight: "700" },
  topActions: { flexDirection: "row", gap: 10 },
  roundButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EEF0EF" },
  topIcon: { fontSize: 25, color: C.teal },
  loading: { paddingVertical: 30, alignItems: "center", gap: 10 },
  profileCard: { backgroundColor: C.white, borderRadius: 23, padding: 14, gap: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#EEF0EF", elevation: 1 },
  avatarWrap: { width: 78, height: 78, position: "relative" },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#E2F5F2", borderWidth: 1, borderColor: "#CDEAE5", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  initial: { fontSize: 34, fontWeight: "700", color: C.ink },
  camera: { position: "absolute", bottom: 0, right: 0, width: 29, height: 29, borderRadius: 15, backgroundColor: C.teal, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.white },
  identity: { flex: 1, minWidth: 0, gap: 5 },
  name: { color: C.ink, fontSize: 18, fontWeight: "800" },
  email: { color: "#66717C", fontSize: 10 },
  member: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: "#E3F6F2" },
  memberText: { color: "#226C64", fontSize: 11, fontWeight: "700" },
  edit: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: "#7DBAB2" },
  editText: { color: "#246C65", fontSize: 9, fontWeight: "700" },
  summary: { flexDirection: "row", gap: 8 },
  bubble: { alignItems: "center", justifyContent: "center" },
  metric: { flex: 1, minWidth: 0, backgroundColor: C.white, borderRadius: 17, padding: 10, borderWidth: 1, borderColor: "#EEF0EF", gap: 5 },
  value: { color: C.ink, fontSize: 19, lineHeight: 23, fontWeight: "800" },
  metricTitle: { color: "#4F5B66", fontSize: 11, fontWeight: "600" },
  sub: { color: C.muted, fontSize: 10, lineHeight: 14 },
  card: { backgroundColor: C.white, borderRadius: 23, padding: 15, gap: 12, borderWidth: 1, borderColor: "#EEF0EF", elevation: 1 },
  heading: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 38 },
  headingText: { color: C.ink, fontSize: 15, fontWeight: "800", flex: 1 },
  badge: { backgroundColor: "#E2F7F3", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  badgeText: { color: C.teal, fontWeight: "800", fontSize: 11 },
  hint: { color: "#7C8791", fontSize: 11, marginTop: -5 },
  track: { height: 13, borderRadius: 99, backgroundColor: "#E8EBEA", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 99, backgroundColor: C.teal },
  foot: { color: "#58636D", fontSize: 12, fontWeight: "600" },
  performance: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themeHint: { color: C.muted, fontSize: 10, marginTop: -4 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themeChip: { minWidth: "18%", flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 11, borderRadius: 24, borderWidth: 1, borderColor: "#E1E5E3", backgroundColor: C.white },
  selectedChip: { borderColor: C.teal, backgroundColor: C.tealLight },
  themeText: { color: "#52606B", fontSize: 11, fontWeight: "600" },
  selectedThemeText: { color: C.teal, fontWeight: "800" },
  preferences: { backgroundColor: C.white, borderRadius: 21, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#EEF0EF" },
  preferenceTitle: { color: C.ink, fontSize: 14, fontWeight: "800" },
  chevron: { color: "#7C8791", fontSize: 27, paddingHorizontal: 4 },
  signOut: { backgroundColor: "#08796F", borderRadius: 19, minHeight: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginHorizontal: 5 },
  signGlyph: { color: C.white, fontSize: 19 },
  signText: { color: C.white, fontSize: 15, fontWeight: "700" },
});

