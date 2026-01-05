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
} from "react-native";
import { Link, router } from "expo-router";
import { register, type MobileUserRole, login } from "../../src/services/auth";

const roleCopy: Record<MobileUserRole, { label: string; description: string }> =
  {
    owner: {
      label: "Owner",
      description: "Full control of studios, trainers, and billing.",
    },
    instructor: {
      label: "Instructor",
      description: "Create and manage classes you teach.",
    },
    student: {
      label: "Student",
      description: "Book classes and manage your profile.",
    },
  };

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"M" | "F">("F");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<MobileUserRole>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim();
    if (!firstName.trim() || !lastName.trim() || !trimmedEmail || !password) {
      setError("First name, last name, email, and password are required.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8 || !/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
      setError("Use at least 8 characters with letters and numbers.");
      return;
    }
    setLoading(true);
    try {
      await register({
        email: trimmedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        gender,
        role,
      });
      // login after registration to capture tokens if backend didn't return them
      const { role: signedInRole } = await login(trimmedEmail, password);
      setInfo("Account created successfully. You're signed in.");
      const nextRoute =
        signedInRole === "owner"
          ? "/(tabs)/owner-dashboard"
          : signedInRole === "instructor"
            ? "/(tabs)/schedule"
            : "/(tabs)";
      router.replace(nextRoute);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
            <Text style={styles.title}>Join Elevate Dance</Text>
            <Text style={styles.subtitle}>
              Create an account to start your dance journey
            </Text>
          </View>

          <View style={styles.card}>
            {error && <Text style={styles.error}>{error}</Text>}
            {info && <Text style={styles.success}>{info}</Text>}

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="John"
                  placeholderTextColor="#b8b8c7"
                  autoCapitalize="words"
                  style={styles.input}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Doe"
                  placeholderTextColor="#b8b8c7"
                  autoCapitalize="words"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#b8b8c7"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#b8b8c7"
                keyboardType="phone-pad"
                style={styles.input}
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
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Gender *</Text>
              <View style={styles.roleGrid}>
                {(["F", "M"] as const).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setGender(value)}
                    style={[
                      styles.roleCard,
                      gender === value && styles.roleCardActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleLabel,
                        gender === value && styles.roleLabelActive,
                      ]}
                    >
                      {value === "F" ? "Female" : "Male"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="********"
                placeholderTextColor="#b8b8c7"
                secureTextEntry
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Choose a role *</Text>
              <View style={styles.roleGrid}>
                {(Object.keys(roleCopy) as MobileUserRole[]).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setRole(value)}
                    style={[
                      styles.roleCard,
                      role === value && styles.roleCardActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleLabel,
                        role === value && styles.roleLabelActive,
                      ]}
                    >
                      {roleCopy[value].label}
                    </Text>
                    <Text style={styles.roleDescription}>
                      {roleCopy[value].description}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.roleHint}>
                Owners can later approve instructor access for teammates.
              </Text>
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.9 },
                loading && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account?</Text>
              <Link href="/(auth)/login" style={styles.switchLink}>
                Sign in
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
    backgroundColor: "#db2777",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#db2777",
    shadowOpacity: 0.35,
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
  fieldRow: {
    flexDirection: "row",
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
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  roleCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    width: "48%",
  },
  roleCardActive: {
    borderColor: "#8b5cf6",
    backgroundColor: "#f5f3ff",
  },
  roleLabel: {
    fontWeight: "700",
    color: "#1f2937",
  },
  roleLabelActive: {
    color: "#7c3aed",
  },
  roleDescription: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  roleHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
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
