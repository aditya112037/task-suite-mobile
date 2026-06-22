import { useState } from "react";
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
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { login, register } from "@/services/auth";
import { signInWithGoogle } from "@/services/googleAuth";
import { useAuth } from "@/services/auth-context";
import { useThemePreset } from "@/services/theme-context";

export default function LoginScreen() {
  const router = useRouter();
  const { checkToken } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { activeThemeKey, availableThemes, setThemePreset } = useThemePreset();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
      router.replace("/(tabs)");
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
      router.replace("/(tabs)");
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
            <ThemedText style={[styles.title, { color: theme.primary }]}>
              {isRegister ? "Create Account" : "Welcome Back"}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
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

            <View style={styles.themeWrap}>
              <ThemedText style={[styles.themeLabel, { color: theme.textSecondary }]}>Theme</ThemedText>
              <View style={styles.themeRow}>
                {availableThemes.map((themeOption) => {
                  const selected = themeOption.key === activeThemeKey;

                  return (
                    <Pressable
                      key={themeOption.key}
                      onPress={() => setThemePreset(themeOption.key)}
                      style={[
                        styles.themeChip,
                        {
                          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                          borderColor: selected ? theme.primary : theme.cardBorder,
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: selected ? theme.primary : theme.textSecondary }}>
                        {themeOption.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

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
  title: {
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.2,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
    maxWidth: 420,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
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
    borderRadius: 14,
    paddingVertical: 14,
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
    fontSize: 16,
    color: "#f4f1ff",
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
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 2,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.one,
    minHeight: 48,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  footerText: {
    fontSize: 14,
    color: "rgba(244, 241, 255, 0.6)",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
  themeWrap: {
    width: "100%",
    maxWidth: 460,
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1,
  },
  themeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.two,
  },
  themeChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
});
