import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  fetchProfile,
  logout,
  updateProfile,
  type AccountProfile,
} from "../../../src/services/auth";
import { getStoredTokens } from "../../../src/lib/api";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  danceLevel: string;
  interests: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "F",
    danceLevel: "Beginner",
    interests: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const tokens = await getStoredTokens();
      if (!tokens) {
        setProfile(null);
        return;
      }
      const data = await fetchProfile();
      setProfile(data);
      setForm({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        email: data.email || "",
        phone: data.phone_number || "",
        gender: data.gender || "F",
        danceLevel: data.dance_level || "Beginner",
        interests: (data.interests || []).join(", "),
      });
    } catch (err) {
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        gender: form.gender,
        danceLevel: form.danceLevel,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
      });
      Alert.alert("Success", "Profile details saved.");
      await loadProfile();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.textMuted}>Please sign in to view your profile.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              value={form.firstName}
              onChangeText={(t) => setForm({ ...form, firstName: t })}
              style={styles.input}
              placeholder="Jane"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              value={form.lastName}
              onChangeText={(t) => setForm({ ...form, lastName: t })}
              style={styles.input}
              placeholder="Doe"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={form.email}
              editable={false}
              style={[styles.input, styles.disabledInput]}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="+1 555 123 4567"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.levelContainer}>
              {["F", "M"].map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setForm({ ...form, gender: g })}
                  style={[
                    styles.levelChip,
                    form.gender === g && styles.levelChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.levelText,
                      form.gender === g && styles.levelTextActive,
                    ]}
                  >
                    {g === "F" ? "Female" : "Male"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dance Level</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelContainer}>
              {["Beginner", "Intermediate", "Advanced", "Professional"].map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setForm({ ...form, danceLevel: l })}
                  style={[
                    styles.levelChip,
                    form.danceLevel === l && styles.levelChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.levelText,
                      form.danceLevel === l && styles.levelTextActive,
                    ]}
                  >
                    {l}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Interests (comma separated)</Text>
            <TextInput
              value={form.interests}
              onChangeText={(t) => setForm({ ...form, interests: t })}
              style={styles.input}
              placeholder="Salsa, Bachata"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.subtle}>{profile.roles || "Client"}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.9 },
            saving && { opacity: 0.7 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textMuted: {
    color: "#64748b",
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    marginLeft: 4,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  subtle: {
    fontSize: 14,
    color: "#64748b",
  },
  input: {
    fontSize: 16,
    color: "#0f172a",
    paddingVertical: 8,
  },
  disabledInput: {
    color: "#94a3b8",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  levelContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  levelChipActive: {
    borderColor: "#8b5cf6",
    backgroundColor: "#f3e8ff",
  },
  levelText: {
    fontSize: 13,
    color: "#64748b",
  },
  levelTextActive: {
    color: "#7c3aed",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#8b5cf6",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
