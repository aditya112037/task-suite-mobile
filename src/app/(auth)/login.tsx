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
import { login, register } from "@/services/auth";
import { signInWithGoogle } from "@/services/googleAuth";
import { useAuth } from "@/services/auth-context";

const TEAL = "#0f766e";
const AMBER = "#b08968";
const CARD_BORDER = "rgba(238, 230, 220, 0.22)";
const INPUT_BG = "rgba(255, 255, 255, 0.06)";
const INPUT_BORDER = "rgba(255, 255, 255, 0.15)";
const INPUT_FOCUS_BORDER = "rgba(15, 118, 110, 0.6)";

export default function LoginScreen() {
  const router = useRouter();
  const { checkToken } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
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
        colors={["#07111d", "#0b1824"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(15, 118, 110, 0.26)",
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
            backgroundColor: "rgba(176, 137, 104, 0.26)",
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
            <ThemedText
              style={[styles.title, { color: TEAL }]}
            >
              {isRegister ? "Create Account" : "Welcome Back"}
            </ThemedText>

            <GlassView
              style={styles.card}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.googleButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <View style={styles.googleIconContainer}>
                  <View style={styles.googleIcon}>
                    <ThemedText style={styles.googleG}>G</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.googleLabel}>
                  Continue with Google
                </ThemedText>
              </Pressable>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: CARD_BORDER }]} />
                <ThemedText style={styles.dividerText}>or</ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: CARD_BORDER }]} />
              </View>

              {isRegister && (
                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Full Name</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor:
                          focusedField === "name" ? INPUT_FOCUS_BORDER : INPUT_BORDER,
                        backgroundColor: INPUT_BG,
                        color: "#f4f1ff",
                      },
                    ]}
                    placeholder="Your name"
                    placeholderTextColor="rgba(244, 241, 255, 0.4)"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}

              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Email Address</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor:
                        focusedField === "email" ? INPUT_FOCUS_BORDER : INPUT_BORDER,
                      backgroundColor: INPUT_BG,
                      color: "#f4f1ff",
                    },
                  ]}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(244, 241, 255, 0.4)"
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
                <ThemedText style={styles.label}>Password</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor:
                        focusedField === "password" ? INPUT_FOCUS_BORDER : INPUT_BORDER,
                      backgroundColor: INPUT_BG,
                      color: "#f4f1ff",
                    },
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(244, 241, 255, 0.4)"
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
                  { backgroundColor: TEAL, opacity: pressed || loading ? 0.8 : 1 },
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
              <ThemedText style={styles.footerText}>
                {isRegister ? "Already have an account?" : "New here?"}
              </ThemedText>
              <Pressable onPress={() => setIsRegister(!isRegister)}>
                <ThemedText style={[styles.footerLink, { color: AMBER }]}>
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
    marginBottom: Spacing.four,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 8,
    paddingVertical: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
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
    color: "rgba(244, 241, 255, 0.5)",
    fontWeight: "600",
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: "rgba(244, 241, 255, 0.7)",
    fontWeight: "500",
    marginLeft: 2,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
  },
  submitButton: {
    borderRadius: 8,
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
});
