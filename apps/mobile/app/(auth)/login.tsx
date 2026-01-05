import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Link, router } from "expo-router";
import { login, requestPasswordReset } from "../../src/services/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email/username and password are required.");
      return;
    }
    setLoading(true);
    try {
      const { role } = await login(trimmedEmail, password);
      const roleLabel =
        role === "owner"
          ? "Owner"
          : role === "instructor"
            ? "Instructor"
            : "Student";
      setInfo(`Signed in as ${roleLabel}.`);
      Alert.alert("Signed in", `Welcome back, ${roleLabel}.`);
      const nextRoute =
        role === "owner"
          ? "/(tabs)/owner-dashboard"
          : role === "instructor"
            ? "/(tabs)/schedule"
            : "/(tabs)";
      router.replace(nextRoute);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your email to reset your password.");
      return;
    }
    setIsResetting(true);
    try {
      await requestPasswordReset(email.trim());
      setInfo("Password reset code sent. Check your email.");
      Alert.alert("Reset code sent", "Check your email for the verification code.");
    } catch (err: any) {
      setError(err?.message || "Unable to send reset email right now.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logo}>
              <View style={styles.logoDiamond} />
              <View style={styles.logoLines} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your account and book classes
            </Text>
          </View>

          <View style={styles.card}>
            {error && <Text style={styles.error}>{error}</Text>}
            {info && <Text style={styles.success}>{info}</Text>}

            <View style={styles.field}>
              <Text style={styles.label}>Email or Username *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#b8b8c7"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                autoCorrect={false}
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                placeholderTextColor="#b8b8c7"
                secureTextEntry
                style={styles.input}
                textContentType="password"
              />
            </View>

            <Pressable
              style={styles.forgotRow}
              disabled={isResetting || loading}
              onPress={handleForgotPassword}
            >
              <Text
                style={[
                  styles.forgotText,
                  (isResetting || loading) && { opacity: 0.6 },
                ]}
              >
                {isResetting ? "Sending reset..." : "Forgot password?"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.9 },
                loading && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Don't have an account?</Text>
              <Link href="/(auth)/register" style={styles.switchLink}>
                Sign up
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#1a0b2e",
  },
  scroll: {
    padding: 24,
  },
  header: {
    marginTop: 24,
    marginBottom: 24,
    gap: 8,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c3aed",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  logoDiamond: {
    width: 22,
    height: 22,
    transform: [{ rotate: "45deg" }],
    borderWidth: 2,
    borderColor: "white",
  },
  logoLines: {
    position: "absolute",
    width: 36,
    height: 2,
    backgroundColor: "white",
    opacity: 0.7,
    transform: [{ rotate: "45deg" }],
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f3e8ff",
  },
  subtitle: {
    color: "#c4b5fd",
    fontSize: 14,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  field: {
    gap: 8,
  },
  label: {
    color: "#2d1b4c",
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
    color: "#0f172a",
  },
  forgotRow: {
    alignItems: "flex-end",
  },
  forgotText: {
    color: "#7c3aed",
    fontWeight: "600",
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  switchText: {
    color: "#4b5563",
  },
  switchLink: {
    color: "#7c3aed",
    fontWeight: "700",
  },
  error: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecdd3",
    fontSize: 14,
  },
  success: {
    backgroundColor: "#ecfdf3",
    color: "#14532d",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    fontSize: 14,
  },
});
