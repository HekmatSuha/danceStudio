import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  fetchProfile,
  logout,
  updateProfile,
  getCurrentRole,
  type AccountProfile,
  type MobileUserRole,
} from "../../../src/services/auth";
import { supabase } from "../../../src/lib/supabase";

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
  const [role, setRole] = useState<MobileUserRole | null>(null);
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const webAdminBase = useMemo(() => process.env.EXPO_PUBLIC_WEB_ADMIN_URL || "", []);
  const webAdminOrigin = useMemo(() => {
    const raw = webAdminBase.trim();
    if (!raw) return "";
    try {
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(normalized).origin;
    } catch {
      return raw.replace(/\/+$/, "");
    }
  }, [webAdminBase]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }
      const [data, currentRole] = await Promise.all([
        fetchProfile(),
        getCurrentRole(),
      ]);
      setProfile(data);
      setRole(currentRole);
      setForm({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        email: data.email || "",
        phone: data.phone_number || "",
        gender: data.gender || "F",
        danceLevel: data.dance_level || "Beginner",
        interests: (data.interests || []).join(", "),
      });
    } catch {
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

  const handlePickAvatar = async () => {
    if (uploadingAvatar) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo access to upload an avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingAvatar(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const contentType = asset.mimeType || "image/jpeg";

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const extFromUri = uri.split(".").pop() || "jpg";
      const fileExt = extFromUri.includes("?") ? extFromUri.split("?")[0] : extFromUri;
      const filePath = `${user.id}/avatar.${fileExt}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true, contentType });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const publicUrl = publicUrlData?.publicUrl || null;

      await updateProfile({ avatarUrl: publicUrl });
      await loadProfile();
    } catch (err: any) {
      Alert.alert("Upload failed", err?.message || "Unable to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const openAdminDashboard = async () => {
    if (!webAdminOrigin) {
      Alert.alert(
        "Web dashboard not configured",
        "Set EXPO_PUBLIC_WEB_ADMIN_URL to open the web admin dashboard."
      );
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      Alert.alert("Not signed in", "Please sign in again and retry.");
      return;
    }
    const access = encodeURIComponent(data.session.access_token);
    const refresh = encodeURIComponent(data.session.refresh_token);
    const redirectPath = role === "super_admin" ? "/dashboard/super-admin" : "/dashboard";
    const url = `${webAdminOrigin}${redirectPath}?access=${access}&refresh=${refresh}`;
    router.push(`/admin/web-dashboard?url=${encodeURIComponent(url)}`);
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

  const initials =
    `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.trim() ||
    profile.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.avatar} onPress={handlePickAvatar}>
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
              <View style={styles.avatarOverlay}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <Ionicons name="camera-outline" size={18} color="#111827" />
                )}
              </View>
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>My Profile</Text>
              <Text style={styles.subtle}>{profile.roles || "Client"}</Text>
            </View>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {(role === "owner" || role === "instructor" || role === "super_admin") && (
            <Pressable
              style={styles.adminButton}
              onPress={openAdminDashboard}
            >
              <View style={styles.adminContent}>
                <View style={styles.adminIcon}>
                  <Ionicons name="briefcase" size={20} color="white" />
                </View>
                <View>
                  <Text style={styles.adminTitle}>Admin Dashboard</Text>
                  <Text style={styles.adminSub}>Manage studio & classes</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </Pressable>
          )}

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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#475569",
  },
  avatarOverlay: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  adminContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adminIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  adminSub: {
    fontSize: 12,
    color: "#64748b",
  },
});
