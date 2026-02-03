import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  InteractionManager,
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
import { markAutoOpenedAdmin } from "../../../src/services/admin-bridge";
import base64Decode from "fast-base64-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [deletingAccount, setDeletingAccount] = useState(false);
  const isMounted = useRef(true);
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
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) {
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }
      const profileCacheKey = `dancecrm.cache.profile.${userId}`;
      const roleCacheKey = `dancecrm.cache.role.${userId}`;
      const cachedProfile = await AsyncStorage.getItem(profileCacheKey);
      const cachedRole = await AsyncStorage.getItem(roleCacheKey);
      if (cachedProfile && isMounted.current) {
        try {
          const parsed = JSON.parse(cachedProfile) as AccountProfile;
          setProfile(parsed);
          setForm({
            firstName: parsed.first_name || "",
            lastName: parsed.last_name || "",
            email: parsed.email || "",
            phone: parsed.phone_number || "",
            gender: parsed.gender || "F",
            danceLevel: parsed.dance_level || "Beginner",
            interests: (parsed.interests || []).join(", "),
          });
          if (cachedRole) {
            setRole(cachedRole as MobileUserRole);
          }
          setLoading(false);
        } catch {
          // ignore cache parse errors
        }
      }

      const [freshProfile, currentRole] = await Promise.all([
        fetchProfile(),
        getCurrentRole(),
      ]);
      if (!isMounted.current) return;
      setProfile(freshProfile);
      setRole(currentRole);
      setForm({
        firstName: freshProfile.first_name || "",
        lastName: freshProfile.last_name || "",
        email: freshProfile.email || "",
        phone: freshProfile.phone_number || "",
        gender: freshProfile.gender || "F",
        danceLevel: freshProfile.dance_level || "Beginner",
        interests: (freshProfile.interests || []).join(", "),
      });
      await AsyncStorage.setItem(profileCacheKey, JSON.stringify(freshProfile));
      if (currentRole) {
        await AsyncStorage.setItem(roleCacheKey, currentRole);
      } else {
        await AsyncStorage.removeItem(roleCacheKey);
      }
    } catch {
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    InteractionManager.runAfterInteractions(() => {
      if (isMounted.current) loadProfile();
    });
    return () => {
      isMounted.current = false;
    };
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
        base64: true,
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

      let dataToUpload: Uint8Array | ArrayBuffer;
      if (asset.base64) {
        const sanitized = asset.base64.replace(/\s/g, "");
        const padding = sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0;
        const byteLength = (sanitized.length * 3) / 4 - padding;
        const buffer = new Uint8Array(byteLength);
        base64Decode(sanitized, buffer);
        dataToUpload = buffer;
      } else {
        const response = await fetch(uri);
        dataToUpload = await response.arrayBuffer();
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, dataToUpload, { upsert: true, contentType });
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

  const handleDeleteAccount = async () => {
    if (!webAdminOrigin) {
      Alert.alert(
        "Account deletion unavailable",
        "Set EXPO_PUBLIC_WEB_ADMIN_URL to enable account deletion."
      );
      return;
    }

    Alert.alert(
      "Delete account?",
      "This will permanently delete your account and data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (deletingAccount) return;
            setDeletingAccount(true);
            try {
              const { data, error } = await supabase.auth.getSession();
              if (error || !data.session) {
                Alert.alert("Not signed in", "Please sign in again and retry.");
                return;
              }

              const response = await fetch(`${webAdminOrigin}/api/account/delete`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${data.session.access_token}`,
                },
                body: JSON.stringify({}),
              });

              const payload = await response.json().catch(() => ({}));
              if (!response.ok) {
                Alert.alert(
                  "Delete failed",
                  payload?.error || "Unable to delete your account."
                );
                return;
              }

              await logout();
              router.replace("/(auth)/login");
            } catch (err: any) {
              Alert.alert("Delete failed", err?.message || "Unable to delete your account.");
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
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
    await markAutoOpenedAdmin();
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

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={styles.dangerText}>
            Permanently delete your account and associated data.
          </Text>
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.9 },
              deletingAccount && { opacity: 0.7 },
            ]}
          >
            {deletingAccount ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            )}
          </Pressable>
        </View>

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
  dangerCard: {
    marginTop: 20,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b91c1c",
    marginBottom: 6,
  },
  dangerText: {
    fontSize: 12,
    color: "#7f1d1d",
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 14,
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
