import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { login, register } from "@/services/auth";
import { signInWithGoogle } from "@/services/googleAuth";
import { useAuth } from "@/services/auth-context";
import { consumePendingIntent } from "@/services/intent-navigation";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { checkToken, hasToken } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [isRegister, setIsRegister] = useState(params.mode === "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const hasRedirectedRef = useRef(false);

  const completeAuthRedirect = useCallback(async () => {
    hasRedirectedRef.current = true;
    const pendingIntent = await consumePendingIntent();
    if (pendingIntent) {
      router.replace(pendingIntent as Href);
      return;
    }

    router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    if (!hasToken || hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    void completeAuthRedirect();
  }, [completeAuthRedirect, hasToken]);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (isRegister && !name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    setLoading(true);
    try {
      const user = isRegister
        ? await register(name, email, password)
        : await login(email, password);
      Alert.alert("Success", `Welcome ${user.name}`);
      await checkToken();
      await completeAuthRedirect();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      Alert.alert("Success", `Welcome ${user.name}`);
      await checkToken();
      await completeAuthRedirect();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...theme.pageGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.pageGlowPrimary,
            borderRadius: 600,
            width: 500,
            height: 500,
            top: "-15%",
            left: "-20%",
            transform: [{ scaleX: 1.8 }],
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.pageGlowSecondary,
            borderRadius: 600,
            width: 400,
            height: 400,
            top: "-8%",
            right: "-30%",
            transform: [{ scaleX: 1.5 }],
          },
        ]}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View
            style={[
              styles.container,
              { paddingTop: safeAreaInsets.top + Spacing.six + 20 },
            ]}
          >
            <ThemedText style={[styles.eyebrow, { color: theme.secondary }]}>
              TASK SUITE
            </ThemedText>
            <ThemedText type="hero" themeColor="primary" style={{ textAlign: "center" }}>
              {isRegister ? "Create Account" : "Welcome Back"}
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary" style={{ textAlign: "center", maxWidth: 420 }}>
              {isRegister
                ? "Build your workspace with the same Task Suite flow as the web app."
                : "Sign in to continue with your teams, tasks, reports, and mobile workspace."}
            </ThemedText>

            <GlassView
              style={[
                styles.card,
                {
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.heroSurface,
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.googleButton,
                  {
                    opacity: pressed ? 0.8 : 1,
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.backgroundElement,
                  },
                ]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <View style={styles.googleIconContainer}>
                  <View style={styles.googleIcon}>
                    <ThemedText style={styles.googleG}>G</ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.googleLabel, { color: theme.text }]}>
                  Continue with Google
                </ThemedText>
              </Pressable>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
                <ThemedText style={[styles.dividerText, { color: theme.textSecondary }]}>or</ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
              </View>

              {isRegister && (
                <View style={styles.fieldGroup}>
                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Full Name</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor:
                          focusedField === "name" ? theme.primary : theme.divider,
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Your name"
                    placeholderTextColor={theme.textSecondary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}

              <View style={styles.fieldGroup}>
                <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Email Address</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor:
                        focusedField === "email" ? theme.primary : theme.divider,
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                    },
                  ]}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Password</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor:
                        focusedField === "password" ? theme.primary : theme.divider,
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: theme.primary, opacity: pressed || loading ? 0.8 : 1 },
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.submitText}>
                    {isRegister ? "Create Account" : "Login"}
                  </ThemedText>
                )}
              </Pressable>
            </GlassView>

            <View style={styles.footer}>
              <ThemedText style={[styles.footerText, { color: theme.textSecondary }]}>
                {isRegister ? "Already have an account?" : "New here?"}
              </ThemedText>
              <Pressable onPress={() => setIsRegister(!isRegister)}>
                <ThemedText style={[styles.footerLink, { color: theme.secondary }]}>
                  {isRegister ? "Login" : "Create account"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.2,
    marginBottom: Spacing.one,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  googleG: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4285F4",
  },
  googleLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: Spacing.one,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.one,
    minHeight: 44,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
